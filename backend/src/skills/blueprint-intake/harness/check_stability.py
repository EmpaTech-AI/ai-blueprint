#!/usr/bin/env python3
"""
PIO Framework — Cross-Run Stability Harness
============================================

Checks that multiple dossier outputs from the same engagement (same inputs, different
runs) are content-identical on the sections that must be deterministic:
  - Selected hypothesis title set (Section D)
  - Selected pain point title set (Section C)
  - JUSTIFICATION floor-item set (obligatory-tag floor only — see confidence_thresholds.md §1C)

JUSTIFICATION check design (v10 floor-subset approach):
  - Floor items: justification entries whose title ends with "[floor]" — these correspond to
    obligatory-tag floor categories (F-1 through F-5) and MUST be set-stable across runs.
  - Discretionary items: all other justification entries — these may vary run-to-run due to
    the ~20% low-confidence tagging CV. Discretionary divergence is logged as an observability
    metric (WARN) but does NOT gate.
  - The retired FW-08 global count band is NOT re-introduced here. See §4 of the v10
    Closure Feedback Report for the cardinal regression trap this avoids.

Also emits a candidate-pool observability metric: logs the full scored hypothesis list
(titles + scores) from each run so pool divergence is visible even when the top-7 set
is stable.

Usage:
    python check_stability.py dossier_run1.md dossier_run2.md [dossier_run3.md ...]
    python check_stability.py dossier_run*.md --json
    python check_stability.py dossier_run*.md --strict  # treat all WARNs as FAIL

Exit codes:
    0 — PASS (all gated sets identical across all runs)
    1 — FAIL (set divergence detected in a gated set)
    2 — ERROR (fewer than 2 files provided, or file unreadable)
"""

import argparse
import json
import re
import sys
from pathlib import Path

# ============================================================================
# Extraction helpers
# ============================================================================

_HYPOTHESIS_RE = re.compile(r"^###\s+Hypothesis\s+\d+\s+—\s+(.+?)$", re.MULTILINE)
_PAIN_POINT_RE = re.compile(r"^###\s+Pain Point\s+\d+\s+—\s+(.+?)$", re.MULTILINE)
_JUSTIFICATION_ITEM_RE = re.compile(r"^\*\*Item\s+\d+\s+—\s+(.+?)\*\*", re.MULTILINE)
_SCORE_COMMENT_RE = re.compile(
    r"<!--\s*score:\s*impact=(\d+)\s+feasibility=(\d+)\s+alignment=(\d+)\s+product=(\d+)\s+class=(\w+)\s*-->",
    re.MULTILINE,
)


def normalise_title(title: str) -> str:
    """Lowercase + collapse whitespace for fuzzy-resistant comparison."""
    return re.sub(r"\s+", " ", title.strip().lower())


def extract_hypothesis_titles(text: str) -> list:
    return [normalise_title(m.group(1)) for m in _HYPOTHESIS_RE.finditer(text)]


def extract_pain_point_titles(text: str) -> list:
    return [normalise_title(m.group(1)) for m in _PAIN_POINT_RE.finditer(text)]


def extract_justification_titles(text: str) -> list:
    return [normalise_title(m.group(1)) for m in _JUSTIFICATION_ITEM_RE.finditer(text)]


_FLOOR_SUFFIX = "[floor]"


def split_justification_by_tier(titles: list) -> tuple:
    """Split justification item titles into floor and discretionary sets.

    Floor items have normalised titles ending with '[floor]' — the skill marks these
    per confidence_thresholds.md §Obligatory-Tag Floor. Discretionary items are all others.

    Returns (floor_titles, discretionary_titles).
    """
    floor = [t for t in titles if t.endswith(_FLOOR_SUFFIX)]
    discretionary = [t for t in titles if not t.endswith(_FLOOR_SUFFIX)]
    return floor, discretionary


def extract_candidate_pool(text: str) -> list:
    """Extract scored hypothesis entries from HTML score comments.

    Each entry: {title, impact, feasibility, alignment, product, class}
    These comments are embedded by the skill at the end of each hypothesis block
    and are invisible in rendered output — they are the machine-readable score record.
    """
    # Match each hypothesis heading + the score comment that follows it
    h_blocks = list(_HYPOTHESIS_RE.finditer(text))
    pool = []
    for i, h_match in enumerate(h_blocks):
        start = h_match.end()
        end = h_blocks[i + 1].start() if i + 1 < len(h_blocks) else len(text)
        block = text[start:end]
        score_m = _SCORE_COMMENT_RE.search(block)
        if score_m:
            pool.append({
                "title": normalise_title(h_match.group(1)),
                "impact": int(score_m.group(1)),
                "feasibility": int(score_m.group(2)),
                "alignment": int(score_m.group(3)),
                "product": int(score_m.group(4)),
                "class": score_m.group(5),
            })
        else:
            pool.append({
                "title": normalise_title(h_match.group(1)),
                "impact": None, "feasibility": None, "alignment": None, "product": None, "class": None,
            })
    return pool


# ============================================================================
# Stability checks
# ============================================================================

def check_set_stability(sets_by_run: list, label: str) -> list:
    """Return list of issue strings for any divergence across runs.

    Sets must be identical regardless of order — we compare frozensets.
    """
    issues = []
    frozen = [frozenset(s) for s in sets_by_run]
    reference = frozen[0]
    for i, s in enumerate(frozen[1:], start=2):
        if s != reference:
            added = s - reference
            removed = reference - s
            lines = [f"{label} divergence between run 1 and run {i}:"]
            if removed:
                lines.append(f"  In run 1 but not run {i}: {sorted(removed)}")
            if added:
                lines.append(f"  In run {i} but not run 1: {sorted(added)}")
            issues.append("\n".join(lines))
    return issues


def check_pool_divergence(pools_by_run: list) -> list:
    """Warn if the scored candidate pool differs across runs.

    Pool divergence means the model selected different hypothesis candidates
    before scoring — a precursor to selection drift even when the top-7 happens
    to be stable. This is an observability metric, not a hard FAIL.
    """
    issues = []
    if not any(pools_by_run):
        return ["No score comments found in any run — candidate pool metric unavailable. "
                "Ensure hypotheses carry <!-- score: ... --> comments."]
    ref_titles = frozenset(e["title"] for e in pools_by_run[0])
    for i, pool in enumerate(pools_by_run[1:], start=2):
        run_titles = frozenset(e["title"] for e in pool)
        added = run_titles - ref_titles
        removed = ref_titles - run_titles
        if added or removed:
            lines = [f"Candidate pool differs between run 1 and run {i} (WARN — pool divergence upstream of scoring):"]
            if removed:
                lines.append(f"  In run 1 pool but not run {i}: {sorted(removed)}")
            if added:
                lines.append(f"  In run {i} pool but not run 1: {sorted(added)}")
            issues.append("\n".join(lines))
    return issues


# ============================================================================
# Main
# ============================================================================

def run_stability_check(paths: list, strict: bool = False) -> dict:
    """Run all stability checks across the provided dossier files.

    JUSTIFICATION check uses floor-subset gating (v10):
      - FAIL on floor-item set divergence (obligatory-tag floor categories F-1..F-5)
      - WARN on discretionary-item divergence (expected ~20% LC-tagging CV)
      - No global justification count band (retired FW-08 pattern avoided)

    Returns a result dict with keys: passed, fail_issues, warn_issues, per_run.
    """
    per_run = []
    for p in paths:
        try:
            text = p.read_text(encoding="utf-8")
        except Exception as e:
            return {"error": f"Cannot read {p}: {e}"}
        all_titles = extract_justification_titles(text)
        floor_titles, discretionary_titles = split_justification_by_tier(all_titles)
        per_run.append({
            "file": str(p),
            "hypothesis_titles": extract_hypothesis_titles(text),
            "pain_point_titles": extract_pain_point_titles(text),
            "justification_titles": all_titles,
            "justification_floor": floor_titles,
            "justification_discretionary": discretionary_titles,
            "candidate_pool": extract_candidate_pool(text),
        })

    fail_issues = []
    warn_issues = []

    # FAIL checks — selected sets must be identical
    fail_issues.extend(check_set_stability(
        [r["hypothesis_titles"] for r in per_run], "Hypothesis selected set"
    ))
    fail_issues.extend(check_set_stability(
        [r["pain_point_titles"] for r in per_run], "Pain point selected set"
    ))

    # JUSTIFICATION: gate on floor subset only (v10 floor-subset approach)
    floor_counts = [len(r["justification_floor"]) for r in per_run]
    if all(c == 0 for c in floor_counts):
        # No floor items found — either pre-v10 dossiers or floor markers missing
        warn_issues.append(
            "No [floor]-marked JUSTIFICATION items found in any run. "
            "Floor-subset stability cannot be checked. "
            "Ensure the skill is writing floor markers per confidence_thresholds.md §1C. "
            "Falling back to full-set check for this batch."
        )
        # Fallback: full-set check (pre-v10 behaviour) so old dossiers still gate
        fail_issues.extend(check_set_stability(
            [r["justification_titles"] for r in per_run], "JUSTIFICATION full set (floor fallback)"
        ))
    else:
        # Normal path: gate on floor subset, observe discretionary band
        fail_issues.extend(check_set_stability(
            [r["justification_floor"] for r in per_run], "JUSTIFICATION floor set"
        ))
        # Discretionary band: warn if it differs (expected, not a defect)
        disc_sets = [frozenset(r["justification_discretionary"]) for r in per_run]
        ref = disc_sets[0]
        disc_divergences = []
        for i, s in enumerate(disc_sets[1:], start=2):
            if s != ref:
                added = sorted(s - ref)
                removed = sorted(ref - s)
                lines = [f"Discretionary band differs between run 1 and run {i} (WARN — expected variance):"]
                if removed:
                    lines.append(f"  In run 1 but not run {i}: {removed}")
                if added:
                    lines.append(f"  In run {i} but not run 1: {added}")
                disc_divergences.append("\n".join(lines))
        if strict:
            fail_issues.extend(disc_divergences)
        else:
            warn_issues.extend(disc_divergences)

    # WARN checks — pool divergence is observability, not a gate failure
    pool_issues = check_pool_divergence([r["candidate_pool"] for r in per_run])
    if strict:
        fail_issues.extend(pool_issues)
    else:
        warn_issues.extend(pool_issues)

    passed = len(fail_issues) == 0

    return {
        "passed": passed,
        "fail_count": len(fail_issues),
        "warn_count": len(warn_issues),
        "fail_issues": fail_issues,
        "warn_issues": warn_issues,
        "per_run": per_run,
    }


def format_human_report(result: dict, paths: list) -> str:
    lines = ["=" * 70, "PIO Framework — Cross-Run Stability Report", "=" * 70, ""]
    lines.append(f"Runs compared: {len(paths)}")
    for p in paths:
        lines.append(f"  {p}")
    lines.append("")

    if result.get("error"):
        lines.append(f"ERROR: {result['error']}")
        return "\n".join(lines)

    if result["passed"]:
        lines.append("RESULT: PASS — selected sets are identical across all runs")
    else:
        lines.append(f"RESULT: FAIL — {result['fail_count']} set divergence(s) detected")
    lines.append("")

    if result["fail_issues"]:
        lines.append("FAILURES:")
        for issue in result["fail_issues"]:
            lines.append(f"  [FAIL] {issue}")
        lines.append("")

    if result["warn_issues"]:
        lines.append("WARNINGS (observability — not a gate failure unless --strict):")
        for issue in result["warn_issues"]:
            lines.append(f"  [WARN] {issue}")
        lines.append("")

    lines.append("Per-run metrics:")
    for r in result["per_run"]:
        lines.append(f"  {Path(r['file']).name}:")
        lines.append(f"    Pain points selected:    {len(r['pain_point_titles'])}")
        lines.append(f"    Hypotheses selected:     {len(r['hypothesis_titles'])}")
        floor_count = len(r.get("justification_floor", []))
        disc_count = len(r.get("justification_discretionary", []))
        total_just = len(r["justification_titles"])
        lines.append(f"    Justification items:     {total_just}  (floor: {floor_count}  discretionary: {disc_count})")
        pool_scored = sum(1 for e in r["candidate_pool"] if e["product"] is not None)
        lines.append(f"    Candidate pool (scored): {pool_scored}")
        if r["candidate_pool"]:
            lines.append("    Candidate pool detail:")
            for e in sorted(r["candidate_pool"], key=lambda x: (-(x["product"] or 0))):
                score_str = str(e["product"]) if e["product"] is not None else "n/a"
                lines.append(f"      {score_str:>4}  {e['class'] or 'unknown':20}  {e['title']}")
    lines.append("")
    lines.append("=" * 70)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Cross-run stability check for intake dossiers")
    parser.add_argument("files", nargs="+", help="Two or more dossier markdown files to compare")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of human report")
    parser.add_argument(
        "--strict", action="store_true",
        help="Treat candidate pool divergence (WARN) as FAIL"
    )
    args = parser.parse_args()

    paths = [Path(f) for f in args.files]
    if len(paths) < 2:
        print("ERROR: At least 2 dossier files are required for a stability check.", file=sys.stderr)
        sys.exit(2)

    missing = [p for p in paths if not p.exists()]
    if missing:
        for p in missing:
            print(f"ERROR: File not found: {p}", file=sys.stderr)
        sys.exit(2)

    result = run_stability_check(paths, strict=args.strict)

    if args.json:
        # Remove per-run candidate pool raw data from JSON to keep it readable
        output = {k: v for k, v in result.items() if k != "per_run"}
        output["per_run_summary"] = [
            {
                "file": r["file"],
                "pain_points": len(r["pain_point_titles"]),
                "hypotheses": len(r["hypothesis_titles"]),
                "justification_items": len(r["justification_titles"]),
                "justification_floor": len(r.get("justification_floor", [])),
                "justification_discretionary": len(r.get("justification_discretionary", [])),
                "candidate_pool_scored": sum(1 for e in r["candidate_pool"] if e["product"] is not None),
            }
            for r in result["per_run"]
        ]
        print(json.dumps(output, indent=2))
    else:
        print(format_human_report(result, paths))

    if result.get("error"):
        sys.exit(2)
    sys.exit(0 if result["passed"] else 1)


if __name__ == "__main__":
    main()
