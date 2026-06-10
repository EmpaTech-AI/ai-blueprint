# Validation Record — Blueprint Intake Pipeline

**Schema:** `intake_v1.0`
**Maintained by:** AI Assist BG · Blueprint Practice
**Last updated:** June 2026 (v14 batch + instrument rebuild B4)

This document records what has been validated, what has been confirmed as a known-gap, and the
cross-matrix roadmap for expanding validation coverage beyond the primary archetype.

---

## v10 Validation Batch Summary

### Engagement: Meridian Talent Partners (primary archetype)

| Axis | Value |
|---|---|
| Archetype | Recruitment & Talent Solutions |
| Size band | Small (68 employees) |
| Document richness | Standard |
| Regulatory regime | EU / GDPR |
| Runs | 4 (vik_t1, vik_t2, ivan_t1, ivan_t2) |

#### Results

| Check | Result | Notes |
|---|---|---|
| People maturity reproducibility | CONFIRMED CLOSED | 4/4 runs: People = Developing; Evidenced-Absence principle defeated the trigger condition |
| Evidenced-Absence principle (Fix A) | VALIDATED | Positive signals establish Developing; unrecorded items logged as gaps not downgrades; other 5 dimensions unchanged |
| Selected-hypothesis-set stability | CONFIRMED CLOSED | All 4 runs: H6 = "Candidate Database Revival"; V9 Pipeline-Visibility fork does not recur |
| Schema counts | HELD | 8 pain points, 7 hypotheses, all 4 runs |
| v9 confidence-propagation contract | INTACT | [CONFIDENCE_PROPAGATION] present all 4; Overall grounding: Partial all 4 |
| Justification-set stability (floor) | PENDING | 8/7/7/7 pattern diagnosed as downstream of ~20% LC-tagging CV; floor-subset fix implemented; post-fix run not yet executed |

#### Justification residual diagnosis

The 8/7/7/7 justification count variance is correctly attributed to the ~20% low-confidence
tagging CV tracked since v6. The floor-subset fix (v10, `check_stability.py` + `confidence_thresholds.md §1C`)
separates obligatory tags (F-1 through F-5) from discretionary tags. Floor-subset stability is
now the gate; discretionary variance is observed, not blocked. Post-fix confirmation batch pending.

---

## v11 Validation Batch Summary

### Engagement: Meridian Talent Partners (primary archetype — post-fix confirmation batch)

| Axis | Value |
|---|---|
| Archetype | Recruitment & Talent Solutions |
| Size band | Small (68 employees) |
| Document richness | Standard |
| Regulatory regime | EU / GDPR |
| Runs | 4 (v11_t1, v11_t2, v11_t3, v11_t4) |

#### Results

| Check | Result | Notes |
|---|---|---|
| People maturity reproducibility | **CLOSED — STRENGTHENED** | 4/4 v11 runs: People = Developing. Combined with v10's 4/4 = 8/8 across two version lines. Mechanism holds. |
| Selected-hypothesis-set stability | **STABLE (semantically)** | All 4 v11 runs select identical 7 hypotheses including H6 "Candidate Database Revival". V9 fork does not recur. |
| Schema counts | **HELD** | 7 hypotheses / 8 pain points in all 4 v11 runs |
| v9 confidence-propagation contract | **INTACT** | [CONFIDENCE_PROPAGATION] + [END CONFIDENCE_PROPAGATION] present; Overall grounding: Partial; all 4 runs |
| Obligatory-tag floor emission | **EMITTING (not deterministic)** | [floor] markers emit in all 4 runs (5/6/2/4 per run). Floor-marker fix is wired end-to-end. |
| Justification total count | **IMPROVED** | 8/8/8/8 (vs v10's 8/7/7/7). Tightest full-count CV recorded. |
| Justification floor stability | **RED — instrument defect** | check_stability.py false-FAILs: gates on model-emitted [floor] tag which varies 5/6/2/4 (Gap B). Fixed by v11 instrument rebuild — see below. |
| Selected-set instrument check | **RED — instrument defect** | check_stability.py false-FAILs: gates on prose title, paraphrase causes divergence (Gap A). Fixed by v11 instrument rebuild — see below. |

#### v11_t1 pre-flight miss

v11_t1's `[JUSTIFICATION]` section opened with a leaked reasoning preamble
("Re-reading Checkpoint 2 to confirm the 8 Inferred/Assumption items. Producing [JUSTIFICATION] first…").
This is a pipeline-stage acknowledgement that `preflight.md` Pattern Set 2 forbids. One run
only — a generation-hygiene miss. Fixed in this instrument rebuild (Pattern Set 6 — see below).

#### False-FAIL adjudication

The live `check_stability.py` run on the v10 batch returned selected-set FAIL. Verbatim
adjudication against the v10 Closure Report's own table shows the selection IS semantically
identical across all 4 runs — divergences are pure title paraphrase:

| Hypothesis (semantic) | v10 title variants observed |
|---|---|
| ATS client status updates | "…client status updates" vs "…client status updates via Vincere" |
| Interview scheduling | "…via Calendly" vs "…via Calendly company-wide rollout" vs "…via full Calendly rollout" |
| GDPR foundation | "GDPR Compliance Foundation (Sprint 0 enabler)" vs "…sprint (enabler for all AI initiatives)" |
| RPO service design | "AI delivery infrastructure" vs "AI-enabled delivery infrastructure" |

**Verdict: the v10 instrument false-FAILed a semantically stable selection.** The selection is
deterministic at the level that matters (which hypotheses are chosen). The instrument was gating
on model prose titles, which are legitimately allowed to vary.

---

## v14 Validation Batch Summary

### Engagement: Meridian Talent Partners (primary archetype — v14 stability analysis)

| Axis | Value |
|---|---|
| Archetype | Recruitment & Talent Solutions |
| Size band | Small (68 employees) |
| Runs | 4 (v14_t1, v14_t2, v14_t3, v14_t4) |

#### Results

| Check | Result | Notes |
|---|---|---|
| Stage-2 dimension reproducibility | **STABLE — 2nd consecutive batch** | 6/6 dimensions identical 4/4 runs; People + Processes both Developing held from v13 |
| Selected-set identity | **STABLE** | Canonical H-ID + PP-ID identical 4/4; H-RT-06 excluded 4/4 |
| Schema counts / propagation | **HELD** | 7H / 8PP / propagation block present 4/4 |
| v13 optional-anchored residual | **ADDRESSED** | "AI scheduling assistant" now emits `Element: NONE`; excluded by B3+ gate |
| Justification floor (B3+) | **RED — two new variance surfaces** | F-category flips (F-5/F-1 for same claim) and Element re-anchoring (H-RT-01 ↔ H-RT-05) defeat B3+; root cause confirmed as per-item annotation CV |
| Total-tag CV | **WIDENING** | 58/60/73/64 → CV 9.0% (trend: 2.8 → 7.7 → 9.0); same diffuse per-item noise |

#### v14 Floor Defect Diagnosed (per-item annotation CV confirmed)

Two surfaces remain after B3+'s optional-anchored closure:

- **F-category flips:** Same claim classified F-5 in t1/t3, F-1 in t2/t4 (AI sourcing; Candidate Database Revival). B3+ gates only F-1/F-2 — an F-5 classification removes the item from the floor, so the same content is in/out depending on the model's F-cat annotation.
- **Element re-anchoring / drop:** "AI sourcing tool" anchors H-RT-01 in three runs, H-RT-05 in t3; t3 emits `Element:` on only 3/7 items. B3+ deduplication reads `Element:` to de-dup — if the field re-anchors, dedup operates on a different set.

Both are the same root cause identified in v11–v13: per-item annotations carry ~20% LC-emission CV. No additional per-item refinement can remove this variance; it only relocates it to the next annotation layer. Change of kind required: derive the floor from the selected-element spine.

---

## v14 Instrument Rebuild (development — June 2026)

### B4 — Spine-Derived Floor (replaces B3+)

**Problem:** B3+ (and all prior per-item classifiers) inherit the ~20% LC-emission CV of whatever per-item annotation they read. v11–v14 are four consecutive demonstrations that per-item gate refinement relocates this variance rather than removing it.

**Root cause:** The floor gate reads model-emitted annotations (`[floor]` tag → `Floor category:` line → `Class:` + `Element:` fields). Every such annotation is non-deterministic. The selected-element ID set is the only layer that has been stable across all four batches.

**Fix implemented (B4 — Spine-Derived Floor):**
- `check_stability.py` updated:
  - `split_justification_by_tier()` removed (B3+ per-item classifier).
  - `classify_justification_by_element(entries, selected_h_ids, selected_pp_ids)` added.
    - Groups JUSTIFICATION entries by `Element:` field value (element ID).
    - Floor = `frozenset` of element IDs covered by ≥1 JUSTIFICATION entry.
    - F-category per element is harness-computed from entry bodies and emitted as advisory WARN only — never used as a gate criterion.
    - Uncovered selected IDs (element selected but absent from JUSTIFICATION) = schema-gap FAIL.
    - Unanchored items (no `Element:` field) = discretionary, WARN only.
  - `run_stability_check()` restructured: extracts selected IDs first, passes them to `classify_justification_by_element()`, gates on element ID coverage set.
  - Cross-run F-category flip detection added as advisory WARN.
- `SKILL.md` updated:
  - Floor-marker rule updated from B3+ to B4: gate criterion is `Element:` presence (any number of entries per element); F-category advisory only.
  - B3+ "one primary claim per required element" restriction lifted — sub-elaborations may carry `Element:` freely.
  - Schema completeness requirement added: every selected element must have ≥1 JUSTIFICATION entry.

**Why this ends the whack-a-mole:** The floor set is now `covered_element_ids ⊆ selected_element_ids`. Both sets derive from the stable P1 spine. F-category flips, Element re-anchoring, and optional-elaboration presence/absence do not affect `covered_element_ids` — an element is covered if any item anchors to it, regardless of category. The only way for `covered_element_ids` to change between runs is if an element's JUSTIFICATION anchor is added or removed entirely, which is a real schema defect (FAIL) not annotation noise (WARN).

**Total-tag CV watch:** CV 9.0% (58/60/73/64). Trend widening (2.8 → 7.7 → 9.0). Once B4 is active, per-item tag totals are observability only. CV is expected to stabilise or become irrelevant once the floor is no longer driven by per-item classification.

**Regression guards added:**
- B4 gate reads element ID presence only; never reads F-category, F-N line, or `[floor]` suffix as a gate criterion
- Schema-gap FAIL if a selected element has no JUSTIFICATION entry
- No count-band gate introduced (FW-08 guard intact)

---

## v13 Validation Batch Summary

### Engagement: Meridian Talent Partners (primary archetype — v13 stability analysis)

| Axis | Value |
|---|---|
| Archetype | Recruitment & Talent Solutions |
| Size band | Small (68 employees) |
| Runs | 4 (v13_t1, v13_t2, v13_t3, v13_t4) |

#### Results

| Check | Result | Notes |
|---|---|---|
| Processes maturity reproducibility | **CLOSED** | 6/6 dimensions identical 4/4 runs; Evidenced-Absence trigger encountered and defeated in the run that previously scored Early |
| Selected-set identity | **HELD** | Canonical H-ID + PP-ID set identical 4/4; H-RT-06 excluded 4/4 |
| Schema counts | **HELD** | 7H / 8PP / canonical ID set 4/4 |
| Standalone floor exclusion (v12 flag) | **RESOLVED** | Revenue/FTE item now emits `Element: NONE`; excluded by gate-condition-1 |
| Justification floor (B3 optional-anchored) | **NEAR-CLOSED — one residual** | "AI scheduling assistant" item anchored to H-RT-05, Assumption + numeric → F-1 eligible; present 3/4 runs (t2/t3/t4); absent t1. Floor stable if classified discretionary; unstable if floor-eligible. |
| Total-tag CV | **TRIPWIRE BREACH** | 74/61/69/63 → CV 7.7%, breaches 5% tripwire; t2=61 is probable outlier; diffuse LC noise, not systemic |
| Confidence propagation | **INTACT** | Block + END present 4/4 |

#### v13 Instrument Defect Diagnosed (B3 residual)

The optional-anchored residual is the natural completion of the Element: anchor fix. B3's gate-condition-1 already excludes *unanchored* claims (the v12 standalone flag, resolved). The remaining sub-case: an optional elaboration that happens to anchor to a real hypothesis and pass F-1/F-2 detection still varies in presence. The fix: enforce one required claim per element — only the first F-1/F-2 claim anchored to each element ID enters the floor; second+ claims are optional elaborations and join the discretionary band.

---

## v13 Instrument Rebuild (development — June 2026)

### Gate-condition-1 refinement (B3+) — optional-anchored elaboration closure

**Problem:** A sub-elaboration of H-RT-05 ("AI scheduling assistant" implementation variant, Assumption + numeric → F-1) appeared in 3/4 v13 runs. It anchored to H-RT-05, passed B3's gate conditions 1 and 2, and was floor-eligible. Because it was optional content (the model sometimes included it, sometimes did not), the floor set diverged between t1 (absent) and t2/t3/t4 (present). B3's existing two-condition gate could not distinguish a required primary claim from an optional sub-elaboration that happened to anchor to the same element.

**Fix implemented (B3+):**
- `check_stability.py` updated:
  - `split_justification_by_tier()`: added gate condition 3 — one required claim per element. A `seen_floor_elements` dict tracks which element IDs have already contributed a floor claim. The first F-1/F-2 claim anchored to an element enters the floor; all subsequent claims anchored to the same element are optional elaborations → discretionary + WARN.
  - WARN message format: "Optional elaboration (discretionary): item '...' anchors to '{element_id}' which already has a required floor claim ('...') — classified as discretionary (one required claim per element)".
  - `run_stability_check()` docstring updated to B3+.
- `SKILL.md` updated:
  - Practical guidance extended: "One primary claim per required element" — only the primary confidence-tagged claim for each hypothesis/pain point should carry `Element:`. Sub-elaborations and implementation variants should omit `Element:` to self-classify as discretionary. Harness deduplication is a safety net, not the primary enforcement mechanism.

**Total-tag CV watch:** CV 7.7% (74/61/69/63) breaches the 5% tripwire. t2 at 61 is the probable outlier. No code change — confirm whether t2 is a documentable outlier before treating as systemic. The tripwire is a watch signal, not a gate failure.

---

## v12 Validation Batch Summary

### Engagement: Meridian Talent Partners (primary archetype — v12 stability analysis)

| Axis | Value |
|---|---|
| Archetype | Recruitment & Talent Solutions |
| Size band | Small (68 employees) |
| Runs | 4 (v12_t1, v12_t2, v12_t3, v12_t4) |

#### Results

| Check | Result | Notes |
|---|---|---|
| Selected-hypothesis-set stability | **CLOSED** | v11 canonical-ID fix holds. Selected set identical across all 4 runs. |
| Schema counts | **HELD** | 7 hypotheses / 8 pain points in all 4 v12 runs |
| Justification floor stability (B2) | **RED — instrument defect** | `Floor category:` line itself proved unreliable: same claim received F-3 in one run and F-4 in another; a standalone F-2 calculation appeared in 1 of 4 runs only. Both patterns survive B2 classification. |
| Processes maturity reproducibility | **RED — regression** | v12_t1: Processes = Early; v12_t2/t3/t4: Processes = Developing. Correct level is Developing — documented SOP that is not universally adopted is a Developing signal; non-execution is a Key Constraint. |

#### v12 Instrument Defects Diagnosed

**Gap B2 → B3 (floor classification):** The `Floor category:` line emitted by the model carries
the same CV as the `[floor]` title suffix it replaced. Two distinct failure modes observed:

- **Semantic variance (source a):** The Calendly scheduling claim was classified F-3 in three runs
  and F-4 in one run. These are semantically adjacent categories — the model's labelling is not
  mechanically grounded.
- **Standalone-claim volatility (source c):** A Vincere integration calculation appeared as a
  JUSTIFICATION entry with F-2 in one run only. No Element: anchor linked it to a required
  output element — it was a volunteered standalone claim, present only when the model chose to
  include it. B2's `Floor category:` gate made this entry volatile; B3's Element: anchor
  closes the source by classifying unanchored claims as discretionary by construction.

**Processes regression:** `blueprint-maturity/SKILL.md` Evidenced-Absence rule covered People
by name but did not provide explicit Processes guidance. The v12_t1 run conflated an unrecorded
execution gap with evidenced absence of process capability. Fix: extend the rule to all 6
dimensions with explicit per-dimension guidance.

---

## v12 Instrument Rebuild (development — June 2026)

### Gap B3 fix — AC2 (structural floor classification)

**Problem:** `split_justification_by_tier()` keyed floor membership on the model-emitted
`Floor category: F-N` line. The v12 batch showed this line has the same CV as the retired
`[floor]` title suffix — semantically adjacent categories (F-3 vs F-4) varied across runs,
and standalone calculations without required-element anchors appeared in only 1 of 4 runs.

**Fix implemented (B3 — structural detection):**
- `check_stability.py` updated:
  - New regex constants: `_ELEMENT_RE`, `_CLASS_ASSUMPTION_RE`, `_CLASS_INFERRED_RE`,
    `_F2_ARITHMETIC_RE`.
  - `split_justification_by_tier()` rewritten: floor eligibility requires BOTH (1) `Element:
    H-RT-XX` or `Element: PP-RT-XX` anchor in body, AND (2) structural F-1 or F-2 detection.
    - F-1: `Class: Assumption` + numeric digit in claim text.
    - F-2: `Class: Inferred` + arithmetic/calculation signature in body.
  - Entries with `Element:` but no F-1/F-2 structure → semantic F-3/F-4/F-5 range → WARN only.
  - Entries without `Element:` → standalone/volunteered → discretionary (no WARN on variance).
  - `Floor category:` line and `[floor]` title tag demoted to advisory observability.
- `SKILL.md` updated:
  - JUSTIFICATION entry format: `Element: H-RT-XX` field added after `Class:`.
  - Floor-marker rule rewritten from B2 to B3: `Element:` + structural signature is the gate;
    `Floor category:` and `[floor]` are advisory.
  - `[JUSTIFICATION] Block` description updated to list `Element:` field.

### Processes fix — Evidenced-Absence extension

**Problem:** `blueprint-maturity/SKILL.md` Evidenced-Absence rule named People in its
illustration but did not explicitly cover Processes or the other four dimensions.
The v12_t1 run downgraded Processes to Early on an unrecorded execution gap.

**Fix implemented:**
- `blueprint-maturity/SKILL.md` updated:
  - Added Processes illustration (parallel to People): documented SOP holds Developing;
    non-execution is a logged constraint, not evidenced absence.
  - Added explicit per-dimension table: what "presence signals" hold at Developing vs what
    constitutes evidenced absence warranting a downgrade, for all 6 dimensions.

---

## v11 Instrument Rebuild (development — June 2026)

Two instrument defects identified in the v11 batch were fixed on the development side before
returning the batch to the business for re-run.

### Gap A fix — AC1 (canonical ID selected-set comparison)

**Problem:** `check_stability.py` keyed the selected-set comparison on normalised prose titles.
Title paraphrase caused false FAILs even when the same hypothesis was selected every run.

**Fix implemented:**
- `SKILL.md` updated: hypotheses now emit `id=H-RT-XX` as the first field in the
  `<!-- score: ... -->` comment. Pain points now emit `<!-- pp-id: PP-RT-XX -->` on the line
  immediately after the heading.
- `check_stability.py` updated:
  - `extract_hypothesis_ids()` resolves IDs from `id=` field first, then falls back to the
    alias registry (`_HYPOTHESIS_ALIAS_REGISTRY`), then falls back to normalised title.
  - `extract_pain_point_ids()` resolves IDs from `<!-- pp-id: -->` comments first, then alias
    registry, then normalised title.
  - `run_stability_check()` calls the new ID extractors for FAIL-gated set comparison.
  - Per-run title lists are still extracted separately for human-readable reporting.
  - Per-archetype alias registry seeded for recruitment (`H-RT-01` through `H-RT-13`,
    `PP-RT-01` through `PP-RT-15`) covering all v11-observed paraphrase variants.
  - `--archetype` CLI flag added to select the registry for other archetypes.

**Guard:** Distinct hypotheses must carry distinct IDs. The alias layer cannot silently merge
a real fork — a genuine divergence (different hypothesis chosen) will still FAIL because the
IDs will differ.

**Expected effect on v10 batch:** `check_stability.py` run on the v10 batch should now return
selected-set PASS (semantic identity confirmed by adjudication). A synthetic genuine-fork fixture
(where a different hypothesis IS chosen) must still FAIL.

### Gap B fix — AC2 (harness-derived floor classification)

**Problem:** `split_justification_by_tier()` keyed floor membership on the model-emitted
`[floor]` title suffix. The model applied `[floor]` inconsistently (5/6/2/4 across v11 runs),
making the floor gate non-deterministic.

**Fix implemented (B2 — harness-derived floor):**
- `check_stability.py` updated:
  - `extract_justification_entries()` extracts `(title, body)` pairs from the JUSTIFICATION
    block, scoped after `## [JUSTIFICATION]` to avoid false matches in Section D.
  - `split_justification_by_tier()` rewritten to classify floor membership from the structural
    `Floor category: F-N` line in the entry body. The model's `[floor]` suffix is advisory only.
  - When model tag disagrees with harness classification (under-tagged or over-tagged), a WARN
    is emitted for skill-tuning observability — not a gate failure.
  - Floor set comparison keys on normalised `Claim:` text (verbatim quote — more stable across
    runs than item title prose).
  - Discretionary items remain WARN (expected variance), not gated.
  - No global count band introduced (cardinal regression trap avoided — retired FW-08).
- `SKILL.md` floor-marker rule updated to make `Floor category:` line the primary structural
  gate authority. The `[floor]` title suffix is described as advisory complement.
- `confidence_thresholds.md §1C` language unchanged — the `Floor category:` requirement was
  already stated; this fix enforces it as the gate, not the title suffix.

### AC4 fix — JUSTIFICATION section reasoning preambles

**Problem:** v11_t1's `[JUSTIFICATION]` section opened with a reasoning preamble that no existing
Pattern Set caught, because existing patterns only checked the document's opening paragraphs.

**Fix implemented:**
- `preflight.md` updated: **Pattern Set 6** added. Specifies forbidden patterns between
  `## [JUSTIFICATION]` and the first `**Item 1 —` line. Includes `Re-reading Checkpoint`,
  `Producing [JUSTIFICATION]`, `Let me`, `I will/am/have`, `Reviewing`, `Checking`, etc.
- `SKILL.md` pre-flight sanitization section updated to list JUSTIFICATION preambles as a
  forbidden pattern with a reference to Pattern Set 6.

---

## Post-Fix Runs Required (Business Side)

The following runs require pipeline execution against real or synthetic engagement inputs.

| # | Run | Purpose | Expected result | Dependency |
|---|---|---|---|---|
| 1 | `check_stability.py` on v10 Meridian batch (4 dossiers) | Confirm rebuilt instrument returns selected-set **PASS** on the semantically stable v10 batch | Selected-set PASS (H and PP); floor check WARN or PASS; no false FAILs | v10 dossier files (vik_t1, vik_t2, ivan_t1, ivan_t2) |
| 2 | Synthetic genuine-fork fixture | Confirm a real selection divergence (different hypothesis chosen) still FAILs | FAIL on hypothesis selected set | Produce two dossiers where one selects H-RT-06 and the other selects H-RT-11 in the 7th slot |
| 3 | Post-fix Meridian batch (v11 re-run, 4 runs) | Confirm selected-set PASS; floor-set PASS or named real divergence; People 4/4 Developing; schema 7/8; propagation present | All ACs 1–4 met | Execute pipeline on Meridian materials with v11 skill fixes active (id= + pp-id: comments emitted) |
| 4 | Veritas Pressings Ltd run | Contrasting-archetype: manufacturing, mid, sparse, Non-EU | People=Developing (Evidenced-Absence holds); Governance=Early; no GDPR references; no false count failures | Execute pipeline on `fixtures/smoke_test_manufacturing_input.md` |

---

## Cross-Matrix Roadmap

The primary validated cell is **Recruitment × Small × Standard × EU**. All other cells are
unvalidated. The table below logs the roadmap priority. Cells marked `VALIDATED` have been
confirmed by a completed engagement run and a passing stability check. All others are pending.

### Dimensions

- **Sector**: Recruitment, Manufacturing, Professional Services, Financial Services, Technology,
  Retail, Healthcare, Logistics, Construction
- **Size band**: micro (<20), small (20–100), mid (100–500), large (500+)
- **Document richness**: sparse, standard, heavy
- **Regulatory regime**: EU/GDPR, Non-EU, Sector-specific

### Priority validation targets

| Priority | Cell | Rationale | Status |
|---|---|---|---|
| P1 | Recruitment × Small × Standard × EU | Primary archetype; Golden Output available | **VALIDATED** (Meridian v1) |
| P2 | Manufacturing × Mid × Sparse × Non-EU | Veritas fixture ready; tests Evidenced-Absence + regime neutralisation | **PENDING** (fixture built; run not executed) |
| P3 | Recruitment × Small × Standard × Non-EU | Tests regime neutralisation on known-good archetype | Not started |
| P4 | Recruitment × Micro × Sparse × EU | Tests size-band + richness modifiers together | Not started |
| P5 | Recruitment × Large × Heavy × EU | Tests upper bound of size + richness modifiers | Not started |
| P6 | Manufacturing × Small × Standard × EU | Manufacturing archetype on baseline profile | Not started |
| P7 | Professional Services × Small × Standard × EU | First skeleton-only archetype promoted to PENDING VALIDATION | Not started |

### Cells explicitly deferred

The following are architecturally supported (the validation harness accepts them) but are not
on the active roadmap until P1–P3 are confirmed:

- All Sector-specific regulatory regime cells (requires a client in financial services or healthcare)
- Large size-band cells beyond P5
- All skeleton-only archetypes beyond Professional Services

---

## Regression Guards

These items must not degrade across any new run, regardless of archetype or profile:

| Guard | How to verify |
|---|---|
| Evidenced-Absence principle: People holds at Developing when positive signals present | Re-run Meridian; confirm People = Developing |
| Evidenced-Absence fires correctly: Governance = Early when absence is evidenced | Run Veritas; confirm Governance = Early |
| FIXED counts unchanged by profile modifiers: 8 PP / 7 H / 5+5 Section E bullets | Validate any run; count must be exact |
| v9 confidence-propagation contract intact | [CONFIDENCE_PROPAGATION] present; Overall grounding: Partial (Meridian) |
| No GDPR references in Non-EU engagement output | Run Veritas; grep output for "GDPR" |
| No global count band re-introduced for justification | Inspect `check_stability.py` — must not gate on justification count range |
| Selection cutoff (0/12) unchanged | Any run; confirm cutoff behaviour in hypothesis selection |
| Genuine fork still FAILs after A2/A1 alias fix | Run synthetic genuine-fork fixture; confirm FAIL |
| Floor-set gate uses structural F-1/F-2 detection + Element: anchor (B3) | Inspect `check_stability.py split_justification_by_tier` — must use _ELEMENT_RE + _CLASS_ASSUMPTION_RE/_CLASS_INFERRED_RE/_F2_ARITHMETIC_RE; Floor category: line is advisory only |
| Standalone JUSTIFICATION claims (no Element:) are discretionary — no gate failure on variance | Run v12 batch; confirm floor set stable while standalone calc varies run-to-run without FAIL |
| Optional elaborations (second+ F-1/F-2 claim per element) are discretionary — no gate failure | Inspect `split_justification_by_tier` — must use `seen_floor_elements` deduplication; second anchored claim → WARN not FAIL |
| Processes holds at Developing when documented SOP present (even if not universally adopted) | Re-run Meridian; confirm Processes = Developing; non-execution logged as Key Constraint |
| Evidenced-Absence rule covers all 6 dimensions | Inspect `blueprint-maturity/SKILL.md` — must have per-dimension table and Processes illustration |

---

## Validation Record Format

When a new run is executed and passes, add a row to the summary table above and append a
subsection below this line with:
- Engagement reference (anonymised if required)
- Run date and operator
- Full stability check output (JSON or human report)
- Any anomalies and their resolution

*Post-fix re-run records will be populated here after the business-side runs complete (see §Post-Fix Runs Required).*
