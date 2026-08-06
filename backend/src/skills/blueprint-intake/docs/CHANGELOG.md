# PIO Framework Changelog

All notable changes to this framework are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this framework adheres to semantic versioning per `OPERATIONS.md`.

---

## [2.7.0] — 2026-08-06 — v37.9: the five-item micro-release, held ahead of TC3

Responds to the **fourteen-batch cross-era report** and the Practice's sequencing decision: hold TC3
(VelocityFreight, a first-ever batch with no baseline) until instance 20's false-fire class is closed,
because freight vocabulary is dense in exactly that shape — EUR2 pallets, FTL/LTL, 24/7, ISO codes, M365.

### Changed
- **Instance 20/20b — a digit inside an alphanumeric identifier is not a quantity.** `B2B` produced a
  phantom €2.0B (Luna 4/4) and `M365` a headcount of 365 (Meridian 2/4). One lookbehind on the numeric
  token. **The first attempt was wrong and the new tests caught it within the hour:** `(?<![A-Za-z])`
  rejects the position after a letter, so the engine advanced into the digit run and matched `65`. The
  guard has to exclude a preceding DIGIT as well.
- **Instance 21 — the narration strip's `^` anchor and its markup blindness.** `Producing **Chunk 1
  only**:` escaped because `\s+` met `**`; `…produce Chunk 1.` escaped because the phrase was at the end
  of the line. Markup is now admitted at every token boundary, and forms that carry their own
  discriminator (a production verb applied to a numbered pipeline unit) no longer use position at all —
  they are removed at SENTENCE level, so a mixed line keeps its client content.
  `Chunk N` narration was also in **no** registry form, so instance 21 was a false CLEAN rather than only
  an escaped strip. Registered.
- **The P&L ladder (the net_profit accounting identity).** `total_costs` held two component labels and
  `net_profit` two higher profit levels, so `revenue − COGS = net_profit` fired on packs whose arithmetic
  was *correct*. The register named one conflation; auditing the vocabulary found three. Levels are now
  separate metrics with each cost level paired to the profit level it produces, gross and EBITDA margin
  are checked (previously unpaired), and EBITDA carries no subtraction identity because the D&A add-back
  is not derivable from these documents.
- **N4 — "active integration" is DERIVED, not read.** A pair is active iff P-a inventoried ∧ P-b automatic
  ∧ P-c functioning ∧ P-d cited. A14 was one-directional in the wrong way: an inflated `yes` was caught,
  an under-stated `no` on a row whose predicates all hold was accepted in silence. Coverage now comes from
  the predicates and the authored cell is a C1 measurement on every row.
- **T1 — the placement clause.** P1's cap and P0b's deadline pull shared one rank-ordered pass, so a
  deadline item that sorted below three Quick Wins entered a full Phase 1 anyway (Now silently carried 4)
  and the wrong item kept its slot. Two passes: unconditional rules reserve capacity, the cap applies to
  the remainder, and deadline items alone exceeding the cap is reported as over-commitment rather than
  absorbed.

### Notes
- Label **v37.8 → v37.9**. **512 tests, 18 suites**; typecheck and build clean.
- Release note: `rework_docs/2026-08-06_v37_9_Micro_Release_Before_TC3.md`.
- **Open, not ours:** the LunaCart coverage pin. `fixtures/lunacart_archetype_free_golden.md` pins 0.33
  (2 active pairs ÷ 6) and the fourteen-batch appendix pins 0.67 provisional. Not re-pinned — see the
  release note §6.

---

## [2.6.0] — 2026-08-05 — v37.8: Sequence 1–6, R6 closed, UCR instrumented

Backfilled — v37.8 shipped with a release note but no changelog entry.

### Added
- **`parsers/layoutRenderer.ts` (E1 durable fix)** — position-aware page rendering through pdf-parse's own
  `pagerender` hook. **No dependency change was needed:** the default renderer breaks lines on the Y
  coordinate and then concatenates every item on a line with nothing between them. Four lines. Uses the X
  coordinate and each item's width, inserting a TAB (not a pipe — the corpus is read by the model too) on
  a horizontal gap over 1.2 em.
- **`utils/unassistedConformance.ts` (UCR)** — computed per run, denominator is intervention
  OPPORTUNITIES not corrections, so adding a guard cannot flatter the score.

### Changed
- **Instance 19 — no thousands-joins across plain whitespace.** The E1 repair created this: once
  `84,00078,000` was split, the parser re-joined it across the space into 84,000,780,000. NBSP, narrow
  NBSP and thin space stay separators — a cell boundary cannot produce them.
- **Item 16 — metric attribution by structural row label** rather than any line mentioning the name.
  Over-tightened on the first pass (dropped `12 employees`, where the metric word is the unit) and the
  existing suite caught it; adjacency window bounded to 24 characters.
- **App-side narration strip (Law 3).** `[SELF_AUDIT]` routing achieved zero adoption in 8/8 — the
  definition of an instruction.
- **P1=3 / P2=YES → P-rules ENFORCING, R6 closes.** Flipped on evidence: 8/8 advisory runs matched the
  emitted roadmap with zero divergence.
- **A19 `feasibility_vs_base` → `feasibility_within_base`.** The deterministic 4-forks on Meridian were a
  measurement artefact in the record, not extraction: every legitimate A4 reduction was being marked a
  fork, and Meridian has exactly four flag-firing cards.

### Notes
- Label **v37.7 → v37.8**. **478 tests, 17 suites.**
- Release note: `rework_docs/2026-08-05_v37_8_Sequence_1_6_Complete.md`.

---

## [2.5.0] — 2026-08-05 — v37.7: the five ten-batch engineering items

Responds to the **ten-batch cross-era report** (40 runs, two controlled pairs). Meridian ≈91% [30/32],
LunaCart ≈82% [16/32]; four consecutive batches at zero undetected harm.

### Added
- **`parsers/textRepair.ts` (E1, top register item)** — repairs separator-destroying PDF extraction at the
  boundary, before anything reads the text. Only structurally-impossible boundaries are repaired, so every
  repair is provable. **The corrupted corpus was feeding the MODEL too**, so E1 is a plausible upstream
  cause of R1 and R4 — both previously scored model-side.
- **`utils/phasePlacement.ts` (R6)** — derives the phase map from pinned inputs, every decision naming the
  clause that fired. **ADVISORY: P1 (Now capacity) and P2 (does `d_gate4` defer alone) are UNSET** — the
  Practice owns them, and guessed thresholds would re-sequence deliverables on guessed rules.
- `extractStage1ManifestDetailed` (N1) — dedupe with duplicate/conflict separation.
- `isPlacedIn` (N3) — structural placement vs prose mention, shared with the P-rules reader.

### Changed
- **E1 phantom €2.0B:** a single-letter scale suffix must now be ATTACHED. `Revenue 2.0 B 1,486,200` read
  the standalone column label "B" as BILLION. `12.4M` and `12.4 million` still parse.
- **N1 A19 freeze:** duplicates were frozen separately, so a T-26 duplicate with differing values produced
  deterministic forks. Now first-occurrence-wins; an identical duplicate is a `⚠`, a conflicting one a
  BLOCKER (at rung C the manifest is the only integrity anchor there is).
- **N2 self-narration routed on ALL FOUR stage contracts**, widened beyond rule identifiers to receipts,
  checkpoint confirmations, chunk narration and machine-channel block names. Makes the Practice's C6
  prediction a falsifiable pre-registration.
- **N3 GATE-4:** `laterSection.includes(id)` counted a contrastive prose mention as a misplacement.

### Notes
- Label **v37.6 → v37.7**. **449 tests, 16 suites.**
- Release note: `rework_docs/2026-08-05_v37_7_Engineering_Complete_For_Confirmation_Pair.md`.
- **Deferred with reason:** the durable E1 fix (table-aware extractor) ships AFTER the confirmation pair,
  so the pair stays readable.
- **Blocks R6:** the two Practice-owned P-rule constants.

---

## [2.4.0] — 2026-08-04 — v37.6: engineering side complete for the confirmation pair

Responds to the **eight-batch cross-era report** (32 runs, first controlled pair on v37.5 `4ca96a2`).
Meridian ≈90% [22/24 checked], LunaCart ≈78% [8/24]; both release-FAIL, ~93% of blockers one class.

### Added
- **`utils/archetypeRung.ts`** — the activation ladder as a first-class output (III.2). Every run record
  opens with `RUNG: A|B|C` + the MEASURED Class-A coverage fraction + the non-comparability reading rule.
  Rung is read from INDEX status for the DECLARED archetype, never inferred from the industry string; an
  unlisted archetype resolves to C, because inferring ACTIVE from a file's existence is what rule 1 forbids.
- **`utils/stage1Manifest.ts` (A19)** — III.3 pin 1, the Stage-1 freeze. **This gives rung C a root:** A9
  needs an archetype row and there is none at rung C, so the frozen manifest is that row. ID set,
  impact, alignment and the nine relay flags are frozen; feasibility is DIRECTIONAL (may fall via the D6
  adjustment, never rise). Joins the Gate A coverage families.
- **`renderInventoryMarker`** — III.3 pin 2. Closes R1/R2/R9 by construction. The authored values are
  still recorded as A11 forks, so the fix does not remove its own evidence.
- **A16c over-capture fail-safe** — suspends with ONE diagnostic when the scrape returns >half the library.
- Name-cell normalisation: `normaliseName` / `normaliseNameList` / `namesResolve`.

### Changed
- **I1 A15 compound names (~32 BLOCKERs):** `Vincere/Zoho Recruit`, `shopify plus + klaviyo`,
  `zoho recruit (migrating)`. A NAME cell is not an ENUM cell — `normaliseEnumCell` takes the leading
  token and would have matched the wrong system silently.
- **I2 A17 enumerator tokenisation (~19):** `1. Revenue Summary` parsed as `revenue=1`.
- **I4 A18 phase openers:** the contract emits three (`Why now` / `Why next, not now` / `Why later`).
  **Consequently the (Now+Next) pin was probably UNREACHABLE, not wrong — see the release note.**
- **I5/I6 B3:** trailing-gloss parentheticals; `MACHINE_BLOCK_NAMES` closes the false-CLEAN gap.
- **I3 A16:** exclusion IDs scoped to the record label, with a clause-scoped fallback.
- **I7 GATE-4:** Quick-Win recomputed from post-adjustment feasibility, not the emitted label.
- **R5 `[DATA_INVENTORY]` emission:** the block was documented but ABSENT from the mandatory Chunk-3
  production order. Documentation is not a checklist.

### Notes
- Label **v37.5 → v37.6**. **425 tests, 15 suites.**
- Release note: `rework_docs/2026-08-04_v37_6_Engineering_Complete_Release_Note.md`.
- **Blocked on Practice spec:** item 6 (phase-placement counted rules) — R6 does not close without it.

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
