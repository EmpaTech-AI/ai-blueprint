# PIO Framework — Operations Guide

**Framework version:** 1.2.0
**Schema version:** `intake_v1.0`
**Owner:** AI Assist BG — Blueprint Practice

---

## What This Framework Is

The Perfect Intake Output (PIO) Framework converts the `blueprint-intake` skill from a prompt-engineering problem (with run-to-run variance) into a schema-and-template engineering problem (with deterministic structure). It is a set of contracts that the intake skill must conform to, plus a validation harness that mechanically enforces those contracts.

The framework targets **reproducibility**, not byte-level determinism. Same input → same structure, same selections, same citations, same numbers. Prose-level paraphrasing may still vary between runs at the sentence level; everything else does not.

## Components

| Layer | Component | Path | Purpose |
|---|---|---|---|
| Schema | Spec | `references/intake_v1.0.md` | Top-level structure + count policies |
| Schema | Pain Point Selection | `references/algorithms/pain_point_selection.md` | How to pick 8 from candidates |
| Schema | Hypothesis Selection | `references/algorithms/hypothesis_selection.md` | How to pick 7 from candidates |
| Schema | Ordering | `references/algorithms/ordering.md` | Section and item ordering rules |
| Schema | Citation Rules | `references/citation_rules.md` | One tag per claim, multi-source format |
| Schema | Source Registry | `references/source_registry.md` | Canonical names for all 8 PDF categories |
| Schema | Confidence Thresholds | `references/confidence_thresholds.md` | When to apply each of the four tags |
| Pipeline | Pre-Flight Sanitization | `references/preflight.md` | Strip leaks before assembly |
| Industry | Archetype Index | `archetypes/INDEX.md` | Industry → archetype router |
| Industry | Recruitment Archetype | `archetypes/recruitment.md` | KPIs, libraries, defaults (ACTIVE) |
| Industry | Manufacturing Archetype | `archetypes/manufacturing.md` | KPIs, libraries, defaults (PENDING VALIDATION) |
| Industry | Skeleton | `archetypes/_template_skeleton.md` | Starting point for new industries |
| Reference | Golden Output | `golden/recruitment_meridian_v1.md` | Canonical Meridian dossier |
| Reference | Examples | `examples/recruitment_meridian_v1.md` | Skill-facing copy of golden output |
| Validation | Gate Shell Script | `harness/gate.sh` | One-line gate check for operators |
| Validation | Harness | `harness/validate_intake.py` | Python validator (called by gate.sh) |
| Validation | Test Suite | `harness/tests/test_validate.py` | 8 regression tests for failure modes |
| Validation | Cross-Run Test | `harness/tests/test_cross_run_regression.py` | Determinism comparison between two runs |
| Automation | Wrapper | `harness/run_intake_automated.py` | Full 3-chunk workflow via Anthropic API |
| Automation | Example Materials | `harness/example_materials.json` | Reference input for dry-run and CI |
| Automation | Production Monitor | `harness/monitor_production.py` | Metrics aggregator across all engagements |
| Automation | Model Deprecation | `harness/RUNBOOK_MODEL_DEPRECATION.md` | Procedure when model is deprecated |
| Ops | This document | `docs/OPERATIONS.md` | Operations guide (you are here) |
| Ops | Operator Quickstart | `docs/OPERATOR_QUICKSTART.md` | Step-by-step for consultants |
| Ops | Materials Contract | `docs/MATERIALS_JSON_CONTRACT.md` | Input file schema for operators |
| Ops | Artifact Lifecycle | `docs/ARTIFACT_LIFECYCLE_POLICY.md` | Retention and deletion rules |
| Ops | GDPR Procedures | `docs/GDPR_PROCEDURES.md` | Data processing and erasure rules |
| Ops | Failure Escalation | `docs/FAILURE_ESCALATION_RUNBOOK.md` | Runbooks per failure category |
| Dashboard | Integration Spec | `docs/DASHBOARD_INTEGRATION_SPEC.md` | How dashboard consumes harness output |
| Dashboard | Refresh Procedure | `docs/DASHBOARD_REFRESH_PROCEDURE.md` | Dashboard update timing and error handling |
| CI | GitHub Actions | `.github/workflows/framework-ci.yml` | Automated tests on every framework change |

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

## Gate Invocation Point Policy (HR-01 — LOCKED)

**The validation gate MUST run on the native markdown output from `blueprint-intake`, BEFORE any DOCX conversion step.**

Correct workflow order:
```
[1] blueprint-intake produces dossier.md
[2] python3 harness/validate_intake.py dossier.md  ← gate runs HERE
[3] Only on PASS: convert dossier.md → dossier.docx for archival/client use
[4] Downstream skills read dossier.md (the markdown), not the DOCX
```

**Why this matters:** DOCX export (via pandoc or similar) produces markdown that the harness cannot validate: backslash-escaped citation brackets, triple-hyphens instead of em-dashes, bold headings instead of H3 headings, lost table structure. The harness will detect these patterns and fail with a `pandoc_artifact_detected` error — that is intentional, not a harness bug. It means the gate is being run on the wrong file.

**The DOCX is for humans. The markdown is for the pipeline.** Do not pass a DOCX-roundtripped file to the harness.

## Running the Gate (Standard Operator Workflow)

The one-line gate check. Run this after every Step 1 invocation before proceeding to blueprint-maturity:

```bash
# Standard gate invocation (HR-01 LOCKED: run on native .md BEFORE any DOCX conversion)
bash harness/gate.sh path/to/dossier.md
```

Expected output for a PASSING dossier:
```
GATE 1: PASS — dossier conforms to intake_v1.0. Safe to invoke blueprint-maturity.
```

Expected output for a FAILING dossier:
```
[harness report with failure details]

GATE 1: FAIL — violations detected. See report above. DO NOT invoke blueprint-maturity.
```

## Running the Automated Wrapper

For engagements where the `materials.json` has been prepared (see `docs/MATERIALS_JSON_CONTRACT.md`):

```bash
# Full automated run: 3-chunk generation + gate + cost tracking
python3 harness/run_intake_automated.py materials/BP-2026-001.json

# Dry-run (validates materials and builds prompts without calling the API)
python3 harness/run_intake_automated.py materials/BP-2026-001.json --dry-run

# Use a specific model
python3 harness/run_intake_automated.py materials/BP-2026-001.json --model claude-opus-4-7

# Structured JSON logging (for CI / monitoring pipelines)
python3 harness/run_intake_automated.py materials/BP-2026-001.json --json

# Override engagement reference
python3 harness/run_intake_automated.py materials/BP-2026-001.json --engagement-ref BP-2026-001-R1
```

Exit codes: `0` = PASS, `1` = Gate FAIL (dossier produced, not safe for Step 2), `2` = Error.

## Running the Validator Directly

For advanced use or debugging:

```bash
# Validate a single dossier (archetype auto-detected from header)
python3 harness/validate_intake.py path/to/dossier.md

# Get machine-readable JSON output (for dashboard integration)
python3 harness/validate_intake.py path/to/dossier.md --json

# Override archetype (if auto-detection fails)
python3 harness/validate_intake.py path/to/dossier.md --archetype manufacturing

# Run the test suite
python3 harness/tests/test_validate.py

# Cross-run regression test (compare two runs of the same materials)
python3 harness/tests/test_cross_run_regression.py run_a.md run_b.md
```

## Running Production Monitoring

```bash
# Aggregate metrics across all engagements in ./outputs/
python3 harness/monitor_production.py

# Filter by date range
python3 harness/monitor_production.py --since 2026-05-01

# JSON output only (for dashboards / Grafana)
python3 harness/monitor_production.py --json | jq '.gate.pass_rate'
```

Exit codes: `0` = all metrics within target, `1` = alert threshold breached.

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
- **Archetype auto-detection requires a well-formed header.** If the `Industry Archetype:` line is missing from the header, the harness defaults to recruitment and emits a warning.
- **The harness operates on native markdown only.** DOCX-roundtripped files fail immediately with `pandoc_artifact_detected`. See §'Gate Invocation Point Policy' above — this is by design, not a bug.
