# Contributing to the PIO Framework

This guide covers the two most common framework changes: adding a new industry archetype and updating the schema. For any change, the Golden Output must continue to validate, and the test suite must continue to pass.

---

## Adding a New Industry Archetype

The framework currently supports Recruitment fully; the other industries listed in `archetypes/INDEX.md` are skeleton routings only. To promote an industry from skeleton to ACTIVE, complete the following steps.

### Step 1 — Copy the skeleton

```bash
cp archetypes/_template_skeleton.md archetypes/<industry>.md
```

Use lowercase, underscores for spaces. Examples: `manufacturing.md`, `professional_services.md`, `financial_services.md`.

### Step 2 — Populate the six required sections

Every archetype file must contain populated content (not placeholders) in:

1. **KPI Taxonomy** — the operational metrics that Section B of a dossier should surface for this industry. Use the existing Recruitment archetype as a model. Aim for 25–35 specific KPIs across the financial / operational / volume / client / team / technology dimensions.

2. **Pain Point Library** — at least 12 candidate pain points specific to this industry, with default severity and impact area for each. These become the candidate pool that emergent pain points are selected from per `schema/algorithms/pain_point_selection.md`.

3. **Hypothesis Library** — at least 10 candidate AI opportunities for this industry, with typical Impact / Feasibility / Alignment ratings and default classification. These feed `schema/algorithms/hypothesis_selection.md`.

4. **Archetype Defaults** — recommended counts for BOUNDED schema fields (Section A word count, Section B row count, Open Questions count, total tag count band). These must respect the framework's hard limits in `schema/intake_v1.0.md`.

5. **Industry Terminology** — preferred terms for the 8 generic concepts (Customer, Order, Lead Time, Inventory, Sales, Account Manager, Production, Pre-screening). Recruitment uses Client / Mandate / Time-to-Fill / Candidate Database / BD / Consultant / Delivery / Sourcing.

6. **Worked Example Reference** — pointer to the Golden Output dossier for this archetype (Step 3 below).

### Step 3 — Build the Golden Output

Produce a canonical Compressed Client Dossier for a representative client in this industry. The Golden Output is what future engagements anchor on for tone, structure, and citation depth.

**Requirements:**

- Use a real client engagement or a high-fidelity fictional client with the full 8-PDF source set
- Apply EVERY schema rule from `schema/intake_v1.0.md`
- Use the archetype's KPI taxonomy in Section B
- Apply `pain_point_selection.md` to choose the 8 pain points (do not just list 8 arbitrary items)
- Apply `hypothesis_selection.md` to choose the 7 hypotheses
- Apply `ordering.md` for all within-section ordering
- Use canonical source names from `source_registry.md` throughout
- Include the [JUSTIFICATION] block with one item per Inferred/Assumption tag

Save as `golden/<industry>_<client_short_name>_v1.md`.

### Step 4 — Validate the Golden Output

```bash
python3 harness/validate_intake.py golden/<industry>_<client_short_name>_v1.md
```

Must return PASS. If it fails:

- Fix issues in the Golden Output until it passes
- DO NOT modify the harness to make it pass — the schema is authoritative

If the Golden Output reveals a genuine schema limitation (e.g. the manufacturing archetype legitimately requires 9 pain points to cover its standard scope, not 8), that's a schema change — see "Updating the Schema" below.

### Step 5 — Update the routing index

Edit `archetypes/INDEX.md` to:

- Update the row for this industry with the file name (replace `_template_skeleton.md` with the new file)
- Change Status from SKELETON ONLY to ACTIVE
- Add or refine the routing keywords if needed

### Step 6 — Update the changelog and bump version

In `CHANGELOG.md`, add a `[1.X.0]` entry under "Future Versions" with:

- Date
- The new archetype name
- The client used as basis for the Golden Output (or "representative client" if fictional)
- Any notable archetype-specific decisions

Bump the MINOR version (1.0.0 → 1.1.0 for the first new archetype).

### Step 7 — Run the full test suite

```bash
python3 harness/tests/test_validate.py
```

All 8 tests must still pass. Adding a new archetype must not break existing tests.

---

## Updating the Schema

Schema changes are higher-stakes than archetype additions because they can invalidate existing dossiers. Follow this procedure.

### Step 1 — Determine if a schema bump is needed

See `OPERATIONS.md` § "When to Bump the Schema". If your change is to aliases, harness messages, archetype additions, or algorithm documentation only, you do not need a schema bump.

### Step 2 — Update the schema spec

Edit `schema/intake_v1.0.md` to describe the change. If the change is backward-compatible with existing dossiers, it's a MINOR schema bump (`intake_v1.0` → `intake_v1.1`). If it's breaking, it's a MAJOR bump (`intake_v1.0` → `intake_v2.0`).

For breaking changes, rename the schema file to reflect the new version: `intake_v2.0.md`.

### Step 3 — Update the harness

The harness must validate against the new schema. For MINOR changes, augment the existing checks. For MAJOR changes, branch the harness logic on schema version detected in the dossier header.

### Step 4 — Re-validate ALL Golden Outputs

```bash
for f in golden/*.md; do
  python3 harness/validate_intake.py "$f"
done
```

Every Golden Output must continue to pass. If any fails, either:

- Update the Golden Output to conform to the new schema (preferred for MINOR changes)
- Provide a migration script (required for MAJOR changes)

### Step 5 — Update the test suite

Add a test case for the new schema behaviour. The existing 8 tests must continue to pass.

### Step 6 — Update operational documentation

- Add a CHANGELOG entry describing the schema change and rationale
- Update `OPERATIONS.md` if the change affects deployment, versioning, or the upgrade path
- Update `SKILL.md` references in `blueprint-intake` and `blueprint-orchestrator` if needed

### Step 7 — Communicate the change

Before deploying the new schema:

- Notify all engagement teams of the change
- Update the prompts / configurations used by the intake skill
- Run a parallel test (old schema vs new schema) on the same input to confirm output equivalence (for non-breaking changes) or document the differences (for breaking changes)

---

## Code Style for the Harness

The validation harness is Python 3.9+. Style conventions:

- Standard library only (no external dependencies — must run in any Python environment)
- Type hints for function signatures
- Dataclasses for structured data
- Each check function is independent and accepts `(text, sections, report)` or a subset
- Add failures to the `ValidationReport` via `report.add_fail()` / `report.add_warn()` — do not raise exceptions for validation issues
- Reserve exceptions for genuine errors (file unreadable, parse failure)

When adding a new check:

1. Add the check function to `harness/validate_intake.py`
2. Call it from `validate()` in the appropriate position
3. Add a test case in `harness/tests/test_validate.py` that triggers the check with a fixture document
4. Verify Golden Output still passes
5. Document the rule in the appropriate schema reference file

---

## Quality Gates Before Merging Any Change

Every change must pass these gates:

- [ ] All existing tests pass (`python3 harness/tests/test_validate.py`)
- [ ] Golden Output(s) validate clean (`python3 harness/validate_intake.py golden/*.md`)
- [ ] Documentation updated (schema spec, archetype files, CHANGELOG)
- [ ] New tests added for new behaviour
- [ ] Version bumped per semantic versioning rules
- [ ] No new external dependencies introduced
