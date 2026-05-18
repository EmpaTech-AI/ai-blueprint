# AI Value Blueprint — Shared Methodology & Data Contracts

## Identity

The AI Value Blueprint is a productized, semi-automated diagnostic service by AI Assist BG.
It uses compressed versions of the company's proprietary 6-step AI Consulting pipeline to produce
a standalone deliverable that identifies a company's highest-value AI opportunities, readiness
gaps, and recommended action sequence.

The Blueprint is a separate product from the full AI Company Audit. It shares the same analytical
methodology but operates at compressed depth.

## Relationship to the Full Consulting Pipeline

| Blueprint Step | Based On | What Changes |
|---------------|----------|--------------|
| blueprint-intake | Skill 1 (ai-consulting-intake-analyst) | Sections A–D full depth; E–G bullet-point only; 3–4 pages not 8–15 |
| blueprint-maturity | Skill 2 (ai-maturity-scorer) | 3 levels (Early/Developing/Established) not 5; 1 paragraph per dimension not full section |
| blueprint-opportunities | Skill 3 (ai-opportunity-harvester) | Top 5–7 not 10–12; half-page cards not full-page; no Parking Lot or Discovery Questions |
| blueprint-roadmap | Skill 4 (ai-roadmap-builder) | Now/Next/Later over 12 months; no milestones, dependencies, or capacity planning |
| blueprint-assembly | New (no equivalent) | Compiles all outputs into final 12–18 page client deliverable |

## Methodology Standards (Apply to ALL Blueprint Skills)

### Citation Format

Use: `[Source: filename | location]` or `[Form: section/question]`

For form-based data: `[Form: section name]`
For uploaded documents: `[Doc: filename | page/section]`
If location unknown: `[Doc: filename | location unknown]` — reduce confidence.

### Confidence Tagging

Every data point in the pipeline must carry a confidence tag:

| Tag | Meaning | Confidence |
|-----|---------|-----------|
| [Document-Backed] | Supported by data from an uploaded document | High |
| [Form-Stated] | Based on what the client stated in the intake form | Medium |
| [Inferred] | Inferred from patterns across multiple inputs | Medium-Low |
| [Assumption] | Based on industry norms or general knowledge | Low |

### Quality Rules (Non-Negotiable)

1. **Never invent facts.** If something is not supported by provided materials, mark it with the appropriate confidence tag.
2. **Every important claim must be traceable** to either a form response or an uploaded document.
3. **Separate facts from interpretations.** Label assumptions explicitly.
4. **Conservative bias.** When evidence is ambiguous between two adjacent levels or scores, go lower and note what would confirm the higher score.
5. **No "AI for AI's sake."** Every opportunity must map to a business outcome.
6. **Client-facing tone.** Neutral, non-judgmental. Prefer "has not yet" / "opportunity to strengthen" over harsh statements.

### The 6 Maturity Dimensions

Used consistently across all Blueprint skills:

1. **Strategy** — How clearly AI is connected to business objectives
2. **Data** — Quality, accessibility, and governance of organizational data
3. **Technology** — Infrastructure readiness for AI deployment
4. **People** — Skills, culture, and leadership readiness for AI adoption
5. **Processes** — How well business processes are documented and optimized
6. **Governance** — Policies, controls, and risk management for AI

### Blueprint Maturity Levels (Simplified from Full 5-Level Model)

| Level | Definition | Equivalent in Full Model |
|-------|-----------|------------------------|
| Early | Little to no structured capability in this dimension | Levels 1–2 |
| Developing | Some capability exists but inconsistent or informal | Levels 2–3 |
| Established | Structured capability with consistent execution | Levels 4–5 |

### Opportunity Scoring (Impact x Feasibility x Alignment)

**Impact (1–5):** 1 = marginal niche improvement → 5 = material business impact, major KPI movement
**Feasibility (1–5):** 1 = major blockers, data absent → 5 = can pilot quickly with existing tools
**Alignment (1–5):** How strongly the opportunity supports stated goals

**Readiness Adjustment Rule:** Maturity scores reduce feasibility for complex deployments:
- Data ≤ Early → reduce feasibility for ML-heavy or multi-source initiatives
- Governance ≤ Early → reduce feasibility for regulated/high-risk automated decisions
- People ≤ Early → reduce feasibility for solutions requiring widespread adoption
- Technology ≤ Early → reduce feasibility for large integrations

**Ranking:** Sort by (Impact × Feasibility), then by Alignment as tiebreaker.

**Classification:**
- **Quick Win** — High feasibility, can start immediately, fast ROI
- **Foundation Builder** — Enablement work that unblocks future initiatives
- **Big Bet** — High impact but lower feasibility, requires investment

### Roadmap Sequencing (Now / Next / Later)

| Phase | Timeframe | What Goes Here |
|-------|----------|---------------|
| Now | Months 1–3 | Quick Wins that build momentum and prove value |
| Next | Months 3–6 | Foundation Builders that require some preparation |
| Later | Months 6–12 | Big Bets that depend on earlier wins and higher maturity |

**Maturity gating rule:** Advanced initiatives cannot precede foundations. If Data or Governance maturity is "Early," schedule foundation work in Now before deploying data-heavy or regulated solutions.

## Inter-Skill Data Contracts

| Handoff | What Must Be Present | Quality Gate |
|---------|---------------------|-------------|
| Intake → Maturity | Sections A–D complete; pain points (C) with severity; hypotheses (D) with evidence links | QG-1: All sections present. Claims cited or tagged. Minimum Amber (76%). |
| Intake + Maturity → Opportunities | Compressed dossier + all 6 dimension scores with rationale | QG-2: No dimension scored without at least one supporting data point. Minimum Amber (76%). |
| Opportunities → Roadmap | Scored opportunities with Impact/Feasibility/Alignment and classification | QG-3: At least 5 scored opportunities with Quick Win / Foundation / Big Bet labels. Minimum Amber (76%). |
| Roadmap → Assembly | All opportunities assigned to Now/Next/Later with rationale | QG-4: Maturity gating respected. At least one Quick Win in Now. Minimum Amber (76%). |
| Assembly → Client | Complete 12–18 page deliverable with all 8 sections | QG-FINAL: Full consistency check. No internal jargon. Minimum **Green (90%)**. |

## Quality Gate System (Mandatory)

Every skill's output must pass through a **standardized Quality Gate** before being handed
to the next skill. The orchestrator enforces this. The quality gate system is defined in
three reference documents:

1. **`quality-gate-algorithm.md`** — The scoring algorithm: 5 weighted dimensions producing
   a single Confidence Score (0–100%) classified into Green/Amber/Blue/Red bands.
2. **`evidence-grounding-checklist.md`** — The anti-hallucination checklist every skill must
   self-assess against before the gate runs.
3. **`pipeline-execution-sop.md`** — The full SOP for running the pipeline including gate
   enforcement, remediation workflows, and escalation paths.

### Quality Gate Summary

| Band | Range | Action |
|------|-------|--------|
| 🟢 Green | 90–100% | PASS — output proceeds |
| 🟡 Amber | 76–89% | PASS WITH REVIEW — consultant addresses flagged items |
| 🔵 Blue | 60–75% | REMEDIATE AND RE-GATE — must fix and re-run gate |
| 🔴 Red | 0–59% | FAIL — re-run skill or escalate |

### Confidence Score Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|-----------------|
| Evidence Grounding | 40% | % of claims backed by [Document-Backed] or [Form-Stated] evidence |
| Completeness | 25% | All required sections present and at minimum depth |
| Internal Consistency | 15% | Facts, scores, and names consistent within output and with upstream |
| Downstream Readiness | 10% | Output contains everything the next skill needs per data contract |
| Hallucination Risk | 10% | Absence of fabricated specifics, phantom citations, and false precision |

### Self-Assessment Requirement

Every skill must include a **Quality Self-Assessment** block at the end of its output,
reporting its own estimated scores across all 5 dimensions. The orchestrator independently
verifies this assessment during the gate.

### Anti-Hallucination Rules (Supplement to Quality Rule #1)

In addition to the existing Quality Rules above, the following anti-hallucination rules
are now non-negotiable:

7. **Tag every claim.** No claim, data point, or assertion may appear without a confidence
   tag. Untagged claims are treated as [Assumption] during quality gate scoring.
8. **Specificity must match evidence.** If the evidence says "approximately €5M," the output
   cannot say "€5.2M." Precision beyond the source is hallucination.
9. **Absence is not evidence.** If a topic isn't covered in client materials, state the gap
   explicitly. Do not fill gaps with industry assumptions presented as findings.
10. **Upstream fidelity.** Facts taken from a prior skill's output must be reproduced exactly.
    Paraphrasing that changes meaning is a consistency violation.
11. **No phantom citations.** Every document reference must point to a document that was
    actually provided. Every page/section reference must be verifiable.

## Scope Boundary: What the Blueprint Does NOT Include

These are explicitly reserved for the full AI Company Audit (€75K–€100K+):

- Detailed implementation roadmap with milestones, dependencies, and capacity planning
- Financial ROI model with scenario analysis, NPV, and sensitivity drivers
- AI governance blueprint with risk tiering, policies, RACI, and stage gates
- Stakeholder interviews and deep process mapping
- Custom financial modeling tied to client P&L
- Cross-dimension correlation analysis
- Evidence coverage requests by dimension
