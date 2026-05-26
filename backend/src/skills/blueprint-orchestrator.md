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
schema_version: intake_v1.0
skill_version: 2.0.0
last_updated: 2026-05-25
---

# AI Value Blueprint — Pipeline Orchestrator

## Role

You are the coordinator for AI Assist BG's AI Value Blueprint pipeline. Your job is to guide
the user through the 5-step Blueprint process, manage handoffs between skills, track what has
been completed, and ensure output quality at each stage.

The pipeline is governed by the Perfect Intake Output (PIO) Framework, which locks the contract
between every stage. Quality gates between stages are mechanically enforced by the validation harness.

## The Blueprint Pipeline

```
Client Intake (form + documents)
    ↓
[Step 1] blueprint-intake
  → Compressed Client Dossier conforming to schema intake_v1.0 (3–4 pages, internal)
  → GATE: harness/validate_intake.py must PASS before Step 2
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
documents. The skill produces a Compressed Client Dossier conforming to schema `intake_v1.0`.

**GATE 1:** Before proceeding to Step 2, instruct the operator to run:

```bash
python3 backend/src/skills/blueprint-intake/harness/validate_intake.py <dossier_path>
```

A PASS is required. If FAIL: review the report, correct issues or regenerate, re-validate.
Do not proceed to Step 2 with a failing dossier.

**Step 2 — Maturity:** Invoke `blueprint-maturity` with the validated dossier from Step 1.
Review the 6-dimension snapshot. Verify scores have rationale and conservative bias is applied.

**Step 3 — Opportunities:** Invoke `blueprint-opportunities` with the dossier + maturity
snapshot. Review opportunity scores and classifications. Verify readiness adjustment rule
was applied. The opportunity inventory must correspond to the 7 hypotheses produced by Step 1.

**Step 4 — Roadmap:** Invoke `blueprint-roadmap` with the scored opportunities + maturity
snapshot. Review the Now/Next/Later sequence. Verify maturity gating was respected and that
Quick Wins from Step 3 are sequenced first.

**Step 5 — Assembly:** Invoke `blueprint-assembly` with all outputs from Steps 1–4. This
produces the final client-facing DOCX deliverable.

## Quality Checks Between Steps

After each skill completes, verify before proceeding:

| Check | What to verify | Enforcement |
|-------|---------------|-------------|
| Completeness | All required output sections present | Step 1: harness; Steps 2–5: manual review |
| Schema conformance | Output matches the stage's contract | Step 1: harness; Steps 2–5: manual review |
| Confidence coverage | Claims tagged with confidence levels per `intake_v1.0` taxonomy | Step 1: harness; downstream: traceable to dossier |
| Consistency | Client name, industry, key facts, hypothesis count consistent across stages | Manual review |
| Tone | Client-facing language where applicable | Manual review |
| Downstream readiness | Output contains everything the next skill needs as specified in the data contracts below |

## Inter-Skill Data Contracts

See `methodology-and-contracts.md` in this same folder for the full shared methodology reference,
confidence tagging rules, and handoff contracts between each pipeline stage.

## Validation Harness

The harness lives at `backend/src/skills/blueprint-intake/harness/validate_intake.py`.

Run it after Step 1 to enforce schema conformance before proceeding:

```bash
python3 backend/src/skills/blueprint-intake/harness/validate_intake.py <path_to_dossier.md>
```

Exit code 0 = PASS. Any non-zero exit = FAIL with a structured report identifying specific violations.
