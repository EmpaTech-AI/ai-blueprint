# Operator Quickstart — Blueprint Intake Engagement

**Audience:** Consultants running Blueprint engagements (not engineers)
**Time to complete:** 45–90 minutes active time (plus model generation time ~15 min)
**Last updated:** 2026-05-27

---

## Before You Start

Confirm you have:

- [ ] Completed intake form responses from the client
- [ ] Client documents uploaded: financial summary, org chart, plus whatever else the client provided
- [ ] An engagement reference number (format: `BP-YYYY-NNN` — get this from the Practice Lead)
- [ ] Access to the Claude interface (claude.ai or equivalent)

If any documents are missing, proceed anyway — the skill will note the gaps.

---

## Step 1 — Open the Blueprint Intake Skill

In Claude, start a new conversation. The skill will auto-load when you describe what you need, or select **blueprint-intake** from the skill menu.

Say something like:
> "I need to run a Blueprint intake for [Client Name]. I have their intake form responses and uploaded documents."

The skill will confirm it's ready and ask you to provide the materials.

---

## Step 2 — Provide the Materials

Paste or upload the following in a single message:

1. **Intake form responses** — copy the form answers as text (or paste a structured summary)
2. **Document list** — list which documents you're uploading and their type (e.g. "financial summary", "org chart")
3. **Engagement reference** — mention `BP-YYYY-NNN`

Then say: **"Please begin with Chunk 1."**

---

## Step 3 — Receive Chunk 1 and Confirm

The skill will produce:
- A dossier header
- Section A (Executive Summary, ~300 words)
- Section B (Key Data Points table, ~40 rows)
- A **Checkpoint 1 block** at the end

**Review Checkpoint 1.** It should list 8 mandatory category coverages, all ticked ✓. If any category is missing a tick, make a note — that section of the dossier will be weaker.

Then say: **"continue to chunk 2"**

---

## Step 4 — Receive Chunk 2 and Confirm

The skill will produce:
- Section C (8 pain points, each with heading, evidence bullets, severity, and impact)
- Section D (7 hypotheses, each with heading, rationale, and a Selection score line)
- A **Checkpoint 2 block** listing all 8 pain points and all 7 hypotheses

**Review Checkpoint 2.** Confirm:
- 8 pain points listed
- 7 hypotheses listed
- Pain points and hypotheses match what you know about this client

Then say: **"continue to chunk 3"**

---

## Step 5 — Receive Chunk 3

The skill will produce:
- Section E (Org and Process Views)
- Section F (Document Index)
- Section G (Open Questions)
- Section H (Reviewer Checklist)
- The [JUSTIFICATION] appendix

The response ends with:
> *End of Compressed Client Dossier. Schema: intake_v1.0. Chunks 1–3 complete. Next pipeline step: blueprint-maturity (after GATE 1 PASS).*

---

## Step 6 — Assemble the Dossier

Copy all three chunks into a single `.md` file. **Remove the Checkpoint 1 and Checkpoint 2 blocks** (they are navigation aids, not dossier content). Keep everything else including the [JUSTIFICATION] appendix and the final marker.

Name the file: `dossier_BP-YYYY-NNN.md`

---

## Step 7 — Run the Validation Gate

Send the assembled `.md` file to your technical contact or run the gate yourself:

```bash
bash harness/gate.sh dossier_BP-YYYY-NNN.md
```

**You should see:**
```
GATE 1: PASS — dossier conforms to intake_v1.0. Safe to invoke blueprint-maturity.
```

**If you see GATE 1: FAIL:**
- Read the failure report
- Most common cause: one of the chunks was truncated (missing sections)
- Fix: re-run the relevant chunk (go back to Step 2 or 3)
- If failures persist: contact your technical lead

**Do not proceed to Step 2 (Maturity) until you have a GATE 1: PASS.**

---

## Step 8 — Check the Dashboard

Upload the validated `.md` dossier to the AI Output Quality dashboard. Confirm:

- **STRUCTURAL STATUS:** Green (PASS) ← from the gate
- **Citation Grounding:** Green (>80%) ← from citation analysis

Both must be green before proceeding.

---

## Step 9 — Proceed to Blueprint Maturity

With GATE 1 PASS confirmed, open the `blueprint-maturity` skill and provide the dossier. The maturity scorer will produce a 1-page AI Readiness Snapshot.

Continue through Steps 3–5 (Opportunities → Roadmap → Assembly) in sequence. Do not skip steps.

---

## Common Questions

**Q: The skill produced fewer than 8 pain points in Chunk 2. What do I do?**
Re-run from Step 3 ("continue to chunk 2"). Do not manually add pain points — the selection algorithm must choose them.

**Q: The gate says "pandoc_artifact_detected". What happened?**
You ran the gate on a `.docx` file. Only `.md` files can be validated. Use the original markdown file, not any Word export.

**Q: The client only provided 2 documents. Will the dossier be lower quality?**
Yes — fewer documents mean more `[Assumption]` tags and lower overall confidence. The dossier will still be produced; the downstream skills will note the uncertainty. Flag the limited evidence to the client at delivery.

**Q: How long does the whole process take?**
- Chunk generation: ~5 minutes per chunk (15 min total)
- Assembly and gate: ~5 minutes
- Dashboard upload: ~2 minutes
- Total active time: ~30–45 minutes

---

## Using the Automated Wrapper (Optional)

If your team has the automation wrapper configured, you can skip Steps 2–7 and run:

```bash
python3 harness/run_intake_automated.py materials/BP-YYYY-NNN.json
```

This produces all three chunks, assembles the dossier, and runs the gate automatically. See `docs/MATERIALS_JSON_CONTRACT.md` for how to prepare the input file.

The wrapper is optional — the manual workflow above always works and is preferred for first-time clients or unusual engagements.
