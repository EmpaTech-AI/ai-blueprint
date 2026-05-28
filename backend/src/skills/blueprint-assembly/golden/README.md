# Golden Outputs — Blueprint Assembly

**Status:** Pending first live run
**Schema:** `intake_v1.0`
**Skill version:** 1.0.0

---

## Purpose

Golden outputs are canonical reference examples of what a correct final AI Value Blueprint
deliverable looks like for a given industry archetype. They serve as regression canaries,
training references, and QA baselines.

The Assembly golden is the most important of the downstream goldens — it is the final
client-facing document and the one that directly represents AI Assist BG's quality standard.

---

## How to Create the Recruitment Golden (Meridian Talent Solutions)

When the first live Meridian engagement completes through the full pipeline:

1. Run `blueprint-assembly` with all four upstream outputs (Dossier, Snapshot, Map, Sequence)
2. Review the assembled output for correctness:
   - All sections present: Executive Summary, Readiness Scorecard, Key Findings,
     Opportunity Map, Portfolio View, Action Sequence, Readiness Gaps, Next Steps
   - Numbers, names, and classifications consistent across all sections
   - No content from the internal Compressed Dossier (not client-facing) leaking through
   - Currency convention: EUR, not €
   - Client name consistent throughout
   - Professional, client-facing language throughout (no internal scoring jargon)
3. Save the approved output as `recruitment_meridian_v1.md` in this folder
4. Note: The final client deliverable is DOCX — save the markdown source here, not the DOCX
5. Update this README's Status line to `Active — recruitment_meridian_v1.md`

---

## Cross-Stage Consistency (the Orchestrator's Pre-Assembly Check)

Before the Assembly golden is created, confirm the orchestrator's consistency checks pass:

- Hypothesis titles from Dossier Section D → Opportunity titles in Step 3 Map (1:1 match)
- Pain points from Section C → referenced in opportunity cards
- Step 3 classifications → Step 4 Now/Next/Later placement (or documented exceptions)
- Step 2 maturity scores → reflected in Step 3 feasibility adjustments
- Currency convention consistent (EUR throughout)
- Client name consistent across all four upstream outputs

---

## Naming Convention

`{archetype}_{client_short_name}_v{version}.md`
