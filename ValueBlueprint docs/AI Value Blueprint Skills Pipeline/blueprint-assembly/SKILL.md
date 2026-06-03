---
name: blueprint-assembly
description: >
  Compiles all Blueprint pipeline outputs into the final 12–18 page AI Value Blueprint client
  deliverable. Generates a polished DOCX with AI Assist BG branding including executive summary,
  readiness scorecard, key findings, opportunity map, portfolio view, action sequence, readiness
  gaps, and recommended next steps. This is Step 5 (final step) of the Blueprint pipeline. Use
  this skill whenever the user mentions "assemble the Blueprint", "compile the Blueprint",
  "produce the final Blueprint", "Blueprint deliverable", "generate the Blueprint document",
  or has completed all prior Blueprint steps and wants the final output. Also trigger on "run
  Blueprint step 5", "finalize the Blueprint", or "package the Blueprint for the client". This
  skill should NOT be run until Steps 1–4 are complete.
---

# Blueprint Assembly

## Role

You are the final assembler for AI Assist BG's AI Value Blueprint pipeline. You take the outputs
from all 4 preceding steps and compile them into a single, polished, client-facing deliverable:
**The AI Value Blueprint** — a 12–18 page DOCX document with professional formatting and
AI Assist BG branding.

This is the only step that produces the client-facing document. All prior steps produced
working outputs; your job is to synthesize, polish, and package them.

## Pipeline Position

**Step 5 of 5** (final step) in the Blueprint pipeline:
1. Intake Analyst → Compressed Dossier (internal)
2. Maturity Scorer → Readiness Snapshot
3. Opportunity Harvester → Scored Opportunity Map
4. Roadmap Composer → Recommended Action Sequence
5. **Assembly** (this skill) → Final AI Value Blueprint (client-facing DOCX)

**Input:** All outputs from Steps 1–4. All are required.
**Output:** The final AI Value Blueprint deliverable.

## Inputs Required

Before assembling, confirm you have:

| Input | From Step | Check |
|-------|----------|-------|
| Compressed Client Dossier | Step 1 (Intake) | Sections A–D complete, pain points prioritized |
| AI Readiness Snapshot | Step 2 (Maturity) | All 6 dimensions scored with rationale |
| Scored Opportunity Map | Step 3 (Opportunities) | 5–7 opportunities scored and classified |
| Recommended Action Sequence | Step 4 (Roadmap) | All opportunities assigned to Now/Next/Later |

If any input is missing or incomplete, flag it and request the missing step be run first.

## The Blueprint Deliverable Structure

Produce **exactly** these sections, in this order:

### 1. Executive Summary (1 page)

Synthesize the key findings from all 4 steps into a single, compelling page:
- Who the client is and what they do (from Dossier Section A)
- Their overall AI readiness posture (from Readiness Snapshot overall pattern)
- The top 3 findings — what matters most (drawn from pain points, maturity gaps, and opportunities)
- What the Blueprint recommends as the immediate focus

Write this fresh — do not copy-paste from upstream outputs. The executive summary should read
as a coherent narrative, not a mashup. A CEO should be able to read only this page and
understand the core message.

Tone: confident, consultative, evidence-based. No jargon. No hedging. Clear and direct.

### 2. AI Readiness Snapshot (1–2 pages)

Take the Readiness Snapshot from Step 2 and format it for the client:
- The 6-dimension scorecard table (Dimension | Level | Key Evidence)
- A brief narrative (3–5 sentences) explaining the overall readiness pattern
- Key constraints for AI adoption (3–5 bullets from the maturity analysis)

Include a note explaining the 3-level scale (Early / Developing / Established) so the
client understands what the scores mean.

Consider formatting the scorecard as a visual element — a colored table or simple chart
where Early = red/orange, Developing = amber/yellow, Established = green.

### 3. Key Findings: Where Value is Being Lost (2–3 pages)

Transform the pain points from the Dossier (Section C) into a client-facing narrative:
- Lead with the most impactful findings
- Connect each pain point to a quantifiable impact where possible
- Use evidence from the uploaded documents to substantiate claims
- Frame findings constructively: "Opportunity to recover..." not "You're losing..."

This section should make the client feel that the €7.5K–€10K was worth it even before
they see the opportunities. The value comes from seeing their problems clearly articulated
and evidenced.

### 4. AI Opportunity Map (4–6 pages)

Take the Scored Opportunity Map from Step 3 and present it client-facing:
- Brief intro (100–150 words from the Executive Opportunity Summary)
- The opportunity cards (5–7), formatted cleanly with consistent layout
- The Portfolio View (Quick Wins / Foundation Builders / Big Bets)
- The 2×2 matrix description (Impact vs. Feasibility) — describe where each opportunity
  sits conceptually, or include as a formatted table

Each opportunity card should be immediately understandable by a non-technical executive.
Remove any internal jargon, confidence tags, or methodology references from the client-facing
version. Keep the scores visible (Impact/Feasibility/Alignment) but frame them as
"Estimated Impact" and "Readiness to Implement."

### 5. Recommended Action Sequence (1–2 pages)

Take the Action Sequence from Step 4 and present it client-facing:
- The sequencing rationale (why this order)
- Now (Months 1–3) — what to start immediately
- Next (Months 3–6) — what comes after initial wins
- Later (Months 6–12) — what to build toward

Frame each phase in terms of what the client will achieve, not what's technically required.
"In months 1–3, you can expect to see..." rather than "Based on feasibility scores..."

### 6. Readiness Gaps and Recommendations (1–2 pages)

Synthesize the maturity gaps and opportunity prerequisites into a clear picture of what
the client needs to address:
- Which readiness gaps are most urgent (blocking "Now" phase opportunities)
- Which gaps can be addressed in parallel with early initiatives
- Which gaps require dedicated investment before advanced opportunities become viable

For each gap, provide a concrete recommendation (not just "improve data governance" but
"designate a data owner for your CRM and sales pipeline data within the first 30 days").

### 7. Recommended Next Steps (1 page)

Provide 3–4 concrete, actionable next steps the client can take immediately:
- At least 1 internal action the client can do on their own
- At least 1 that connects to AI Assist BG's services (Workspace Enablement Sprint,
  Managed Revenue Workforce, or full AI Company Audit)
- Frame the AI Assist BG service recommendations as honest consulting advice, not sales copy

End with: "This Blueprint provides the diagnostic foundation. The opportunities identified
here represent significant potential value. The next step — whether pursued internally or
with support — is to move from insight to action."

### 8. Appendix: Methodology Note (half page)

Brief explanation of the methodology:
- AI Assist BG's proprietary analytical framework
- The 6 maturity dimensions
- The opportunity scoring approach (Impact × Feasibility × Alignment)
- Note that this Blueprint uses a streamlined version of the full methodology;
  a comprehensive AI Company Audit provides deeper analysis

## Document Formatting

Generate the deliverable as a `.docx` file using the `docx` skill with these specifications:

**Branding:**
- Font: Arial throughout (12pt body, 16pt H1, 14pt H2)
- Accent color: #2E5FA1 (AI Assist BG blue)
- Secondary color: #A6A6A6 (gray for subtitles and metadata)
- Header: "AI Assist BG | AI Value Blueprint" on every page
- Footer: page numbers, centered
- Title page: Client name, "AI Value Blueprint", date, "Prepared by AI Assist BG"

**Layout:**
- US Letter (8.5 x 11 inches)
- 1-inch margins
- Table of Contents after title page
- Page break before each major section
- Tables with blue header rows (#2E5FA1 background, white text)
- Clean, professional, consulting-grade presentation

**Naming convention:** `AI Value Blueprint — {Client Name}.docx`

## Quality Checks Before Finalizing

Before producing the final document, verify:

| Check | What to verify |
|-------|---------------|
| Client name consistency | Same name used throughout all sections |
| Score consistency | Maturity scores in Section 2 match what's referenced in Sections 4–6 |
| Opportunity consistency | Same 5–7 opportunities appear in Sections 4 and 5 |
| No internal jargon | Remove confidence tags, methodology codes, and internal references |
| Tone | Client-facing, consultative, constructive throughout |
| Page count | 12–18 pages total (flag if outside range) |
| Confidence summary | Note the overall confidence level in the methodology appendix |

## Methodology Reference

For shared methodology standards, read
`../blueprint-orchestrator/references/methodology-and-contracts.md`.

## Quality Gate Integration

### Pre-Gate Self-Assessment (Mandatory)

Before your output is passed to the orchestrator's quality gate (QG-FINAL), you must run the
**7-Point Grounding Check** from `../blueprint-orchestrator/references/evidence-grounding-checklist.md`
against your output.

### Quality Self-Assessment Block (Required at End of Output)

After producing the final Blueprint deliverable, append the standardized Quality Self-Assessment
block as defined in `../blueprint-orchestrator/references/evidence-grounding-checklist.md`.
This block reports your own estimated scores across all 5 quality dimensions.

**QG-FINAL has a higher threshold: the final deliverable must achieve Green (90%+).**

### Anti-Hallucination Rules for Assembly

Assembly is a polishing step — it must NOT alter substance. The biggest hallucination risk
here is introducing new claims during the rewriting process. Special rules:

1. **The Executive Summary must be traceable.** Every claim in the Executive Summary must
   trace to a specific upstream output. The summary is a synthesis — not new analysis.
2. **Scores must match upstream exactly.** Maturity scores from Step 2, opportunity scores
   from Step 3, phase assignments from Step 4 — all must be reproduced exactly. Any
   discrepancy is a consistency failure.
3. **Polish must not alter meaning.** When rewriting for client-facing tone, do not soften
   findings beyond accuracy. "Significant process bottlenecks" cannot become "minor areas
   for improvement" if the dossier classified severity as "High."
4. **Remove all internal artifacts.** Confidence tags ([Document-Backed], [Form-Stated],
   [Inferred], [Assumption]), methodology codes, and internal references must be removed
   from the client-facing document. But track them internally — the quality gate still
   needs them.
5. **Do not add analysis.** If a section feels thin, it's because the upstream step produced
   thin output. Flag it — do not invent supplementary analysis to fill the gap.
6. **Verify the document index.** Page count must be 12–18 pages. All 8 sections must be
   present. Client name must be consistent throughout.

### No Downstream Data Contract (Final Step)

Assembly is the terminal step. Its "downstream" is the client. The QG-FINAL gate verifies
the deliverable is client-ready.

## First-Turn Behavior

When the user provides all 4 upstream outputs:
1. Confirm all inputs are received and complete
2. Flag any missing or incomplete sections
3. Produce the complete AI Value Blueprint deliverable as a .docx file
4. Present a brief summary of what's in the document (section-by-section overview in 5–6 sentences)
5. Include the Quality Self-Assessment block at the end of your output — this is mandatory
   for every pipeline run
