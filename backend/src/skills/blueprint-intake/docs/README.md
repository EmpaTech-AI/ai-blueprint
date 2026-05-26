# Perfect Intake Output (PIO) Framework

A schema-and-template engineering solution to the non-determinism in AI Assist BG's `blueprint-intake` skill. Converts a prompt-engineering problem into a deterministic procedure with mechanical enforcement.

**Framework version:** 1.0.0
**Schema version:** `intake_v1.0`
**Status:** Production-ready for Recruitment archetype; other industries skeleton-only

---

## The Problem This Solves

Two runs of the `blueprint-intake` skill on the same input (intake form + 8 PDFs for Meridian Talent Partners OOD) produced semantically similar but mechanically different dossiers:

| Dimension | TEST 1 | TEST 2 |
|---|---|---|
| Total citation tags | 109 | 147 |
| Section B rows | 44 | 35 |
| Hypotheses inventory | Sourcing, CV, Updates, DB, Scheduling, BD Proposal, RPO | Sourcing, CV, Updates, DB, Pipeline Dashboard, RPO, GDPR Foundation |
| CV baseline figure | 1.5–2 hours (intake verbatim) | 95–125 minutes (SOP step sum) |

Both outputs were defensible. Neither was replicable. The variance traced to seven structural defects in the skill, summarised in `CHANGELOG.md` § "Built To Address".

## What This Framework Provides

A single source of truth for what a Compressed Client Dossier must contain, how it must be structured, what tags are valid, what counts apply, and how to choose between alternatives. Plus an executable validator that mechanically enforces every rule.

### Key Properties

- **Schema-locked** — every section, field, and count is specified
- **Deterministic selection** — pain point and hypothesis selection are formula-based, not LLM judgement
- **Citation-disciplined** — one tag per claim, canonical source names, no ambiguity
- **Industry-aware** — KPI taxonomy, pain point library, and hypothesis library per industry
- **Mechanically validated** — Python harness enforces every rule, in under a second
- **Reproducible** (not byte-deterministic) — same input → same structure, selections, citations, numbers

## Directory Map

```
PIO_Framework/
├── schema/
│   ├── intake_v1.0.md                  Schema specification (the contract)
│   ├── citation_rules.md               One tag per claim, multi-source format
│   ├── source_registry.md              Canonical PDF and form names
│   ├── confidence_thresholds.md        When to apply each of the four tags
│   └── algorithms/
│       ├── pain_point_selection.md     Pick exactly 8 from candidates
│       ├── hypothesis_selection.md     Pick exactly 7 from candidates
│       └── ordering.md                 Section and item ordering rules
├── pipeline/
│   └── preflight.md                    Strip leaks before validation
├── archetypes/
│   ├── INDEX.md                        Industry → archetype router
│   ├── recruitment.md                  ACTIVE
│   └── _template_skeleton.md           Starting point for new industries
├── golden/
│   └── recruitment_meridian_v1.md      Canonical Meridian dossier (PASSES validation)
├── harness/
│   ├── validate_intake.py              Python validator (~450 lines)
│   └── tests/
│       └── test_validate.py            8 test cases proving failure-mode coverage
├── OPERATIONS.md                       Versioning, deployment, recovery
├── CONTRIBUTING.md                     How to add archetypes / update schema
├── CHANGELOG.md                        Version history
└── README.md                           This file
```

## Quick Start

### Validate an existing dossier

```bash
python3 harness/validate_intake.py path/to/dossier.md
```

Exit code 0 = PASS. Exit code 1 = FAIL (the report shows what to fix).

### Run the test suite

```bash
python3 harness/tests/test_validate.py
```

Expected: `8 passed, 0 failed`.

### Read the schema

Start with `schema/intake_v1.0.md`. It is the contract every dossier conforms to.

### Read the Golden Output

`golden/recruitment_meridian_v1.md` is the canonical example for the Recruitment archetype. It is also the regression-test target — any schema change must keep this file valid.

## Integration with the Live Skill

The framework deploys into `/mnt/skills/user/blueprint-intake/`. See `OPERATIONS.md` § "Deployment Path" for the procedure.

In short: the framework's `schema/` and `pipeline/` directories become the `references/` folder the SKILL.md already points at (currently a dead link). The `golden/` directory becomes `examples/`. The harness ships as `harness/`. After deployment, the SKILL.md is updated to reference these resources explicitly.

## Adding a New Industry

See `CONTRIBUTING.md` § "Adding a New Industry Archetype". Summary: copy the skeleton, populate 6 sections, build a Golden Output, validate, update INDEX, bump version. Effort: 3–4 hours per industry.

## Limitations

- Pure byte-level determinism is not achievable with an LLM-driven skill. The framework targets reproducibility (same structure, selections, numbers); prose-level sentence variance is acceptable.
- Only Recruitment is ACTIVE. Other industries are skeleton routings.
- Harness defaults to Recruitment archetype count bands; per-archetype runtime config is a 1.2.0 target.
- Harness operates on Markdown. For DOCX dossiers, convert via `pandoc dossier.docx -o dossier.md` first.

## Acknowledgements

This framework was designed in response to the variance analysis in the Blueprint Pipeline Audit (TEST 1 vs TEST 2). The seven defects identified in that audit became the seven design requirements for this framework, all of which are addressed in v1.0.0.
