#!/usr/bin/env python3
"""
Test suite for the PIO Framework validation harness.

Verifies that the harness catches the documented failure modes that
disqualified TEST 2 of the original Blueprint pipeline:
  - Test metadata in title
  - Leaked orchestrator preambles
  - Bare/malformed confidence tags
  - Non-canonical source names
  - FIXED-count violations
  - Missing justification entries
"""

import subprocess
import sys
import tempfile
from pathlib import Path

# Locate the harness
HARNESS = Path(__file__).resolve().parent.parent / "validate_intake.py"
GOLDEN = Path(__file__).resolve().parent.parent.parent / "golden" / "recruitment_meridian_v1.md"

# Base content (a minimal stub — we mutate from this for each test)
BASE = """# MERIDIAN TALENT PARTNERS OOD

**Schema Version:** `intake_v1.0`
**Industry Archetype:** Recruitment & Talent Solutions

## A) Executive Summary

stub [Document-Backed — financial summary p.1]. stub [Document-Backed — org chart p.1].

## B) Key Data Points

| M | V | S | C |
| --- | --- | --- | --- |
| stub | stub | stub | stub |
"""


def run_validator(text: str) -> tuple:
    """Run the validator on the given text. Returns (returncode, stdout)."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(text)
        path = f.name
    result = subprocess.run(
        [sys.executable, str(HARNESS), path],
        capture_output=True, text=True
    )
    Path(path).unlink()
    return result.returncode, result.stdout


def assert_fails_with(text: str, rule_name: str, label: str) -> bool:
    """Validator should FAIL and the failure should include the given rule name."""
    rc, out = run_validator(text)
    if rc == 0:
        print(f"  FAIL: {label} — expected validator to reject, but it passed")
        return False
    if rule_name not in out:
        print(f"  FAIL: {label} — expected rule '{rule_name}' in output, not found")
        print(out[:600])
        return False
    print(f"  PASS: {label}")
    return True


def main():
    passed = 0
    failed = 0

    print("=" * 70)
    print("PIO Framework — Validation Harness Test Suite")
    print("=" * 70)

    # Test 1: Golden Output passes
    print("\n[Test 1] Golden Output validates clean")
    rc, out = run_validator(GOLDEN.read_text(encoding="utf-8"))
    if rc == 0:
        print("  PASS: Golden Output validates against intake_v1.0")
        passed += 1
    else:
        print("  FAIL: Golden Output should pass but failed")
        print(out[:2000])
        failed += 1

    # Test 2: Title leak with "TEST 2 temp 0"
    print("\n[Test 2] Header containing 'TEST 2 temp 0' must be rejected")
    bad_title = BASE.replace(
        "# MERIDIAN TALENT PARTNERS OOD",
        "# MERIDIAN TALENT PARTNERS TEST 2 temp 0 OOD"
    )
    if assert_fails_with(bad_title, "forbidden_header_pattern", "TEST/temp metadata in title"):
        passed += 1
    else:
        failed += 1

    # Test 3: Leaked orchestrator preamble
    print("\n[Test 3] Leaked 'I have confirmed receipt' preamble must be rejected")
    bad_preamble = BASE.replace(
        "## A) Executive Summary\n\nstub",
        "## A) Executive Summary\n\nI have confirmed receipt of all four upstream outputs. stub"
    )
    if assert_fails_with(bad_preamble, "forbidden_leading_paragraph", "Orchestrator preamble leak"):
        passed += 1
    else:
        failed += 1

    # Test 4: Forbidden tag pattern (Doc-Backed instead of Document-Backed)
    print("\n[Test 4] Malformed '[Doc-Backed]' tag must be rejected")
    bad_tag = BASE.replace(
        "[Document-Backed — financial summary p.1]",
        "[Doc-Backed — financial summary p.1]"
    )
    if assert_fails_with(bad_tag, "forbidden_tag_pattern", "Malformed confidence tag"):
        passed += 1
    else:
        failed += 1

    # Test 5: Non-canonical source name (use Golden Output as base; swap one source)
    print("\n[Test 5] Non-canonical source name 'process docs' must be rejected")
    golden_text = GOLDEN.read_text(encoding="utf-8")
    bad_source = golden_text.replace(
        "[Document-Backed — SOP p.2]",
        "[Document-Backed — process documentation file p.2]",
        1
    )
    if assert_fails_with(bad_source, "unknown_source", "Non-canonical source name"):
        passed += 1
    else:
        failed += 1

    # Test 6: Section C count violation — drop a pain point so count != 8
    print("\n[Test 6] Section C with only 7 pain points (FIXED=8) must be rejected")
    bad_count = golden_text.replace(
        "### Pain Point 8 — Interview & Offer Coordination Friction",
        "### REMOVED — used to be Pain Point 8"
    )
    if assert_fails_with(bad_count, "section_c_count", "Section C pain point count"):
        passed += 1
    else:
        failed += 1

    # Test 7: Section D count violation — drop a hypothesis
    print("\n[Test 7] Section D with only 6 hypotheses (FIXED=7) must be rejected")
    bad_d = golden_text.replace(
        "### Hypothesis 7 — RPO Service Design Supported by AI Delivery Infrastructure",
        "### REMOVED — used to be Hypothesis 7"
    )
    if assert_fails_with(bad_d, "section_d_count", "Section D hypothesis count"):
        passed += 1
    else:
        failed += 1

    # Test 8: Missing justification entry — body references appendix item 9 with no entry
    print("\n[Test 8] Body reference to non-existent appendix item must be rejected")
    bad_just = golden_text.replace(
        "[Assumption — appendix item 5]",
        "[Assumption — appendix item 99]"
    )
    if assert_fails_with(bad_just, "justification_missing_entry", "Orphan appendix reference"):
        passed += 1
    else:
        failed += 1

    # Summary
    print("\n" + "=" * 70)
    print(f"Test Suite Results: {passed} passed, {failed} failed")
    print("=" * 70)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
