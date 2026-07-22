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


def check_stage3(exp: dict, text: str, fails: list, warns: list) -> None:
    markers = parse_markers(text)
    exp_set = set(exp["hypothesis_ids_ordered"])
    got_set = set(markers.keys())
    if got_set != exp_set:
        fails.append(f"KR2 selection fork (Stage 3 map): missing {sorted(exp_set - got_set)}, unexpected {sorted(got_set - exp_set)}")
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
