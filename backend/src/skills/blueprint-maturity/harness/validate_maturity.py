#!/usr/bin/env python3
"""
Blueprint Maturity Output Validation Harness
============================================
Validates an AI Readiness Snapshot against the v9 Confidence-Propagation Contract.

Enforces:
  - check_confidence_annotation() (AC4 / 2A): every dimension whose rationale uses
    [Inferred] or [Assumption] tags must carry a confidence annotation on its level
    label, and the level itself must not have changed.
  - check_propagation_field() (AC5 / 2B): the [CONFIDENCE_PROPAGATION] block must
    be present, contain all 6 dimensions with valid grounding values, and be properly
    closed — so Stages 3-5 can consume it.

Usage:
    python validate_maturity.py <path_to_snapshot.md>
    python validate_maturity.py <path_to_snapshot.md> --json

Exit codes:
    0 — PASS
    1 — FAIL (contract violation; see report)
    2 — ERROR (file unreadable or usage error)
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

# ============================================================================
# Constants
# ============================================================================

DIMENSIONS = ["Strategy", "Data", "Technology", "People", "Processes", "Governance"]
VALID_LEVELS = {"Early", "Developing", "Established"}
VALID_GROUNDING = {"High", "Partial", "Low"}

# ============================================================================
# Compiled patterns
# ============================================================================

# Dimension rationale header — matches both annotated and plain forms:
#   **Strategy: Developing**
#   **Strategy: Developing *(score rests partly on inferred claims)*
# Captures everything after the level to end-of-line as `rest`.
DIMENSION_HEADER_RE = re.compile(
    r"^\*\*(?P<dim>" + "|".join(DIMENSIONS) + r")\s*:\s*"
    r"(?P<level>Early|Developing|Established)"
    r"(?P<rest>[^\n]*)",
    re.IGNORECASE | re.MULTILINE,
)

# Confidence annotation — a parenthetical italic note after the level.
# Accepts both *(text)* and plain (text containing confidence-related words).
CONFIDENCE_ANNOTATION_RE = re.compile(
    r"\*\([^)]+\)\*"                             # *(any text)*
    r"|"
    r"\([^)]*(?:inferred|confidence|partly|partial|low.grounding)[^)]*\)",
    re.IGNORECASE,
)

# Any [Inferred] or [Assumption] tag
LC_TAG_RE = re.compile(r"\[(Inferred|Assumption)")

# Dimension Rationales section — from its heading to the next ### heading
RATIONALE_SECTION_RE = re.compile(
    r"###\s+Dimension Rationales\s*\n(.*?)(?=###|\Z)",
    re.DOTALL,
)

# [CONFIDENCE_PROPAGATION] block
PROP_BLOCK_START_RE = re.compile(r"^##\s+\[CONFIDENCE_PROPAGATION\]", re.MULTILINE)
PROP_BLOCK_END_STR = "[END CONFIDENCE_PROPAGATION]"

# Dimension row in propagation table:
#   | Strategy | Developing | Partial | optional notes |
PROP_DIM_ROW_RE = re.compile(
    r"^\|\s*(?P<dim>" + "|".join(DIMENSIONS) + r")\s*\|"
    r"\s*(?P<level>Early|Developing|Established)\s*\|"
    r"\s*(?P<grounding>[^|]+?)\s*\|",
    re.MULTILINE | re.IGNORECASE,
)

OVERALL_GROUNDING_RE = re.compile(r"^Overall grounding:\s*.+", re.MULTILINE)

# [JUSTIFICATION] block
JUSTIFICATION_RE = re.compile(r"^##\s+\[?JUSTIFICATION\]?", re.MULTILINE)

# Readiness Scorecard section
SCORECARD_RE = re.compile(
    r"###\s+Readiness Scorecard\s*\n(.*?)(?=###|\Z)",
    re.DOTALL,
)

# Forbidden pre-flight patterns
FORBIDDEN_PATTERNS = [
    (re.compile(r"\bTEST[\s_]?\d+\b", re.IGNORECASE), "TEST/temp metadata in heading"),
    (re.compile(r"\bDEBUG\b"), "DEBUG marker"),
    (re.compile(r"^I have confirmed receipt", re.IGNORECASE | re.MULTILINE), "Pipeline preamble leak"),
    (re.compile(r"\bthis skill produces\b", re.IGNORECASE), "Internal methodology meta-reference"),
    (re.compile(r"\bper the methodology\b", re.IGNORECASE), "Internal methodology meta-reference"),
    (re.compile(r"\[Doc-Backed[\s\]—]"), "Malformed tag [Doc-Backed]"),
    (re.compile(r"\[Form Stated[\s\]—]"), "Malformed tag [Form Stated] — missing hyphen"),
]

# ============================================================================
# Data model
# ============================================================================

@dataclass
class ValidationIssue:
    severity: str  # "FAIL" or "WARN"
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

    def add_fail(self, rule: str, location: str, message: str) -> None:
        self.issues.append(ValidationIssue("FAIL", rule, location, message))

    def add_warn(self, rule: str, location: str, message: str) -> None:
        self.issues.append(ValidationIssue("WARN", rule, location, message))

    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "fail_count": sum(1 for i in self.issues if i.severity == "FAIL"),
            "warn_count": sum(1 for i in self.issues if i.severity == "WARN"),
            "issues": [
                {
                    "severity": i.severity,
                    "rule": i.rule,
                    "location": i.location,
                    "message": i.message,
                }
                for i in self.issues
            ],
            "metrics": self.metrics,
        }


# ============================================================================
# Checks
# ============================================================================

def check_pre_flight(text: str, report: ValidationReport) -> None:
    """Forbidden patterns that disqualify output from pipeline use."""
    for pattern, description in FORBIDDEN_PATTERNS:
        m = pattern.search(text)
        if m:
            report.add_fail(
                "forbidden_pattern",
                "Pre-flight",
                f"{description}: '{m.group(0)}' detected.",
            )


def check_required_structure(text: str, report: ValidationReport) -> None:
    """Core sections of the AI Readiness Snapshot must be present."""
    required = [
        ("### Readiness Scorecard", "Readiness Scorecard"),
        ("### Dimension Rationales", "Dimension Rationales"),
        ("### Overall Pattern", "Overall Pattern"),
        ("### Key Constraints for AI Adoption", "Key Constraints for AI Adoption"),
    ]
    for marker, name in required:
        if marker not in text:
            report.add_fail(
                "missing_section",
                name,
                f"Required section '{name}' not found in snapshot output.",
            )


def check_scorecard_dimensions(text: str, report: ValidationReport) -> None:
    """All 6 dimensions must appear in the Readiness Scorecard table."""
    m = SCORECARD_RE.search(text)
    if not m:
        return
    scorecard = m.group(1)
    for dim in DIMENSIONS:
        if dim not in scorecard:
            report.add_fail(
                "scorecard_missing_dimension",
                "Readiness Scorecard",
                f"Dimension '{dim}' not found in scorecard table.",
            )


def _extract_dimension_chunks(text: str) -> dict:
    """Parse the Dimension Rationales section into per-dimension chunks.

    Returns {dim: {"level": str, "rest": str, "text": str}} where:
      - level  = the assigned maturity level
      - rest   = everything on the header line after the level (annotation lives here)
      - text   = the rationale body text following the header
    """
    m = RATIONALE_SECTION_RE.search(text)
    if not m:
        return {}
    rationale_body = m.group(1)
    headers = list(DIMENSION_HEADER_RE.finditer(rationale_body))
    chunks = {}
    for i, hm in enumerate(headers):
        dim = hm.group("dim").capitalize()
        level = hm.group("level").capitalize()
        rest = hm.group("rest").strip()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(rationale_body)
        body = rationale_body[hm.end():end]
        chunks[dim] = {"level": level, "rest": rest, "text": body}
    return chunks


def check_confidence_annotation(text: str, report: ValidationReport) -> None:
    """AC4 / 2A: Dimensions with [Inferred]/[Assumption] tags in their rationale
    must carry a confidence annotation on the level label. The level itself must
    remain one of Early / Developing / Established — annotation must not re-score.

    Cardinal regression trap: if a level value changes after 2A is applied, the
    annotation logic has bled into scoring. This check catches that.
    """
    chunks = _extract_dimension_chunks(text)

    if not chunks:
        report.add_warn(
            "rationale_not_parsed",
            "Dimension Rationales",
            "Could not parse any dimension rationale blocks. "
            "Ensure dimension headings follow: **{Dimension}: {Level}** "
            "on their own line.",
        )
        return

    annotated, missing_annotation, invalid_level = [], [], []

    for dim in DIMENSIONS:
        if dim not in chunks:
            report.add_fail(
                "dimension_rationale_missing",
                "Dimension Rationales",
                f"No rationale block found for '{dim}'. All 6 dimensions are required.",
            )
            continue

        data = chunks[dim]
        level = data["level"]

        # Cardinal regression trap — level must be a valid maturity level
        if level not in VALID_LEVELS:
            invalid_level.append(dim)
            report.add_fail(
                "annotation_bled_into_level",
                f"Dimension: {dim}",
                f"Level '{level}' is not one of Early / Developing / Established. "
                "The 2A annotation must append a note — it must not alter the assigned level. "
                "Revert and re-implement: the note goes in parentheses after the level, "
                "not as a replacement for it.",
            )

        has_lc = bool(LC_TAG_RE.search(data["text"]))
        has_annotation = bool(CONFIDENCE_ANNOTATION_RE.search(data["rest"]))

        if has_lc and not has_annotation:
            missing_annotation.append(dim)
            report.add_fail(
                "confidence_annotation_missing",
                f"Dimension: {dim}",
                f"'{dim}' rationale contains [Inferred] or [Assumption] tags but the level "
                f"label carries no confidence annotation. "
                f"Append a parenthetical italic note — e.g. "
                f"'**{dim}: {level} *(score rests partly on inferred claims)*'",
            )
        elif has_annotation:
            annotated.append(dim)

    report.metrics["dimensions_parsed"] = list(chunks.keys())
    report.metrics["dimensions_with_annotation"] = annotated
    report.metrics["dimensions_missing_annotation"] = missing_annotation
    report.metrics["dimensions_with_invalid_level"] = invalid_level


def check_propagation_field(text: str, report: ValidationReport) -> None:
    """AC5 / 2B: The [CONFIDENCE_PROPAGATION] block must be present, contain all
    6 dimensions with valid grounding values (High / Partial / Low), include an
    Overall grounding summary line, and be closed with [END CONFIDENCE_PROPAGATION].

    This block is the inter-stage contract: Stages 3-5 read it to understand which
    dimension scores carry inherited uncertainty from Stage 1 tagging.
    """
    prop_match = PROP_BLOCK_START_RE.search(text)

    if not prop_match:
        report.add_fail(
            "propagation_field_missing",
            "[CONFIDENCE_PROPAGATION]",
            "## [CONFIDENCE_PROPAGATION] block is absent. "
            "This mandatory field carries grounding signals to Stages 3-5. "
            "Add it after 'Key Constraints for AI Adoption' and before [JUSTIFICATION].",
        )
        return

    # Locate the block end
    block_start = prop_match.start()
    end_pos = text.find(PROP_BLOCK_END_STR, block_start)
    if end_pos == -1:
        report.add_fail(
            "propagation_field_unterminated",
            "[CONFIDENCE_PROPAGATION]",
            f"'{PROP_BLOCK_END_STR}' delimiter not found. The block must be explicitly closed.",
        )
        prop_text = text[block_start:]
    else:
        prop_text = text[block_start : end_pos + len(PROP_BLOCK_END_STR)]

    # All 6 dimensions must be present with valid grounding
    found = {}
    for m in PROP_DIM_ROW_RE.finditer(prop_text):
        dim = m.group("dim").capitalize()
        grounding = m.group("grounding").strip()
        found[dim] = grounding

    report.metrics["propagation_dimensions"] = found

    for dim in DIMENSIONS:
        if dim not in found:
            report.add_fail(
                "propagation_missing_dimension",
                "[CONFIDENCE_PROPAGATION]",
                f"Dimension '{dim}' not present in the propagation table. All 6 are required.",
            )
        else:
            grounding = found[dim]
            if grounding not in VALID_GROUNDING:
                report.add_fail(
                    "propagation_invalid_grounding",
                    f"[CONFIDENCE_PROPAGATION] — {dim}",
                    f"Grounding value '{grounding}' is not one of High / Partial / Low.",
                )

    # Overall grounding summary line
    if not OVERALL_GROUNDING_RE.search(prop_text):
        report.add_fail(
            "propagation_missing_overall_grounding",
            "[CONFIDENCE_PROPAGATION]",
            "Missing 'Overall grounding:' summary line. "
            "Stages 3-5 use this for portfolio-level confidence decisions.",
        )

    # Schema declaration (advisory)
    if "maturity_v1.0" not in prop_text:
        report.add_warn(
            "propagation_missing_schema",
            "[CONFIDENCE_PROPAGATION]",
            "Schema version 'maturity_v1.0' not declared in propagation block.",
        )


def check_justification_block(text: str, report: ValidationReport) -> None:
    """[JUSTIFICATION] block must be present at the end of the snapshot."""
    if not JUSTIFICATION_RE.search(text):
        report.add_fail(
            "justification_missing",
            "[JUSTIFICATION]",
            "Mandatory ## [JUSTIFICATION] block not found. "
            "Every [Inferred] and [Assumption] tag used in the snapshot "
            "must have a numbered entry here.",
        )


# ============================================================================
# Main validation entry point
# ============================================================================

def validate(path: Path) -> ValidationReport:
    report = ValidationReport()
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as e:
        report.add_fail("file_unreadable", str(path), f"Cannot read file: {e}")
        return report

    check_pre_flight(text, report)
    check_required_structure(text, report)
    check_scorecard_dimensions(text, report)
    check_confidence_annotation(text, report)   # AC4 / 2A
    check_propagation_field(text, report)        # AC5 / 2B
    check_justification_block(text, report)

    return report


def format_report(report: ValidationReport, path: Path) -> str:
    lines = [
        "=" * 70,
        "Blueprint Maturity Validation Report",
        "Schema: maturity_v1.0 | Contract: v9 Confidence-Propagation",
        f"File: {path}",
        "=" * 70,
        "",
    ]
    if report.passed:
        lines.append("RESULT: PASS — snapshot conforms to v9 confidence-propagation contract")
    else:
        fail_count = sum(1 for i in report.issues if i.severity == "FAIL")
        warn_count = sum(1 for i in report.issues if i.severity == "WARN")
        lines.append(f"RESULT: FAIL — {fail_count} failures, {warn_count} warnings")
    lines += ["", "Metrics:"]
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


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate a Blueprint Maturity snapshot against the v9 confidence-propagation contract"
    )
    parser.add_argument("file", help="Path to the AI Readiness Snapshot markdown file")
    parser.add_argument("--json", action="store_true", help="Machine-readable JSON output")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        print(f"ERROR: File not found: {path}", file=sys.stderr)
        sys.exit(2)

    report = validate(path)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        print(format_report(report, path))

    sys.exit(0 if report.passed else 1)


if __name__ == "__main__":
    main()
