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
