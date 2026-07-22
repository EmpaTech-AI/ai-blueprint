# Delivery Run-Book — the n=2 Double-Run Protocol (PROPOSED — pending Practice ruling)

**AI Assist BG · Blueprint Practice · v1.0-draft · 2026-07-21 · STATUS: PROPOSED delivery-process design — adoption is Ivan's ruling (per the Era-N adjudication's delegation boundaries); not in the ledger; nothing in the acceptance gates depends on it**
**Audience:** consultants and operators running client engagements.
**Supersedes:** the testing procedure in `Blueprint_Testing_Guide_for_Consultants.pdf` (v2.0-era —
its prompt-based QG gates, "Quality Self-Assessment" blocks, and single-run flow predate skills
v3.x; do not follow it for delivery runs).

## Why this exists

Reproducibility is verified per engagement, not assumed. Two runs on identical inputs must agree
on the **decision spine** — which pain points, which hypotheses, which scores, which band, which
phases. Prose wording may differ between runs; decisions may not. This protocol makes the check
mechanical (≈ 30 seconds) so nobody has to eyeball prose similarity or wonder "why did it pick
different pain points this time" — a spine mismatch is caught before anyone reads the documents.

## The protocol

1. **Pin the inputs.** Assemble the client's form answers + documents once. Compute checksums
   (`sha256sum`) and record them in the engagement tracker. Both runs use byte-identical files.
   *(For the Meridian fixture, the pinned manifest is in
   `rework_docs/Meridian_Golden_Benchmark_v1_1_PINNED.md` §I.)*
2. **Run the pipeline twice**, in two fresh sessions, same skill versions (check the orchestrator
   version table; never mix versions mid-engagement). Extract every stage from the delivery path
   (`/step/:step/delivery`) — never the raw endpoint.
3. **Diff the spine mechanically:**
   ```bash
   python3 harness/check_stability.py runA_dossier.md runB_dossier.md
   ```
   The spine = pain-point ID set + order · hypothesis ID set + positions · all 14 score-marker
   fields · maturity levels · band · phase map · CEO/client names vs INTAKE_FACTS.
4. **Spine identical → proceed.** Use either run (they are the same where it matters); the
   consultant reviews content once, against the archetype golden.
5. **Spine divergent → STOP. This is an incident, not bad luck.** Do NOT hand-pick the run you
   prefer. Record which surface forked (the harness names it), file it to the Practice lead —
   a spine fork on ratified anchors means a contract gap that will fork again for the next
   client. The fix is a rule, not a re-roll.
6. **Gate normally:** GATE 1 (`gate.sh`) after Step 1, GATE 3 checklist after Step 3, GATE 5
   before DOCX — per the orchestrator SKILL.md.

## Operator hygiene rules (standing)

- **Fixture naming:** never name test runs or fixtures after team members (the "Ivan Montin"
  label collided with the firm-surname stoplist and cost an acceptance cycle — S-33). Use the
  fictional client's own name: `Meridian_v1.1_Test_N`.
- **One golden per archetype:** the anchor is `golden/<archetype>_*.md`. Never create copies.
- **Same-model discipline:** both runs on the session model configured for the engagement; do
  not switch models between run A and run B.
- **Band fixtures:** when validating skill changes, run the Band 2 and Band 3 calibration
  fixtures (`fixtures/band2_calibration.md`, `fixtures/band3_calibration.md`) — Band 3 is the
  anti-fabrication check and must yield *no* PP-0.

## What "identical" means (set expectations with the team)

| Layer | Guarantee |
|---|---|
| Decision spine (IDs, scores, band, phases) | Byte-identical across runs — mechanically verified |
| Document structure (sections, tables, headings) | Identical by contract |
| Prose wording (rationale sentences, narrative) | Semantically stable, not byte-identical — convergence to full render-determinism arrives with the render-from-contract architecture (ADR-001) |
