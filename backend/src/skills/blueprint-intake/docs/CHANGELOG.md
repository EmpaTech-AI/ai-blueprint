# PIO Framework Changelog

All notable changes to this framework are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this framework adheres to semantic versioning per `OPERATIONS.md`.

---

## [2.3.0] — 2026-08-03 — v37.5: exact-match class swept · B3 routed · S4 anchors rendered

Responds to the LunaCart v1.1 amended verdict and the six-batch comparison (both 2026-08-03).
v1.1 scored **88%, equal to Meridian v38, on a non-archetype case**, harm 1.86 (lowest in the programme).

### Added
- **`utils/enumNormalise.ts`** — one normaliser for every guard that compares model-produced text. The
  audit (Practice item 4) found the exact-match defect in **four more places** than the two known:
  A13 rating, A12 severity, **A4 flag firing** (which failed in the report-clean direction — an
  annotated flag would under-count and log `agreed: true`), and A9 flag equality.
- **A16c exclusion provenance** — `band1_pool` is an archetype CORE-columns value, so an exclusion must
  have a root. No archetype + exclusions present is a BLOCKER, because unlike A4/A9's unavailability it
  changed the output. Verified against the real `recruitment.md`.
- **`[SELF_AUDIT]` block** (`blueprint-opportunities/SKILL.md`) — B3 fixed by ROUTING after six batches
  of failed instruction. The SKILL instructs the model using rule identifiers, so it cites them back;
  the audit narration had no channel and landed in the deliverable. Now stripped for delivery.
- **A18 `renderPhaseAnchors`** — S4 anchors RENDERED, not instructed. Six batches unstable
  (4/5/5/5 · 5/6/9/8 · 5/3/8/9). `stripConfidenceTags` deletes the anchor before delivery, so it is a
  grading assertion, not client prose — the app is the right place to assert it.
- **`fixtures/lunacart_archetype_free_golden.md`** + `archetypeFreeGolden.test.ts` — LunaCart pinned as
  the PERMANENT archetype-free golden. The test fails if any ACTIVE archetype claims retail/e-commerce,
  if every industry becomes ACTIVE, or if an archetype file starts carrying `H-LC-*` IDs.

### Changed
- **A17a entity identity** — fixed (Practice item 7) rather than demoted to advisory (item 1), so it
  stays a BLOCKER. Only DECLARED form metric fields establish a band; `parseQuantity` type-checks the
  quantity kind so a percentage never satisfies currency and currency never satisfies a count.
- The engineering-identifier detector now **quotes the match and its line**. For six batches it named
  only the class — B3 was a defect report with no locus.
- Marker parser: values run to the next `key=` boundary, so multi-word values are no longer truncated.

### Notes
- Pipeline label **v37.4 → v37.5**. Parent build v37.4 `sha=84b3029`.
- **379 tests, 13 suites.** Justification: `rework_docs/2026-08-03_v37_5_Remediation_Justification.md`.
- **Grading impact:** three metrics change MEANING — see
  `rework_docs/2026-08-03_v37_5_Grading_Impact_Notice.md` before scoring the next batch.
- **Open and outranking everything:** Meridian has not run since v38. Every v37.4/v37.5 change was
  diagnosed on LunaCart.

---

## [2.2.0] — 2026-08-03 — v37.4: F13a/F13b spec closure + fail-loud guard layer (LunaCart TC1)

### Added
- **`[DATA_INVENTORY]` Stage-1 block** (`SKILL.md`) — the counted root for the PP-CORE-00 severity
  gate and the Stage-2 Data dimension. Three tables (Core Systems, Integrations, Record Classes)
  plus a `<!-- inventory: -->` computed marker. Tables are the root, the marker is derived, so a
  model that miscounts its own table is caught.
- **A11–A15 relational guards** (`backend/src/utils/inventoryGuards.ts`) — coverage arithmetic, PP-0
  severity from coverage, Data grade from record classes, active-integration integrity, referential
  integrity. **Archetype-independent by construction**, so they run on every case including the six
  SKELETON industries.
- **A16 pool-exclusion guard** — `band1_pool=no` exclusions vs PP-0 severity, deliberately asymmetric
  (see `references/algorithms/hypothesis_selection.md`).
- **A17 / F12 financial reconciliation** (`backend/src/utils/financialReconciliation.ts`) —
  form-vs-document numeric divergence, derived-financial arithmetic, divergence table per run.
- **G1–G3 Established governance gate** (`blueprint-maturity/SKILL.md` D4 Step 4).
- **`fixtures/band3_calibration.md`** extended with a full inventory — the only case in the kit that
  exercises C1 `>60% + reconciling SSOT` and `Data = Established`.

### Changed
- **F13b — `_core.md` §2 C1 redefined.** "zero or near-zero active integrations between core systems"
  → **Integration Coverage = active ÷ (n_core − 1)**, thresholds ≤25% / >25–60% / >60%. Ratios only;
  a count threshold is architecture-dependent.
- **F13a — D4 D2 redefined.** The word "primary" was **removed, not defined** — it does not survive a
  multi-source architecture. Replaced by per-record-class rating + priority-weighted aggregation.
  The same undefined phrase in the **Evidenced-Absence table** was corrected in the same pass.
- Class-G guards fail loudly with distinguishable causes; C1 declares per-family coverage.
- `stripJustification` made drift-tolerant; scaffold detector now derives from one registry.
- GATE-4 "Phase 1: Now appears empty" false fire fixed (tested for bold; the contract emits H3
  headings and table rows).
- Reviewer-flag panels carry a `RUN: index=` stamp.

### Notes
- Pipeline label bumped **v37.3 → v37.4** (`backend/package.json`).
- Justification: `rework_docs/2026-08-03_v37_4_F13_SpecClosure_and_FailLoud_Justification.md`.

---

## [2.1.0] — 2026-07-22 — Era-N remediation, Wave 2 (adjudicated plan, Steven 2026-07-22)

### Added
- **Pre-registration discipline**: `harness/expected/BP-TEST-001_v1_1_expected.json` (signed
  expected-outputs manifest — selection, markers, Stage-3 scores, maturity, band, phase map,
  names, CR register) + `harness/check_expectation.py` (mechanical run-vs-expectation diff;
  detects KR2 drops, KR3 deadline overrides, and T-30 splits)
- **Three-seed safety battery**: `harness/tests/test_seeded_battery.py` — seeds the H-RT-04
  drop, the H-RT-07 deadline defer, and an H-CORE-00 two-row split into conforming artifacts
  and asserts each is CAUGHT (5/5 passing incl. two PASS controls)
- **Schema-derived permit manifest**: `harness/permit_manifest_intake_v1_1.json` — the app-layer
  re-keying input (permit lists, detectors, renderer contract; token-based S5 strip incl.
  flattened-heading forms — the Era-N T2 breach class)
- OPERATIONS.md: four-layer Version-Event Checklist Amendment (skills / harness / app
  instrumentation / pre-registered expectations — never split again)

### Changed
- **KR3 pin (REG-20)**: roadmap imminence rule — imminent or passed deadlines NEVER defer;
  GATE-4 deadline audit line
- **KR2 pin (REG-19)**: absorption whitelist at the selection step (`h0_consumer=yes` is the
  only absorption mechanism; H-RT-04/H-RT-07 never absorbed; top-7 completeness assertion) +
  Checkpoint-2 assertion line
- **Heading contracts (T-32 support)**: explicit mandatory heading skeletons for Stage 2 and
  Stage 4 (H2 sections, H3 dimensions/opportunities) so contract and allowlist agree
- **Build stamp (T-07)**: assembly template stamp values are supplied-by-bundle, never a typed
  constant; `unknown` beats a wrong label
- Golden Section H: contradiction register rows now carry CR-1…CR-5 identifiers (A-16)

Full-spine regression after all contract edits: gate PASS · validator 8/8 · stability PASS ·
expectation-vs-golden PASS (0 warns) · seeded battery 5/5.

---

## [2.0.0] — 2026-07-21 — `intake_v1.1` version event (CORE pattern / ARIA enhancement)

Transcribes the Meridian Golden Benchmark v1.1 §A encoding register (18 items; Practice
confirmation 2026-07-20). All 5 pipeline skills + orchestrator + validators + the golden anchor
bumped together. Prose-era transcription (P2); ADR-001 render-from-contract remains the committed
terminal architecture.

### Added
- `archetypes/_core.md` — universal CORE pattern: PP-CORE-00 (instantiation gate, absorption/tombstone),
  H-CORE-00 (gated reserved slot, promotion gate), band decision table, v1.1 severity enum
- `references/intake_v1.1.md` — new schema (v1.0 kept for lineage; schema-aware validation)
- `blueprint-aria-spec` skill (Layer B, post-Gate-5, read-only) + 3 band Build Sheet goldens
- `[BAND_ASSIGNMENT]` block in blueprint-maturity + `check_band_assignment()` validator
- INTAKE_FACTS fields `INTEGRATION_STATUS`, `ORG_FRICTION_SIGNAL` + `check_intake_facts()`
- Section H expected-contradictions register (CR-IDs) + cross-run CR-ID comparison in `check_stability.py`
- `fixtures/band2_calibration.md`, `fixtures/band3_calibration.md` (anti-fabrication test)
- `docs/DELIVERY_RUNBOOK_N2.md` — the n=2 delivery double-run protocol
- preflight Pattern Set 8 (product/tier language forbidden in diagnostic stages)

### Changed
- Pain-point selection: Stage 0 eligibility filter (process/organisational/product-gap),
  PP-0 gate + 2-emergent accounting, PP-0→form-order→score ordering contract
- Hypothesis selection: `band1_pool`/`h0_consumer` pool filters, Stage 4b H-0 reserved slot,
  H-0 slot-0 presentation; H-RT-10 re-anchored (3×3×5, re-scoped BD+RPO support)
- Golden anchor regenerated (v1.1, full machine spine: pp-ids, 14-field markers, INTAKE_FACTS,
  17-entry canonical JUSTIFICATION); `examples/` duplicate retired (single-anchor rule)
- JUSTIFICATION format unified to `#### N. [Tag]` everywhere (schema §4.12, preflight PS6,
  `check_stability.py` parser); linkage rule extended (strategic-priority anchor)
- Roadmap capacity: Now/Next capped at 3, Later uncapped; GATE-4 counts 7-or-8
- `gate.sh`: working-interpreter detection (Windows Store alias stubs skipped)
- `example_materials.json`: fictional company renamed (Borealis) — S-26/S-33-class collision removed

---

## [1.0.0] — May 2026

Initial release.

### Added

- **Schema spec `intake_v1.0`** — locks structure, count policies, mandatory fields per section
- **Selection algorithms** — deterministic procedures for pain point selection (8 fixed) and hypothesis selection (7 fixed)
- **Ordering rules** — within-section item ordering deterministic by severity, evidence, impact area, alphabetical tie-break
- **Citation rules** — one tag per claim; multi-source via semicolon-separated brackets
- **Source registry** — canonical names for all 8 PDF categories + 7 form sections; alias mapping
- **Confidence threshold rules** — decision tree for the four tags + section-level confidence scoring
- **Pre-flight sanitization** — strips test metadata, leaked preambles, forbidden phrases before validation
- **Archetype Index** — industry router mapping detected industry to archetype file
- **Recruitment archetype** — ACTIVE; KPI taxonomy, 15-item pain point library, 13-item hypothesis library, defaults
- **Skeleton template** — starting point for adding new industry archetypes
- **Golden Output (Meridian)** — canonical Compressed Client Dossier; serves as regression-test target
- **Validation harness** — Python validator enforcing every schema rule, ~430 lines
- **Test suite** — 8 test cases covering the documented TEST 1 / TEST 2 failure modes
- **Operations guide** — versioning, deployment path, disaster recovery
- **Contributing guide** — how to add new industry archetypes

### Built To Address

The seven defects identified during the TEST 1 vs TEST 2 audit:

1. ✅ No locked schema → `schema/intake_v1.0.md` with FIXED/BOUNDED/GATED count policies
2. ✅ No ordering algorithm → `schema/algorithms/ordering.md`
3. ✅ No selection algorithm → `schema/algorithms/pain_point_selection.md` and `hypothesis_selection.md`
4. ✅ No citation density rule → `schema/citation_rules.md`
5. ✅ No source-name normalization → `schema/source_registry.md` with canonical names + aliases
6. ✅ No pre-flight sanitization → `pipeline/preflight.md` + harness enforcement
7. ✅ No industry-specific reference frame → `archetypes/` library with INDEX router

### Validation Status

- Golden Output `recruitment_meridian_v1.md` validates clean against `intake_v1.0`
- Test suite: 8 of 8 tests passing
- Coverage: catches test metadata leaks, preamble leaks, malformed tags, non-canonical sources, FIXED-count violations, orphan appendix references

### Known Gaps

- Only the Recruitment archetype is ACTIVE. Manufacturing, Professional Services, Financial Services, Technology, Retail, Healthcare, Logistics, Construction are present as skeleton-only routings.
- Harness defaults to Recruitment archetype bands; per-archetype runtime configuration is a Minor-version target.

---

## [1.1.0] — June 2026

v10 batch validation work: People-fix closure, selection-fork closure, justification-layer fix,
profile-relative validation, regulatory regime neutralisation, contrasting-archetype fixture.

### Added

- **`harness/check_stability.py`** — new cross-run stability harness; checks hypothesis set,
  pain point set, and JUSTIFICATION floor-set stability across multiple runs of the same
  engagement; candidate pool emitted as observability metric; `--strict` promotes WARNs to FAIL
- **`harness/validate_intake.py`** — manufacturing archetype defaults; generic fallback archetype;
  size-band modifiers (micro/small/mid/large); richness-tier modifiers (sparse/standard/heavy);
  `--size-band` and `--richness` CLI flags; mandatory header field detection with warnings
- **`archetypes/INDEX.md`** — validator key column; manufacturing status updated to PENDING VALIDATION
- **`fixtures/smoke_test_manufacturing_input.md`** — Veritas Pressings Ltd contrasting-archetype
  smoke test fixture (manufacturing, mid, sparse, Non-EU); targets: People=Developing,
  Governance=Early, no GDPR references, no false count failures
- **`references/confidence_thresholds.md §1C`** — Obligatory-Tag Floor: five floor categories
  (F-1 through F-5), floor marker protocol (`[floor]` suffix + `Floor category:` line),
  floor vs discretionary distinction for cross-run stability
- **`docs/validation_record.md`** — v10 validation batch summary and size × sector × richness
  × regime cross-matrix roadmap

### Changed

- **`blueprint-maturity/SKILL.md`** — Evidenced-Absence rule codified with Meridian illustration;
  regulatory-regime instruction added to Governance scoring
- **`blueprint-intake/SKILL.md`** — mandatory header fields (Industry Archetype, Company Size Band,
  Document Richness, Regulatory Regime) with operator-declared vs auto-detected resolution logic;
  archetype routing table updated; JUSTIFICATION entry format updated with floor-marker rule
- **`archetypes/recruitment.md`** — PP-RT-07 and H-RT-07 renamed to regime-neutral language
  ("data protection compliance risk/foundation" replacing "GDPR risk/foundation")
- **`references/algorithms/hypothesis_selection.md`** — worked example updated to match renamed H-RT-07
- **`references/algorithms/pain_point_selection.md`** — worked example updated to match renamed PP-RT-07
- **`references/algorithms/ordering.md`** — explanatory enabler example updated to regime-neutral language
- **`harness/check_stability.py`** JUSTIFICATION check — now gates on floor-subset stability only;
  discretionary band logged as WARN; pre-v10 dossiers without `[floor]` markers fall back to
  full-set check with a warning

### Validation Status

- v10 Meridian batch (n=4): People fix confirmed end-to-end (trigger encountered and defeated);
  hypothesis selected-set stable (H6 = "Candidate Database Revival" all 4 runs);
  pain point selected-set stable; schema counts 8/7 held
- Justification residual diagnosed: 8/7/7/7 pattern is downstream of ~20% LC-tagging CV;
  floor-subset fix implemented; post-fix Meridian batch and Veritas run pending (business-side)
- `check_stability.py` instrument ready; V10 batch run pending (dossier files on business side)

### Known Gaps (carried to next iteration)

- Post-fix Meridian batch run (AC4): requires executing the pipeline on Meridian materials
- Veritas contrasting-archetype run (AC5): requires executing the pipeline on the Veritas fixture
- Manufacturing Golden Output: archetype is PENDING VALIDATION; no validated Golden Output yet
- Cross-matrix validation beyond Meridian/small/standard/EU: logged as roadmap in validation_record.md

---

## Future Versions (Planned)

### [1.1.0] — Manufacturing archetype

Add Manufacturing archetype with full KPI taxonomy, pain point library, hypothesis library, and a Golden Output dossier built against a representative manufacturing client (likely Baros Vision–class precedent).

### [1.2.0] — Per-archetype harness configuration

Make the validation harness load archetype defaults at runtime rather than hardcoding Recruitment values. Each archetype file defines its own count bands.

### [2.0.0] — Schema iteration (planned 6-month review)

After 6 months of operational use, review schema for refinements suggested by field experience. Potential changes (subject to review):

- Section structure adjustments
- New mandatory fields
- Refined count policies based on observed dossier patterns

Any v2.0 release will include a migration guide for v1.x dossiers.
