# PIO Framework Changelog

All notable changes to this framework are recorded in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this framework adheres to semantic versioning per `OPERATIONS.md`.

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
