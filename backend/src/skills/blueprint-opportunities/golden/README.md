# Golden Outputs — Blueprint Opportunity Harvester

**Status:** Pending first live run
**Schema:** `intake_v1.0`
**Skill version:** 1.0.0

---

## Purpose

Golden outputs are canonical reference examples of what a correct, high-quality Scored
Opportunity Map looks like for a given industry archetype. They serve as regression canaries,
training references, and QA baselines.

---

## How to Create the Recruitment Golden (Meridian Talent Solutions)

When the first live Meridian engagement completes through the full pipeline:

1. Run `blueprint-opportunities` with the validated Meridian dossier + Readiness Snapshot
2. Review the output for correctness:
   - Exactly 5–7 opportunities with half-page cards
   - Each card has all mandatory fields: What it is, Pain point addressed, Expected impact,
     Feasibility rationale, Scores, Classification, Pilot suggestion
   - Every factual claim carries an inline confidence tag
   - Machine-readable `<!-- score: ... -->` comment block present after each Scores line
   - Readiness adjustments applied and explicitly noted where triggered
   - Portfolio view groups opportunities into Quick Wins / Foundation Builders / Big Bets
   - At least 1 of each classification present
3. Save the approved output as `recruitment_meridian_v1.md` in this folder
4. Update this README's Status line to `Active — recruitment_meridian_v1.md`

---

## Key Consistency Check Against Intake Dossier

The golden output for Opportunities MUST be consistent with the intake golden at
`../blueprint-intake/golden/recruitment_meridian_v1.md`:

- Every opportunity title should map to a hypothesis title from Dossier Section D
  (allowing minor client-facing rephrasing, but NOT addition or removal)
- Every pain point referenced in the cards should appear in Dossier Section C
- Classification should align with the intake dossier's classification unless the
  Readiness Adjustment Rule changed it — in which case the adjustment must be noted

---

## Naming Convention

`{archetype}_{client_short_name}_v{version}.md`
