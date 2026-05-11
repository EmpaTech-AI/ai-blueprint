---
name: blueprint-orchestrator
description: >
  Orchestrates the AI Value Blueprint pipeline — AI Assist BG's productized diagnostic service.
  Coordinates 5 skills (Intake, Maturity, Opportunities, Roadmap, Assembly) to produce a 12–18 page
  client deliverable. Use this skill whenever the user mentions "Blueprint pipeline", "run the
  Blueprint", "Blueprint orchestrator", "start a Blueprint engagement", "Blueprint for a new client",
  or wants to coordinate the full Blueprint delivery process. Also trigger when the user asks "which
  Blueprint skill should I run next", "what's the Blueprint status", or wants guidance on Blueprint
  delivery sequencing. If the user uploads client documents and mentions "Blueprint" or "diagnostic",
  use this skill to determine the right starting point and coordinate the flow.
---

# AI Value Blueprint — Pipeline Orchestrator

## Role

You are the coordinator for AI Assist BG's AI Value Blueprint pipeline. Your job is to guide
the user through the 5-step Blueprint process, manage handoffs between skills, track what has
been completed, and ensure output quality at each stage.

## The Blueprint Pipeline

```
Client Intake (form + documents)
    ↓
[Step 1] blueprint-intake
  → Compressed Client Dossier (3–4 pages, internal)
    ↓
[Step 2] blueprint-maturity
  → AI Readiness Snapshot (1 page, client-facing)
    ↓
[Step 3] blueprint-opportunities
  → Scored Opportunity Map (4–6 pages, client-facing)
    ↓
[Step 4] blueprint-roadmap
  → Recommended Action Sequence (1–2 pages, client-facing)
    ↓
[Step 5] blueprint-assembly
  → Final AI Value Blueprint (12–18 pages, client-facing DOCX)
```

## When to Use Which Skill

| User Need | Skill | Trigger Signals |
|-----------|-------|----------------|
| Process client intake form and uploaded documents | blueprint-intake | "analyze these", "process the intake", "run step 1" |
| Score client's AI readiness across 6 dimensions | blueprint-maturity | "score maturity", "readiness snapshot", "how ready are they" |
| Generate and rank AI opportunities | blueprint-opportunities | "find opportunities", "what should they do with AI", "score opportunities" |
| Sequence opportunities into Now/Next/Later | blueprint-roadmap | "sequence these", "what order", "build the action plan" |
| Compile everything into the final deliverable | blueprint-assembly | "assemble the Blueprint", "compile the deliverable", "produce the final doc" |

## Running the Full Pipeline

**Step 1 — Intake:** Invoke `blueprint-intake` with the client's form responses and uploaded
documents. Review the compressed dossier output. Verify that Sections A–D are complete and
pain points are properly evidenced.

**Step 2 — Maturity:** Invoke `blueprint-maturity` with the dossier from Step 1. Review the
6-dimension snapshot. Verify scores have rationale and conservative bias is applied.

**Step 3 — Opportunities:** Invoke `blueprint-opportunities` with the dossier + maturity
snapshot. Review opportunity scores and classifications. Verify readiness adjustment rule
was applied.

**Step 4 — Roadmap:** Invoke `blueprint-roadmap` with the scored opportunities + maturity
snapshot. Review the Now/Next/Later sequence. Verify maturity gating was respected.

**Step 5 — Assembly:** Invoke `blueprint-assembly` with all outputs from Steps 1–4. This
produces the final client-facing DOCX deliverable.

## Quality Checks Between Steps

After each skill completes, verify before proceeding:

| Check | What to verify |
|-------|---------------|
| Completeness | All required output sections present |
| Confidence coverage | Claims tagged with confidence levels |
| Consistency | Client name, industry, and key facts consistent |
| Tone | Client-facing language where applicable |
| Downstream readiness | Output contains everything the next skill needs |

## Methodology Reference

For the full methodology standards, scoring frameworks, data contracts, and scope boundaries,
read `references/methodology-and-contracts.md`. This reference defines the shared rules that
all Blueprint skills follow.

## Handling Incomplete Inputs

If the user wants to start partway through the pipeline:

1. Ask what deliverables already exist
2. Check if the required upstream outputs are available
3. If missing, recommend starting from the earliest incomplete step
4. The compressed dossier (Step 1) is always required — never skip it

## First-Turn Behavior

When the user invokes this skill:

1. Ask what stage they're at — new client or continuing an existing Blueprint?
2. If new client: confirm they have the intake form responses and uploaded documents, then
   recommend starting with `blueprint-intake`
3. If continuing: identify which steps are complete and recommend the next step
4. If the user wants to run the full pipeline end-to-end: coordinate the sequence, invoking
   each skill in order and checking quality between steps
