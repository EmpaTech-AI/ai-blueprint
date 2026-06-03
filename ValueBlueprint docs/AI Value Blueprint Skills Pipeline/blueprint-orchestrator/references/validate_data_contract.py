"""
validate_data_contract.py — AI Value Blueprint Data Contract Validator
=======================================================================
AI Assist BG | Blueprint Pipeline Quality Tool

PURPOSE
-------
Programmatic pre-gate validation script for the AI Value Blueprint pipeline.
Parses a skill's markdown output file and checks that it satisfies the data
contract requirements defined in methodology-and-contracts.md and
quality-gate-algorithm.md before the output is passed to the quality gate.

This script is the AUTOMATED component of the quality gate — it handles the
mechanical, pattern-based checks. Human judgment is still required for the
semantic dimensions (Internal Consistency, Downstream Readiness).

USAGE
-----
    python validate_data_contract.py --skill intake --output path/to/output.md
    python validate_data_contract.py --skill maturity --output path/to/output.md \\
        --documents "Financial Report 2025.pdf,Org Chart.xlsx"

SKILL VALUES
    intake       — blueprint-intake (Step 1)
    maturity     — blueprint-maturity (Step 2)
    opportunities — blueprint-opportunities (Step 3)
    roadmap      — blueprint-roadmap (Step 4)
    assembly     — blueprint-assembly (Step 5)

OUTPUT
------
  - Colored validation report to stdout
  - JSON report saved alongside the input file as <filename>.validation.json

CONFIDENCE SCORE ESTIMATION
----------------------------
The script estimates the Evidence Grounding dimension score (Weight: 40%) and
the Hallucination Risk dimension score (Weight: 10%) programmatically.
Completeness (Weight: 25%) is scored based on section presence.
Internal Consistency (Weight: 15%) and Downstream Readiness (Weight: 10%)
are flagged but require human scoring — the script defaults them to 80% each
as a neutral starting point and notes they require manual review.

VERSION
-------
1.0 — 2026-05-18 — Initial release
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# ANSI COLOR CODES
# ---------------------------------------------------------------------------

class Color:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    GREEN   = "\033[92m"
    AMBER   = "\033[93m"
    BLUE    = "\033[94m"
    RED     = "\033[91m"
    CYAN    = "\033[96m"
    WHITE   = "\033[97m"
    DIM     = "\033[2m"


def colorize(text: str, color: str) -> str:
    """Wrap text in ANSI color codes."""
    return f"{color}{text}{Color.RESET}"


def bold(text: str) -> str:
    return f"{Color.BOLD}{text}{Color.RESET}"


# ---------------------------------------------------------------------------
# REQUIRED SECTIONS PER SKILL
# Source: methodology-and-contracts.md, quality-gate-algorithm.md
# ---------------------------------------------------------------------------

REQUIRED_SECTIONS: dict[str, list[str]] = {
    "intake": [
        "Executive Summary",
        "Key Data Points",
        "Detected Pain Points",
        "Opportunities and Hypotheses",
        "Org and Process Views",
        "Document Index",
        "Open Questions",
        "Reviewer Checklist",
        "Quality Self-Assessment",
    ],
    "maturity": [
        "Readiness Scorecard",
        "Dimension Rationales",
        "Overall Pattern",
        "Key Constraints",
        "Quality Self-Assessment",
    ],
    "opportunities": [
        "Executive Opportunity Summary",
        "Opportunity Cards",
        "Portfolio View",
        "Quality Self-Assessment",
    ],
    "roadmap": [
        "Sequencing Rationale",
        "Phase 1: Now",
        "Phase 2: Next",
        "Phase 3: Later",
        "Bridge to Deeper Engagement",
        "Quality Self-Assessment",
    ],
    "assembly": [
        "Executive Summary",
        "AI Readiness Snapshot",
        "Key Findings",
        "AI Opportunity Map",
        "Recommended Action Sequence",
        "Readiness Gaps",
        "Recommended Next Steps",
        "Appendix",
    ],
}

# Sections whose absence or thinness critically impacts downstream skills.
# Source: quality-gate-algorithm.md — Dimension 2 critical section list.
CRITICAL_SECTIONS: dict[str, list[str]] = {
    "intake":        ["Executive Summary", "Key Data Points", "Detected Pain Points",
                      "Opportunities and Hypotheses"],
    "maturity":      ["Readiness Scorecard", "Dimension Rationales", "Key Constraints"],
    "opportunities": ["Opportunity Cards", "Portfolio View"],
    "roadmap":       ["Phase 1: Now", "Phase 2: Next", "Phase 3: Later",
                      "Sequencing Rationale"],
    "assembly":      ["Executive Summary", "AI Opportunity Map",
                      "Recommended Action Sequence"],
}

# Gate label for each skill's output handoff
GATE_LABELS: dict[str, str] = {
    "intake":        "QG-1 (Intake → Maturity)",
    "maturity":      "QG-2 (Maturity → Opportunities)",
    "opportunities": "QG-3 (Opportunities → Roadmap)",
    "roadmap":       "QG-4 (Roadmap → Assembly)",
    "assembly":      "QG-FINAL (Assembly → Client)",
}

# Minimum pass threshold per gate
MINIMUM_PASS: dict[str, float] = {
    "intake":        76.0,
    "maturity":      76.0,
    "opportunities": 76.0,
    "roadmap":       76.0,
    "assembly":      90.0,   # QG-FINAL requires Green
}

# ---------------------------------------------------------------------------
# FALSE PRECISION PATTERNS
# Patterns that suggest invented specifics or precision beyond evidence.
# Source: evidence-grounding-checklist.md, quality-gate-algorithm.md
# ---------------------------------------------------------------------------

FALSE_PRECISION_PATTERNS: list[tuple[str, str]] = [
    # Overly precise percentages
    (r'\b\d{1,3}\.\d+\s*%', "Decimal-precision percentage (e.g., 47.3%) — verify source supports this precision"),
    # Precise monetary values with decimals
    (r'[€$£]\s*\d[\d,.]*\.\d+\s*[MmBbKk]?\b', "Precise monetary value with decimals — verify source is this specific"),
    # ROI/payback claims without modeling
    (r'\b(?:ROI|return on investment)\s+(?:within|in|of)\s+\d+\s*(?:month|week|year)', "ROI timeframe claim — verify financial modeling supports this"),
    # Specific benchmark comparisons
    (r'\d+\s*[xX]\s+(?:faster|slower|more|less|higher|lower)\s+than\s+(?:industry|average|benchmark|typical)', "Benchmark comparison — verify source for the comparison figure"),
    # "X% reduction/improvement" precision
    (r'\b(?:reduc|improv|increas|decreas)\w+\s+(?:by\s+)?\d{2,3}%', "Specific improvement percentage — verify evidence supports this precision"),
    # Time precision claims
    (r'\b\d+\s*(?:hours?|minutes?|days?)\s+(?:per|a)\s+(?:week|month|day|year)\b', "Precise time measurement — verify source contains this figure"),
    # Headcount precision
    (r'\b(?:approximately\s+)?\d+\s+(?:employees?|staff|FTEs?|people)\b(?!\s+(?:survey|said|report))', "Precise headcount figure — ensure this is form-stated, not assumed"),
]

# Patterns indicating potential phantom citations
PHANTOM_CITATION_PATTERNS: list[str] = [
    r'\[Doc:\s*([^\]|]+?)(?:\s*\|[^\]]+)?\]',   # [Doc: Filename | page]
    r'\[Source:\s*([^\]|]+?)(?:\s*\|[^\]]+)?\]', # [Source: Filename | section]
    r'\[See:\s*([^\]|]+?)(?:\s*\|[^\]]+)?\]',    # [See: Filename]
]

# Patterns for the Quality Self-Assessment block
SELF_ASSESSMENT_PATTERN = re.compile(
    r'##\s+Quality\s+Self.?Assessment',
    re.IGNORECASE
)

# Confidence tag patterns
CONFIDENCE_TAG_PATTERNS: dict[str, re.Pattern] = {
    "document_backed": re.compile(r'\[Document-Backed\]', re.IGNORECASE),
    "form_stated":     re.compile(r'\[Form-Stated\]', re.IGNORECASE),
    "inferred":        re.compile(r'\[Inferred\]', re.IGNORECASE),
    "assumption":      re.compile(r'\[Assumption\]', re.IGNORECASE),
    "insufficient_evidence": re.compile(r'\[Insufficient\s+Evidence\]', re.IGNORECASE),
}

# ---------------------------------------------------------------------------
# DATA CLASSES
# ---------------------------------------------------------------------------

@dataclass
class TagCounts:
    document_backed: int = 0
    form_stated: int = 0
    inferred: int = 0
    assumption: int = 0
    insufficient_evidence: int = 0

    @property
    def high_confidence(self) -> int:
        return self.document_backed + self.form_stated

    @property
    def low_confidence(self) -> int:
        return self.inferred + self.assumption

    @property
    def total_tagged(self) -> int:
        return (self.document_backed + self.form_stated +
                self.inferred + self.assumption + self.insufficient_evidence)


@dataclass
class SectionResult:
    name: str
    found: bool
    is_critical: bool = False


@dataclass
class PhantomCitation:
    cited_name: str
    raw_match: str
    line_number: int
    reason: str


@dataclass
class FalsePrecisionFlag:
    match_text: str
    pattern_description: str
    line_number: int


@dataclass
class ValidationResults:
    skill: str
    output_file: str
    timestamp: str

    # Raw counts
    tag_counts: TagCounts = field(default_factory=TagCounts)
    untagged_claim_estimate: int = 0

    # Section checks
    sections: list[SectionResult] = field(default_factory=list)
    self_assessment_present: bool = False

    # Hallucination checks
    phantom_citations: list[PhantomCitation] = field(default_factory=list)
    false_precision_flags: list[FalsePrecisionFlag] = field(default_factory=list)

    # Dimension scores (0-100)
    evidence_grounding_score: float = 0.0
    completeness_score: float = 0.0
    hallucination_risk_score: float = 0.0
    # Internal consistency and downstream readiness require human review
    internal_consistency_score: float = 80.0   # neutral default
    downstream_readiness_score: float = 80.0   # neutral default

    # Derived
    estimated_confidence_score: float = 0.0
    gate_decision: str = ""
    band: str = ""
    band_color: str = ""

    # Validation pass/fail per check
    checks: dict[str, bool] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# CORE HELPER FUNCTIONS
# ---------------------------------------------------------------------------

def count_confidence_tags(text: str) -> TagCounts:
    """
    Count all confidence tags in the output text.

    Returns a TagCounts dataclass with counts for each tag type:
        [Document-Backed], [Form-Stated], [Inferred], [Assumption],
        [Insufficient Evidence]

    Used as the primary input to the Evidence Grounding score calculation.
    """
    counts = TagCounts()
    counts.document_backed    = len(CONFIDENCE_TAG_PATTERNS["document_backed"].findall(text))
    counts.form_stated        = len(CONFIDENCE_TAG_PATTERNS["form_stated"].findall(text))
    counts.inferred           = len(CONFIDENCE_TAG_PATTERNS["inferred"].findall(text))
    counts.assumption         = len(CONFIDENCE_TAG_PATTERNS["assumption"].findall(text))
    counts.insufficient_evidence = len(CONFIDENCE_TAG_PATTERNS["insufficient_evidence"].findall(text))
    return counts


def find_sections(text: str, required_sections: list[str]) -> dict[str, bool]:
    """
    Check whether each required section header is present in the output text.

    Looks for markdown headers (##, ###, ####) that contain the section name
    as a substring, case-insensitively. Returns a dict of section_name -> found.

    Note: This checks for presence only, not content depth. Depth assessment
    requires human judgment and is flagged in the report.
    """
    results: dict[str, bool] = {}
    lines = text.splitlines()

    for section in required_sections:
        # Build a pattern that finds the section name inside a markdown header
        # at any depth (##, ###, ####)
        escaped = re.escape(section)
        pattern = re.compile(
            r'^#{2,6}\s+.*' + escaped + r'.*$',
            re.IGNORECASE | re.MULTILINE
        )
        found = bool(pattern.search(text))

        # Also try a looser match: the section name appears anywhere on a
        # header line (handles variations like "## B. Key Data Points")
        if not found:
            for line in lines:
                if line.strip().startswith('#') and section.lower() in line.lower():
                    found = True
                    break

        results[section] = found

    return results


def check_phantom_citations(
    text: str,
    known_documents: Optional[list[str]] = None
) -> list[PhantomCitation]:
    """
    Detect citations that reference documents not in the provided materials list.

    If known_documents is provided, extracts document names from citation tags
    and cross-checks against the list. Matches are case-insensitive and use
    partial matching (the cited name must be a substring of a known document
    name or vice versa).

    If known_documents is None or empty, all citations are returned as
    "unverifiable" — the caller must confirm them manually.

    Returns a list of PhantomCitation objects with context for each suspect.
    """
    phantoms: list[PhantomCitation] = []
    lines = text.splitlines()

    for line_num, line in enumerate(lines, start=1):
        for pattern_str in PHANTOM_CITATION_PATTERNS:
            pattern = re.compile(pattern_str, re.IGNORECASE)
            for match in pattern.finditer(line):
                cited_raw = match.group(1).strip()

                if not known_documents:
                    # No document list provided — flag as unverifiable
                    phantoms.append(PhantomCitation(
                        cited_name=cited_raw,
                        raw_match=match.group(0),
                        line_number=line_num,
                        reason="No document list provided — cannot verify this citation exists"
                    ))
                else:
                    # Check if cited name matches any known document
                    matched = _citation_matches_known(cited_raw, known_documents)
                    if not matched:
                        phantoms.append(PhantomCitation(
                            cited_name=cited_raw,
                            raw_match=match.group(0),
                            line_number=line_num,
                            reason=f"'{cited_raw}' not found in provided document list"
                        ))

    return phantoms


def _citation_matches_known(cited: str, known: list[str]) -> bool:
    """
    Return True if the cited document name matches any known document.

    Uses case-insensitive partial matching on stem (filename without extension).
    """
    cited_lower = cited.lower()
    # Strip common extensions for comparison
    cited_stem = re.sub(r'\.(pdf|xlsx?|docx?|pptx?|csv|txt)$', '', cited_lower).strip()

    for doc in known:
        doc_lower = doc.lower()
        doc_stem = re.sub(r'\.(pdf|xlsx?|docx?|pptx?|csv|txt)$', '', doc_lower).strip()
        if cited_stem in doc_stem or doc_stem in cited_stem:
            return True
    return False


def detect_false_precision(text: str) -> list[FalsePrecisionFlag]:
    """
    Scan for patterns indicating false precision or invented specifics.

    Checks against a curated set of patterns derived from the hallucination
    red flag checklist in quality-gate-algorithm.md and
    evidence-grounding-checklist.md.

    Returns a list of FalsePrecisionFlag objects, each with the matched text,
    pattern description, and line number for context.

    Note: These are flags for human review — not all matches are hallucinations.
    The reviewer must assess whether the source material supports the precision.
    """
    flags: list[FalsePrecisionFlag] = []
    lines = text.splitlines()

    for line_num, line in enumerate(lines, start=1):
        # Skip lines that are inside citation tags or the self-assessment block
        if _is_metadata_line(line):
            continue
        for pattern_str, description in FALSE_PRECISION_PATTERNS:
            pattern = re.compile(pattern_str, re.IGNORECASE)
            for match in pattern.finditer(line):
                flags.append(FalsePrecisionFlag(
                    match_text=match.group(0).strip(),
                    pattern_description=description,
                    line_number=line_num
                ))

    return flags


def _is_metadata_line(line: str) -> bool:
    """
    Return True for lines that are structural metadata rather than claims:
    table headers, section headers, code blocks, citation-only lines.
    """
    stripped = line.strip()
    if stripped.startswith('#'):    return True  # Header
    if stripped.startswith('|'):    return True  # Table row (likely header/structural)
    if stripped.startswith('```'):  return True  # Code block
    if stripped.startswith('---'):  return True  # HR / separator
    if stripped.startswith('>'):    return True  # Blockquote
    return False


def calculate_evidence_grounding_score(tag_counts: TagCounts) -> float:
    """
    Calculate the Evidence Grounding score as a percentage.

    Formula (from quality-gate-algorithm.md, Dimension 1):
        HIGH = [Document-Backed] + [Form-Stated]
        LOW  = [Inferred] + [Assumption]
        UNTAGGED is estimated separately and treated as [Assumption]

        Evidence Grounding % = HIGH / (HIGH + LOW + UNTAGGED_ESTIMATE) × 100

    [Insufficient Evidence] tags are treated neutrally — they acknowledge a
    gap honestly, which is better than assumption but not high-confidence
    evidence. They are not counted in HIGH or LOW for this calculation.

    Returns a float between 0.0 and 100.0.
    If no tags are found at all, returns 0.0 (cannot assess — flag as Red).
    """
    high = tag_counts.high_confidence
    low  = tag_counts.low_confidence
    total = high + low

    if total == 0:
        return 0.0

    score = (high / total) * 100.0
    return round(score, 1)


def _calculate_completeness_score(
    sections: list[SectionResult],
    self_assessment_present: bool,
    skill: str,
) -> float:
    """
    Calculate the Completeness dimension score from section presence.

    Scoring:
        - Present: 100 points for that section
        - Missing: 0 points for that section
        - Critical section missing: additional -10% penalty on final score
        - Self-Assessment block missing: -5% penalty

    Returns a float between 0.0 and 100.0.
    """
    if not sections:
        return 0.0

    total_sections = len(sections)
    found_count = sum(1 for s in sections if s.found)
    base_score = (found_count / total_sections) * 100.0

    # Penalty for missing critical sections
    critical_missing = sum(
        1 for s in sections if s.is_critical and not s.found
    )
    critical_penalty = critical_missing * 10.0

    # Penalty for missing self-assessment block
    sa_penalty = 5.0 if not self_assessment_present else 0.0

    score = max(0.0, base_score - critical_penalty - sa_penalty)
    return round(score, 1)


def _calculate_hallucination_risk_score(
    phantom_citations: list[PhantomCitation],
    false_precision_flags: list[FalsePrecisionFlag],
    known_documents_provided: bool,
) -> float:
    """
    Estimate the Hallucination Risk dimension score.

    Scoring logic (from quality-gate-algorithm.md, Dimension 5):
        - Start at 95% (assumes no hallucination until proven otherwise)
        - Each phantom citation: -10% (Tier 1 hard hallucination risk)
        - Each false precision flag: -5% (Tier 2 soft hallucination)
        - If no document list was provided: phantom citations downgraded to
          -3% each (unverifiable, not confirmed phantoms)
        - Floor: 0%

    Returns a float between 0.0 and 100.0.
    """
    score = 95.0

    phantom_penalty = 10.0 if known_documents_provided else 3.0
    for _ in phantom_citations:
        score -= phantom_penalty

    for _ in false_precision_flags:
        score -= 5.0

    return round(max(0.0, score), 1)


def _estimate_untagged_claims(text: str, tag_counts: TagCounts) -> int:
    """
    Rough estimate of untagged claims by counting sentences/assertions that
    lack any confidence tag in their vicinity.

    Strategy:
        1. Split into sentences ending with . ! ?
        2. For each sentence, check if any confidence tag appears within a
           20-character window around a numeric or assertive keyword
        3. If an assertive sentence has no nearby tag, count it

    This is a heuristic — it will over- and under-count. Its purpose is to
    flag outputs that have very few tags relative to their content volume,
    not to produce a precise count.
    """
    # Remove the Quality Self-Assessment block to avoid counting it
    clean = re.sub(
        r'##\s+Quality\s+Self.?Assessment.*$', '', text,
        flags=re.IGNORECASE | re.DOTALL
    )

    # Count sentences that contain assertive language (is, are, has, have, will, can)
    # but no confidence tag on the same line
    assertive_pattern = re.compile(
        r'(?:^|\.\s+|\!\s+|\?\s+)'
        r'(?:[A-Z][^.!?]*?)'
        r'(?:\bis\b|\bare\b|\bhas\b|\bhave\b|\bwill\b|\bcan\b|\bshows\b|\bindicates\b)'
        r'[^.!?]*[.!?]',
        re.MULTILINE
    )
    tag_pattern = re.compile(
        r'\[(?:Document-Backed|Form-Stated|Inferred|Assumption|Insufficient\s+Evidence)\]',
        re.IGNORECASE
    )

    untagged = 0
    for match in assertive_pattern.finditer(clean):
        sentence = match.group(0)
        if not tag_pattern.search(sentence):
            # Check surrounding context (±200 chars)
            start = max(0, match.start() - 200)
            end   = min(len(clean), match.end() + 200)
            context = clean[start:end]
            if not tag_pattern.search(context):
                untagged += 1

    return untagged


def generate_report(results: ValidationResults) -> str:
    """
    Generate a formatted, color-coded validation report string for stdout.

    The report covers:
        1. Header with file, skill, gate, and timestamp
        2. Tag count summary
        3. Section presence check
        4. Hallucination red flags (phantoms + false precision)
        5. Quality Self-Assessment block check
        6. Dimension score estimates
        7. Estimated Confidence Score with band
        8. Gate decision
        9. Remediation action summary (if not Green)
    """
    lines: list[str] = []
    sep = colorize("─" * 70, Color.DIM)

    # ── HEADER ──────────────────────────────────────────────────────────────
    lines.append("")
    lines.append(sep)
    lines.append(bold(colorize("  AI VALUE BLUEPRINT — DATA CONTRACT VALIDATOR", Color.CYAN)))
    lines.append(sep)
    lines.append(f"  {bold('File:')}      {results.output_file}")
    lines.append(f"  {bold('Skill:')}     {results.skill.upper()}")
    lines.append(f"  {bold('Gate:')}      {GATE_LABELS.get(results.skill, 'Unknown')}")
    lines.append(f"  {bold('Run at:')}    {results.timestamp}")
    lines.append(sep)

    # ── CONFIDENCE TAG COUNTS ───────────────────────────────────────────────
    tc = results.tag_counts
    total_tagged = tc.total_tagged
    lines.append("")
    lines.append(bold("  CONFIDENCE TAG COUNTS"))
    lines.append("")
    lines.append(f"  {'[Document-Backed]':<22} {colorize(str(tc.document_backed), Color.GREEN)}")
    lines.append(f"  {'[Form-Stated]':<22} {colorize(str(tc.form_stated), Color.GREEN)}")
    lines.append(f"  {'[Inferred]':<22} {colorize(str(tc.inferred), Color.AMBER)}")
    lines.append(f"  {'[Assumption]':<22} {colorize(str(tc.assumption), Color.AMBER)}")
    lines.append(f"  {'[Insufficient Evidence]':<22} {colorize(str(tc.insufficient_evidence), Color.BLUE)}")
    lines.append(f"  {'Estimated Untagged':<22} {colorize(str(results.untagged_claim_estimate), Color.RED if results.untagged_claim_estimate > 3 else Color.AMBER)}")
    lines.append(f"  {'Total Tagged':<22} {total_tagged}")
    if total_tagged == 0:
        lines.append("")
        lines.append(colorize("  WARNING: Zero confidence tags found. Output may not follow tagging protocol.", Color.RED))

    # ── SECTION CHECKS ──────────────────────────────────────────────────────
    lines.append("")
    lines.append(bold("  REQUIRED SECTIONS"))
    lines.append("")
    missing_critical = []
    missing_non_critical = []
    for s in results.sections:
        status = colorize("  FOUND", Color.GREEN) if s.found else colorize("MISSING", Color.RED)
        critical_marker = colorize(" [CRITICAL]", Color.RED) if s.is_critical and not s.found else \
                          colorize(" [critical]", Color.DIM) if s.is_critical else ""
        lines.append(f"  {status}  {s.name}{critical_marker}")
        if not s.found:
            if s.is_critical:
                missing_critical.append(s.name)
            else:
                missing_non_critical.append(s.name)

    # Self-assessment block
    sa_status = colorize("  FOUND", Color.GREEN) if results.self_assessment_present else colorize("MISSING", Color.RED)
    lines.append(f"  {sa_status}  Quality Self-Assessment block {colorize('[REQUIRED]', Color.RED) if not results.self_assessment_present else ''}")

    # ── PHANTOM CITATIONS ───────────────────────────────────────────────────
    lines.append("")
    lines.append(bold("  PHANTOM CITATION CHECK"))
    lines.append("")
    if not results.phantom_citations:
        lines.append(colorize("  No phantom citations detected.", Color.GREEN))
    else:
        for pc in results.phantom_citations:
            lines.append(colorize(f"  FLAG  Line {pc.line_number}: {pc.raw_match}", Color.RED))
            lines.append(f"         {pc.reason}")

    # ── FALSE PRECISION FLAGS ───────────────────────────────────────────────
    lines.append("")
    lines.append(bold("  FALSE PRECISION FLAGS"))
    lines.append("")
    if not results.false_precision_flags:
        lines.append(colorize("  No false precision patterns detected.", Color.GREEN))
    else:
        for fp in results.false_precision_flags:
            lines.append(colorize(f"  FLAG  Line {fp.line_number}: \"{fp.match_text}\"", Color.AMBER))
            lines.append(f"         {fp.pattern_description}")

    # ── DIMENSION SCORES ─────────────────────────────────────────────────────
    lines.append("")
    lines.append(bold("  ESTIMATED DIMENSION SCORES"))
    lines.append("")

    def dim_line(name: str, weight: str, score: float, automated: bool) -> str:
        score_str = f"{score:.1f}%"
        auto_marker = "" if automated else colorize(" [manual default]", Color.DIM)
        color = _score_color(score)
        return (f"  {name:<28} Weight: {weight:<6}  Score: "
                f"{colorize(score_str, color)}{auto_marker}")

    lines.append(dim_line("Evidence Grounding",    "40%",  results.evidence_grounding_score,   True))
    lines.append(dim_line("Completeness",          "25%",  results.completeness_score,          True))
    lines.append(dim_line("Internal Consistency",  "15%",  results.internal_consistency_score,  False))
    lines.append(dim_line("Downstream Readiness",  "10%",  results.downstream_readiness_score,  False))
    lines.append(dim_line("Hallucination Risk",    "10%",  results.hallucination_risk_score,    True))
    lines.append("")
    lines.append(colorize(
        "  Note: Internal Consistency and Downstream Readiness require human review.",
        Color.DIM
    ))
    lines.append(colorize(
        "  Defaults set to 80% (neutral). Override in JSON before final gate submission.",
        Color.DIM
    ))

    # ── ESTIMATED CONFIDENCE SCORE ───────────────────────────────────────────
    lines.append("")
    lines.append(sep)
    score_display = f"  ESTIMATED CONFIDENCE SCORE: {results.estimated_confidence_score:.1f}% — {results.band}"
    lines.append(bold(colorize(score_display, results.band_color)))
    lines.append(sep)

    # ── GATE DECISION ────────────────────────────────────────────────────────
    lines.append("")
    decision_color = _decision_color(results.gate_decision)
    lines.append(bold(f"  GATE DECISION: {colorize(results.gate_decision, decision_color)}"))
    min_pass = MINIMUM_PASS.get(results.skill, 76.0)
    lines.append(f"  Minimum to proceed: {min_pass:.0f}% ({'Green 90%+' if min_pass >= 90 else 'Amber 76%+'})")

    # ── WARNINGS ────────────────────────────────────────────────────────────
    if results.warnings:
        lines.append("")
        lines.append(bold(colorize("  WARNINGS", Color.AMBER)))
        for w in results.warnings:
            lines.append(colorize(f"  ! {w}", Color.AMBER))

    # ── REMEDIATION SUMMARY ──────────────────────────────────────────────────
    if results.gate_decision not in ("PASS",):
        lines.append("")
        lines.append(bold("  REMEDIATION PRIORITIES"))
        lines.append("")
        actions = _build_remediation_actions(results)
        for i, (priority, action, dimension) in enumerate(actions, start=1):
            p_color = Color.RED if priority == "HIGH" else Color.AMBER
            lines.append(f"  {i}. [{colorize(priority, p_color)}] {action}")
            lines.append(f"       Dimension: {dimension}")

    lines.append("")
    lines.append(sep)
    lines.append("")

    return "\n".join(lines)


def _score_color(score: float) -> str:
    if score >= 90:  return Color.GREEN
    if score >= 76:  return Color.AMBER
    if score >= 60:  return Color.BLUE
    return Color.RED


def _decision_color(decision: str) -> str:
    mapping = {
        "PASS":                   Color.GREEN,
        "PASS WITH REVIEW":       Color.AMBER,
        "REMEDIATE AND RE-GATE":  Color.BLUE,
        "FAIL":                   Color.RED,
    }
    return mapping.get(decision, Color.WHITE)


def _build_remediation_actions(
    results: ValidationResults,
) -> list[tuple[str, str, str]]:
    """
    Build a prioritized list of (priority, action, dimension) tuples.
    Used in the remediation section of the report.
    """
    actions: list[tuple[str, str, str]] = []

    # Evidence Grounding
    if results.evidence_grounding_score < 76:
        actions.append((
            "HIGH",
            "Add [Document-Backed] or [Form-Stated] tags to claims currently untagged or tagged [Assumption]/[Inferred]",
            "Evidence Grounding (40%)"
        ))
    if results.untagged_claim_estimate > 3:
        actions.append((
            "HIGH",
            f"Scan and tag ~{results.untagged_claim_estimate} estimated untagged claims — untagged counts as [Assumption] in scoring",
            "Evidence Grounding (40%)"
        ))

    # Completeness
    missing_crit = [s.name for s in results.sections if s.is_critical and not s.found]
    for sec in missing_crit:
        actions.append((
            "HIGH",
            f"Add missing critical section: '{sec}'",
            "Completeness (25%)"
        ))
    missing_non = [s.name for s in results.sections if not s.is_critical and not s.found]
    for sec in missing_non:
        actions.append((
            "MEDIUM",
            f"Add missing section: '{sec}'",
            "Completeness (25%)"
        ))
    if not results.self_assessment_present:
        actions.append((
            "HIGH",
            "Add Quality Self-Assessment block (required by pipeline SOP)",
            "Completeness (25%)"
        ))

    # Hallucination Risk
    for pc in results.phantom_citations:
        actions.append((
            "HIGH",
            f"Resolve phantom citation at line {pc.line_number}: '{pc.cited_name}' — verify or remove",
            "Hallucination Risk (10%)"
        ))
    if len(results.false_precision_flags) > 0:
        actions.append((
            "MEDIUM",
            f"Review {len(results.false_precision_flags)} false precision flag(s) — confirm each has source-level precision",
            "Hallucination Risk (10%)"
        ))

    # Internal Consistency — reminder to review
    actions.append((
        "MEDIUM",
        "Perform manual Internal Consistency check: verify scores, names, numbers match upstream",
        "Internal Consistency (15%) — manual"
    ))
    actions.append((
        "MEDIUM",
        "Perform manual Downstream Readiness check: verify data contract requirements are met",
        "Downstream Readiness (10%) — manual"
    ))

    return actions


# ---------------------------------------------------------------------------
# CONFIDENCE SCORE CALCULATION
# ---------------------------------------------------------------------------

def calculate_confidence_score(results: ValidationResults) -> tuple[float, str, str]:
    """
    Calculate the weighted Confidence Score from the 5 dimensions.

    Formula (quality-gate-algorithm.md):
        Score = (EG × 0.40) + (Comp × 0.25) + (IC × 0.15)
              + (DR × 0.10) + (HR × 0.10)

    Returns (score_float, band_label, band_color).
    """
    score = (
        results.evidence_grounding_score   * 0.40 +
        results.completeness_score          * 0.25 +
        results.internal_consistency_score  * 0.15 +
        results.downstream_readiness_score  * 0.10 +
        results.hallucination_risk_score    * 0.10
    )
    score = round(score, 1)

    if score >= 90:
        return score, "GREEN — High Confidence",          Color.GREEN
    elif score >= 76:
        return score, "AMBER — Needs Review",             Color.AMBER
    elif score >= 60:
        return score, "BLUE — Requires Strict Evaluation", Color.BLUE
    else:
        return score, "RED — Significant Concern",        Color.RED


def _gate_decision_from_score(score: float, skill: str) -> str:
    min_pass = MINIMUM_PASS.get(skill, 76.0)
    if score >= 90:
        return "PASS"
    elif score >= min_pass:
        return "PASS WITH REVIEW"
    elif score >= 60:
        return "REMEDIATE AND RE-GATE"
    else:
        return "FAIL"


# ---------------------------------------------------------------------------
# MAIN VALIDATION ORCHESTRATOR
# ---------------------------------------------------------------------------

def validate(
    skill: str,
    output_path: str,
    known_documents: Optional[list[str]] = None,
) -> ValidationResults:
    """
    Run the full data contract validation against an output file.

    Parameters
    ----------
    skill : str
        One of: intake, maturity, opportunities, roadmap, assembly
    output_path : str
        Absolute or relative path to the skill's markdown output file
    known_documents : list[str] | None
        List of actual document filenames provided by the client.
        If None, phantom citation check runs in "unverifiable" mode.

    Returns
    -------
    ValidationResults
        Fully populated results dataclass ready for report generation
        and JSON serialisation.
    """
    path = Path(output_path)
    if not path.exists():
        print(colorize(f"ERROR: File not found: {output_path}", Color.RED), file=sys.stderr)
        sys.exit(1)

    text = path.read_text(encoding="utf-8", errors="replace")

    results = ValidationResults(
        skill=skill,
        output_file=str(path.resolve()),
        timestamp=datetime.now().isoformat(timespec="seconds"),
    )

    # 1. Count confidence tags
    results.tag_counts = count_confidence_tags(text)

    # 2. Estimate untagged claims
    results.untagged_claim_estimate = _estimate_untagged_claims(text, results.tag_counts)

    # 3. Check required sections
    required = REQUIRED_SECTIONS.get(skill, [])
    critical = CRITICAL_SECTIONS.get(skill, [])
    section_found = find_sections(text, required)
    for sec_name, found in section_found.items():
        results.sections.append(SectionResult(
            name=sec_name,
            found=found,
            is_critical=(sec_name in critical),
        ))

    # 4. Check for Quality Self-Assessment block
    results.self_assessment_present = bool(SELF_ASSESSMENT_PATTERN.search(text))

    # 5. Phantom citation check
    results.phantom_citations = check_phantom_citations(text, known_documents)

    # 6. False precision check
    results.false_precision_flags = detect_false_precision(text)

    # 7. Calculate Evidence Grounding score
    results.evidence_grounding_score = calculate_evidence_grounding_score(results.tag_counts)

    # 8. Calculate Completeness score
    results.completeness_score = _calculate_completeness_score(
        results.sections, results.self_assessment_present, skill
    )

    # 9. Calculate Hallucination Risk score
    results.hallucination_risk_score = _calculate_hallucination_risk_score(
        results.phantom_citations,
        results.false_precision_flags,
        known_documents_provided=bool(known_documents),
    )

    # 10. Confidence Score (IC and DR use neutral defaults)
    score, band, band_color = calculate_confidence_score(results)
    results.estimated_confidence_score = score
    results.band       = band
    results.band_color = band_color

    # 11. Gate decision
    results.gate_decision = _gate_decision_from_score(score, skill)

    # 12. Populate checks dict for JSON output
    results.checks = {
        "all_required_sections_present":
            all(s.found for s in results.sections),
        "self_assessment_block_present":
            results.self_assessment_present,
        "no_phantom_citations":
            len(results.phantom_citations) == 0,
        "no_false_precision_flags":
            len(results.false_precision_flags) == 0,
        "confidence_tags_present":
            results.tag_counts.total_tagged > 0,
        "evidence_grounding_gte_76pct":
            results.evidence_grounding_score >= 76.0,
        "completeness_gte_76pct":
            results.completeness_score >= 76.0,
        "estimated_score_passes_minimum":
            results.estimated_confidence_score >= MINIMUM_PASS.get(skill, 76.0),
    }

    # 13. Collect warnings
    if results.tag_counts.total_tagged == 0:
        results.warnings.append("No confidence tags found — output may not follow tagging protocol.")
    if results.untagged_claim_estimate > 10:
        results.warnings.append(
            f"High untagged claim estimate ({results.untagged_claim_estimate}). "
            "Review output carefully — untagged claims score as [Assumption]."
        )
    if results.tag_counts.document_backed == 0 and results.tag_counts.form_stated == 0:
        results.warnings.append("Zero high-confidence tags ([Document-Backed] + [Form-Stated] = 0). Evidence Grounding will score Red.")
    if skill == "assembly" and results.estimated_confidence_score < 90:
        results.warnings.append("Assembly output must reach Green (90%+) for QG-FINAL. Current estimate is below threshold.")

    return results


# ---------------------------------------------------------------------------
# JSON SERIALISATION
# ---------------------------------------------------------------------------

def _results_to_dict(results: ValidationResults) -> dict:
    """Serialise ValidationResults to a JSON-compatible dict."""
    return {
        "metadata": {
            "tool":      "validate_data_contract.py",
            "version":   "1.0",
            "timestamp": results.timestamp,
            "skill":     results.skill,
            "gate":      GATE_LABELS.get(results.skill, ""),
            "file":      results.output_file,
        },
        "tag_counts": {
            "document_backed":       results.tag_counts.document_backed,
            "form_stated":           results.tag_counts.form_stated,
            "inferred":              results.tag_counts.inferred,
            "assumption":            results.tag_counts.assumption,
            "insufficient_evidence": results.tag_counts.insufficient_evidence,
            "high_confidence_total": results.tag_counts.high_confidence,
            "low_confidence_total":  results.tag_counts.low_confidence,
            "total_tagged":          results.tag_counts.total_tagged,
            "estimated_untagged":    results.untagged_claim_estimate,
        },
        "sections": [
            {
                "name":        s.name,
                "found":       s.found,
                "is_critical": s.is_critical,
            }
            for s in results.sections
        ],
        "self_assessment_present": results.self_assessment_present,
        "phantom_citations": [
            {
                "cited_name":  pc.cited_name,
                "raw_match":   pc.raw_match,
                "line_number": pc.line_number,
                "reason":      pc.reason,
            }
            for pc in results.phantom_citations
        ],
        "false_precision_flags": [
            {
                "match_text":           fp.match_text,
                "pattern_description":  fp.pattern_description,
                "line_number":          fp.line_number,
            }
            for fp in results.false_precision_flags
        ],
        "dimension_scores": {
            "evidence_grounding":    results.evidence_grounding_score,
            "completeness":          results.completeness_score,
            "internal_consistency":  results.internal_consistency_score,
            "downstream_readiness":  results.downstream_readiness_score,
            "hallucination_risk":    results.hallucination_risk_score,
        },
        "dimension_notes": {
            "internal_consistency":  "Manual default (80%). Human reviewer must assess and override.",
            "downstream_readiness":  "Manual default (80%). Human reviewer must assess and override.",
        },
        "estimated_confidence_score": results.estimated_confidence_score,
        "band":         results.band,
        "gate_decision": results.gate_decision,
        "minimum_pass":  MINIMUM_PASS.get(results.skill, 76.0),
        "checks":        results.checks,
        "warnings":      results.warnings,
    }


def save_json_report(results: ValidationResults, output_path: str) -> str:
    """
    Save the validation results as a JSON file alongside the input file.

    Output filename: <input_stem>.validation.json
    Returns the path to the saved JSON file.
    """
    input_path = Path(output_path)
    json_path  = input_path.parent / (input_path.stem + ".validation.json")

    data = _results_to_dict(results)
    json_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )
    return str(json_path)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="validate_data_contract.py",
        description=(
            "AI Value Blueprint — Data Contract Validator\n"
            "Validates a skill output file against pipeline quality requirements.\n\n"
            "AI Assist BG | Blueprint Pipeline v1.0"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python validate_data_contract.py --skill intake --output intake_output.md\n"
            "  python validate_data_contract.py --skill maturity --output maturity_output.md \\\n"
            "      --documents 'Financial Report 2025.pdf,Org Chart.xlsx'\n"
        )
    )
    parser.add_argument(
        "--skill",
        required=True,
        choices=list(REQUIRED_SECTIONS.keys()),
        help="The Blueprint skill that produced the output file",
    )
    parser.add_argument(
        "--output",
        required=True,
        metavar="PATH",
        help="Path to the skill's markdown output file to validate",
    )
    parser.add_argument(
        "--documents",
        metavar="DOC1,DOC2,...",
        default=None,
        help=(
            "Comma-separated list of actual document filenames provided by the client. "
            "Used to cross-check phantom citations. If omitted, citations are flagged "
            "as unverifiable rather than confirmed phantoms."
        ),
    )
    parser.add_argument(
        "--no-color",
        action="store_true",
        default=False,
        help="Disable ANSI color codes in stdout output (useful for log files)",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        default=False,
        help="Skip stdout report; only write the JSON validation file",
    )
    return parser.parse_args()


def _strip_ansi(text: str) -> str:
    """Remove ANSI escape codes from a string (for --no-color mode)."""
    return re.sub(r'\033\[[0-9;]*m', '', text)


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    args = _parse_args()

    # Parse document list
    known_docs: Optional[list[str]] = None
    if args.documents:
        known_docs = [d.strip() for d in args.documents.split(",") if d.strip()]

    # Run validation
    results = validate(
        skill=args.skill,
        output_path=args.output,
        known_documents=known_docs,
    )

    # Save JSON report
    json_path = save_json_report(results, args.output)

    if not args.json_only:
        # Generate and print the human-readable report
        report = generate_report(results)
        if args.no_color:
            report = _strip_ansi(report)
        print(report)

    # Print JSON save location
    if not args.json_only:
        print(colorize(f"  JSON report saved: {json_path}", Color.DIM) if not args.no_color
              else f"  JSON report saved: {json_path}")
        print()

    # Exit with non-zero code if gate fails (useful for CI/scripting)
    if results.gate_decision == "FAIL":
        sys.exit(2)
    elif results.gate_decision == "REMEDIATE AND RE-GATE":
        sys.exit(1)
    else:
        sys.exit(0)
