# PIO Framework — Operations Guide

**Framework version:** 1.0.0
**Schema version:** `intake_v1.0`
**Owner:** AI Assist BG — Blueprint Practice

---

## What This Framework Is

The Perfect Intake Output (PIO) Framework converts the `blueprint-intake` skill from a prompt-engineering problem (with run-to-run variance) into a schema-and-template engineering problem (with deterministic structure). It is a set of contracts that the intake skill must conform to, plus a validation harness that mechanically enforces those contracts.

The framework targets **reproducibility**, not byte-level determinism. Same input → same structure, same selections, same citations, same numbers. Prose-level paraphrasing may still vary between runs at the sentence level; everything else does not.

## Components

| Layer | Component | Path | Purpose |
|---|---|---|---|
| Schema | Spec | `schema/intake_v1.0.md` | Top-level structure + count policies |
| Schema | Pain Point Selection | `schema/algorithms/pain_point_selection.md` | How to pick 8 from candidates |
| Schema | Hypothesis Selection | `schema/algorithms/hypothesis_selection.md` | How to pick 7 from candidates |
| Schema | Ordering | `schema/algorithms/ordering.md` | Section and item ordering rules |
| Schema | Citation Rules | `schema/citation_rules.md` | One tag per claim, multi-source format |
| Schema | Source Registry | `schema/source_registry.md` | Canonical names for all 8 PDF categories |
| Schema | Confidence Thresholds | `schema/confidence_thresholds.md` | When to apply each of the four tags |
| Pipeline | Pre-Flight Sanitization | `pipeline/preflight.md` | Strip leaks before assembly |
| Industry | Archetype Index | `archetypes/INDEX.md` | Industry → archetype router |
| Industry | Recruitment Archetype | `archetypes/recruitment.md` | KPIs, libraries, defaults |
| Industry | Skeleton | `archetypes/_template_skeleton.md` | Starting point for new industries |
| Reference | Golden Output | `golden/recruitment_meridian_v1.md` | Canonical Meridian dossier |
| Validation | Harness | `harness/validate_intake.py` | Python validator |
| Validation | Test Suite | `harness/tests/test_validate.py` | Catches documented failure modes |

## How the Skill Uses This Framework

The `blueprint-intake` SKILL.md references the framework as follows (proposed update to SKILL.md):

```
## Methodology Reference

For the locked schema and rules, read these references in order:
1. /mnt/skills/user/blueprint-intake/references/intake_v1.0.md
2. /mnt/skills/user/blueprint-intake/references/citation_rules.md
3. /mnt/skills/user/blueprint-intake/references/confidence_thresholds.md
4. /mnt/skills/user/blueprint-intake/references/algorithms/*.md

For industry-specific guidance, route via /archetypes/INDEX.md to the relevant archetype file.

Before producing the dossier, anchor on the Golden Output for the detected industry:
/mnt/skills/user/blueprint-intake/examples/recruitment_meridian_v1.md
```

The skill must read the schema files, identify the industry, load the matching archetype, study the Golden Output, then produce a conforming dossier.

## Deployment Path

To deploy this framework into the live skill folder:

1. Copy `schema/`, `pipeline/`, `archetypes/`, `golden/` directories into `/mnt/skills/user/blueprint-intake/` (rename `golden/` → `examples/` to match the skill convention)
2. Copy `harness/` into the skill folder
3. Update `blueprint-intake/SKILL.md` to reference the new structure (see the proposed update above)
4. Update `blueprint-orchestrator/SKILL.md` to point its `references/methodology-and-contracts.md` reference at `schema/intake_v1.0.md` (the previously-dead pointer)
5. Run the harness against the next live engagement output before downstream skills are invoked

Until step 4 is complete, the orchestrator's `methodology-and-contracts.md` reference remains a dead pointer. The framework is usable independently of the orchestrator update.

## Running the Validator

```bash
# Validate a single dossier
python3 harness/validate_intake.py path/to/dossier.md

# Get machine-readable JSON output
python3 harness/validate_intake.py path/to/dossier.md --json

# Specify a non-default archetype (recruitment is default)
python3 harness/validate_intake.py path/to/dossier.md --archetype manufacturing

# Run the test suite
python3 harness/tests/test_validate.py
```

Exit codes: `0` = PASS, `1` = FAIL (schema violation), `2` = ERROR (file unreadable).

## Versioning Strategy

The framework uses semantic versioning at two levels:

### Framework version (file `CHANGELOG.md`)

- `MAJOR` bumps for breaking schema changes (existing dossiers fail validation)
- `MINOR` bumps for new archetypes or additive schema fields
- `PATCH` bumps for bug fixes, harness improvements, doc updates

### Schema version (embedded in dossier header)

- Bumped when the schema spec changes in a way that affects validation
- Format: `intake_v<MAJOR>.<MINOR>`
- Every dossier records its schema version; the harness checks compatibility

### Schema-version compatibility rule

- Dossiers produced under schema vX.Y must validate against vX.Y or any compatible later vX.Z
- vX+1.0 is NOT backward-compatible — explicit migration required
- Validation always uses the schema version declared in the dossier header (not the latest)

## When to Bump the Schema

Bump the schema when ANY of the following are true:

- Adding or removing a top-level section
- Changing a FIXED count value (e.g. moving from 8 pain points to 10)
- Adding a new mandatory field to any section
- Adding a new confidence tag or removing an existing one
- Changing the canonical source registry

Do NOT bump the schema for:

- Adding new aliases to the source registry
- Improving validation harness error messages
- Adding new test cases
- Adding new industry archetypes
- Updating algorithm explanations without changing the algorithm
- Bug fixes in the harness

## Disaster Recovery

If a dossier in production fails validation post-hoc:

1. Capture the failure report (harness JSON output)
2. Identify the rule(s) violated
3. Determine: was the dossier produced under an earlier schema?
   - If yes: validate against the original schema; if still fails, the dossier was always non-conformant
   - If no: the failure indicates either a schema regression or a harness bug
4. For schema regressions: roll back the offending schema change
5. For harness bugs: fix the harness; the dossier was likely correct

The Golden Output (`golden/recruitment_meridian_v1.md`) is the regression-test target. Any schema change must keep the Golden Output passing. If the Golden Output fails after a change, the change is rejected.

## Adding a New Industry Archetype

See `CONTRIBUTING.md` for the full procedure. Summary:

1. Copy `archetypes/_template_skeleton.md` to `archetypes/<industry>.md`
2. Populate all six required sections
3. Build a Golden Output for this archetype using a real or representative client
4. Validate the Golden Output (must pass)
5. Update `archetypes/INDEX.md` with the new mapping
6. Bump framework version (MINOR), update `CHANGELOG.md`

Estimated effort per industry: 3–4 hours.

## Known Limitations

- **Pure determinism is not achievable** with an LLM-driven skill. The framework targets reproducibility (same structure, same selections, same numbers) but allows prose-level variance at the sentence level.
- **Archetype coverage is incomplete.** Only Recruitment is currently ACTIVE. New industries require the procedure above.
- **The harness is currently single-archetype-aware.** Future versions should load archetype-specific count bands at runtime. Today, the recruitment defaults are hardcoded.
- **The harness operates on Markdown.** If the intake skill produces a DOCX, it must be converted to Markdown before validation. A simple `pandoc dossier.docx -o dossier.md` step works for this.
