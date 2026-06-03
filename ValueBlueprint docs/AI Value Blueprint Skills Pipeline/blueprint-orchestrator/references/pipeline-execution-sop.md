# AI Value Blueprint — Pipeline Execution Standard Operating Procedure (SOP)

## Purpose

This SOP defines the **exact procedure** for executing the AI Value Blueprint pipeline from
start to finish, including quality gate enforcement, remediation workflows, escalation paths,
and the handoff protocol between skills. It is the authoritative reference for how the pipeline
should be run — whether by an AI consultant using Claude, or by any future automated pipeline
orchestration system.

---

## Pre-Pipeline Checklist

Before starting the pipeline, verify:

| # | Check | Status |
|---|-------|--------|
| 1 | Client intake form responses received (all 7 sections) | ☐ |
| 2 | Uploaded documents received (minimum 4 required categories) | ☐ |
| 3 | Client name and engagement ID confirmed | ☐ |
| 4 | Engagement type confirmed as "AI Value Blueprint" (not full Audit) | ☐ |
| 5 | All documents in readable format (PDF, DOCX, XLSX, PPTX, CSV) | ☐ |
| 6 | No documents exceed 50 pages (flag for pre-processing if so) | ☐ |
| 7 | Intake Form Quality Score calculated (see `intake-form-quality-scoring.md`) | ☐ |
| 8 | Material quality assessed against templates (see `client-material-templates.md`) | ☐ |
| 9 | Client industry identified and hallucination hotspots loaded (see `industry-hallucination-hotspots.md`) | ☐ |
| 10 | Engagement row created in tracker (see `engagement-tracker.xlsx`) | ☐ |

### Intake Form Quality Screen

Before assessing material sufficiency, run the **Intake Form Quality Score** from
`intake-form-quality-scoring.md`. This scores each of the 7 form sections on a 0–3 scale
with industry-weighted averages:
- **80%+ (Excellent):** Strong foundation for pipeline
- **65–79% (Adequate):** Acceptable but budget for remediation
- **50–64% (Marginal):** Request improved responses on low-scoring sections
- **Below 50% (Insufficient):** Do not start pipeline until form quality improves

### Material Quality Assessment

Assess uploaded documents against the standardized templates in `client-material-templates.md`.
For each of the 8 categories, check: received? correct format? contains expected data points?
quality level (Rich/Adequate/Thin)?

### Industry Hallucination Briefing

Identify the client's industry and load the relevant section from
`industry-hallucination-hotspots.md`. Brief on industry-specific hallucination patterns,
false precision traps, and opportunity generation traps that all skills should watch for.

### Material Sufficiency Pre-Screen

After completing the form quality score and material assessment, synthesize into the
material sufficiency judgment:

| Signal | Sufficient | Marginal | Insufficient |
|--------|-----------|----------|-------------|
| Intake form completeness | All 7 sections answered with detail | 5–6 sections answered, some thin | <5 sections or mostly one-word answers |
| Document count | 5–8 documents across categories | 4 documents, core categories covered | <4 documents or missing required categories |
| Financial data | P&L or revenue breakdown provided | Revenue mentioned in form only | No financial data at all |
| Process documentation | SOPs or workflow docs provided | Processes described in form | No process information |

- **Sufficient:** Proceed with pipeline
- **Marginal:** Proceed but expect Amber/Blue quality gates — plan for remediation
- **Insufficient:** Contact client for additional materials before starting. Running the
  pipeline on insufficient materials wastes time and produces unreliable output.

---

## Pipeline Execution Sequence

### Overview with Quality Gates

```
[Pre-Pipeline Checklist]
         ↓
[Step 1] blueprint-intake
  → Compressed Client Dossier
         ↓
    [QG-1] Quality Gate Assessment
    Decision: PASS / REVIEW / REMEDIATE / FAIL
         ↓
[Step 2] blueprint-maturity
  → AI Readiness Snapshot
         ↓
    [QG-2] Quality Gate Assessment
    Decision: PASS / REVIEW / REMEDIATE / FAIL
         ↓
[Step 3] blueprint-opportunities
  → Scored Opportunity Map
         ↓
    [QG-3] Quality Gate Assessment
    Decision: PASS / REVIEW / REMEDIATE / FAIL
         ↓
[Step 4] blueprint-roadmap
  → Recommended Action Sequence
         ↓
    [QG-4] Quality Gate Assessment
    Decision: PASS / REVIEW / REMEDIATE / FAIL
         ↓
[Step 5] blueprint-assembly
  → Final AI Value Blueprint
         ↓
    [QG-FINAL] Quality Gate Assessment (Green threshold)
    Decision: PASS / REMEDIATE / FAIL
         ↓
[Consultant Review & Polish]
         ↓
[Client Delivery]
```

---

### Step 1: Intake Analysis

**Skill:** `blueprint-intake`
**Input:** Client intake form responses + uploaded documents
**Output:** Compressed Client Dossier (3–4 pages, internal)

**Execution instructions:**
1. Provide all client materials to the blueprint-intake skill
2. Confirm it acknowledges receipt and lists all documents
3. Wait for the complete Compressed Dossier output
4. Verify the output includes the Quality Self-Assessment block
5. Proceed to QG-1

**Common issues at this step:**
- Documents in image-only PDF format (can't be parsed) → Request re-submission
- Form answers that are copy-pasted marketing language → Flag as low-value input
- Contradictions between form answers and document data → Both must be captured

### QG-1: Intake → Maturity Gate

**Run the quality gate algorithm** (see `quality-gate-algorithm.md`) against the Compressed
Client Dossier.

**Gate-specific focus areas:**
- Are Sections A–D complete and substantive?
- Are pain points (Section C) backed by evidence, not just form statements?
- Are hypotheses (Section D) grounded in at least 2 data points each?
- Is the document index accurate?
- Are open questions (Section G) meaningful and specific?

**Decision matrix:**

| Score | Action |
|-------|--------|
| Green (90%+) | Proceed to Step 2. Consultant scans dossier for 5 minutes. |
| Amber (76–89%) | Consultant reviews flagged items. Fixes inline. Proceed to Step 2. |
| Blue (60–75%) | Consultant performs detailed review. Supplements weak sections from source documents. Re-runs QG-1. |
| Red (<60%) | Dossier rejected. Check: are client materials sufficient? If yes, re-run intake with explicit instructions to improve weak areas. If no, contact client for additional materials. |

---

### Step 2: Maturity Scoring

**Skill:** `blueprint-maturity`
**Input:** QG-1-passed Compressed Client Dossier
**Output:** AI Readiness Snapshot (1 page, client-facing)

**Execution instructions:**
1. Provide the QG-1-passed dossier to blueprint-maturity
2. Wait for the complete Readiness Snapshot output
3. Verify the output includes the Quality Self-Assessment block
4. Proceed to QG-2

**Common issues at this step:**
- Scoring dimensions with insufficient evidence → Ensure [Insufficient Evidence] tags are used
- All dimensions scored "Developing" (suspiciously uniform) → Challenge for differentiation
- Scores that contradict obvious evidence in the dossier → Flag consistency issue

### QG-2: Maturity → Opportunities Gate

**Gate-specific focus areas:**
- Does every dimension score have at least one supporting citation from the dossier?
- Is the conservative bias applied (ambiguous evidence → lower score)?
- Is the pocket maturity rule applied (one advanced team ≠ organizational maturity)?
- Are key constraints specifically named and actionable?
- Do the rationales actually justify the assigned levels?

**Decision matrix:** Same as QG-1 structure.

---

### Step 3: Opportunity Harvesting

**Skill:** `blueprint-opportunities`
**Input:** QG-1-passed Dossier + QG-2-passed Readiness Snapshot
**Output:** Scored Opportunity Map (4–6 pages, client-facing)

**Execution instructions:**
1. Provide BOTH the dossier and readiness snapshot
2. Verify the skill restates the baseline before generating opportunities
3. Wait for the complete Scored Opportunity Map
4. Verify the output includes the Quality Self-Assessment block
5. Proceed to QG-3

**Common issues at this step:**
- Generic "AI for everything" opportunities → Every opportunity must trace to a specific pain point
- Feasibility scores that ignore maturity gaps → Readiness adjustment rule is mandatory
- All opportunities scored similarly → Challenge for genuine differentiation
- Missing portfolio balance → Should include Quick Wins, Foundation Builders, and Big Bets

### QG-3: Opportunities → Roadmap Gate

**Gate-specific focus areas:**
- Does every opportunity card cite a specific pain point from Dossier Section C?
- Were readiness adjustments applied and noted for every affected opportunity?
- Do the scores (Impact × Feasibility) actually justify the ranking order?
- Is the portfolio view balanced (at least 1 of each classification)?
- Are pilot suggestions realistic given the client's maturity profile?

**Decision matrix:** Same structure.

---

### Step 4: Roadmap Composition

**Skill:** `blueprint-roadmap`
**Input:** QG-3-passed Opportunity Map + QG-2-passed Readiness Snapshot
**Output:** Recommended Action Sequence (1–2 pages, client-facing)

**Execution instructions:**
1. Provide BOTH the opportunity map and readiness snapshot
2. Verify the skill restates key constraints before sequencing
3. Wait for the complete Recommended Action Sequence
4. Verify the output includes the Quality Self-Assessment block
5. Proceed to QG-4

**Common issues at this step:**
- Maturity gating not respected → Advanced initiatives must not precede foundations
- No Quick Win in "Now" phase → At least one must be present for momentum
- Phase overloading → Maximum 3 items per phase
- Vague "why now/next/later" rationale → Must reference specific maturity gaps

### QG-4: Roadmap → Assembly Gate

**Gate-specific focus areas:**
- Is every opportunity from Step 3 assigned to exactly one phase?
- Are maturity gating rules respected (Early dimensions block advanced initiatives)?
- Does "Now" include at least one Quick Win?
- Are "why next, not now" explanations grounded in specific maturity gaps?
- Is the bridge to deeper engagement present and non-salesy?

**Decision matrix:** Same structure.

---

### Step 5: Blueprint Assembly

**Skill:** `blueprint-assembly`
**Input:** All 4 QG-passed outputs from Steps 1–4
**Output:** Final AI Value Blueprint (12–18 page client-facing DOCX)

**Execution instructions:**
1. Provide ALL 4 prior outputs
2. Verify the skill confirms receipt of all inputs
3. Wait for the complete Blueprint deliverable
4. Verify page count is within 12–18 pages
5. Proceed to QG-FINAL

**Common issues at this step:**
- Executive summary that introduces new claims not in upstream outputs
- Maturity scores or opportunity scores that differ from upstream
- Internal jargon leaking into client-facing text (confidence tags, methodology codes)
- Tone that's too harsh or too soft (should be consultative and constructive)
- Missing sections or sections that are placeholders

### QG-FINAL: Assembly → Client Delivery Gate

**This gate has a HIGHER threshold: Green (90%+) required.**

**Gate-specific focus areas:**
- Client name consistent throughout the entire document
- All maturity scores match Step 2 exactly
- All opportunities match Step 3 exactly (same titles, scores, classifications)
- All phase assignments match Step 4 exactly
- No confidence tags, internal jargon, or methodology references visible
- Tone is client-facing, consultative, and constructive throughout
- Page count is 12–18 pages
- All 8 sections present and properly formatted

**Decision matrix:**

| Score | Action |
|-------|--------|
| Green (90%+) | Proceed to consultant review and client delivery. |
| Amber (76–89%) | Consultant fixes flagged issues. Re-run QG-FINAL. Must achieve Green. |
| Blue or Red | Re-run assembly with explicit instructions. If second attempt fails, manual assembly required. |

---

## Remediation Workflows

### Quick Fix Workflow (Amber items)

**Time budget:** 15–30 minutes per gate

1. Read the Quality Gate Report's "Flags Requiring Attention" section
2. For each flag, go to the specific location in the output
3. Apply the recommended remediation action
4. If the fix changes substance (not just wording), re-check upstream consistency
5. No re-gate required for Amber unless changes were substantial

### Deep Fix Workflow (Blue items)

**Time budget:** 30–60 minutes per gate

1. Read the Quality Gate Report's full dimension breakdown
2. Identify the dimensions dragging the score below 76%
3. For Evidence Grounding issues: go back to source documents and add citations
4. For Completeness issues: write missing section content from source materials
5. For Consistency issues: trace the discrepancy and correct to match source of truth
6. For Hallucination issues: remove or re-ground the flagged claims
7. Re-run the quality gate
8. If still Blue after remediation: escalate to senior consultant

### Rejection Workflow (Red items)

**Time budget:** Assessment only — 15 minutes. Execution varies.

1. Assess root cause: input quality vs. skill execution
2. If input quality:
   a. List specific missing materials needed
   b. Contact client with specific, prioritized document request
   c. Once received, re-run from the failed step
3. If skill execution:
   a. Re-run the skill with explicit instructions addressing the failure points
   b. If second run also fails Red: manual creation required
4. Document the failure and remediation in the engagement log

---

## Pipeline Timing Expectations

| Step | Expected Time (AI) | Quality Gate | Remediation Buffer | Total |
|------|-------------------|-------------|-------------------|-------|
| Step 1: Intake | 15–25 min | QG-1: 5 min | 15–30 min | 35–60 min |
| Step 2: Maturity | 10–15 min | QG-2: 5 min | 10–20 min | 25–40 min |
| Step 3: Opportunities | 15–25 min | QG-3: 5 min | 15–30 min | 35–60 min |
| Step 4: Roadmap | 10–15 min | QG-4: 5 min | 10–20 min | 25–40 min |
| Step 5: Assembly | 20–30 min | QG-FINAL: 10 min | 15–30 min | 45–70 min |
| **Total Pipeline** | **70–110 min** | **30 min** | **65–130 min** | **165–270 min** |

**Target:** Full pipeline completion in **3–4.5 hours** including quality gates and
remediation. This is the 80–90% automation target.

**Consultant time budget:** 1–2 hours for gate reviews, remediation, and final polish.
This is the remaining 10–20% human effort.

---

## Quality Metrics and Tracking

### Engagement Tracker

Use the **`engagement-tracker.xlsx`** workbook to record all quality metrics. The workbook has
4 sheets:

1. **Engagement Log** — Per-engagement tracking: all QG scores (first pass + final), form
   quality score, material sufficiency, remediation time, consultant time, pipeline time
2. **Quality Trends** — Auto-calculated dashboard: average scores by gate, failure rates,
   pipeline performance metrics
3. **Remediation Details** — Per-gate remediation event log: which dimension failed, what
   action was taken, root cause analysis
4. **Improvement Actions** — Systemic improvement tracking: patterns observed, proposed
   improvements, priority, status

**Update the tracker after every pipeline run.** This data drives continuous improvement.

### Per-Engagement Tracking

Record in the Engagement Log sheet for every Blueprint engagement:

| Metric | Value |
|--------|-------|
| Client name | |
| Industry | |
| Date started | |
| Date completed | |
| Form Quality Score (%) | |
| Material sufficiency rating | Sufficient / Marginal / Insufficient |
| QG-1 score (first pass / final) | |
| QG-2 score (first pass / final) | |
| QG-3 score (first pass / final) | |
| QG-4 score (first pass / final) | |
| QG-FINAL score (first pass / final) | |
| Gates requiring remediation | |
| Total remediation time | |
| Consultant review time | |
| Total pipeline time | |

### Automated Validation

For additional rigor, run the **`validate_data_contract.py`** script against each skill's
output after it completes. This provides programmatic checks for:
- Required section presence
- Confidence tag counts and ratios
- Phantom citation detection (when document list is provided)
- False precision patterns
- Evidence Grounding score estimation

Usage: `python validate_data_contract.py --skill <skill> --output <file.md> --documents doc1.pdf,doc2.xlsx`

### Continuous Improvement Signals

Track across engagements using the Quality Trends and Improvement Actions sheets:

- **Average first-pass gate scores by step:** Identifies which skills need improvement
- **Most common remediation actions:** Identifies systemic weaknesses to address in skill design
- **Gate failure rate by step:** Shows where the pipeline is weakest
- **Average remediation time by gate:** Shows where human effort is concentrated
- **Correlation between material sufficiency and gate scores:** Validates the pre-screen
- **Industry-specific patterns:** Some industries consistently produce thinner materials — track this

---

## Escalation Matrix

| Situation | Escalate To | Action |
|-----------|------------|--------|
| Single gate fails Red (first time) | Re-run skill | Re-run with targeted instructions |
| Single gate fails Red (second time) | Senior consultant | Manual creation of that step |
| 3+ gates score Amber in one pipeline | Senior consultant + client | Assess material sufficiency; consider discovery call |
| QG-FINAL fails twice | Senior consultant | Manual assembly and review |
| Client materials confirmed insufficient | Engagement lead | Recommend supplementary discovery session before completing Blueprint |
| Systemic skill failure across engagements | Skill maintainer (Viktor) | Skill redesign or re-prompt needed |

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-05-18 | Initial pipeline execution SOP |
