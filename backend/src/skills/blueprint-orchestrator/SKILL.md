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
schema_version: intake_v1.1
skill_version: 3.0.0
last_updated: 2026-07-21
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

**GATE 1 (MANDATORY — NON-SKIPPABLE):** Before proceeding to Step 2, the operator MUST run the
validation harness and confirm a PASS result. The orchestrator MUST refuse to invoke
`blueprint-maturity` without this confirmation. Treat the harness output as authoritative —
not the AI Output Quality dashboard, which measures citation grounding only and does not
detect structural truncation or missing sections.

```bash
# The one-line gate check — run this after every Step 1 invocation:
bash /mnt/skills/user/blueprint-intake/harness/gate.sh <dossier_path>
```

Expected output for a passing dossier:
```
GATE 1: PASS — dossier conforms to its declared intake schema. Safe to invoke blueprint-maturity.
```

Expected output for a failing dossier:
```
GATE 1: FAIL — N failures detected. See report above. DO NOT invoke blueprint-maturity.
```

If FAIL: review the harness report, decide whether to regenerate (preferred) or hand-correct,
then re-run gate.sh. Only proceed when PASS is confirmed.

**Why this gate exists:** The Ivan_Montin test runs (May 2026) produced dossiers that scored
99% GREEN on the AI Output Quality dashboard but were missing 5 of 9 mandatory sections due
to generation truncation. The dashboard measured what existed; the harness measures what
should exist. Both are needed; the harness gate is the authoritative one for pipeline progression.

**Step 2 — Maturity:** Invoke `blueprint-maturity` with the validated dossier from Step 1.
Review the 6-dimension snapshot. Verify scores have rationale and conservative bias is applied.

**Step 3 — Opportunities:** Invoke `blueprint-opportunities` with the dossier + maturity
snapshot. Review opportunity scores and classifications. Verify readiness adjustment rule
was applied. The opportunity inventory must correspond to the 7 hypotheses produced by Step 1.

**GATE 3 (MANDATORY — NON-SKIPPABLE):** Before proceeding to Step 4, the operator MUST verify
all of the following. Do NOT invoke `blueprint-roadmap` until every check passes.

```
GATE 3 checklist:

[ ] Score marker count: exactly N <!-- score: id=... --> markers present, where N = the number
    of hypotheses in the Step 1 dossier Section D (7, or 8 when H-CORE-00 was gated in — v1.1).
    A missing marker means the downstream roadmap and assembly will silently drop that opportunity.

[ ] H-CORE-00 consistency (v1.1): if the Step 1 dossier contains PP-CORE-00 and an H-0 entry,
    the Step 3 map carries exactly one id=H-CORE-00 marker (one undivided card — any split is a FAIL);
    if the dossier has no H-0, the Step 3 map must not introduce one.

[ ] Classification conformance: for every score marker, verify the class= value obeys the
    D6b pinned decision tree:
      · feasibility ≥ 4  →  class must be QuickWin
      · impact ≥ 4 AND feasibility ≤ 3  →  class must be BigBet
      · all other combinations  →  class must be FoundationBuilder
    Any mislabelled marker is a GATE 3 FAIL — regenerate the Step 3 output, do not hand-correct.

[ ] Portfolio completeness: at least 1 QuickWin, 1 FoundationBuilder, 1 BigBet in the marker set.

[ ] Score consistency: the class= label in each marker matches the **Classification:** field
    in the corresponding opportunity card. Discrepancies indicate the pre-flight check was skipped.
```

If any check fails: return to Step 3, identify and fix the defect, and re-run this checklist.
Do not proceed to Step 4 with a failing Gate 3.

**Step 4 — Roadmap:** Invoke `blueprint-roadmap` with the scored opportunities + maturity
snapshot. Review the Now/Next/Later sequence. Verify maturity gating was respected and that
Quick Wins from Step 3 are sequenced first.

**Step 5.5 — Build Sheet (conditional, post-Gate-5):** after GATE 5 passes, invoke
`blueprint-aria-spec` when the engagement's outputs contain PP-CORE-00 or `[BAND_ASSIGNMENT]`
Band 1/2 — it reads the three locked outputs (never modifies them) and emits the ARIA Build
Sheet plus the honesty-gate report. Assembly's Section 7 pinned recommendation sentence renders
only when aria-spec emitted `recommendation: proceed`. If aria-spec is skipped or gates fail,
the client deliverable carries no product recommendation.

**Step 5 — Assembly:** Invoke `blueprint-assembly` with all outputs from Steps 1–4. The assembly
skill uses a **3-chunk workflow** — the operator MUST actively trigger all three chunks.

```
Assembly completion protocol:

1. Provide all 4 upstream outputs. The skill produces Chunk 1 (Sections 1–2) and stops.
2. Reply "continue to chunk 2". The skill produces Chunk 2 (Sections 3–4) and stops.
3. Reply "continue to chunk 3". The skill produces Chunk 3 (Sections 5–8 + JUSTIFICATION + Final marker).
4. Concatenate Chunks 1–3 into the final document, removing the CHECKPOINT 1 and CHECKPOINT 2
   blocks but keeping the Final marker.
```

**GATE 5 — Assembly completion check (mandatory before DOCX conversion):**

```
[ ] All 7 section headers present (Executive Summary, AI Readiness Snapshot, Key Findings,
    AI Opportunity Map, Recommended Action Sequence, Readiness Gaps, Recommended Next Steps)
[ ] Appendix / Methodology Note present
[ ] Final marker present: "End of AI Value Blueprint. Chunks 1–3 complete."
[ ] No CHECKPOINT block in the deliverable (search for "CHECKPOINT 1" or "CHECKPOINT 2")
[ ] No operator preamble in the deliverable (search for "I have all" or "continue to chunk")
[ ] Word count within 12–18 page equivalent (~5,000–7,000 words)
```

If any check fails, the deliverable is incomplete. Trigger the missing chunk(s) and re-assemble
before DOCX conversion. A document that stops after Section 2 is a fragment, not a Blueprint.

## Quality Checks Between Steps

After each skill completes, verify before proceeding:

| Check | What to verify | Enforcement |
|-------|---------------|-------------|
| Completeness | All required output sections present | Step 1: harness; Steps 2–5: manual review |
| Schema conformance | Output matches the stage's contract | Step 1: harness; Steps 2–5: manual review |
| Confidence coverage | Claims tagged with confidence levels per `intake_v1.0` taxonomy | Step 1: harness; downstream: traceable to dossier |
| Consistency | Client name, industry, key facts, hypothesis count consistent across stages | Manual review |
| Tone | Client-facing language where applicable | Manual review |
| Downstream readiness | Output contains everything the next skill needs | Manual review |

## Methodology Reference

For the full methodology standards, scoring frameworks, data contracts, and scope boundaries,
read the PIO Framework files in `../blueprint-intake/references/`:

- `intake_v1.1.md` — the master schema for Step 1 output (the foundation of all downstream stages)
- `citation_rules.md` — citation format used across the pipeline
- `source_registry.md` — canonical source names
- `confidence_thresholds.md` — confidence tag definitions
- `algorithms/pain_point_selection.md` — how Step 1 picks pain points (drives Step 3 opportunities)
- `algorithms/hypothesis_selection.md` — how Step 1 picks hypotheses (drives Step 3 and Step 4)
- `algorithms/ordering.md` — within-section ordering
- `archetypes/_core.md` — the universal CORE pattern (PP-CORE-00/H-CORE-00 gates, band table)
- `preflight.md` — forbidden patterns across all stages

The schema spec `intake_v1.1.md` is the canonical reference document for cross-stage contracts.

## Handling Incomplete Inputs

If the user wants to start partway through the pipeline:

1. Ask what deliverables already exist
2. Check if the required upstream outputs are available
3. **If starting from Step 2 or later: confirm the existing dossier passes harness validation.**
   If not, instruct the operator to either:
   - Re-run `blueprint-intake` on the original inputs (preferred), OR
   - Manually remediate the dossier to schema conformance before proceeding
4. If upstream materials are missing, recommend starting from the earliest incomplete step
5. The compressed dossier (Step 1) is always required — never skip it

## Engagement Reference Numbering

Each Blueprint engagement should have a reference number (e.g. `BP-2026-001`) that:

- Appears in the Step 1 dossier header
- Carries through every downstream deliverable
- Is logged in the engagement tracker (location TBD by Practice Lead)

This enables post-hoc audit of any deliverable back to its source materials and schema version.

## First-Turn Behavior

When the user invokes this skill:

1. Ask what stage they're at — new client or continuing an existing Blueprint?
2. If new client: confirm they have the intake form responses and uploaded documents, then
   recommend starting with `blueprint-intake`. Also confirm the engagement reference number.
3. If continuing: identify which steps are complete and recommend the next step. If they're
   continuing from Step 2 or later, ask whether the Step 1 dossier passed harness validation —
   if not, route them back to Step 1 first.
4. If the user wants to run the full pipeline end-to-end: coordinate the sequence, invoking
   each skill in order and enforcing the harness gate after Step 1.
5. If the user asks about pipeline quality, methodology, or "why does the output vary": point
   them at the PIO Framework files (especially `intake_v1.0.md` and the audit document).

## Cross-Stage Consistency Checks

Once Steps 1–4 are complete and before invoking Step 5 (Assembly), verify:

**Hypothesis identity check (match by canonical ID first, title second):**
- Extract the canonical IDs (`id=H-RT-XX` / `id=H-CORE-00`) from the Step 1 Section D score markers and from the Step 3 opportunity markers — the ID sets must be identical (no addition, no removal)
- Where markers are absent (legacy dossiers), fall back to title matching (allowing minor rephrasing for client-facing language, but NOT addition or removal)
- **Do NOT match by position number (H1, H2, etc.).** Position numbers reflect the presentation ordering and may change; canonical IDs never do. H-CORE-00, when present in Step 1, must be present in Step 3 as exactly one card
- Flag any Step 3 opportunity with no corresponding Step 1 ID (addition) and any Step 1 ID missing from Step 3 (removal)

**Pain point reference check:**
- The 8 pain points named in Step 1 Section C (incl. PP-CORE-00 when gated in) are referenced by the Step 3 opportunities

**Sequencing integrity check:**
- The Step 4 Now/Next/Later sequence respects the Step 3 classifications (Quick Wins in Now, Foundation Builders in Next, Big Bets in Later — with documented exceptions only)
- The Step 2 maturity scores are reflected in the Step 3 readiness adjustments

**Style check:**
- Currency convention consistent (EUR, not €, per AI Assist BG style)
- Client name consistent across all four upstream outputs

Any inconsistency must be resolved before assembly, not after.

## Skill Versioning Policy

Each Blueprint skill carries a `skill_version` in its frontmatter. The orchestrator is
compatible with skill versions in the same major version. When invoking a skill, verify
the version. If a skill has been upgraded mid-engagement, do not mix versions — finish the
engagement with the started version, or restart from Step 1 with the upgraded versions.

Current versions (as of this SKILL.md update):

| Skill | Version | Schema |
|-------|---------|--------|
| blueprint-orchestrator | 3.0.0 | intake_v1.1 |
| blueprint-intake | 3.0.0 | intake_v1.1 |
| blueprint-maturity | 2.0.0 | intake_v1.1 |
| blueprint-opportunities | 2.0.0 | intake_v1.1 |
| blueprint-roadmap | 2.0.0 | intake_v1.1 |
| blueprint-assembly | 2.0.0 | intake_v1.1 |
| blueprint-aria-spec | 1.0.0 | intake_v1.1 (read-only consumer; versioned independently) |
| methodology-and-contracts | 1.1.0 | intake_v1.1 |

All skills now carry `schema_version: intake_v1.1` in their frontmatter. If the schema bumps to
`intake_v2.0`, each downstream skill must be updated before it is used with dossiers produced under
the new schema. The orchestrator must refuse to invoke a downstream skill whose declared schema_version
does not match the dossier's schema version header.

## What Changed in Skill Version 2.0.0

This SKILL.md was updated in May 2026 to integrate the PIO Framework. The previous version
referenced a `references/methodology-and-contracts.md` file that did not exist (the dead
pointer that contributed to TEST 1 / TEST 2 output variance).

Substantive changes from v1.x:

- The methodology reference now points at the actual file at
  `../blueprint-intake/references/intake_v1.0.md` rather than a non-existent file
- A new validation gate is enforced between Step 1 and Step 2 (`harness/validate_intake.py`)
- Cross-stage consistency checks are now explicit before invoking Step 5
- Skill versioning policy is documented
- Engagement reference numbering is now recommended

Existing engagements in flight under v1.x may continue under v1.x rules. New engagements
should start under v2.0.0.
