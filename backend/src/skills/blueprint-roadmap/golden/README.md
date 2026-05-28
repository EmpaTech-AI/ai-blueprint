# Golden Outputs — Blueprint Roadmap Composer

**Status:** Pending first live run
**Schema:** `intake_v1.0`
**Skill version:** 1.0.0

---

## Purpose

Golden outputs are canonical reference examples of what a correct Recommended Action Sequence
looks like for a given industry archetype. They serve as regression canaries, training
references, and QA baselines.

---

## How to Create the Recruitment Golden (Meridian Talent Solutions)

When the first live Meridian engagement completes through the full pipeline:

1. Run `blueprint-roadmap` with the Scored Opportunity Map + Readiness Snapshot
2. Review the output for correctness:
   - Now / Next / Later phasing respected (Quick Wins in Now, Foundation Builders in Next,
     Big Bets in Later — with any exceptions explicitly justified)
   - Maturity gating applied (nothing in Now that requires a maturity dimension not yet
     at "Developing")
   - Every opportunity from the Opportunity Map appears exactly once in the sequence
   - No new opportunities introduced that weren't in the Opportunity Map
   - Client-facing language used (not internal scoring language)
3. Save the approved output as `recruitment_meridian_v1.md` in this folder
4. Update this README's Status line to `Active — recruitment_meridian_v1.md`

---

## Key Consistency Check Against Upstream Steps

The golden Roadmap MUST be consistent with the golden Opportunity Map:

- All 5–7 opportunities from the Opportunity Map must appear in the sequence
- Now/Next/Later placement must match the classification from Step 3
  (Quick Win → Now, Foundation Builder → Next, Big Bet → Later)
- Exceptions must be noted with rationale (e.g., "Moved to Next despite Quick Win
  classification because it depends on GDPR compliance initiative completing first")

---

## Naming Convention

`{archetype}_{client_short_name}_v{version}.md`
