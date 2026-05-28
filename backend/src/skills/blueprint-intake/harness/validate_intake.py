#!/usr/bin/env python3
"""
PIO Framework — Intake Dossier Validation Harness
==================================================

Validates a Compressed Client Dossier against schema intake_v1.0.

IMPORTANT: Run this gate on the NATIVE MARKDOWN output from blueprint-intake,
BEFORE any DOCX conversion step. Feeding a DOCX-roundtripped file will produce
a pandoc_artifact_detected FAIL — that is intentional, not a harness bug.

Usage:
    python validate_intake.py <path_to_dossier.md>
    python validate_intake.py <path_to_dossier.md> --archetype recruitment
    python validate_intake.py <path_to_dossier.md> --json       # machine-readable output
    python validate_intake.py <path_to_dossier.md> --completeness-json  # alias for --json

Archetype detection:
    Default: auto-detect from "Industry Archetype:" line in the dossier header.
    Override: --archetype <key>  (e.g. recruitment, manufacturing)

Exit codes:
    0 — PASS
    1 — FAIL (schema violation; see report)
    2 — ERROR (file unreadable or harness bug)
"""

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ============================================================================
# Source Registry (canonical names + acceptable aliases)
# ============================================================================

SOURCE_REGISTRY = {
    "financial summary": ["financial_summary", "p&l", "management accounts", "finance"],
    "org chart": ["org_chart", "organisational structure", "team structure", "org"],
    "sales pipeline": ["sales_pipeline", "pipeline data", "bd report", "pipeline"],
    "SOP": ["process docs", "process documentation", "processes", "sops", "process documentation v2.1"],
    "marketing/customer data": ["marketing data", "customer data", "client satisfaction survey", "marketing"],
    "tech inventory": ["technology inventory", "tech stack", "systems inventory", "it inventory"],
    "strategic plan": ["strategy doc", "board deck", "annual plan", "fy26 plan", "strategic plan fy2026"],
    "previous AI initiatives": ["prior ai", "ai history", "previous ai doc", "ai initiative review"],
}

FORM_SECTIONS = {
    "form: company fundamentals",
    "form: strategic context",
    "form: pain points",
    "form: technology",
    "form: people & culture",
    "form: data readiness",
    "form: budget & timeline",
}

# Build a lookup: alias -> canonical
ALIAS_TO_CANONICAL = {}
for canonical, aliases in SOURCE_REGISTRY.items():
    ALIAS_TO_CANONICAL[canonical.lower()] = canonical
    for alias in aliases:
        ALIAS_TO_CANONICAL[alias.lower()] = canonical

# ============================================================================
# Pre-flight forbidden patterns
# ============================================================================

FORBIDDEN_HEADER_PATTERNS = [
    re.compile(r"TEST[\s_]?\d+", re.IGNORECASE),
    re.compile(r"\btemp[\s_]?\d+\b", re.IGNORECASE),
    re.compile(r"\bTEMP\d+\b"),
    re.compile(r"\bDEBUG\b"),
    re.compile(r"\bv\d+\.\d+\.dev\b"),
]

FORBIDDEN_LEADING_PARAGRAPH_PATTERNS = [
    re.compile(r"^I have confirmed", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^I have received", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^I confirm receipt", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^All inputs are complete", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^Proceeding to (final assembly|analysis|the next step)", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^Step \d+ \(", re.MULTILINE),
    re.compile(r"^Beginning (Stage|Step|Phase) \d+", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^Inputs verified", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^All upstream outputs (received|confirmed)", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^Acknowledgement of receipt", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^No missing sections", re.IGNORECASE | re.MULTILINE),
    re.compile(r"^No unresolved placeholders", re.IGNORECASE | re.MULTILINE),
]

FORBIDDEN_TAG_PATTERNS = [
    re.compile(r"\[Likely[\s\]—]"),
    re.compile(r"\[Probably[\s\]—]"),
    re.compile(r"\[Estimated[\s\]—](?! ?[—-])"),  # bare [Estimated] without further qualifier
    re.compile(r"\[Doc-Backed[\s\]—]"),
    re.compile(r"\[Form Stated[\s\]—]"),  # missing hyphen
]

VALID_CONFIDENCE_TAGS = {
    "Document-Backed",
    "Form-Stated",
    "Document-Backed + Form-Stated",
    "Inferred",
    "Assumption",
}

# ============================================================================
# Schema constants — archetype defaults (HR-03: archetype-aware)
# ============================================================================

ARCHETYPE_DEFAULTS = {
    "recruitment": {
        "section_a_words_min": 200,
        "section_a_words_max": 350,   # FW-05: strict ceiling, no ±20% expansion
        "section_a_paragraphs": 4,
        "section_b_rows_min": 35,
        "section_b_rows_max": 50,
        "section_c_pain_points": 8,   # FIXED
        "section_d_hypotheses": 7,    # FIXED
        "section_e_org_bullets": 5,   # FIXED
        "section_e_process_bullets": 5,  # FIXED
        "section_g_open_questions_min": 3,
        "section_g_open_questions_max": 6,
        "total_tags_min": 100,
        "total_tags_max": 200,
        "per_pp_evidence_bullets_min": 3,
        "per_pp_evidence_bullets_max": 5,
    }
}

# Maps keywords found in the "Industry Archetype:" header line → ARCHETYPE_DEFAULTS key
ARCHETYPE_HEADER_MAP = {
    "recruitment": "recruitment",
    "talent solutions": "recruitment",
    "talent & staffing": "recruitment",
    "staffing": "recruitment",
    # add new archetypes here as they are promoted to ACTIVE status
}


def detect_archetype_from_header(text: str) -> Optional[str]:
    """Auto-detect the industry archetype from the dossier header line."""
    m = re.search(r"Industry Archetype:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    if not m:
        return None
    raw = m.group(1).strip().lower()
    for keyword, archetype_key in ARCHETYPE_HEADER_MAP.items():
        if keyword in raw:
            return archetype_key
    return None

IMPACT_AREAS_CANONICAL = ["Revenue", "Cost", "Risk", "Time", "Customer", "Compliance", "Strategic", "Team"]

# ============================================================================
# Data model
# ============================================================================

@dataclass
class ValidationIssue:
    severity: str  # "FAIL", "WARN"
    rule: str
    location: str
    message: str

@dataclass
class ValidationReport:
    issues: list = field(default_factory=list)
    metrics: dict = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        return not any(i.severity == "FAIL" for i in self.issues)

    def add_fail(self, rule, location, message):
        self.issues.append(ValidationIssue("FAIL", rule, location, message))

    def add_warn(self, rule, location, message):
        self.issues.append(ValidationIssue("WARN", rule, location, message))

    def to_dict(self):
        return {
            "passed": self.passed,
            "fail_count": sum(1 for i in self.issues if i.severity == "FAIL"),
            "warn_count": sum(1 for i in self.issues if i.severity == "WARN"),
            "issues": [{"severity": i.severity, "rule": i.rule, "location": i.location, "message": i.message} for i in self.issues],
            "metrics": self.metrics,
        }

# ============================================================================
# Parser — locate sections in the markdown dossier
# ============================================================================

SECTION_PATTERNS = {
    "header": re.compile(r"^#\s+(?P<title>.+?)(?:\n|$)", re.MULTILINE),
    "A": re.compile(r"^##\s+A\)\s+Executive Summary", re.IGNORECASE | re.MULTILINE),
    "B": re.compile(r"^##\s+B\)\s+Key Data Points", re.IGNORECASE | re.MULTILINE),
    "C": re.compile(r"^##\s+C\)\s+Detected Pain Points", re.IGNORECASE | re.MULTILINE),
    "D": re.compile(r"^##\s+D\)\s+Opportunities and Hypotheses", re.IGNORECASE | re.MULTILINE),
    "E": re.compile(r"^##\s+E\)\s+Org and Process Views", re.IGNORECASE | re.MULTILINE),
    "F": re.compile(r"^##\s+F\)\s+Document Index", re.IGNORECASE | re.MULTILINE),
    "G": re.compile(r"^##\s+G\)\s+Open Questions", re.IGNORECASE | re.MULTILINE),
    "H": re.compile(r"^##\s+H\)\s+Reviewer Checklist", re.IGNORECASE | re.MULTILINE),
    "JUSTIFICATION": re.compile(r"^##\s+\[?JUSTIFICATION\]?", re.MULTILINE),
}

def split_sections(text: str) -> dict:
    """Split the dossier into named sections."""
    positions = []
    for name, pattern in SECTION_PATTERNS.items():
        m = pattern.search(text)
        if m:
            positions.append((m.start(), name))
    positions.sort()
    sections = {}
    for i, (start, name) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        sections[name] = text[start:end]
    return sections

# ============================================================================
# HR-01 — Pandoc artifact detection patterns
# Harness path (b): gate runs on native markdown BEFORE any DOCX conversion.
# These patterns indicate a DOCX-roundtripped file — fail immediately with a
# clear diagnostic rather than a confusing cascade of format failures.
# ============================================================================

PANDOC_ARTIFACT_PATTERNS = [
    (re.compile(r"\\\[(?:Document-Backed|Form-Stated|Inferred|Assumption)"), "backslash-escaped citation brackets (\\[Tag\\]) — pandoc DOCX→MD artifact"),
    (re.compile(r"^#{1,3}\s+\*\*Pain Point\s+\d+", re.MULTILINE), "bold pain point heading (**Pain Point N) instead of H3 heading — pandoc artifact"),
    (re.compile(r"^#{1,3}\s+\*\*Hypothesis\s+\d+", re.MULTILINE), "bold hypothesis heading (**Hypothesis N) instead of H3 heading — pandoc artifact"),
    (re.compile(r"^(\*\*Pain Point\s+\d+\s*---)", re.MULTILINE), "bold pain point with triple-hyphens instead of H3+em-dash — pandoc artifact"),
    (re.compile(r"^(\*\*Hypothesis\s+\d+\s*---)", re.MULTILINE), "bold hypothesis with triple-hyphens instead of H3+em-dash — pandoc artifact"),
]


# ============================================================================
# HR-04 — Structured extraction helpers (for extended JSON output)
# ============================================================================

def extract_hypotheses_structured(sections: dict) -> list:
    """Return list of {position, title} dicts from Section D."""
    if "D" not in sections:
        return []
    h_re = re.compile(r"^###\s+Hypothesis\s+(\d+)\s+—\s+(.+?)$", re.MULTILINE)
    return [{"position": int(m.group(1)), "title": m.group(2).strip()} for m in h_re.finditer(sections["D"])]


def extract_pain_points_structured(sections: dict) -> list:
    """Return list of {position, title, severity} dicts from Section C."""
    if "C" not in sections:
        return []
    pp_re = re.compile(r"^###\s+Pain Point\s+(\d+)\s+—\s+(.+?)$", re.MULTILINE)
    severity_re = re.compile(r"\*\*Severity:\*\*\s*(.+?)(?:\n|$)")
    result = []
    matches = list(pp_re.finditer(sections["C"]))
    for idx, m in enumerate(matches):
        chunk_start = m.end()
        chunk_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(sections["C"])
        chunk = sections["C"][chunk_start:chunk_end]
        sev_m = severity_re.search(chunk)
        result.append({
            "position": int(m.group(1)),
            "title": m.group(2).strip(),
            "severity": sev_m.group(1).strip() if sev_m else "Unknown",
        })
    return result


def extract_weak_tags_structured(text: str, sections: dict) -> list:
    """Return list of {tag, sources} dicts for all Inferred/Assumption tags in the body."""
    if "JUSTIFICATION" in sections:
        body = text[: text.find(sections["JUSTIFICATION"])]
    else:
        body = text
    result = []
    for m in CITATION_TAG_RE.finditer(body):
        if m.group("tag") in {"Inferred", "Assumption"}:
            result.append({"tag": m.group("tag"), "sources": m.group("sources") or ""})
    return result


# ============================================================================
# Validation checks
# ============================================================================

def check_required_sections(sections: dict, report: ValidationReport) -> None:
    required = ["A", "B", "C", "D", "E", "F", "G", "H", "JUSTIFICATION"]
    for s in required:
        if s not in sections:
            report.add_fail("required_section_missing", f"Section {s}", f"Required section '{s}' not found")


def check_pandoc_artifacts(text: str, report: ValidationReport) -> None:
    """HR-01: Detect DOCX-roundtrip artifacts and fail early with a clear diagnostic.

    The gate must run on the native markdown output from the skill, BEFORE any
    DOCX conversion step. This check enforces that discipline — if pandoc artifacts
    are present, the file is not the correct input for this harness.
    """
    for pattern, description in PANDOC_ARTIFACT_PATTERNS:
        m = pattern.search(text)
        if m:
            report.add_fail(
                "pandoc_artifact_detected",
                "Pre-flight",
                f"DOCX-roundtrip artifact detected: {description}. "
                f"Run the gate on the original markdown output from blueprint-intake BEFORE "
                f"any DOCX conversion. See OPERATIONS.md §'Gate Invocation Point Policy'."
            )

def check_header_block(text: str, report: ValidationReport) -> None:
    # First 60 lines should contain schema version
    head = "\n".join(text.split("\n")[:60])
    if "intake_v1.0" not in head:
        report.add_fail("schema_version", "Header", "Schema version 'intake_v1.0' not declared in header")
    # No forbidden header patterns
    for pat in FORBIDDEN_HEADER_PATTERNS:
        m = pat.search(head)
        if m:
            report.add_fail("forbidden_header_pattern", "Header", f"Forbidden pattern '{m.group(0)}' found in header block")

def check_leading_paragraphs(text: str, sections: dict, report: ValidationReport) -> None:
    if "A" not in sections:
        return
    a = sections["A"]
    # Get first few paragraphs after the heading
    body = a.split("\n", 1)[1] if "\n" in a else a
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    for i, para in enumerate(paragraphs[:3]):
        for pat in FORBIDDEN_LEADING_PARAGRAPH_PATTERNS:
            if pat.search(para):
                report.add_fail("forbidden_leading_paragraph", f"Section A paragraph {i+1}", f"Leaked pipeline-stage marker detected")
                break

def check_forbidden_tags(text: str, report: ValidationReport) -> None:
    for pat in FORBIDDEN_TAG_PATTERNS:
        for m in pat.finditer(text):
            report.add_fail("forbidden_tag_pattern", "Body", f"Forbidden tag pattern '{m.group(0)}' detected")

# Citation tag regex — captures full tag including content
CITATION_TAG_RE = re.compile(
    r"\[(?P<tag>Document-Backed \+ Form-Stated|Document-Backed|Form-Stated|Inferred|Assumption)(?:\s+—\s+(?P<sources>[^\]]+))?\]"
)

def extract_citations(text: str) -> list:
    return [(m.group("tag"), m.group("sources")) for m in CITATION_TAG_RE.finditer(text)]

def check_citation_format(text: str, report: ValidationReport, arch_defaults: dict = None) -> None:
    # Identify tags that are summary labels rather than citations:
    # (1) Tags in **Confidence:** lines  (PP/Hypothesis Confidence summary field)
    # (2) Tags in table cells (Section B "Confidence Tag" column)
    # (3) Tags inside the [JUSTIFICATION] block (tag-name references, not citations)
    # These are NOT citations and don't need source citations.

    # Find the start of the JUSTIFICATION block (if present)
    just_match = re.search(r"^##\s+\[?JUSTIFICATION\]?", text, re.MULTILINE)
    justification_start = just_match.start() if just_match else len(text)

    # Find all citation tag positions
    all_tag_matches = list(CITATION_TAG_RE.finditer(text))

    citation_tags = []
    for m in all_tag_matches:
        start = m.start()
        end = m.end()
        # Skip if inside JUSTIFICATION block
        if start >= justification_start:
            continue
        # Check for **Confidence:** prefix in last 20 chars before tag
        prefix = text[max(0, start - 20):start]
        if re.search(r"\*\*Confidence:\*\*\s*$", prefix):
            continue
        # Check whether tag is inside a markdown table cell:
        # A table cell tag is bracketed by | on both sides on the same line.
        line_start = text.rfind("\n", 0, start) + 1
        line_end = text.find("\n", end)
        if line_end == -1:
            line_end = len(text)
        line = text[line_start:line_end]
        line_stripped = line.strip()
        if line_stripped.startswith("|") and line_stripped.endswith("|"):
            continue
        citation_tags.append((m.group("tag"), m.group("sources")))

    if not citation_tags:
        report.add_fail("no_citations", "Body", "No citations found in dossier")
        return
    report.metrics["total_tags"] = len(citation_tags)
    tag_counts = Counter(t[0] for t in citation_tags)
    report.metrics["tag_breakdown"] = dict(tag_counts)
    arch = arch_defaults or ARCHETYPE_DEFAULTS["recruitment"]
    if not (arch["total_tags_min"] <= len(citation_tags) <= arch["total_tags_max"]):
        report.add_fail(
            "tag_count_out_of_band",
            "Body",
            f"Total tag count {len(citation_tags)} outside acceptable band [{arch['total_tags_min']}, {arch['total_tags_max']}]"
        )
    # Document-Backed and Form-Stated tags MUST have sources
    for tag, sources in citation_tags:
        if tag in {"Document-Backed", "Form-Stated", "Document-Backed + Form-Stated"} and not sources:
            report.add_fail("citation_missing_source", "Body", f"[{tag}] tag without source citation")

def check_source_registry(text: str, report: ValidationReport) -> None:
    citations = extract_citations(text)
    unknown_sources = set()
    appendix_ref_re = re.compile(r"^(derivation per\s+)?appendix item\s+\d+$", re.IGNORECASE)
    for tag, sources in citations:
        if not sources:
            continue
        # Inferred and Assumption tags can reference appendix items
        # Split on semicolons for multi-source tags
        for src in sources.split(";"):
            src = src.strip()
            # Allow appendix references for Inferred and Assumption tags
            if tag in {"Inferred", "Assumption"} and appendix_ref_re.match(src):
                continue
            # Strip page/section suffix
            src_name = re.sub(r"\s+(p\.\d+(-\d+)?|step\s+\d+(\.\d+)?|pain points|strategic context|company fundamentals|technology|people & culture|data readiness|budget & timeline)$", "", src, flags=re.IGNORECASE).strip()
            # Form sources are valid
            if src.lower() in FORM_SECTIONS:
                continue
            # Check registry
            if src_name.lower() not in ALIAS_TO_CANONICAL and src_name not in SOURCE_REGISTRY:
                unknown_sources.add(src)
    for src in sorted(unknown_sources):
        report.add_fail("unknown_source", "Citations", f"Source '{src}' not in source registry")

def check_section_a(sections: dict, report: ValidationReport, arch_defaults: dict = None) -> None:
    if "A" not in sections:
        return
    body = sections["A"].split("\n", 1)[1] if "\n" in sections["A"] else ""
    paragraphs = [p for p in re.split(r"\n\s*\n", body) if p.strip() and not p.strip().startswith("##")]
    arch = arch_defaults or ARCHETYPE_DEFAULTS["recruitment"]
    if len(paragraphs) != arch["section_a_paragraphs"]:
        report.add_fail("section_a_paragraphs", "Section A", f"Expected {arch['section_a_paragraphs']} paragraphs, found {len(paragraphs)}")
    word_count = sum(len(p.split()) for p in paragraphs)
    report.metrics["section_a_words"] = word_count
    if not (arch["section_a_words_min"] <= word_count <= arch["section_a_words_max"]):
        report.add_fail("section_a_word_count", "Section A", f"Word count {word_count} outside band [{arch['section_a_words_min']}, {arch['section_a_words_max']}]")
    # Each paragraph must have at least 2 citations
    for i, para in enumerate(paragraphs):
        c = len(CITATION_TAG_RE.findall(para))
        if c < 2:
            report.add_fail("section_a_citation_density", f"Section A paragraph {i+1}", f"Paragraph has {c} citations; minimum 2 required")

def check_section_b(sections: dict, report: ValidationReport, arch_defaults: dict = None) -> None:
    if "B" not in sections:
        return
    arch = arch_defaults or ARCHETYPE_DEFAULTS["recruitment"]
    # Primary counter: markdown table rows (lines starting with | that aren't header or separator).
    # HR-02: This counter expects native markdown format. Gate must run BEFORE any DOCX conversion
    # (enforced by check_pandoc_artifacts). If artifacts are detected, the primary counter will
    # return 0 — but that failure is already reported by check_pandoc_artifacts.
    lines = sections["B"].split("\n")
    in_table = False
    row_count = 0
    for line in lines:
        if line.strip().startswith("|") and "---" in line:
            in_table = True
            continue
        if in_table and line.strip().startswith("|"):
            row_count += 1
        elif line.strip() == "":
            continue
        elif in_table and not line.strip().startswith("|"):
            in_table = False

    # HR-02 fallback: if primary counter finds 0 rows, try detecting key-value lines
    # (e.g. "Total Revenue | £5.25M | financial summary | [Document-Backed]") as a
    # defensive signal. A non-zero fallback count is reported as a WARN so the operator
    # knows the file may have lost its table structure.
    if row_count == 0:
        kv_lines = [l for l in lines if l.count("|") >= 3 and l.strip() and not l.strip().startswith("#")]
        if kv_lines:
            report.add_warn(
                "section_b_table_format_lost",
                "Section B",
                f"Markdown table structure not detected but {len(kv_lines)} pipe-delimited lines found. "
                f"File may be DOCX-roundtripped — run gate on original markdown output."
            )
            row_count = len(kv_lines)

    report.metrics["section_b_rows"] = row_count
    if not (arch["section_b_rows_min"] <= row_count <= arch["section_b_rows_max"]):
        report.add_fail("section_b_rows", "Section B", f"Row count {row_count} outside band [{arch['section_b_rows_min']}, {arch['section_b_rows_max']}]")

def check_section_c(sections: dict, report: ValidationReport, arch_defaults: dict = None) -> None:
    if "C" not in sections:
        return
    arch = arch_defaults or ARCHETYPE_DEFAULTS["recruitment"]
    pp_pattern = re.compile(r"^###\s+Pain Point\s+(\d+)\s+—", re.MULTILINE)
    matches = pp_pattern.findall(sections["C"])
    report.metrics["section_c_pain_points"] = len(matches)
    if len(matches) != arch["section_c_pain_points"]:
        report.add_fail("section_c_count", "Section C", f"Found {len(matches)} pain points; FIXED count requires exactly {arch['section_c_pain_points']}")
    # Check numbering 1..N
    numbers = [int(n) for n in matches]
    expected = list(range(1, arch["section_c_pain_points"] + 1))
    if numbers != expected:
        report.add_fail("section_c_numbering", "Section C", f"Pain points must be numbered sequentially 1..{arch['section_c_pain_points']}; found {numbers}")
    # Each PP must have Statement, Evidence, Impact area, Severity, Confidence
    pp_chunks = re.split(r"^###\s+Pain Point\s+\d+\s+—", sections["C"], flags=re.MULTILINE)[1:]
    for i, chunk in enumerate(pp_chunks):
        for field_name in ["Statement", "Evidence", "Impact area", "Severity", "Confidence"]:
            if not re.search(rf"\*\*{re.escape(field_name)}:\*\*", chunk, re.IGNORECASE):
                report.add_fail("section_c_pp_field", f"Pain Point {i+1}", f"Missing required field '{field_name}'")

def check_section_d(sections: dict, report: ValidationReport, arch_defaults: dict = None) -> None:
    if "D" not in sections:
        return
    arch = arch_defaults or ARCHETYPE_DEFAULTS["recruitment"]
    h_pattern = re.compile(r"^###\s+Hypothesis\s+(\d+)\s+—", re.MULTILINE)
    matches = h_pattern.findall(sections["D"])
    report.metrics["section_d_hypotheses"] = len(matches)
    if len(matches) != arch["section_d_hypotheses"]:
        report.add_fail("section_d_count", "Section D", f"Found {len(matches)} hypotheses; FIXED count requires exactly {arch['section_d_hypotheses']}")
    # Each hypothesis must reference a linked Pain Point
    h_chunks = re.split(r"^###\s+Hypothesis\s+\d+\s+—", sections["D"], flags=re.MULTILINE)[1:]
    for i, chunk in enumerate(h_chunks):
        if not re.search(r"\*\*Linked Pain Point\(s\):\*\*\s*PP\d+", chunk):
            report.add_fail("section_d_pp_link", f"Hypothesis {i+1}", "Missing or malformed Linked Pain Point(s) reference (must reference at least one PP)")
        if not re.search(r"\*\*Classification(?: hypothesis)?:\*\*\s*(Quick Win|Foundation Builder(?:\s+\(enabler\))?|Big Bet)", chunk):
            report.add_fail("section_d_classification", f"Hypothesis {i+1}", "Missing or invalid Classification field (must be Quick Win, Foundation Builder, Foundation Builder (enabler), or Big Bet)")

def check_section_e(sections: dict, report: ValidationReport, arch_defaults: dict = None) -> None:
    if "E" not in sections:
        return
    arch = arch_defaults or ARCHETYPE_DEFAULTS["recruitment"]
    text = sections["E"]
    # Find the two sub-headers and count bullets in each
    org_match = re.search(r"\*\*Organisational Structure\*\*\s*\n+((?:- [^\n]+\n?)+)", text)
    proc_match = re.search(r"\*\*Key Processes and Friction Points\*\*\s*\n+((?:- [^\n]+\n?)+)", text)
    if not org_match:
        report.add_fail("section_e_missing", "Section E", "Missing 'Organisational Structure' sub-section")
    else:
        org_bullets = [l for l in org_match.group(1).split("\n") if l.strip().startswith("-")]
        if len(org_bullets) != arch["section_e_org_bullets"]:
            report.add_fail("section_e_org_count", "Section E (Org)", f"Found {len(org_bullets)} org bullets; FIXED count requires exactly {arch['section_e_org_bullets']}")
    if not proc_match:
        report.add_fail("section_e_missing", "Section E", "Missing 'Key Processes and Friction Points' sub-section")
    else:
        proc_bullets = [l for l in proc_match.group(1).split("\n") if l.strip().startswith("-")]
        if len(proc_bullets) != arch["section_e_process_bullets"]:
            report.add_fail("section_e_process_count", "Section E (Process)", f"Found {len(proc_bullets)} process bullets; FIXED count requires exactly {arch['section_e_process_bullets']}")

def check_section_g(sections: dict, report: ValidationReport, arch_defaults: dict = None) -> None:
    if "G" not in sections:
        return
    arch = arch_defaults or ARCHETYPE_DEFAULTS["recruitment"]
    questions = re.findall(r"^\d+\.\s+\*\*", sections["G"], re.MULTILINE)
    report.metrics["section_g_questions"] = len(questions)
    if not (arch["section_g_open_questions_min"] <= len(questions) <= arch["section_g_open_questions_max"]):
        report.add_fail("section_g_count", "Section G", f"Found {len(questions)} open questions; bounded range [{arch['section_g_open_questions_min']}, {arch['section_g_open_questions_max']}]")

def check_section_d_enabler_ordering(sections: dict, report: ValidationReport) -> None:
    """FW-02: Within Foundation Builders, enablers must appear before non-enablers."""
    if "D" not in sections:
        return
    h_num_re = re.compile(r"^###\s+Hypothesis\s+(\d+)\s+—", re.MULTILINE)
    classification_re = re.compile(r"\*\*Classification(?:\s+hypothesis)?:\*\*\s*(.+?)(?:\n|$)")
    h_numbers = [int(m.group(1)) for m in h_num_re.finditer(sections["D"])]
    h_chunks = re.split(r"^###\s+Hypothesis\s+\d+\s+—", sections["D"], flags=re.MULTILINE)[1:]
    fb_sequence = []
    for i, chunk in enumerate(h_chunks):
        class_m = classification_re.search(chunk)
        if not class_m:
            continue
        classification = class_m.group(1).strip()
        if "Foundation Builder" in classification:
            is_enabler = "(enabler)" in classification.lower()
            h_num = h_numbers[i] if i < len(h_numbers) else i + 1
            fb_sequence.append((h_num, is_enabler))
    seen_non_enabler = False
    for h_num, is_enabler in fb_sequence:
        if not is_enabler:
            seen_non_enabler = True
        elif seen_non_enabler:
            report.add_fail(
                "section_d_enabler_ordering",
                f"Section D — Hypothesis {h_num}",
                f"Foundation Builder (enabler) H{h_num} appears after a non-enabler Foundation Builder. "
                "Per FW-02: enablers must precede non-enablers within the Foundation Builder group, "
                "regardless of score. See references/algorithms/ordering.md §Section D."
            )


def check_section_h(sections: dict, report: ValidationReport) -> None:
    if "H" not in sections:
        return
    required_categories = [
        "Highest-risk numbers to verify",
        "Contradictions detected",
        "Low-confidence extractions",
        "Document quality issues",
        "Strategic Priority Coverage",
    ]
    for cat in required_categories:
        if cat not in sections["H"]:
            report.add_fail("section_h_category", "Section H", f"Missing required category '{cat}'")

def check_justification_block(text: str, sections: dict, report: ValidationReport) -> None:
    if "JUSTIFICATION" not in sections:
        report.add_fail("justification_missing", "[JUSTIFICATION]", "Mandatory [JUSTIFICATION] block missing")
        return
    just_text = sections["JUSTIFICATION"]
    # Body text excludes the justification block
    body_text = text[: text.find(just_text)]
    # Find all body [Inferred] and [Assumption] tags, and what appendix items they reference
    # A reference can be: "derivation per appendix item N" or "appendix item N"
    appendix_ref_re = re.compile(
        r"\[(Inferred|Assumption)\s+—\s+(?:derivation\s+per\s+)?appendix item\s+(\d+)\]",
        re.IGNORECASE
    )
    referenced_items = set()
    for m in appendix_ref_re.finditer(body_text):
        referenced_items.add(int(m.group(2)))

    # Also count raw [Inferred]/[Assumption] tags for stats
    body_inferred = len(re.findall(r"\[Inferred[\s\]—]", body_text))
    body_assumption = len(re.findall(r"\[Assumption[\s\]—]", body_text))
    report.metrics["body_inferred_tags"] = body_inferred
    report.metrics["body_assumption_tags"] = body_assumption
    report.metrics["distinct_appendix_refs"] = len(referenced_items)

    # Count entries in justification
    items = re.findall(r"\*\*Item\s+(\d+)\s+—", just_text)
    item_numbers = {int(n) for n in items}
    report.metrics["justification_items"] = len(items)

    # Every appendix reference in body must have a matching item
    missing = referenced_items - item_numbers
    for n in sorted(missing):
        report.add_fail(
            "justification_missing_entry",
            "[JUSTIFICATION]",
            f"Body references 'appendix item {n}' but no matching entry in [JUSTIFICATION] block"
        )

    # Every justification item must be referenced from body (no orphans)
    orphans = item_numbers - referenced_items
    for n in sorted(orphans):
        report.add_warn(
            "justification_orphan",
            "[JUSTIFICATION]",
            f"Justification Item {n} not referenced from body"
        )

    # Each item must have required fields
    item_chunks = re.split(r"\*\*Item\s+\d+\s+—", just_text)[1:]
    for i, chunk in enumerate(item_chunks):
        for field in ["Claim:", "Class:", "Why not higher:", "What resolves:", "Confidence:"]:
            if field not in chunk:
                report.add_fail("justification_field", f"Justification Item {i+1}", f"Missing required field '{field}'")

# ============================================================================
# Main
# ============================================================================

def validate(path: Path, archetype: str = "auto") -> ValidationReport:
    report = ValidationReport()
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as e:
        report.add_fail("file_unreadable", str(path), f"Cannot read file: {e}")
        return report

    # HR-03: Resolve archetype — auto-detect from header, CLI flag overrides
    if archetype == "auto":
        detected = detect_archetype_from_header(text)
        archetype = detected or "recruitment"
        if not detected:
            report.add_warn("archetype_not_detected", "Header", "Industry Archetype not found in header; defaulting to 'recruitment'")
    arch_defaults = ARCHETYPE_DEFAULTS.get(archetype, ARCHETYPE_DEFAULTS["recruitment"])
    report.metrics["archetype"] = archetype

    # HR-01: Detect pandoc/DOCX-roundtrip artifacts before any other checks
    check_pandoc_artifacts(text, report)

    # Pre-flight
    check_header_block(text, report)
    check_forbidden_tags(text, report)

    # Section structure
    sections = split_sections(text)
    check_required_sections(sections, report)
    check_leading_paragraphs(text, sections, report)

    # Per-section checks (HR-03: pass arch_defaults to each)
    check_section_a(sections, report, arch_defaults)
    check_section_b(sections, report, arch_defaults)
    check_section_c(sections, report, arch_defaults)
    check_section_d(sections, report, arch_defaults)
    check_section_d_enabler_ordering(sections, report)
    check_section_e(sections, report, arch_defaults)
    check_section_g(sections, report, arch_defaults)
    check_section_h(sections, report)

    # Citations (HR-03: pass arch_defaults)
    check_citation_format(text, report, arch_defaults)
    check_source_registry(text, report)

    # Justification
    check_justification_block(text, sections, report)

    # HR-04: Extract structured data for downstream-skill handoff
    report.metrics["hypotheses"] = extract_hypotheses_structured(sections)
    report.metrics["pain_points"] = extract_pain_points_structured(sections)
    report.metrics["weak_tags"] = extract_weak_tags_structured(text, sections)

    return report


def format_report(report: ValidationReport, path: Path) -> str:
    lines = []
    lines.append("=" * 70)
    lines.append(f"PIO Framework Validation Report")
    lines.append(f"Schema: intake_v1.0")
    lines.append(f"File: {path}")
    lines.append("=" * 70)
    lines.append("")
    if report.passed:
        lines.append("RESULT: PASS — dossier conforms to schema intake_v1.0")
    else:
        fail_count = sum(1 for i in report.issues if i.severity == "FAIL")
        warn_count = sum(1 for i in report.issues if i.severity == "WARN")
        lines.append(f"RESULT: FAIL — {fail_count} failures, {warn_count} warnings")
    lines.append("")
    lines.append("Metrics:")
    for k, v in report.metrics.items():
        lines.append(f"  {k}: {v}")
    lines.append("")
    if report.issues:
        lines.append("Issues:")
        for issue in report.issues:
            lines.append(f"  [{issue.severity}] {issue.rule}")
            lines.append(f"    Location: {issue.location}")
            lines.append(f"    Message:  {issue.message}")
        lines.append("")
    lines.append("=" * 70)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Validate intake dossier against PIO schema")
    parser.add_argument("file", help="Path to dossier markdown file")
    parser.add_argument(
        "--archetype",
        default="auto",
        help="Industry archetype (default: auto-detect from header). Override with: recruitment, manufacturing, etc."
    )
    parser.add_argument("--json", "--completeness-json", dest="json", action="store_true",
                        help="Output JSON instead of human report (includes downstream-skill handoff data)")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"ERROR: File not found: {path}", file=sys.stderr)
        sys.exit(2)

    report = validate(path, args.archetype)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        print(format_report(report, path))

    sys.exit(0 if report.passed else 1)


if __name__ == "__main__":
    main()
