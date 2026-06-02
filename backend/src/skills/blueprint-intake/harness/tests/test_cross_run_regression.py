#!/usr/bin/env python3
"""
Cross-Run Regression Test (QA-02)
===================================

Compares two dossier files produced from the same materials on separate runs and
verifies that the framework's determinism guarantees are met:

  1. Hypothesis titles match exactly (same 7, same titles, order may differ)
  2. Pain point titles match exactly (same 8, same titles, order may differ)
  3. Tag count variance is < 5% between runs
  4. Section A word count is within ±50 words between runs

Usage (manual / local):
    python test_cross_run_regression.py <dossier_run_a.md> <dossier_run_b.md>

Usage (CI fixture mode):
    python test_cross_run_regression.py fixtures/run_a.md fixtures/run_b.md

CI Notes:
    This test requires two pre-produced dossier files. It cannot generate them
    automatically without API access. For CI, commit representative fixture dossiers
    to tests/fixtures/ and uncomment the CI step in framework-ci.yml.
    Until fixtures exist, this test runs locally only — run it after each
    engagement where two runs were produced for comparison.

Exit codes:
    0 — All checks pass (framework determinism confirmed)
    1 — One or more checks failed (determinism violation — investigate before shipping)
    2 — Usage error or file not found
"""

import math
import re
import sys
from pathlib import Path

# ── CV thresholds (§4, v5.3 spec) ────────────────────────────────────────────
# CV = coefficient of variation for a two-sample comparison:
#      stdev / mean = (|a-b| / sqrt(2)) / ((a+b)/2)
# All thresholds are percentages.

TOTAL_TAG_CV_TARGET   = 3.0   # Aspirational quality goal; logged but not enforced
TOTAL_TAG_CV_FAIL     = 4.0   # CI build fails if exceeded
TOTAL_TAG_CV_TRIPWIRE = 5.0   # Escalation alert; investigate immediately

DB_CV_FAIL      = 3.0         # Document-Backed + Document-Backed+Form-Stated combined
FS_CV_FAIL      = 2.0         # Form-Stated only (excluding DB+FS)
LOWCONF_CV_FAIL = 8.0         # Inferred + Assumption combined

# ── Extraction helpers ───────────────────────────────────────────────────────

HYPOTHESIS_RE   = re.compile(r"^###\s+Hypothesis\s+\d+\s+—\s+(.+?)$", re.MULTILINE)
PAIN_POINT_RE   = re.compile(r"^###\s+Pain Point\s+\d+\s+—\s+(.+?)$", re.MULTILINE)
CITATION_TAG_RE = re.compile(r"\[(Document-Backed \+ Form-Stated|Document-Backed|Form-Stated|Inferred|Assumption)")
SECTION_A_RE    = re.compile(r"^## A\)\s+Executive Summary.*?(?=^## [A-Z]\))", re.MULTILINE | re.DOTALL)
# 1B: JUSTIFICATION item titles — matches both "**Item N — title**" and "Item N — title" forms
JUSTIFICATION_ITEM_RE = re.compile(r"^\*{0,2}Item\s+\d+\s+—\s+(.+?)\*{0,2}$", re.MULTILINE)

# Per-class patterns (order matters: DB+FS before DB to avoid partial-match double-count)
_DB_RE      = re.compile(r"\[Document-Backed(?:\s+\+\s+Form-Stated)?")  # DB + DB+FS
_FS_ONLY_RE = re.compile(r"\[Form-Stated")                              # pure Form-Stated
_LC_RE      = re.compile(r"\[(Inferred|Assumption)")                     # low-confidence


def extract_hypothesis_titles(text: str) -> list:
    return sorted(m.group(1).strip() for m in HYPOTHESIS_RE.finditer(text))


def extract_justification_item_titles(text: str) -> list:
    """1B: Extract JUSTIFICATION appendix item titles for cross-run tag-set stability check.

    Scopes to the [JUSTIFICATION] block so that hypothesis/pain-point headings with
    similar em-dash patterns in the dossier body are not accidentally matched.
    Returns a sorted list of item title strings (5-8 word labels).
    """
    just_match = re.search(r"^##\s+\[?JUSTIFICATION\]?", text, re.MULTILINE)
    if not just_match:
        return []
    just_text = text[just_match.start():]
    return sorted(m.group(1).strip() for m in JUSTIFICATION_ITEM_RE.finditer(just_text))


def extract_pain_point_titles(text: str) -> list:
    return sorted(m.group(1).strip() for m in PAIN_POINT_RE.finditer(text))


def count_tags(text: str) -> int:
    return len(CITATION_TAG_RE.findall(text))


def count_tags_by_class(text: str) -> dict:
    """Return per-class tag counts for CV decomposition."""
    return {
        "db":     len(_DB_RE.findall(text)),       # Document-Backed + Document-Backed+Form-Stated
        "fs":     len(_FS_ONLY_RE.findall(text)),  # Form-Stated only
        "lowconf": len(_LC_RE.findall(text)),       # Inferred + Assumption
    }


def section_a_word_count(text: str) -> int:
    m = SECTION_A_RE.search(text)
    if not m:
        return 0
    return len(m.group(0).split())


def _cv(a: int, b: int) -> float:
    """Two-sample coefficient of variation as a percentage."""
    mean = (a + b) / 2.0
    if mean == 0:
        return 0.0
    return (abs(a - b) / (math.sqrt(2) * mean)) * 100.0


# ── Comparison checks ────────────────────────────────────────────────────────

def check_hypotheses(a_titles: list, b_titles: list) -> list:
    failures = []
    if len(a_titles) != len(b_titles):
        failures.append(
            f"FAIL hypothesis_count: Run A has {len(a_titles)}, Run B has {len(b_titles)}"
        )
    only_in_a = set(a_titles) - set(b_titles)
    only_in_b = set(b_titles) - set(a_titles)
    if only_in_a:
        failures.append(f"FAIL hypothesis_titles: In A only: {sorted(only_in_a)}")
    if only_in_b:
        failures.append(f"FAIL hypothesis_titles: In B only: {sorted(only_in_b)}")
    return failures


def check_pain_points(a_titles: list, b_titles: list) -> list:
    failures = []
    if len(a_titles) != len(b_titles):
        failures.append(
            f"FAIL pain_point_count: Run A has {len(a_titles)}, Run B has {len(b_titles)}"
        )
    only_in_a = set(a_titles) - set(b_titles)
    only_in_b = set(b_titles) - set(a_titles)
    if only_in_a:
        failures.append(f"FAIL pain_point_titles: In A only: {sorted(only_in_a)}")
    if only_in_b:
        failures.append(f"FAIL pain_point_titles: In B only: {sorted(only_in_b)}")
    return failures


def check_tag_variance(
    a_total: int, b_total: int,
    a_classes: dict = None, b_classes: dict = None,
) -> list:
    """Check total and per-class CV against §4 thresholds."""
    failures = []
    if a_total == 0 and b_total == 0:
        return failures

    total_cv = _cv(a_total, b_total)
    if total_cv > TOTAL_TAG_CV_TRIPWIRE:
        failures.append(
            f"FAIL tag_count_variance: total CV={total_cv:.2f}% exceeds tripwire "
            f"{TOTAL_TAG_CV_TRIPWIRE:.0f}% (Run A={a_total}, Run B={b_total}). "
            f"Escalation required — investigate before shipping."
        )
    elif total_cv > TOTAL_TAG_CV_FAIL:
        failures.append(
            f"FAIL tag_count_variance: total CV={total_cv:.2f}% exceeds CI threshold "
            f"{TOTAL_TAG_CV_FAIL:.0f}% (Run A={a_total}, Run B={b_total}). "
            f"Target: <{TOTAL_TAG_CV_TARGET:.0f}%."
        )

    if a_classes and b_classes:
        db_cv = _cv(a_classes["db"], b_classes["db"])
        if db_cv > DB_CV_FAIL:
            failures.append(
                f"FAIL db_tag_variance: Document-Backed CV={db_cv:.2f}% exceeds "
                f"{DB_CV_FAIL:.0f}% (Run A={a_classes['db']}, Run B={b_classes['db']}). "
                "DB tags should be near-deterministic — check source citation consistency."
            )

        fs_cv = _cv(a_classes["fs"], b_classes["fs"])
        if fs_cv > FS_CV_FAIL:
            failures.append(
                f"FAIL fs_tag_variance: Form-Stated CV={fs_cv:.2f}% exceeds "
                f"{FS_CV_FAIL:.0f}% (Run A={a_classes['fs']}, Run B={b_classes['fs']}). "
                "Form-Stated tags should be near-deterministic."
            )

        lc_cv = _cv(a_classes["lowconf"], b_classes["lowconf"])
        if lc_cv > LOWCONF_CV_FAIL:
            failures.append(
                f"FAIL lowconf_tag_variance: Low-confidence CV={lc_cv:.2f}% exceeds "
                f"{LOWCONF_CV_FAIL:.0f}% (Run A={a_classes['lowconf']}, Run B={b_classes['lowconf']})."
            )

    return failures


def check_section_a_word_count(a_words: int, b_words: int, tolerance: int = 50) -> list:
    diff = abs(a_words - b_words)
    if diff > tolerance:
        return [
            f"FAIL section_a_word_count: Run A={a_words}, Run B={b_words}, "
            f"diff={diff} words (tolerance: ±{tolerance})"
        ]
    return []


def check_justification_item_stability(a_titles: list, b_titles: list) -> list:
    """1B (v9): The set of claims tagged [Inferred]/[Assumption] must be identical
    across runs — the grounding analog of the QA-02 selection-identity check.

    Tag count CV (existing check) catches drift in volume but misses 'same count,
    different claims' non-determinism. A JUSTIFICATION item title mismatch means
    different claims were designated low-confidence on each run, which non-
    deterministically promotes or demotes evidence quality at the Stage 2 boundary.
    """
    failures = []
    if len(a_titles) != len(b_titles):
        failures.append(
            f"FAIL justification_item_count: Run A has {len(a_titles)} items, "
            f"Run B has {len(b_titles)} — tag-set size is non-deterministic"
        )
    only_in_a = set(a_titles) - set(b_titles)
    only_in_b = set(b_titles) - set(a_titles)
    if only_in_a:
        failures.append(
            f"FAIL justification_item_stability: Tagged in A but not B "
            f"(claim dropped between runs): {sorted(only_in_a)}"
        )
    if only_in_b:
        failures.append(
            f"FAIL justification_item_stability: Tagged in B but not A "
            f"(claim added between runs): {sorted(only_in_b)}"
        )
    return failures


# ── Main ─────────────────────────────────────────────────────────────────────

def run_comparison(path_a: Path, path_b: Path) -> int:
    text_a = path_a.read_text(encoding="utf-8")
    text_b = path_b.read_text(encoding="utf-8")

    a_hyps    = extract_hypothesis_titles(text_a)
    b_hyps    = extract_hypothesis_titles(text_b)
    a_pps     = extract_pain_point_titles(text_a)
    b_pps     = extract_pain_point_titles(text_b)
    a_tags    = count_tags(text_a)
    b_tags    = count_tags(text_b)
    a_classes = count_tags_by_class(text_a)
    b_classes = count_tags_by_class(text_b)
    a_words   = section_a_word_count(text_a)
    b_words   = section_a_word_count(text_b)
    a_just    = extract_justification_item_titles(text_a)
    b_just    = extract_justification_item_titles(text_b)

    total_cv = _cv(a_tags, b_tags)
    print(f"Run A: {path_a.name}")
    print(f"  Hypotheses: {len(a_hyps)} | Pain Points: {len(a_pps)} | Tags: {a_tags} | Sec-A words: {a_words}")
    print(f"  DB={a_classes['db']} | FS={a_classes['fs']} | LC={a_classes['lowconf']} | JUST items: {len(a_just)}")
    print(f"Run B: {path_b.name}")
    print(f"  Hypotheses: {len(b_hyps)} | Pain Points: {len(b_pps)} | Tags: {b_tags} | Sec-A words: {b_words}")
    print(f"  DB={b_classes['db']} | FS={b_classes['fs']} | LC={b_classes['lowconf']} | JUST items: {len(b_just)}")
    print(f"Total tag CV: {total_cv:.2f}% (target <{TOTAL_TAG_CV_TARGET:.0f}%, fail >{TOTAL_TAG_CV_FAIL:.0f}%)")
    print()

    all_failures = []
    all_failures.extend(check_hypotheses(a_hyps, b_hyps))
    all_failures.extend(check_pain_points(a_pps, b_pps))
    all_failures.extend(check_tag_variance(a_tags, b_tags, a_classes, b_classes))
    all_failures.extend(check_section_a_word_count(a_words, b_words))
    all_failures.extend(check_justification_item_stability(a_just, b_just))  # 1B

    if all_failures:
        print("CROSS-RUN REGRESSION: FAIL")
        for f in all_failures:
            print(f"  {f}")
        print()
        print("Determinism violation — investigate before shipping this framework version.")
        print("Common causes:")
        print("  - hypothesis_titles: scoring algorithm not fully deterministic (see FW-01)")
        print("  - pain_point_titles: tie-breaking rule not applied (see pain_point_selection.md)")
        print("  - db_tag_variance: source citation choices differ between runs (primary V5 driver)")
        print("  - lowconf_tag_variance: reasoning chain depth inconsistent between runs")
        print("  - justification_item_stability: different claims tagged [Inferred]/[Assumption] across runs (1B)")
        print("  - section_a_word_count: word count ceiling not enforced consistently")
        return 1

    print("CROSS-RUN REGRESSION: PASS")
    print(f"  Hypotheses: identical ({len(a_hyps)} / {len(a_hyps)})")
    print(f"  Pain Points: identical ({len(a_pps)} / {len(a_pps)})")
    print(f"  Justification items: identical ({len(a_just)} / {len(a_just)})")
    print(f"  Total tag CV: {total_cv:.2f}% (target <{TOTAL_TAG_CV_TARGET:.0f}%, fail >{TOTAL_TAG_CV_FAIL:.0f}%)")
    word_diff = abs(a_words - b_words)
    print(f"  Section A word diff: {word_diff} words (tolerance: ±50)")
    return 0


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python test_cross_run_regression.py <dossier_run_a.md> <dossier_run_b.md>")
        sys.exit(2)

    path_a = Path(sys.argv[1])
    path_b = Path(sys.argv[2])

    for p in (path_a, path_b):
        if not p.exists():
            print(f"ERROR: File not found: {p}", file=sys.stderr)
            sys.exit(2)

    sys.exit(run_comparison(path_a, path_b))


if __name__ == "__main__":
    main()
