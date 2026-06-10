#!/usr/bin/env python3
"""
PIO Framework — Cross-Run Stability Harness
============================================

Checks that multiple dossier outputs from the same engagement (same inputs, different
runs) are content-identical on the sections that must be deterministic:
  - Selected hypothesis title/ID set (Section D)
  - Selected pain point title/ID set (Section C)
  - JUSTIFICATION floor-item set (obligatory-tag floor only — see confidence_thresholds.md §1C)

SELECTED-SET CHECK design (v11 canonical-ID approach — AC1):
  - When hypotheses carry <!-- score: id=H-RT-XX ... --> comments, the comparison keys on
    the canonical ID, making it immune to all title paraphrase variation.
  - When pain points carry <!-- pp-id: PP-RT-XX --> comments, the same applies.
  - For dossiers without ID comments (pre-v11), falls back to alias-normalised title using
    the per-archetype alias registry (A1 complement). Run check_stability.py --archetype to
    select the registry; defaults to 'recruitment'.
  - A genuine selection fork (different hypothesis chosen) still FAILs — distinct items
    must carry distinct IDs, so the alias layer can never silently merge a real fork.

JUSTIFICATION check design (v14 spine-derived floor — AC2 / B4):
  - v11–v14 batch history proved that every per-item annotation layer (title [floor] tag,
    Floor category: line, Class: field, Element: anchor) carries ~20% LC-emission CV.
    Each fix stabilised one annotation and exposed the next (v11→v14 whack-a-mole pattern).
  - v14 fix-form (B4): derive the floor from the SELECTED-ELEMENT SPINE (P1), not from
    per-item annotations.  The selected element ID set (7H + 8PP) is already proven stable
    across all batches; the floor is defined as the subset of those IDs covered by at least
    one JUSTIFICATION entry via the Element: field.
  - Gate criterion (FAIL on cross-run divergence):
      floor_element_ids = { element_id | JUSTIFICATION entry with Element: anchor to that ID }
      This set must be identical across all runs.
  - Schema-gap FAIL: if a selected element has NO JUSTIFICATION entry at all, that is a
    schema violation emitted as FAIL for the affected run.
  - F-category (F-1/F-2) is harness-computed from JUSTIFICATION entry bodies and emitted
    as advisory WARN only.  F-cat flips and Element: re-anchoring no longer affect the gate.
  - Unanchored JUSTIFICATION items (no Element: field) are discretionary; their variance
    is WARN.  The FW-08 count-band guard is NOT re-introduced (no count gating anywhere).

Also emits a candidate-pool observability metric: logs the full scored hypothesis list
(titles + scores) from each run so pool divergence is visible even when the top-7 set
is stable.

Usage:
    python check_stability.py dossier_run1.md dossier_run2.md [dossier_run3.md ...]
    python check_stability.py dossier_run*.md --json
    python check_stability.py dossier_run*.md --archetype manufacturing
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
# Alias registry (A1 — per-archetype canonical title resolution)
# Provides fallback ID resolution when id= / pp-id: comments are absent.
# Keys: canonical archetype key (matches archetypes/INDEX.md)
# Values: dict mapping canonical_id → list of normalised title substrings
# ============================================================================

_HYPOTHESIS_ALIAS_REGISTRY = {
    "recruitment": {
        "h-rt-01": [
            "ai-assisted specialist sourcing", "specialist sourcing", "loxo",
            "fetcher", "gem sourcing",
        ],
        "h-rt-02": [
            "ai-powered cv formatting", "cv formatting + summary",
            "cv formatting and summary", "cv summary generation",
            "automated cv formatting",
        ],
        "h-rt-03": [
            "ats-driven automated client status updates",
            "ats client status updates", "client status updates via vincere",
            "automated client status updates", "client status updates",
        ],
        "h-rt-04": [
            "candidate database revival", "candidate database revival + ai matching",
            "candidate database revival via governance", "database revival",
        ],
        "h-rt-05": [
            "interview scheduling standardisation", "interview scheduling via calendly",
            "calendly company-wide rollout", "full calendly rollout",
            "interview scheduling", "calendly rollout",
        ],
        "h-rt-06": [
            "pipeline visibility dashboard", "power bi", "pipeline visibility",
            "real-time pipeline visibility",
        ],
        "h-rt-07": [
            "data protection compliance foundation", "gdpr compliance foundation",
            "sprint 0 enabler", "gdpr foundation", "compliance foundation",
            "data protection foundation",
        ],
        "h-rt-08": [
            "rpo product infrastructure", "rpo service design",
            "ai-enabled delivery infrastructure", "ai delivery infrastructure",
            "rpo product", "rpo ai delivery",
        ],
        "h-rt-09": [
            "executive search workflow intelligence", "executive search intelligence",
            "executive search workflow",
        ],
        "h-rt-10": [
            "bd proposal automation", "proposal automation",
            "business development proposal",
        ],
        "h-rt-11": [
            "automated candidate pre-screening", "candidate pre-screening",
            "pre-screening chatbot",
        ],
        "h-rt-12": [
            "ai-powered job description generation", "job description generation",
        ],
        "h-rt-13": [
            "predictive time-to-fill", "predictive ttf", "time-to-fill modelling",
        ],
    },
}

_PAIN_POINT_ALIAS_REGISTRY = {
    "recruitment": {
        "pp-rt-01": [
            "manual candidate sourcing bottleneck", "sourcing bottleneck",
            "manual sourcing", "candidate sourcing bottleneck",
        ],
        "pp-rt-02": [
            "unusable historical candidate database", "unusable candidate database",
            "historical candidate database", "stale candidate database",
        ],
        "pp-rt-03": [
            "cv formatting consuming consultant time", "cv formatting",
            "cv formatting time",
        ],
        "pp-rt-04": [
            "client communication inconsistency", "inconsistent client communication",
            "client status communication",
        ],
        "pp-rt-05": [
            "interview offer coordination friction", "interview coordination friction",
            "offer coordination friction", "interview scheduling friction",
        ],
        "pp-rt-06": [
            "no real-time pipeline visibility", "pipeline visibility for leadership",
            "real-time pipeline visibility",
        ],
        "pp-rt-07": [
            "ungoverned ai use", "data protection compliance risk",
            "ungoverned ai creating compliance risk",
        ],
        "pp-rt-08": [
            "rpo product not formally structured", "rpo not structured",
            "rpo product structuring",
        ],
        "pp-rt-09": [
            "executive search operating semi-independently",
            "executive search semi-independently",
        ],
        "pp-rt-10": [
            "high researcher turnover", "researcher turnover",
        ],
        "pp-rt-11": [
            "cold outreach conversion below", "cold outreach conversion",
        ],
        "pp-rt-12": [
            "manual bd proposal creation", "bd proposal creation",
            "manual proposal creation",
        ],
        "pp-rt-13": [
            "fragmented client account management", "fragmented account management",
        ],
        "pp-rt-14": [
            "no standard sop adoption", "sop adoption",
            "non-standard sop adoption",
        ],
        "pp-rt-15": [
            "cross-border placement complexity",
        ],
    },
}


def _alias_resolve(normalised_title: str, registry: dict) -> str:
    """Look up a normalised title in an alias registry.

    Returns the canonical ID if any registered alias phrase is a substring of the
    normalised title, or the normalised title is a substring of any alias phrase.
    Returns the original normalised_title unchanged if no match is found.
    """
    for canonical_id, aliases in registry.items():
        for alias in aliases:
            if alias in normalised_title or normalised_title in alias:
                return canonical_id
    return normalised_title


# ============================================================================
# Extraction helpers
# ============================================================================

_HYPOTHESIS_RE = re.compile(r"^###\s+Hypothesis\s+\d+\s+—\s+(.+?)$", re.MULTILINE)
_PAIN_POINT_RE = re.compile(r"^###\s+Pain Point\s+\d+\s+—\s+(.+?)$", re.MULTILINE)
_JUSTIFICATION_ITEM_RE = re.compile(r"^\*\*Item\s+\d+\s+—\s+(.+?)\*\*", re.MULTILINE)

# score: now has optional id= as first field
_SCORE_COMMENT_RE = re.compile(
    r"<!--\s*score:\s*(?:id=([\w-]+)\s+)?impact=(\d+)\s+feasibility=(\d+)\s+"
    r"alignment=(\d+)\s+product=(\d+)\s+class=(\w+)\s*-->",
    re.MULTILINE,
)

# pain point canonical ID comment
_PP_ID_COMMENT_RE = re.compile(r"<!--\s*pp-id:\s*([\w-]+)\s*-->", re.MULTILINE)

# floor classification (B3 advisory — kept for WARN observability only)
_FLOOR_CATEGORY_RE = re.compile(r"^\s*Floor category:\s*F-\d+", re.MULTILINE)
_FLOOR_CATEGORY_SEMANTIC_RE = re.compile(r"^\s*Floor category:\s*F-[345]", re.MULTILINE)
# claim text for stable cross-run identity of floor items
_CLAIM_RE = re.compile(r'^Claim:\s*["\']?(.+?)["\']?\s*$', re.MULTILINE)

# B3: structural F-1/F-2 detection (v12)
_ELEMENT_RE = re.compile(r"^\s*Element:\s*([A-Z]+-[A-Z]+-\d+)", re.MULTILINE)
_CLASS_ASSUMPTION_RE = re.compile(r"^\s*Class:\s*Assumption", re.MULTILINE)
_CLASS_INFERRED_RE = re.compile(r"^\s*Class:\s*Inferred", re.MULTILINE)
# F-2 arithmetic signature: division/multiplication operators, "calculation", "per X FTE",
# "combining N source", or explicit arithmetic notation combining two named values
_F2_ARITHMETIC_RE = re.compile(
    r"(÷|×|divided by|multiplied by|\bcalculation\b|\bcalculated\b"
    r"|arithmetic|combining\s+\d*\s*source"
    r"|per\s+\w+\s+FTE|per delivery FTE|revenue\s+per\s"
    r"|\d[\d,.]*\s*÷\s*\d|\d[\d,.]*\s*×\s*\d)",
    re.IGNORECASE,
)


def normalise_title(title: str) -> str:
    """Lowercase + collapse whitespace for fuzzy-resistant comparison."""
    return re.sub(r"\s+", " ", title.strip().lower())


def extract_hypothesis_ids(text: str, archetype: str = "recruitment") -> list:
    """Return canonical IDs for selected hypotheses.

    Resolution order (AC1 / A2 + A1):
      1. id= field in the score comment → canonical archetype library ID
      2. Alias registry lookup on normalised title → canonical ID when recognised
      3. Normalised title → raw fallback key (pre-v11 dossiers without score comments)

    Using IDs makes the selected-set comparison immune to title paraphrase while
    still detecting genuine forks (distinct hypotheses → distinct IDs).
    """
    h_blocks = list(_HYPOTHESIS_RE.finditer(text))
    alias_reg = _HYPOTHESIS_ALIAS_REGISTRY.get(archetype, {})
    result = []
    for i, h_match in enumerate(h_blocks):
        start = h_match.end()
        end = h_blocks[i + 1].start() if i + 1 < len(h_blocks) else len(text)
        block = text[start:end]
        score_m = _SCORE_COMMENT_RE.search(block)
        if score_m and score_m.group(1):
            # id= explicitly emitted — authoritative
            result.append(score_m.group(1).lower())
        else:
            # Fallback: alias registry or normalised title
            nt = normalise_title(h_match.group(1))
            result.append(_alias_resolve(nt, alias_reg))
    return result


def extract_pain_point_ids(text: str, archetype: str = "recruitment") -> list:
    """Return canonical IDs for selected pain points.

    Resolution order (AC1 / A2 + A1):
      1. <!-- pp-id: PP-RT-XX --> comment after the heading
      2. Alias registry lookup on normalised title
      3. Normalised title as raw fallback
    """
    pp_blocks = list(_PAIN_POINT_RE.finditer(text))
    alias_reg = _PAIN_POINT_ALIAS_REGISTRY.get(archetype, {})
    result = []
    for i, pp_match in enumerate(pp_blocks):
        start = pp_match.end()
        end = pp_blocks[i + 1].start() if i + 1 < len(pp_blocks) else len(text)
        block = text[start:end]
        id_m = _PP_ID_COMMENT_RE.search(block)
        if id_m:
            result.append(id_m.group(1).lower())
        else:
            nt = normalise_title(pp_match.group(1))
            result.append(_alias_resolve(nt, alias_reg))
    return result


# Keep legacy title extractors for per-run reporting / observability
def extract_hypothesis_titles(text: str) -> list:
    return [normalise_title(m.group(1)) for m in _HYPOTHESIS_RE.finditer(text)]


def extract_pain_point_titles(text: str) -> list:
    return [normalise_title(m.group(1)) for m in _PAIN_POINT_RE.finditer(text)]


def extract_justification_entries(text: str) -> list:
    """Extract (title, body) pairs for every JUSTIFICATION appendix entry.

    Scoped to the ## [JUSTIFICATION] block so hypothesis headings in Section D
    are not mistakenly matched. Returns [] if no JUSTIFICATION block is found.
    """
    just_m = re.search(r"^## \[JUSTIFICATION\]", text, re.MULTILINE)
    if not just_m:
        return []
    just_text = text[just_m.end():]
    item_re = re.compile(r"^\*\*Item\s+\d+\s+—\s+(.+?)\*\*", re.MULTILINE)
    matches = list(item_re.finditer(just_text))
    entries = []
    for i, m in enumerate(matches):
        title = m.group(1).strip()
        body_start = m.end()
        body_end = matches[i + 1].start() if i + 1 < len(matches) else len(just_text)
        body = just_text[body_start:body_end].strip()
        entries.append((title, body))
    return entries


def classify_justification_by_element(
    entries: list,
    selected_h_ids: list,
    selected_pp_ids: list,
) -> tuple:
    """B4: Spine-derived floor — keyed on selected element IDs, not per-item annotations.

    The floor is the set of selected element IDs (from the stable P1 spine) that are
    covered by at least one JUSTIFICATION entry via an 'Element: H-RT-XX / PP-RT-XX'
    anchor.  Comparison key = element ID; per-item claim text and F-category are
    advisory only and never used as gate criteria.

    This design is immune to:
      - F-category flips (Class: field changing between runs) — F-cat is WARN only
      - Element re-anchoring / partial drop — gate is element presence, not item count
      - Optional-elaboration deduplication (B3+ concern) — all items for an element
        are equivalent; any one anchoring it counts as coverage

    Gate trigger → FAIL (cross-run via check_set_stability):
      covered_ids differs between runs (element present in one, absent in another).

    Schema-gap FAIL (per-run):
      A selected element has no JUSTIFICATION entry at all.

    Advisory WARN (not gated):
      - F-category flip across runs (same element classified differently)
      - Unanchored items (no Element: field) — discretionary
      - JUSTIFICATION entries anchoring to non-selected element IDs

    Returns:
        covered_ids   — frozenset of element IDs (lower) with ≥1 JUSTIFICATION anchor
        uncovered_ids — sorted list of selected IDs absent from JUSTIFICATION
        extra_ids     — sorted list of JUSTIFICATION-anchored IDs not in selected set
        element_fcat  — {element_id: 'F-1'|'F-2'|'F-obs'} advisory harness F-cat map
        warn_msgs     — advisory messages (not gate failures)
    """
    selected_ids = frozenset(
        sid.lower() for sid in (selected_h_ids + selected_pp_ids)
    )

    element_items: dict = {}  # element_id → list of per-item {is_f1, is_f2}
    unanchored: list = []
    warn_msgs: list = []

    for title, body in entries:
        element_m = _ELEMENT_RE.search(body)
        if not element_m:
            unanchored.append(normalise_title(title))
            continue

        element_id = element_m.group(1).lower()

        # Harness F-cat detection — advisory only, never gated
        claim_m = _CLAIM_RE.search(body)
        claim_text = claim_m.group(1).strip() if claim_m else ""
        is_f1 = (
            bool(_CLASS_ASSUMPTION_RE.search(body)) and bool(re.search(r"\d", claim_text))
        )
        is_f2 = (
            bool(_CLASS_INFERRED_RE.search(body)) and bool(_F2_ARITHMETIC_RE.search(body))
        )

        if element_id not in element_items:
            element_items[element_id] = []
        element_items[element_id].append({"is_f1": is_f1, "is_f2": is_f2})

    # Advisory F-cat per element: derived from all items for that element
    element_fcat: dict = {}
    for eid, items in element_items.items():
        if any(i["is_f1"] for i in items):
            element_fcat[eid] = "F-1"
        elif any(i["is_f2"] for i in items):
            element_fcat[eid] = "F-2"
        else:
            element_fcat[eid] = "F-obs"
            warn_msgs.append(
                f"Semantic only (advisory): element '{eid}' has JUSTIFICATION entry "
                f"but no harness-detectable F-1/F-2 structural signature"
            )

    covered_ids = frozenset(element_items.keys())
    uncovered_ids = sorted(selected_ids - covered_ids)
    extra_ids = sorted(covered_ids - selected_ids)

    if unanchored:
        sample = unanchored[:3]
        suffix = "..." if len(unanchored) > 3 else ""
        warn_msgs.append(
            f"{len(unanchored)} unanchored JUSTIFICATION item(s) (no Element: field) "
            f"— discretionary, not gated. Sample: {sample}{suffix}"
        )
    if extra_ids:
        warn_msgs.append(
            f"JUSTIFICATION entries anchor to non-selected element IDs {extra_ids} "
            f"— Element: field may reference a non-selected hypothesis or pain point"
        )

    return covered_ids, uncovered_ids, extra_ids, element_fcat, warn_msgs


def extract_candidate_pool(text: str) -> list:
    """Extract scored hypothesis entries from HTML score comments.

    Each entry: {id, title, impact, feasibility, alignment, product, class}
    The id field carries the canonical archetype ID when emitted; None otherwise.
    """
    h_blocks = list(_HYPOTHESIS_RE.finditer(text))
    pool = []
    for i, h_match in enumerate(h_blocks):
        start = h_match.end()
        end = h_blocks[i + 1].start() if i + 1 < len(h_blocks) else len(text)
        block = text[start:end]
        score_m = _SCORE_COMMENT_RE.search(block)
        if score_m:
            pool.append({
                "id": score_m.group(1),                # None if id= absent
                "title": normalise_title(h_match.group(1)),
                "impact": int(score_m.group(2)),
                "feasibility": int(score_m.group(3)),
                "alignment": int(score_m.group(4)),
                "product": int(score_m.group(5)),
                "class": score_m.group(6),
            })
        else:
            pool.append({
                "id": None,
                "title": normalise_title(h_match.group(1)),
                "impact": None, "feasibility": None, "alignment": None,
                "product": None, "class": None,
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
    """Warn if the scored candidate pool differs across runs."""
    issues = []
    if not any(pools_by_run):
        return ["No score comments found in any run — candidate pool metric unavailable. "
                "Ensure hypotheses carry <!-- score: ... --> comments."]
    ref_titles = frozenset(e["id"] or e["title"] for e in pools_by_run[0])
    for i, pool in enumerate(pools_by_run[1:], start=2):
        run_titles = frozenset(e["id"] or e["title"] for e in pool)
        added = run_titles - ref_titles
        removed = ref_titles - run_titles
        if added or removed:
            lines = [f"Candidate pool differs between run 1 and run {i} "
                     f"(WARN — pool divergence upstream of scoring):"]
            if removed:
                lines.append(f"  In run 1 pool but not run {i}: {sorted(removed)}")
            if added:
                lines.append(f"  In run {i} pool but not run 1: {sorted(added)}")
            issues.append("\n".join(lines))
    return issues


# ============================================================================
# Main
# ============================================================================

def run_stability_check(paths: list, strict: bool = False,
                        archetype: str = "recruitment") -> dict:
    """Run all stability checks across the provided dossier files.

    Selected-set comparison uses canonical IDs (AC1 / A2 + A1):
      - Keys on id= from score comments when present
      - Falls back to alias-normalised title for pre-v11 dossiers

    JUSTIFICATION check uses spine-derived floor (AC2 / B4):
      - Floor = frozenset of selected element IDs covered by ≥1 JUSTIFICATION anchor
      - FAIL on cross-run divergence of the covered element ID set
      - FAIL per-run if a selected element has no JUSTIFICATION entry (schema gap)
      - WARN on F-category flips across runs (advisory observability — not gated)
      - WARN on unanchored JUSTIFICATION items (no Element: field — discretionary)
      - WARN on JUSTIFICATION entries anchoring to non-selected element IDs
      - No global justification count band (retired FW-08 pattern avoided)

    Returns a result dict with keys: passed, fail_issues, warn_issues, per_run.
    """
    per_run = []
    for p in paths:
        try:
            text = p.read_text(encoding="utf-8")
        except Exception as e:
            return {"error": f"Cannot read {p}: {e}"}

        # Extract selected IDs first — used as the spine for floor derivation
        h_ids = extract_hypothesis_ids(text, archetype)
        pp_ids = extract_pain_point_ids(text, archetype)

        just_entries = extract_justification_entries(text)
        covered_ids, uncovered_ids, extra_ids, element_fcat, just_warns = \
            classify_justification_by_element(just_entries, h_ids, pp_ids)

        all_just_titles = [normalise_title(t) for t, _ in just_entries]

        per_run.append({
            "file": str(p),
            "hypothesis_ids":              h_ids,
            "pain_point_ids":              pp_ids,
            "hypothesis_titles":           extract_hypothesis_titles(text),
            "pain_point_titles":           extract_pain_point_titles(text),
            "justification_titles":        all_just_titles,
            "justification_floor_ids":     covered_ids,    # frozenset of element IDs
            "justification_uncovered":     uncovered_ids,  # selected IDs missing from JUSTIFICATION
            "justification_extra":         extra_ids,      # JUSTIFICATION anchors not in selected set
            "justification_element_fcat":  element_fcat,   # advisory F-cat per element
            "justification_warns":         just_warns,
            "candidate_pool":              extract_candidate_pool(text),
        })

    fail_issues = []
    warn_issues = []

    # FAIL: selected sets must be identical (keyed on canonical IDs)
    fail_issues.extend(check_set_stability(
        [r["hypothesis_ids"] for r in per_run], "Hypothesis selected set"
    ))
    fail_issues.extend(check_set_stability(
        [r["pain_point_ids"] for r in per_run], "Pain point selected set"
    ))

    # JUSTIFICATION: B4 spine-derived floor gate
    floor_counts = [len(r["justification_floor_ids"]) for r in per_run]
    if all(c == 0 for c in floor_counts):
        # No Element: anchors found — pre-v12 dossiers or missing fields
        warn_issues.append(
            "No JUSTIFICATION Element: anchors found in any run — cannot apply B4 gate. "
            "Checking [floor] title markers as legacy fallback."
        )
        legacy_floor = [
            [t for t in r["justification_titles"] if t.endswith("[floor]")]
            for r in per_run
        ]
        if all(len(f) == 0 for f in legacy_floor):
            warn_issues.append(
                "No [floor]-marked JUSTIFICATION items found either. "
                "Floor-subset stability cannot be checked. "
                "Falling back to full-set check for this batch."
            )
            fail_issues.extend(check_set_stability(
                [r["justification_titles"] for r in per_run],
                "JUSTIFICATION full set (pre-v10 fallback)"
            ))
        else:
            fail_issues.extend(check_set_stability(
                legacy_floor, "JUSTIFICATION floor set ([floor]-tag fallback)"
            ))
    else:
        # B4 path: gate on element ID coverage set
        fail_issues.extend(check_set_stability(
            [r["justification_floor_ids"] for r in per_run],
            "JUSTIFICATION element coverage"
        ))

        # FAIL: schema gaps — selected elements absent from JUSTIFICATION
        for r in per_run:
            if r["justification_uncovered"]:
                fail_issues.append(
                    f"{Path(r['file']).name}: {len(r['justification_uncovered'])} selected "
                    f"element(s) have no JUSTIFICATION entry (schema gap): "
                    f"{r['justification_uncovered']}"
                )

        # Advisory WARNs per run (unanchored items, extra anchors, semantic-only)
        for r in per_run:
            for w in r["justification_warns"]:
                warn_issues.append(f"{Path(r['file']).name}: {w}")

        # Advisory: cross-run F-category flip (observability — not a gate)
        all_element_ids: set = set()
        for r in per_run:
            all_element_ids.update(r["justification_element_fcat"].keys())
        for eid in sorted(all_element_ids):
            fcats = [
                r["justification_element_fcat"].get(eid, "absent")
                for r in per_run
            ]
            if len(set(fcats)) > 1:
                warn_issues.append(
                    f"F-category flip (advisory): element '{eid}' classified as "
                    f"{fcats} across runs — stable floor gate not affected"
                )

    # WARN: pool divergence is observability only
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
        lines.append(f"    Pain points selected:    {len(r['pain_point_ids'])}")
        lines.append(f"    Hypotheses selected:     {len(r['hypothesis_ids'])}")
        floor_ids = r.get("justification_floor_ids", set())
        uncovered = r.get("justification_uncovered", [])
        total_just = len(r["justification_titles"])
        lines.append(
            f"    Justification items:     {total_just}"
            f"  (covered elements: {len(floor_ids)}"
            + (f"  schema-gaps: {len(uncovered)}" if uncovered else "")
            + ")"
        )
        pool_scored = sum(1 for e in r["candidate_pool"] if e["product"] is not None)
        lines.append(f"    Candidate pool (scored): {pool_scored}")
        if r["candidate_pool"]:
            lines.append("    Candidate pool detail:")
            for e in sorted(r["candidate_pool"], key=lambda x: (-(x["product"] or 0))):
                score_str = str(e["product"]) if e["product"] is not None else "n/a"
                id_str = e["id"] or "–"
                lines.append(
                    f"      {score_str:>4}  {e['class'] or 'unknown':20}  "
                    f"{id_str:12}  {e['title']}"
                )
    lines.append("")
    lines.append("=" * 70)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Cross-run stability check for intake dossiers"
    )
    parser.add_argument(
        "files", nargs="+", help="Two or more dossier markdown files to compare"
    )
    parser.add_argument("--json", action="store_true",
                        help="Output JSON instead of human report")
    parser.add_argument("--archetype", default="recruitment",
                        help="Archetype key for alias registry (default: recruitment)")
    parser.add_argument(
        "--strict", action="store_true",
        help="Treat candidate pool divergence and discretionary variance (WARN) as FAIL"
    )
    args = parser.parse_args()

    paths = [Path(f) for f in args.files]
    if len(paths) < 2:
        print("ERROR: At least 2 dossier files are required for a stability check.",
              file=sys.stderr)
        sys.exit(2)

    missing = [p for p in paths if not p.exists()]
    if missing:
        for p in missing:
            print(f"ERROR: File not found: {p}", file=sys.stderr)
        sys.exit(2)

    result = run_stability_check(paths, strict=args.strict, archetype=args.archetype)

    if args.json:
        output = {k: v for k, v in result.items() if k != "per_run"}
        output["per_run_summary"] = [
            {
                "file": r["file"],
                "pain_points": len(r["pain_point_ids"]),
                "hypotheses": len(r["hypothesis_ids"]),
                "justification_items": len(r["justification_titles"]),
                "justification_covered_elements": len(r.get("justification_floor_ids", set())),
                "justification_uncovered": r.get("justification_uncovered", []),
                "justification_element_fcat": r.get("justification_element_fcat", {}),
                "candidate_pool_scored": sum(
                    1 for e in r["candidate_pool"] if e["product"] is not None
                ),
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
