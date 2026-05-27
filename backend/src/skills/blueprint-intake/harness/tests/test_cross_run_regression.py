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

import re
import sys
from pathlib import Path

# ── Extraction helpers ───────────────────────────────────────────────────────

HYPOTHESIS_RE = re.compile(r"^###\s+Hypothesis\s+\d+\s+—\s+(.+?)$", re.MULTILINE)
PAIN_POINT_RE = re.compile(r"^###\s+Pain Point\s+\d+\s+—\s+(.+?)$", re.MULTILINE)
CITATION_TAG_RE = re.compile(r"\[(Document-Backed|Form-Stated|Document-Backed \+ Form-Stated|Inferred|Assumption)")
SECTION_A_RE = re.compile(r"^## A\)\s+Executive Summary.*?(?=^## [A-Z]\))", re.MULTILINE | re.DOTALL)


def extract_hypothesis_titles(text: str) -> list[str]:
    return sorted(m.group(1).strip() for m in HYPOTHESIS_RE.finditer(text))


def extract_pain_point_titles(text: str) -> list[str]:
    return sorted(m.group(1).strip() for m in PAIN_POINT_RE.finditer(text))


def count_tags(text: str) -> int:
    return len(CITATION_TAG_RE.findall(text))


def section_a_word_count(text: str) -> int:
    m = SECTION_A_RE.search(text)
    if not m:
        return 0
    return len(m.group(0).split())


# ── Comparison checks ────────────────────────────────────────────────────────

def check_hypotheses(a_titles: list[str], b_titles: list[str]) -> list[str]:
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


def check_pain_points(a_titles: list[str], b_titles: list[str]) -> list[str]:
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


def check_tag_variance(a_count: int, b_count: int, threshold: float = 0.05) -> list[str]:
    if a_count == 0 and b_count == 0:
        return []
    baseline = max(a_count, b_count)
    variance = abs(a_count - b_count) / baseline
    if variance > threshold:
        return [
            f"FAIL tag_count_variance: Run A={a_count}, Run B={b_count}, "
            f"variance={variance:.1%} (threshold: {threshold:.0%})"
        ]
    return []


def check_section_a_word_count(a_words: int, b_words: int, tolerance: int = 50) -> list[str]:
    diff = abs(a_words - b_words)
    if diff > tolerance:
        return [
            f"FAIL section_a_word_count: Run A={a_words}, Run B={b_words}, "
            f"diff={diff} words (tolerance: ±{tolerance})"
        ]
    return []


# ── Main ─────────────────────────────────────────────────────────────────────

def run_comparison(path_a: Path, path_b: Path) -> int:
    text_a = path_a.read_text(encoding="utf-8")
    text_b = path_b.read_text(encoding="utf-8")

    a_hyps = extract_hypothesis_titles(text_a)
    b_hyps = extract_hypothesis_titles(text_b)
    a_pps = extract_pain_point_titles(text_a)
    b_pps = extract_pain_point_titles(text_b)
    a_tags = count_tags(text_a)
    b_tags = count_tags(text_b)
    a_words = section_a_word_count(text_a)
    b_words = section_a_word_count(text_b)

    print(f"Run A: {path_a.name}")
    print(f"  Hypotheses: {len(a_hyps)} | Pain Points: {len(a_pps)} | Tags: {a_tags} | Sec-A words: {a_words}")
    print(f"Run B: {path_b.name}")
    print(f"  Hypotheses: {len(b_hyps)} | Pain Points: {len(b_pps)} | Tags: {b_tags} | Sec-A words: {b_words}")
    print()

    all_failures: list[str] = []
    all_failures.extend(check_hypotheses(a_hyps, b_hyps))
    all_failures.extend(check_pain_points(a_pps, b_pps))
    all_failures.extend(check_tag_variance(a_tags, b_tags))
    all_failures.extend(check_section_a_word_count(a_words, b_words))

    if all_failures:
        print("CROSS-RUN REGRESSION: FAIL")
        for f in all_failures:
            print(f"  {f}")
        print()
        print("Determinism violation — investigate before shipping this framework version.")
        print("Common causes:")
        print("  - hypothesis_titles: scoring algorithm not fully deterministic (see FW-01)")
        print("  - pain_point_titles: tie-breaking rule not applied (see pain_point_selection.md)")
        print("  - tag_count_variance: prompt temperature or model snapshot changed")
        print("  - section_a_word_count: word count ceiling not enforced consistently")
        return 1

    print("CROSS-RUN REGRESSION: PASS")
    print(f"  Hypotheses: identical ({len(a_hyps)} / {len(a_hyps)})")
    print(f"  Pain Points: identical ({len(a_pps)} / {len(a_pps)})")
    tag_var = abs(a_tags - b_tags) / max(a_tags, b_tags, 1)
    print(f"  Tag variance: {tag_var:.1%} (threshold: 5%)")
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
