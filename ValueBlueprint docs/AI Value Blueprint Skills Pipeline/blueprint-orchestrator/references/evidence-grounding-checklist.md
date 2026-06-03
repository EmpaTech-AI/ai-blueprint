# AI Value Blueprint — Evidence Grounding & Anti-Hallucination Checklist

## Purpose

This checklist is a **mandatory pre-gate verification** that every skill must run against its
own output before the quality gate assessment. It is the first line of defense against AI
hallucination, slop, and unverified information entering the pipeline.

Every skill in the Blueprint pipeline must self-assess against this checklist as the final
step of its execution, BEFORE the orchestrator runs the quality gate.

---

## The Golden Rule

> **If you cannot point to a specific line in a client-provided document or a specific answer
> in the intake form that supports a claim, that claim is NOT [Document-Backed] or [Form-Stated].
> Tag it honestly. The quality gate will catch dishonest tagging — and dishonest tagging is
> worse than a low-confidence tag, because it creates false trust.**

---

## Pre-Gate Self-Assessment: The 7-Point Grounding Check

Every skill must run these 7 checks against its output before handing off to the orchestrator.

### Check 1: Citation Audit

**Action:** Review every claim in the output that has a confidence tag.

| Verify | How |
|--------|-----|
| Every [Document-Backed] tag has a valid citation | The citation points to a real document that was provided. The page/section reference exists. The document actually says what you claim. |
| Every [Form-Stated] tag matches a real form response | The form section exists. The client's answer actually supports the claim. You haven't paraphrased the answer into something stronger than what was said. |
| Every [Inferred] tag has explicit reasoning | State what evidence you combined and why the inference follows logically. "Inferred from X + Y because Z." |
| Every [Assumption] tag is acknowledged | It's clear that this is an assumption. The assumption is reasonable and industry-standard. |

**Fail condition:** Any [Document-Backed] tag that cannot be traced to an actual document,
or any [Form-Stated] tag where the form answer doesn't actually say what's claimed.

### Check 2: Untagged Claim Scan

**Action:** Scan the entire output for claims, assertions, data points, or conclusions
that have NO confidence tag.

**What to look for:**
- Sentences that state facts without citing a source
- Numbers, percentages, or metrics with no tag
- Cause-effect statements without evidence links
- Comparative claims ("better than," "more than," "significant") without grounding

**Remediation:** Tag every untagged claim. If you cannot determine an appropriate tag,
default to [Assumption] — never leave claims untagged.

**Fail condition:** More than 3 untagged claims in critical sections.

### Check 3: Specificity vs. Evidence Test

**Action:** For every specific claim (numbers, percentages, dates, named tools/systems),
verify that the specificity matches the evidence.

| If the evidence says... | You can say... | You CANNOT say... |
|------------------------|---------------|-------------------|
| "Revenue is around €5M" | "Revenue is approximately €5M [Form-Stated]" | "Revenue is €5.2M" (false precision) |
| "They use a CRM" | "The client uses a CRM system [Form-Stated]" | "Their Salesforce implementation" (capability invention) |
| "Processes are slow" | "Staff report that key processes are slow [Form-Stated]" | "Processing takes 3x longer than industry average" (invented benchmark) |
| No data on topic | "[Insufficient evidence to assess]" | Anything stated as fact (hallucination) |
| Industry report data | "Industry benchmarks suggest X [Assumption — industry norm]" | "The client experiences X" (misattribution) |

**Fail condition:** Any instance where the claim is more specific than the evidence supports.

### Check 4: Phantom Reference Check

**Action:** Verify every document citation references a document that actually exists
in the provided materials.

**Common phantom reference patterns:**
- Citing a document type that wasn't uploaded (e.g., "Annual Report" when none was provided)
- Citing a specific page number when you can't actually verify the page
- Citing a document section that doesn't exist
- Referencing "the client's strategic plan" when no strategic document was provided

**Remediation:** Remove phantom references. If the claim still stands on other evidence,
re-cite correctly. If not, re-tag as [Inferred] or [Assumption].

**Fail condition:** Any phantom reference found.

### Check 5: Upstream Fidelity Check

**Action:** (For Steps 2–5 only) Compare every fact taken from a previous skill's output
against that actual output. Verify you haven't drifted, paraphrased into inaccuracy,
or silently changed numbers/scores/conclusions.

**What to compare:**
- Maturity scores: Are the levels (Early/Developing/Established) exactly as scored?
- Pain points: Are they stated as the intake analyst wrote them, or have they morphed?
- Opportunity scores: Do Impact/Feasibility/Alignment numbers match exactly?
- Classifications: Are Quick Win/Foundation Builder/Big Bet labels unchanged?
- Client facts: Revenue, headcount, industry — unchanged from the dossier?

**Fail condition:** Any material upstream fact that has been altered, rounded differently,
or reinterpreted without explicit notation.

### Check 6: Absence Acknowledgment Check

**Action:** Review areas where evidence was thin or absent. Verify that you've explicitly
acknowledged the gap rather than filling it with plausible content.

**Proper absence handling:**

| Situation | Correct Response | Incorrect Response |
|-----------|-----------------|-------------------|
| No data on a maturity dimension | Score as "Early" with [Insufficient Evidence] tag | Score as "Developing" based on general impression |
| No financial data for ROI estimates | State "quantification not possible with current data" with [Assumption] ranges | Provide specific ROI numbers |
| Client didn't mention a topic | Note the gap in Open Questions | Assume based on industry norms and present as finding |
| Contradictory evidence | Note both data points and the contradiction | Pick one and ignore the other |

**Fail condition:** Any gap that has been silently filled with unacknowledged assumptions.

### Check 7: Output Structure Compliance

**Action:** Verify the output matches the exact structure defined in the skill's SKILL.md
output format specification.

- All required sections present?
- Section headers match the specification?
- Tables have all required columns?
- Minimum content depth met per section?
- Quality metadata section included (confidence score self-assessment)?

**Fail condition:** Missing required sections or structural non-compliance.

---

## The Hallucination Spectrum

Not all inaccuracies are equal. This spectrum helps classify and prioritize issues:

### Tier 1: Hard Hallucinations (Must Fix — Blocks Gate)

These are outright fabrications that would mislead the client or corrupt downstream analysis.

- **Invented data:** Numbers, metrics, or statistics not found in any provided material
- **Phantom citations:** References to non-existent documents or sections
- **Capability invention:** Attributing tools, systems, or processes to the client that aren't evidenced
- **False causation:** Creating cause-effect chains not supported by data
- **Fabricated quotes:** Attributing statements to the client that they didn't make

**Impact:** These MUST be caught and removed. Any hard hallucination found reduces the
Hallucination Risk dimension to ≤50% automatically.

### Tier 2: Soft Hallucinations (Should Fix — Reduces Score)

These are distortions that don't fabricate but misrepresent.

- **False precision:** Being more specific than the evidence warrants
- **Confidence inflation:** Tagging as higher confidence than justified
- **Selective emphasis:** Highlighting one data point while ignoring contradicting evidence
- **Paraphrase drift:** Rewording upstream facts in ways that subtly change meaning
- **Overgeneralization:** Extending a finding about one team/process to the whole organization

**Impact:** Each occurrence reduces the Hallucination Risk score by 5% (max −25%).

### Tier 3: Assumption Creep (Track — Context-Dependent)

These are reasonable inferences that may or may not be accurate.

- **Industry norm assumptions:** Applying sector benchmarks as context
- **Gap-filling inferences:** Connecting dots between limited data points
- **Experience-based patterns:** "Organizations at this maturity level typically..."
- **Scope assumptions:** Assumptions about what the client meant in vague answers

**Impact:** Acceptable when properly tagged. Each untagged instance reduces score by 3%.

---

## Skill-Specific Grounding Requirements

### Blueprint Intake (Step 1)

| Must Ground | In |
|-------------|---|
| Company facts (revenue, headcount, industry) | Intake form Section 1 or uploaded financial docs |
| Pain points | Intake form Section 3 + corroboration from uploaded docs where possible |
| Technology landscape | Intake form Section 4 + uploaded tech inventory if available |
| Hypotheses | Must link to at least 2 pieces of evidence from form or documents |

**Special risk:** Step 1 processes raw materials. The temptation to "clean up" vague client
answers into crisp statements is strong. Resist it — preserve the client's actual language
and note where interpretation was required.

### Blueprint Maturity (Step 2)

| Must Ground | In |
|-------------|---|
| Each dimension score | At least 1 data point from the Compressed Dossier |
| Score rationale | Direct citations to Dossier Sections A, B, C, or D |
| Key constraints | Derived from dimension scores and dossier pain points |

**Special risk:** Scoring with insufficient evidence. The 6 dimensions may not all have
equal evidence coverage. Do NOT inflate scores to avoid "Early" ratings — use the
[Insufficient Evidence] tag honestly.

### Blueprint Opportunities (Step 3)

| Must Ground | In |
|-------------|---|
| Each opportunity | A specific pain point from Dossier Section C |
| Impact scores | Evidence from Dossier (financial data, operational metrics) |
| Feasibility scores | Maturity dimension scores + technology landscape |
| Readiness adjustments | Explicit reference to maturity dimension levels |

**Special risk:** Generating generic AI opportunities not tied to this specific client.
Every opportunity must trace to a specific, cited pain point. "AI-powered customer
analytics" is generic slop. "Automated lead scoring using the CRM data the client
already captures [Doc: Sales Pipeline | CRM export]" is grounded.

### Blueprint Roadmap (Step 4)

| Must Ground | In |
|-------------|---|
| Phase assignments | Opportunity scores + maturity gating rules |
| Sequencing rationale | Specific maturity gaps from the Readiness Snapshot |
| "Why not now" explanations | Concrete references to maturity gaps or prerequisites |

**Special risk:** Creating logical-sounding sequences that aren't actually driven by the
data. The roadmap must be mechanically derivable from the scores and maturity gates —
not based on what "feels right."

### Blueprint Assembly (Step 5)

| Must Ground | In |
|-------------|---|
| Executive summary claims | Traceable to specific upstream outputs |
| Readiness Snapshot | Exact reproduction of Step 2 scores |
| Opportunity Map | Exact reproduction of Step 3 cards and scores |
| Action Sequence | Exact reproduction of Step 4 phasing |

**Special risk:** The Assembly step re-writes content for client consumption. In doing so,
it may inadvertently change meanings, soften findings beyond accuracy, or introduce new
claims not present in upstream outputs. The "polish" must not alter substance.

---

## Self-Assessment Score Reporting

Every skill must include this self-assessment block at the end of its output:

```
---
## Quality Self-Assessment

**Evidence Grounding:**
- Total claims: [N]
- [Document-Backed]: [N] ([X%])
- [Form-Stated]: [N] ([X%])
- [Inferred]: [N] ([X%])
- [Assumption]: [N] ([X%])
- Untagged: [N] — [remediation status]
- Estimated dimension score: [X%]

**Completeness:**
- Required sections: [N]
- Fully populated: [N]
- Thin/below depth: [N] — [list]
- Missing: [N] — [list]
- Estimated dimension score: [X%]

**Internal Consistency:**
- Cross-reference checks performed: [N]
- Inconsistencies found: [N] — [list if any]
- Estimated dimension score: [X%]

**Downstream Readiness:**
- Data contract items required: [N]
- Items present and complete: [N]
- Items partial or missing: [N] — [list]
- Estimated dimension score: [X%]

**Hallucination Risk:**
- Red flags detected: [N]
- Tier 1 (hard): [N] — [status]
- Tier 2 (soft): [N] — [list]
- Tier 3 (assumption creep): [N]
- Estimated dimension score: [X%]

**Self-Assessed Confidence Score: [X%] — [Band]**
---
```

This self-assessment feeds the orchestrator's quality gate, which performs its own independent
verification. The self-assessment is a good-faith declaration, not the final word.

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-05-18 | Initial evidence grounding checklist |
