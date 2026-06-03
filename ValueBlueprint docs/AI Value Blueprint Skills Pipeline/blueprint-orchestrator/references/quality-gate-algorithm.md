# AI Value Blueprint — Quality Gate Algorithm

## Purpose

This document defines the **standardized Quality Gate algorithm** that runs between every skill
in the Blueprint pipeline. Its purpose is to prevent AI hallucinations, ungrounded assumptions,
and incomplete outputs from propagating downstream — where they would compound and contaminate
subsequent skill outputs, ultimately degrading the final client deliverable.

Every skill's output must pass through this gate before being handed to the next skill.
The orchestrator enforces this. No exceptions.

## Why This Exists

The Blueprint pipeline is **sequentially connected**: Intake → Maturity → Opportunities →
Roadmap → Assembly. Each skill trusts the output of the skill before it. This creates a
compounding quality problem:

- A hallucinated data point in Step 1 becomes a "fact" in Step 2
- An ungrounded assumption in Step 2 becomes a scoring input in Step 3
- A poorly scored opportunity in Step 3 gets sequenced in Step 4
- All errors end up in the final client deliverable in Step 5

The quality gate is the **circuit breaker** that stops this cascade.

---

## The Confidence Score: Overview

Every quality gate assessment produces a single **Confidence Score** (0–100%) calculated from
5 weighted dimensions. The score determines whether the output can proceed to the next skill.

### Score Classification

| Band | Range | Label | Meaning | Action |
|------|-------|-------|---------|--------|
| 🟢 Green | 90–100% | High Confidence | Output looks complete and well-structured. Still worth a read, but likely solid. | **Proceed.** Consultant does a quick review scan. |
| 🟡 Amber | 76–89% | Needs Review | The output needs manual review and finetuning actions. | **Proceed with caution.** Consultant reviews flagged items and makes targeted fixes before passing to next skill. |
| 🔵 Blue | 60–75% | Requires Strict Evaluation | Probably essential details are missing. Worth closer attention. | **Pause.** Consultant must perform detailed evaluation, fill gaps, verify claims, and re-run the quality gate before proceeding. |
| 🔴 Red | 0–59% | Significant Concern | Output may be incomplete or based on very thin evidence. Review carefully. | **Stop.** Output is not usable. Either re-run the skill with better inputs, supplement with additional client materials, or escalate for manual creation. |

### Minimum Pass Threshold

- **To proceed automatically:** Green (90%+)
- **To proceed with human review:** Amber (76%+)
- **Requires remediation before proceeding:** Blue (60–75%)
- **Cannot proceed:** Red (<60%)

---

## The 5 Scoring Dimensions

### Dimension 1: Evidence Grounding (Weight: 40%)

**What it measures:** The proportion of claims, data points, and assertions that are directly
traceable to client-provided materials (intake form responses or uploaded documents) versus
those that are inferred or assumed.

**Why it has the highest weight:** This is the primary anti-hallucination measure. An output
full of [Assumption] and [Inferred] tags — no matter how well-structured — is fundamentally
unreliable for downstream consumption.

**Scoring Rubric:**

| Score | Criteria |
|-------|----------|
| 95–100% | ≥90% of claims are [Document-Backed] or [Form-Stated]. Remaining claims are clearly labeled [Inferred] with strong cross-reference logic. Zero [Assumption] tags, or assumptions are trivial (e.g., industry norms). |
| 85–94% | ≥80% of claims are [Document-Backed] or [Form-Stated]. A small number of [Inferred] claims exist but each has clear reasoning. ≤2 [Assumption] tags, all in non-critical areas. |
| 75–84% | ≥70% of claims are [Document-Backed] or [Form-Stated]. Some [Inferred] claims lack strong justification. 3–5 [Assumption] tags present. |
| 60–74% | ≥50% of claims are evidence-backed. Significant reliance on [Inferred] and [Assumption]. Key claims in critical sections lack direct evidence. |
| <60% | <50% of claims are evidence-backed. Output is substantially assumption-driven. High hallucination risk. |

**How to calculate:**
1. Count all distinct claims, data points, and assertions in the output
2. Categorize each by confidence tag: [Document-Backed], [Form-Stated], [Inferred], [Assumption]
3. HIGH = count of [Document-Backed] + [Form-Stated]
4. LOW = count of [Inferred] + [Assumption]
5. UNTAGGED = claims with no confidence tag (treat as [Assumption] — untagged = unverified)
6. Evidence Grounding % = HIGH / (HIGH + LOW + UNTAGGED) × 100

**Critical rule:** Any claim in a critical section (pain points, maturity scores, opportunity
scores, roadmap sequencing rationale) that is [Assumption] or untagged automatically triggers
a −5% penalty to this dimension's score, per occurrence (max −20%).

---

### Dimension 2: Completeness (Weight: 25%)

**What it measures:** Whether all required output sections are present, populated with
substantive content, and meet the minimum depth requirements defined in each skill's
output specification.

**Why it matters:** Incomplete outputs create gaps that the next skill either has to work
around (introducing its own assumptions) or silently ignores (creating blind spots).

**Scoring Rubric:**

| Score | Criteria |
|-------|----------|
| 95–100% | All required sections present and fully populated. Content meets or exceeds minimum depth requirements. No placeholder text or "TBD" markers. |
| 85–94% | All required sections present. 1–2 sections are slightly below minimum depth but still usable. No critical sections are thin. |
| 75–84% | All required sections present but 2–3 are noticeably thin or below depth requirements. At least one section has placeholder or generic content. |
| 60–74% | 1–2 required sections are missing or have only stub content. Multiple sections are below minimum depth. The output has visible gaps. |
| <60% | Multiple required sections missing. Output is fragmentary and cannot serve as a reliable input for the next skill. |

**How to calculate:**
1. List all required sections for the skill's output format (per SKILL.md specification)
2. For each section, assess: Present and full (100%), Present but thin (50%), Missing (0%)
3. Completeness % = average of all section scores
4. Apply penalty: any section marked as "critical for downstream" that scores <50% triggers −10% penalty

**Section criticality by skill:**

| Skill | Critical Sections (downstream-dependent) |
|-------|----------------------------------------|
| blueprint-intake | A (Executive Summary), B (Key Data Points), C (Pain Points), D (Hypotheses) |
| blueprint-maturity | Readiness Scorecard, Dimension Rationales, Key Constraints |
| blueprint-opportunities | Opportunity Cards (all), Portfolio View, Scores |
| blueprint-roadmap | Phase assignments (Now/Next/Later), Sequencing Rationale |
| blueprint-assembly | Executive Summary, AI Opportunity Map, Action Sequence |

---

### Dimension 3: Internal Consistency (Weight: 15%)

**What it measures:** Whether facts, names, numbers, scores, and classifications remain
consistent within the output and with upstream inputs.

**Why it matters:** Inconsistencies are a hallmark of AI hallucination. When the AI invents
or drifts, it often contradicts itself or contradicts established facts from prior steps.

**Scoring Rubric:**

| Score | Criteria |
|-------|----------|
| 95–100% | Zero detected inconsistencies. Client name, industry, all numbers, scores, and facts are consistent throughout. References to upstream data match exactly. |
| 85–94% | 1–2 minor inconsistencies (e.g., slight wording variation in company description) that don't affect analytical conclusions. |
| 75–84% | 3–5 inconsistencies, at least one involving a number or score that could affect downstream analysis. |
| 60–74% | Multiple inconsistencies including at least one material contradiction (e.g., maturity score stated differently in two places, or opportunity score doesn't match the classification). |
| <60% | Widespread inconsistencies. Output contradicts upstream inputs on material points. Unreliable for downstream use. |

**Consistency checks to perform:**

| Check | What to Compare |
|-------|----------------|
| Client identity | Name, industry, size, revenue — consistent across all mentions |
| Numerical data | Revenue figures, headcount, KPIs — same numbers every time cited |
| Maturity scores | Dimension levels match between scorecard table and narrative text |
| Opportunity scores | Impact/Feasibility/Alignment numbers match between cards and portfolio view |
| Classifications | Quick Win/Foundation Builder/Big Bet labels match between scoring and roadmap |
| Cross-referencing | Pain points cited in opportunities actually exist in the dossier |
| Upstream fidelity | Facts from prior skill output are accurately reproduced, not paraphrased into inaccuracy |

---

### Dimension 4: Downstream Readiness (Weight: 10%)

**What it measures:** Whether the output contains everything the next skill in the pipeline
explicitly requires as input, in the format that skill expects.

**Why it matters:** Even a complete and accurate output can fail if it doesn't provide what
the next skill needs. This dimension checks the data contract between skills.

**Scoring Rubric:**

| Score | Criteria |
|-------|----------|
| 95–100% | All data contract requirements met. The next skill can consume this output without any additional information or reformatting. |
| 85–94% | Data contract mostly met. 1–2 minor items could be clearer or more explicit but won't block the next skill. |
| 75–84% | Data contract partially met. The next skill will need to make assumptions or work around gaps. |
| 60–74% | Significant data contract gaps. The next skill will need to request clarification or fabricate missing context. |
| <60% | Data contract fundamentally not met. The next skill cannot proceed without substantial rework of this output. |

**Data contract requirements by handoff:**

| Handoff | Required Data Elements |
|---------|----------------------|
| Intake → Maturity | Sections A–D complete; pain points (C) with severity ratings and confidence tags; hypotheses (D) with evidence links; key data points (B) with source citations; document index (F) |
| Maturity → Opportunities | All 6 dimension scores with level (Early/Developing/Established); rationale per dimension with citations; key constraints list; confidence level per score |
| Intake + Maturity → Opportunities | Compressed dossier with complete pain points AND all 6 dimension scores with rationale. Both must be present and cross-referenced. |
| Opportunities → Roadmap | 5–7 scored opportunities with Impact/Feasibility/Alignment scores; classification labels (Quick Win/Foundation/Big Bet); readiness adjustments noted; portfolio view |
| Maturity + Opportunities → Roadmap | Readiness snapshot with dimension scores AND scored opportunity map. Roadmap needs both to apply maturity gating. |
| All Steps → Assembly | All 4 prior outputs complete and internally consistent. Assembly cannot fix upstream gaps — it can only format and polish. |

---

### Dimension 5: Hallucination Risk Assessment (Weight: 10%)

**What it measures:** A focused check for the most common and dangerous forms of AI
hallucination in consulting deliverables.

**Why it has its own dimension:** Evidence grounding catches missing citations. This dimension
catches the subtler forms of hallucination — plausible-sounding fabrications, false precision,
invented specifics, and over-confident claims.

**Scoring Rubric:**

| Score | Criteria |
|-------|----------|
| 95–100% | No hallucination red flags detected. All specific claims are verifiable against provided materials. Uncertainty is acknowledged where appropriate. |
| 85–94% | 1–2 minor red flags (e.g., slightly over-specific language where evidence is thin) but no fabricated facts detected. |
| 75–84% | 3–5 red flags including at least one instance of false precision or an unverifiable specific claim. |
| 60–74% | Multiple hallucination red flags. At least one claim appears fabricated or cannot be traced to any provided material. |
| <60% | Substantial hallucination risk. Multiple claims appear fabricated. Output cannot be trusted without line-by-line verification. |

**Hallucination Red Flag Checklist:**

| # | Red Flag | Description | Example |
|---|----------|-------------|---------|
| 1 | **Invented specifics** | Precise numbers, percentages, or metrics that don't appear in any provided document | "The company loses approximately €2.3M annually to manual processes" when no financial data supports this |
| 2 | **False precision** | Overly specific claims when evidence only supports general statements | "Reducing processing time by 47%" when evidence only suggests "significant reduction possible" |
| 3 | **Phantom citations** | References to documents, pages, or sections that don't exist in the provided materials | "[Doc: Annual Report | p.23]" when no annual report was uploaded |
| 4 | **Industry assumption injection** | Presenting industry statistics or benchmarks as if they were client-specific data | "Like most companies in this sector, they likely face 15–20% employee turnover" presented as a finding |
| 5 | **Capability invention** | Attributing tools, systems, or capabilities to the client that aren't mentioned in their materials | "Their existing Salesforce implementation can be extended to..." when no Salesforce was mentioned |
| 6 | **Causal fabrication** | Creating cause-effect relationships not supported by evidence | "The decline in customer satisfaction is directly caused by..." when no causal data exists |
| 7 | **Confidence inflation** | Tagging claims as [Document-Backed] or [Form-Stated] when the actual evidence is weaker | A general industry observation tagged as [Document-Backed] |
| 8 | **Extrapolation beyond data** | Making predictions or projections that go far beyond what the data supports | "This initiative will achieve ROI within 6 months" when no financial modeling was done |
| 9 | **Missing qualification** | Stating uncertain things as definite facts without hedging language | "The company has no data governance" when evidence only shows it wasn't mentioned |
| 10 | **Composite fabrication** | Combining true fragments into a false composite claim | Merging two separate pain points into one that was never stated |

---

## Calculating the Final Confidence Score

### Formula

```
Confidence Score = (Evidence Grounding × 0.40)
                 + (Completeness × 0.25)
                 + (Internal Consistency × 0.15)
                 + (Downstream Readiness × 0.10)
                 + (Hallucination Risk × 0.10)
```

### Worked Example

```
Evidence Grounding:     82% × 0.40 = 32.8
Completeness:           90% × 0.25 = 22.5
Internal Consistency:   95% × 0.15 = 14.25
Downstream Readiness:   88% × 0.10 =  8.8
Hallucination Risk:     85% × 0.10 =  8.5
                                     ------
Confidence Score:                     86.85% → Amber (76–89%)
```

**Action:** Proceed with caution. Consultant reviews the Evidence Grounding flags (the lowest
dimension) and addresses the specific items dragging it down before passing to the next skill.

---

## Quality Gate Output Format

Every quality gate assessment must produce this standardized report:

```
## Quality Gate Report: [Skill Name] → [Next Skill Name]
### Gate: [Gate ID, e.g., QG-1 for Intake→Maturity]

**Client:** [Name]
**Date:** [Date]
**Assessed Output:** [Skill output title]

### Confidence Score: [XX.X%] — [🟢/🟡/🔵/🔴] [Band Label]

### Dimension Breakdown

| Dimension | Weight | Raw Score | Weighted Score | Key Issues |
|-----------|--------|-----------|---------------|------------|
| Evidence Grounding | 40% | XX% | XX.X | [summary or "None"] |
| Completeness | 25% | XX% | XX.X | [summary or "None"] |
| Internal Consistency | 15% | XX% | XX.X | [summary or "None"] |
| Downstream Readiness | 10% | XX% | XX.X | [summary or "None"] |
| Hallucination Risk | 10% | XX% | XX.X | [summary or "None"] |

### Flags Requiring Attention

[List specific items that caused score reductions, organized by dimension.
Each flag must include: what it is, where it appears, why it's a concern,
and what remediation action is needed.]

### Remediation Actions (if Amber, Blue, or Red)

| # | Action | Priority | Dimension Affected | Expected Score Impact |
|---|--------|----------|-------------------|----------------------|
| 1 | [specific action] | [High/Medium] | [dimension] | [+X%] |
| 2 | ... | ... | ... | ... |

### Gate Decision

**Decision:** [PASS / PASS WITH REVIEW / REMEDIATE AND RE-GATE / FAIL]
**Rationale:** [1–2 sentences]
```

---

## Gate Decisions by Band

| Band | Decision | What Happens |
|------|----------|-------------|
| 🟢 Green (90%+) | **PASS** | Output proceeds to the next skill. Consultant does a quick scan. |
| 🟡 Amber (76–89%) | **PASS WITH REVIEW** | Output proceeds after the consultant reviews and addresses all flagged items. Fixes are made inline. No re-gate required unless changes are substantial. |
| 🔵 Blue (60–75%) | **REMEDIATE AND RE-GATE** | Output does NOT proceed. Consultant must address all remediation actions. After fixes, the quality gate runs again. Must achieve Amber or Green to proceed. |
| 🔴 Red (<60%) | **FAIL** | Output is rejected. Either: (a) re-run the skill with better/supplementary inputs, (b) manually create the output section, or (c) escalate — the client's materials may be insufficient for a reliable Blueprint. |

---

## Gate IDs and Pipeline Position

| Gate ID | Between | What's Being Assessed | Minimum to Proceed |
|---------|---------|----------------------|-------------------|
| QG-1 | Intake → Maturity | Compressed Client Dossier | Amber (76%) |
| QG-2 | Maturity → Opportunities | AI Readiness Snapshot | Amber (76%) |
| QG-3 | Opportunities → Roadmap | Scored Opportunity Map | Amber (76%) |
| QG-4 | Roadmap → Assembly | Recommended Action Sequence | Amber (76%) |
| QG-FINAL | Assembly → Client | Final Blueprint Deliverable | Green (90%) |

**Note:** QG-FINAL has a higher minimum threshold (Green) because this is the client-facing
deliverable. Anything below Green should not be delivered to a client.

---

## Escalation Protocol

### When a Gate Fails (Red)

1. **Document the failure:** Record which gate failed, the score, and the primary failure dimensions
2. **Root cause analysis:** Is the problem in the skill's execution or in the input quality?
   - If input quality → trace back to the previous skill and re-assess that gate
   - If skill execution → re-run the skill with explicit instructions to address the gaps
3. **Material sufficiency check:** If the client's provided materials are genuinely insufficient:
   - Flag specific missing materials to the consultant
   - Consultant contacts client for supplementary documents
   - If not obtainable: document the limitation and adjust the Blueprint scope accordingly
4. **Escalation trigger:** If a gate fails Red twice after remediation, escalate to senior consultant
   for manual intervention

### When Multiple Gates Are Amber

If 3 or more gates in a single pipeline run score Amber, this signals systemic issues:
- The client's materials may be fundamentally thin
- The intake form may have been filled out poorly
- Consider recommending a discovery call before completing the Blueprint

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-05-18 | Initial quality gate algorithm |
