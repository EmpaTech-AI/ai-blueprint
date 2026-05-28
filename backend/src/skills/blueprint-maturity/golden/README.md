# Golden Outputs — Blueprint Maturity Scorer

**Status:** Pending first live run
**Schema:** `intake_v1.0`
**Skill version:** 1.0.0

---

## Purpose

Golden outputs are canonical reference examples of what a correct, high-quality output from
`blueprint-maturity` looks like for a given industry archetype. They serve as:

1. **Regression canaries** — if a skill update changes output structure, a diff against the
   golden shows exactly what broke
2. **Training references** — new operators can see what a well-formed Readiness Snapshot looks like
3. **QA baselines** — the CI pipeline can smoke-test the skill against a known-good example

---

## How to Create the Recruitment Golden (Meridian Talent Solutions)

When the first live Meridian engagement completes through the full pipeline:

1. Run `blueprint-maturity` with the validated Meridian dossier as input
2. Review the output for correctness:
   - All 6 dimensions scored (Strategy, Data, Technology, People, Processes, Governance)
   - Each dimension at Early / Developing / Established with rationale
   - Conservative bias applied (score down when evidence is ambiguous)
   - Readiness constraints correctly identified (these feed Step 3 feasibility adjustments)
3. Save the approved output as `recruitment_meridian_v1.md` in this folder
4. Update this README's Status line to `Active — recruitment_meridian_v1.md`

---

## Expected Output Structure for Recruitment

A correct Meridian Readiness Snapshot should contain:

```
# AI Readiness Snapshot — [Client Name]

## Summary
[2-3 sentence overall assessment]

## Dimension Scores

| Dimension   | Level       | Score |
|-------------|-------------|-------|
| Strategy    | Developing  | 2/3   |
| Data        | Early       | 1/3   |
| Technology  | Developing  | 2/3   |
| People      | Developing  | 2/3   |
| Processes   | Early       | 1/3   |
| Governance  | Early       | 1/3   |

## Dimension Rationales
[One paragraph per dimension, with citations to dossier]

## Key Constraints for Step 3
[Bullet list of constraints the Opportunity Harvester must apply as readiness adjustments]
```

---

## Naming Convention

`{archetype}_{client_short_name}_v{version}.md`

Examples:
- `recruitment_meridian_v1.md` — Meridian Talent Solutions, first version
- `manufacturing_baros_v1.md` — Baros Vision (when manufacturing archetype is validated)
