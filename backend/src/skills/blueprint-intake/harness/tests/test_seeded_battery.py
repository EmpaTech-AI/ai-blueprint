#!/usr/bin/env python3
"""
Three-Seed Safety Battery (Era N plan, Wave 2)
==============================================

A natural clean run proves nothing (the Era-M lesson: intermittent forks pass
clean re-runs). This battery SEEDS each Era-N fork class into an otherwise
conforming artifact and asserts the expectation checker CATCHES it:

  Seed A — KR2 selection drop:   H-RT-04 marker removed from the golden dossier
  Seed B — KR3 deadline defer:   H-RT-07 moved to Next in a conforming Phase Summary
  Seed C — T-30 split:           H-CORE-00 decomposed into two Phase-Summary rows

Plus two PASS controls: the golden dossier and a conforming Phase Summary must
pass, or the detectors are firing on noise.

Run:  python tests/test_seeded_battery.py
"""

import json
import re
import sys
from pathlib import Path

HARNESS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HARNESS))
import check_expectation as ce  # noqa: E402

EXPECTED = HARNESS / "expected" / "BP-TEST-001_v1_1_expected.json"
GOLDEN = HARNESS.parent / "golden" / "recruitment_meridian_v1.md"

CONFORMING_STAGE4 = """# Recommended Action Sequence — Meridian Talent Partners OOD

## Phase Summary

| Opportunity | H-RT ID | Class | Phase | Primary placement driver |
|---|---|---|---|---|
| AI-Powered CV Formatting + Summary Generation | H-RT-02 | Quick Win | Now | no named prerequisite |
| Interview Scheduling Standardisation | H-RT-05 | Quick Win | Now | no named prerequisite |
| Data Protection Compliance Foundation | H-RT-07 | Foundation Builder | Now | system_event_deadline=2026-07-31 within M1-3 |
| ATS-Driven Automated Client Status Updates | H-RT-03 | Quick Win | Next | d_gate4=yes |
| BD Proposal Automation + RPO Productisation Support | H-RT-10 | Foundation Builder | Next | no dated trigger |
| AI-Assisted Specialist Sourcing | H-RT-01 | Big Bet | Later | phase_dependency=strict |
| Candidate Database Revival | H-RT-04 | Big Bet | Later | phase_dependency=strict |
| AI Company Brain | H-CORE-00 | Big Bet | Later | phase_dependency=strict |
"""


def run_checks(exp, stage1_text=None, stage4_text=None):
    fails, warns = [], []
    if stage1_text is not None:
        ce.check_stage1(exp, stage1_text, fails, warns)
    if stage4_text is not None:
        ce.check_stage4(exp, stage4_text, fails, warns)
    return fails, warns


def main():
    exp = json.loads(EXPECTED.read_text(encoding="utf-8"))
    golden = GOLDEN.read_text(encoding="utf-8")
    passed = failed = 0

    def report(name, ok, detail=""):
        nonlocal passed, failed
        print(f"[{'PASS' if ok else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
        passed += ok
        failed += (not ok)

    # Control 1: golden dossier matches the pre-registered expectation
    fails, _ = run_checks(exp, stage1_text=golden)
    report("Control: golden dossier vs expectation must PASS", not fails, "; ".join(fails[:2]))

    # Control 2: conforming Phase Summary must PASS
    fails, _ = run_checks(exp, stage4_text=CONFORMING_STAGE4)
    report("Control: conforming Phase Summary must PASS", not fails, "; ".join(fails[:2]))

    # Seed A — KR2 drop: remove the H-RT-04 score marker (the Era-N T3 fork)
    seed_a = re.sub(r"<!--\s*score:\s*id=H-RT-04.*?-->", "", golden, flags=re.DOTALL)
    fails, _ = run_checks(exp, stage1_text=seed_a)
    caught = any("KR2" in f and "h-rt-04" in f.lower() for f in fails)
    report("Seed A: silent H-RT-04 drop is CAUGHT", caught, "; ".join(fails[:2]) or "not detected")

    # Seed B — KR3 deadline defer: H-RT-07 to Next (the Era-N T2 fork)
    seed_b = CONFORMING_STAGE4.replace(
        "| Data Protection Compliance Foundation | H-RT-07 | Foundation Builder | Now |",
        "| Data Protection Compliance Foundation | H-RT-07 | Foundation Builder | Next |")
    fails, _ = run_checks(exp, stage4_text=seed_b)
    caught = any("DEADLINE OVERRIDE" in f or ("KR3" in f and "h-rt-07" in f.lower()) for f in fails)
    report("Seed B: H-RT-07 deadline defer to Next is CAUGHT", caught, "; ".join(fails[:2]) or "not detected")

    # Seed C — T-30 split: H-CORE-00 decomposed into two rows (the Era-M S-40 class)
    seed_c = CONFORMING_STAGE4.replace(
        "| AI Company Brain | H-CORE-00 | Big Bet | Later | phase_dependency=strict |",
        "| AI Company Brain — Pilot Scoping | H-CORE-00 | Big Bet | Next | pilot scoping |\n"
        "| AI Company Brain — Full Deployment | H-CORE-00 | Big Bet | Later | phase_dependency=strict |")
    fails, _ = run_checks(exp, stage4_text=seed_c)
    caught = any("T-30 SPLIT" in f for f in fails)
    report("Seed C: H-CORE-00 two-row decomposition is CAUGHT", caught, "; ".join(fails[:2]) or "not detected")

    print("=" * 70)
    print(f"Seeded Battery Results: {passed} passed, {failed} failed")
    print("=" * 70)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
