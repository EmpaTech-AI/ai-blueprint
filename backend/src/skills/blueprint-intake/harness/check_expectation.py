#!/usr/bin/env python3
"""
Pre-Registration Expectation Checker (Era N — new discipline)
==============================================================

Compares a run's decision spine against the SIGNED pre-registered expectation
manifest (harness/expected/*.json). Era N was partly graded against v1.0
expectations; this tool makes that impossible: the expectation is written and
signed BEFORE the batch runs, and every run is diffed against it mechanically.

It is also the harness-level detector for the three Era-N fork classes:
  - KR2 selection fork  (dropped/added IDs, order changes)   — e.g. the T3 H-RT-04 drop
  - KR3 phase fork      (deadline-pinned item not in Now)    — e.g. the T2 H-RT-07 defer
  - T-30 split          (an undivided ID appearing in >1 Phase-Summary row)

Usage:
    python check_expectation.py expected.json stage1_dossier.md
        [--stage2 snapshot.md] [--stage3 map.md] [--stage4 sequence.md] [--json]

Exit codes: 0 = PASS, 1 = FAIL (any expectation violated), 2 = ERROR.
"""

import argparse
import json
import re
import sys
from pathlib import Path

PP_ID_RE = re.compile(r"<!--\s*pp-id:\s*([\w-]+)\s*-->")
SCORE_RE = re.compile(r"<!--\s*score:\s*(.*?)-->", re.DOTALL)
FIELD_RE = re.compile(r"(\w+)=([^\s]+)")
DIM_RE = re.compile(r"^\|\s*(Strategy|Data|Technology|People|Processes|Governance)\s*\|\s*(Early|Developing|Established)", re.MULTILINE)
BAND_LAYER_RE = re.compile(r"Layer-1 grade:\s*(FRAGMENTED|USABLE|SOUND)")
BAND_ALIGN_RE = re.compile(r"Alignment grade:\s*(FRICTION|ALIGNED)")
BAND_RE = re.compile(r"Band:\s*([123])")
CEO_RE = re.compile(r"^\s*CEO_NAME:\s*(.+)$", re.MULTILINE)
CR_RE = re.compile(r"\bCR-(\d+)\b")
# Phase Summary rows: | Title | H-RT-NN or H-CORE-00 | Class | Phase | driver |
PHASE_ROW_RE = re.compile(r"^\|[^|\n]*\|\s*(H-[\w-]+?)\s*\|[^|\n]*\|\s*(Now|Next|Later)\s*\|", re.MULTILINE | re.IGNORECASE)


def parse_markers(text: str) -> dict:
    """Return {id_lower: {field: value}} for every score marker in the text."""
    out = {}
    for m in SCORE_RE.finditer(text):
        fields = dict(FIELD_RE.findall(m.group(1)))
        if "id" in fields:
            out[fields["id"].lower()] = fields
    return out


def check_stage1(exp: dict, text: str, fails: list, warns: list) -> None:
    pp_ids = [m.lower() for m in PP_ID_RE.findall(text)]
    if pp_ids != exp["pain_point_ids_ordered"]:
        fails.append(f"KR-selection (pain points): expected {exp['pain_point_ids_ordered']}, got {pp_ids}")
    markers = parse_markers(text)
    h_ids = list(markers.keys())
    exp_h = exp["hypothesis_ids_ordered"]
    if h_ids != exp_h:
        missing = [i for i in exp_h if i not in h_ids]
        extra = [i for i in h_ids if i not in exp_h]
        detail = []
        if missing:
            detail.append(f"MISSING {missing} (the Era-N T3 class — silent drop)")
        if extra:
            detail.append(f"UNEXPECTED {extra}")
        if not missing and not extra:
            detail.append(f"ORDER differs: expected {exp_h}, got {h_ids}")
        fails.append("KR2 selection fork (hypotheses): " + "; ".join(detail))
    for hid, expected_fields in exp["stage1_markers"].items():
        got = markers.get(hid)
        if not got:
            continue  # absence already reported above
        for field, want in expected_fields.items():
            have = got.get(field)
            if have is None or str(have) != str(want):
                fails.append(f"Marker field mismatch {hid}.{field}: expected {want}, got {have}")
    ceo = CEO_RE.search(text)
    if ceo and exp.get("ceo_name") and ceo.group(1).strip() != exp["ceo_name"]:
        fails.append(f"CEO_NAME mismatch: expected {exp['ceo_name']}, got {ceo.group(1).strip()}")
    if exp.get("contradiction_register_ids"):
        got_cr = sorted({f"cr-{n}" for n in CR_RE.findall(text)})
        if got_cr != sorted(exp["contradiction_register_ids"]):
            warns.append(f"Contradiction register: expected {sorted(exp['contradiction_register_ids'])}, got {got_cr} "
                         "(A-16 — pinned-fixture runs must surface the full register)")


def check_stage2(exp: dict, text: str, fails: list, warns: list) -> None:
    dims = dict(DIM_RE.findall(text))
    for dim, want in exp.get("maturity", {}).items():
        have = dims.get(dim)
        if have and have != want:
            fails.append(f"Maturity fork {dim}: expected {want}, got {have}")
        elif not have:
            warns.append(f"Maturity dimension '{dim}' not parseable from scorecard (heading/structure issue?)")
    band = exp.get("band", {})
    for regex, key, label in ((BAND_LAYER_RE, "layer1", "Layer-1 grade"),
                              (BAND_ALIGN_RE, "alignment", "Alignment grade"),
                              (BAND_RE, "band", "Band")):
        m = regex.search(text)
        if m and str(m.group(1)) != str(band.get(key)):
            fails.append(f"Band fork ({label}): expected {band.get(key)}, got {m.group(1)}")
        elif not m:
            warns.append(f"[BAND_ASSIGNMENT] {label} not found")


def _d6b_class(impact: int, feasibility: int) -> str:
    """Pinned D6b tree (scoring_rubric.md STEP 1-3), post-adjustment Feasibility."""
    if feasibility >= 4:
        return "QuickWin"                       # STEP 1
    if impact >= 4 and feasibility <= 3:
        return "BigBet"                          # STEP 2
    return "FoundationBuilder"                   # STEP 3


# Prose "**Classification:** <label>" immediately followed by its score marker.
CLASS_PAIR_RE = re.compile(r"\*\*Classification:\*\*\s*([^\n]+?)\s*\n\s*<!--\s*score:\s*(.*?)-->", re.DOTALL)


def _norm_class(label: str) -> str:
    return re.sub(r"[^a-z]", "", label.lower())


def check_classification_labels(text: str, fails: list, warns: list) -> None:
    """REG-25 (v37.1): D6b classification-label fork. Recompute class from each marker's own
    I/F and require BOTH the marker class field AND the adjacent prose 'Classification:' label
    to match. Manifest-independent (self-consistency) — no expectation fields, cannot false-fire
    on a conforming card. Standalone so the seeded battery can exercise it on a partial fixture."""
    for hid, f in parse_markers(text).items():
        try:
            impact, feas = int(float(f.get("impact"))), int(float(f.get("feasibility")))
        except (TypeError, ValueError):
            continue
        cls = f.get("class")
        if cls and _norm_class(cls) != _norm_class(_d6b_class(impact, feas)):
            fails.append(f"REG-25 D6b LABEL FORK: {hid} marker class={cls} but Impact {impact}/Feasibility {feas} "
                         f"-> {_d6b_class(impact, feas)} (pinned tree). Class must be recomputed from the scores.")
    for prose, raw in CLASS_PAIR_RE.findall(text):
        fields = dict(FIELD_RE.findall(raw))
        try:
            impact, feas = int(float(fields.get("impact"))), int(float(fields.get("feasibility")))
        except (TypeError, ValueError):
            continue
        expected = _d6b_class(impact, feas)
        if _norm_class(expected) not in _norm_class(prose):
            fails.append(f"REG-25 D6b LABEL FORK: card {fields.get('id', '(unknown)')} prose "
                         f"'Classification: {prose.strip()}' contradicts Impact {impact}/Feasibility {feas} "
                         f"-> {expected} (pinned tree).")


FLAG_DIM = {'ml_heavy': 'Data', 'multi_source': 'Data', 'regulated': 'Governance',
            'large_integration': 'Technology', 'adoption_dependent': 'People'}


def recompute_adjusted_f(base_f, flags, early_dims):
    """A4 (contract v1.3 §4.1): adjusted_F = max(1, base_F - Σ[flag=yes AND dim(flag) Early]).
    Each firing flag is a separate term (two on one Early dim = -2); each gated by its dim Early."""
    firing = [f for f, d in FLAG_DIM.items() if str(flags.get(f, 'no')).lower() == 'yes' and d in early_dims]
    return max(1, base_f - len(firing)), firing


def check_feasibility_from_root(text: str, base_map: dict, early_dims: set, fails: list) -> None:
    """REG-27 (A4): recompute post-adjustment feasibility from root and flag disagreements.
    Manifest-independent (archetype base_F + marker flags + Early dims). Standalone so the seeded
    battery can exercise it directly on a partial fixture."""
    for hid, f in parse_markers(text).items():
        if hid not in base_map:
            continue
        try:
            emitted = int(float(f.get("feasibility")))
        except (TypeError, ValueError):
            continue
        exp_f, firing = recompute_adjusted_f(base_map[hid], f, early_dims)
        if emitted != exp_f:
            fails.append(f"REG-27 A4 STACKING: {hid} feasibility={emitted}, root recompute={exp_f} "
                         f"(base {base_map[hid]} - {len(firing)} firing {firing} on Early {sorted(early_dims)})")


def check_stage3(exp: dict, text: str, fails: list, warns: list) -> None:
    check_classification_labels(text, fails, warns)

    markers = parse_markers(text)
    exp_set = set(exp["hypothesis_ids_ordered"])
    got_set = set(markers.keys())
    if got_set != exp_set:
        fails.append(f"KR2 selection fork (Stage 3 map): missing {sorted(exp_set - got_set)}, unexpected {sorted(got_set - exp_set)}")
    elif list(markers.keys()) != exp["hypothesis_ids_ordered"]:
        fails.append(f"S-47/S-51 ordering fork (Stage 3): expected {exp['hypothesis_ids_ordered']}, got {list(markers.keys())} "
                     "(card order is copied from Stage 1; h-core-00 leads when present -- A-11, never re-sorted)")
    aa_expected = exp.get("aa_expected")
    if aa_expected is not None:
        aa_count = text.count("[Archetype-Anchored")
        if aa_count == 0:
            fails.append(f"REG-22 AA-pin BROKEN: zero [Archetype-Anchored] tags in Stage 3 (expected {aa_expected}) - score-basis tags re-classed into Inferred/Assumption (the Era-O uniform defect)")
        elif aa_count != aa_expected:
            warns.append(f"AA count {aa_count} differs from expected {aa_expected} (one per card)")
    for hid, want in exp.get("stage3_post_adjustment", {}).items():
        got = markers.get(hid)
        if not got:
            continue
        if str(got.get("product")) != str(want["product"]):
            fails.append(f"Stage-3 score fork {hid}: expected product {want['product']}, got {got.get('product')}")
        if got.get("class") != want["class"]:
            fails.append(f"Stage-3 class fork {hid}: expected {want['class']}, got {got.get('class')}")


def check_stage4(exp: dict, text: str, fails: list, warns: list) -> None:
    rows = [(hid.lower(), phase.capitalize()) for hid, phase in PHASE_ROW_RE.findall(text)]
    if not rows:
        warns.append("Stage 4: no Phase Summary rows parseable (heading/table structure issue — the S-44 class)")
        return
    # T-30 split detection: an undivided ID must appear in exactly one row
    from collections import Counter
    counts = Counter(hid for hid, _ in rows)
    for hid in exp.get("undivided_ids", []):
        if counts.get(hid, 0) > 1:
            fails.append(f"T-30 SPLIT: undivided entity {hid} appears in {counts[hid]} Phase-Summary rows "
                         f"({[p for h, p in rows if h == hid]}) — decomposition is forbidden")
    phase_of = {}
    for hid, phase in rows:
        phase_of.setdefault(hid, phase)
    # Expected phase map
    for phase_name, ids in exp.get("phase_map", {}).items():
        for hid in ids:
            have = phase_of.get(hid)
            if have is None:
                fails.append(f"Phase map: {hid} missing from Phase Summary")
            elif have.lower() != phase_name.lower():
                fails.append(f"KR3 phase fork: {hid} expected {phase_name.capitalize()}, got {have}")
    # Imminence pin: deadline-carrying FBs must be Now regardless of date proximity
    for hid in exp.get("deadline_now_ids", []):
        have = phase_of.get(hid)
        if have and have != "Now":
            fails.append(f"KR3 DEADLINE OVERRIDE: {hid} carries a Month-1–3 (or passed) deadline and must be Now; got {have} "
                         "(imminence pin — proximity never defers; the Era-N T2 class)")

    # REG-24 assertion 2 — S4 Archetype-Anchored floor. The v37 run that mis-placed H-RT-07
    # (Next×1) ALSO dropped its [Archetype-Anchored] score anchor: S4 AA = 4 where the three
    # stable runs carried 5. Assertion 1 (placement=Now) is the deadline_now_ids check above;
    # this is assertion 2. Gated on the optional `stage4_aa_min` field so runs/manifests without
    # it are unaffected (the field folds into the signed manifest's S4 slice at the v1.1 re-seal,
    # per the S4-only amendment discipline). A count at or below (min - 1) is the fork signature.
    aa_min = exp.get("stage4_aa_min")
    if aa_min is not None:
        aa_count = text.count("[Archetype-Anchored")
        if aa_count < aa_min:
            fails.append(f"REG-24 AA-DRIVER DROP: Stage-4 carries {aa_count} [Archetype-Anchored] score "
                         f"anchor(s), expected >= {aa_min}. The locked-feasibility citations were re-classed "
                         "away from [Archetype-Anchored] - the tag drop correlated with the H-RT-07 phase fork.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("expected")
    ap.add_argument("stage1")
    ap.add_argument("--stage2")
    ap.add_argument("--stage3")
    ap.add_argument("--stage4")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    try:
        exp = json.loads(Path(args.expected).read_text(encoding="utf-8"))
    except Exception as e:
        print(f"ERROR: cannot read expectation manifest: {e}")
        return 2

    fails, warns = [], []
    stages = [("stage1", args.stage1, check_stage1), ("stage2", args.stage2, check_stage2),
              ("stage3", args.stage3, check_stage3), ("stage4", args.stage4, check_stage4)]
    for name, path, fn in stages:
        if not path:
            continue
        try:
            text = Path(path).read_text(encoding="utf-8")
        except Exception as e:
            print(f"ERROR: cannot read {name} file: {e}")
            return 2
        fn(exp, text, fails, warns)

    result = {"passed": not fails, "fails": fails, "warns": warns}
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for f in fails:
            print(f"  [FAIL] {f}")
        for w in warns:
            print(f"  [WARN] {w}")
        print(f"RESULT: {'PASS — run matches the pre-registered expectation' if not fails else 'FAIL — run diverges from the pre-registered expectation'}")
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main())
