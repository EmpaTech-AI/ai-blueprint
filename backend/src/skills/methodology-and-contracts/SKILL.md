---
name: methodology-and-contracts
description: >
  Shared methodology reference and data contracts for all AI Value Blueprint pipeline skills.
  Defines confidence tagging standards, the mandatory [JUSTIFICATION] block format, quality
  rules, the 6 maturity dimensions, opportunity scoring formula, roadmap sequencing rules,
  and inter-skill data contracts. Read by blueprint-maturity, blueprint-opportunities,
  blueprint-roadmap, and blueprint-assembly before producing output. This is a reference
  document, not an active skill — it has no operating procedure or first-turn behavior.
metadata:
  schema_version: intake_v1.0
  skill_version: 1.0.0
  last_updated: 2026-05-27
---

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

### Mandatory Confidence Justification Report

**Every skill MUST append this block at the very end of its output, after all substantive content, without exception.**

The block is machine-parsed by the pipeline dashboard to show consultants exactly what needs review, why each item is low-confidence, what data is missing, and what action to take. It must follow this exact structure with no deviations:

```
## [JUSTIFICATION]

### Confidence Overview
Grounded: {N} of {total} tagged claims are high-confidence ({grounded %}). Low-confidence elements: {element-id ([Class] — reason), element-id ([Class] — reason), ...}. Primary driver: {main source of low-confidence variance, e.g. "absence of data governance documentation"}.

{This sentence is a meta-description of the output's confidence structure. It must NOT itself carry any confidence tag — [Document-Backed], [Inferred], [Assumption], or [Form-Stated]. Self-tagging this sentence inflates the LC item count and corrupts pipeline metrics. See preflight.md Pattern Set 7.}

{Element IDs by stage:
  Stage 1 — H-RT-XX / PP-RT-XX (selected hypotheses and pain points)
  Stage 2 — dimension names: Strategy / Data / Technology / People / Processes / Governance
  Stage 3 — H-RT-XX (opportunity corresponding to the upstream hypothesis, same namespace)
  Stage 4 — H-RT-XX (sequencing decision for the upstream hypothesis)
  Stage 5 — H-RT-XX (S1), H-RT-XX (S3), H-RT-XX (S4) with stage provenance in parentheses}

### Low-Confidence Items

{One numbered entry for EVERY [Inferred] or [Assumption] tag used anywhere in the output above. If none, write the "No low-confidence items" line below instead.}

#### 1. [Inferred] {5–8 word label identifying the claim}
- **Claim:** "{The exact sentence or phrase tagged [Inferred], copied verbatim from the output}"
- **Element:** {H-RT-XX / PP-RT-XX / dimension name / "n/a" for cross-cutting claims}
- **Why inferred:** {What partial evidence existed — signals that were present but not explicit enough to warrant [Document-Backed] or [Form-Stated]}
- **Missing data:** {The specific document, section, or form field that would upgrade this to a high-confidence tag}
- **Consultant action:** {One concrete, specific step — e.g. "Ask client to provide their IT systems inventory", "Check page 3 of financial summary for revenue breakdown", "Verify headcount figure in org chart"}

#### 2. [Assumption] {5–8 word label}
- **Claim:** "{The exact phrase tagged [Assumption], copied verbatim}"
- **Element:** {H-RT-XX / PP-RT-XX / dimension name / "n/a"}
- **Why assumed:** {No supporting data was present at all — explain what was entirely absent from documents and form}
- **Missing data:** {What would completely resolve this assumption}
- **Consultant action:** {Concrete next step to obtain or verify this information}

{If zero [Inferred] or [Assumption] items were used:}
No low-confidence items. All data points in this output are backed by uploaded documents or explicit form responses.

[END JUSTIFICATION]
```

**Non-negotiable rules:**
- EVERY `[Inferred]` or `[Assumption]` tag used in the output above must have a numbered entry here
- `[Document-Backed]` and `[Form-Stated]` items are NOT listed here — only low-confidence ones
- Claims must be **quoted verbatim** from the output — do not paraphrase
- Every entry must declare its **Element** field (canonical ID the claim scopes to) — this is the cross-run stable key
- The `### Confidence Overview` sentence itself must carry NO confidence tags — it is a meta-description, not a claim
- Each "Consultant action" must be specific and actionable — "Review documents" is not acceptable
- This block must be the absolute last thing in the output — nothing after `[END JUSTIFICATION]`
- If unsure whether to tag something [Inferred] vs [Assumption]: [Inferred] = partial evidence existed, [Assumption] = no evidence at all

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
| Intake → Maturity | Sections A–D complete; pain points (C) with `<!-- pp-id: PP-RT-XX -->` comment; hypotheses (D) with `<!-- score: id=H-RT-XX ... -->` comment; ID-keyed `[JUSTIFICATION]` Confidence Overview (H-RT-XX / PP-RT-XX IDs, not item positions) | All sections present. H-RT-XX `id=` field present on all 7 hypotheses. Confidence Overview uses element IDs. |
| Intake + Maturity → Opportunities | Compressed dossier + all 6 dimension scores with rationale + `[CONFIDENCE_PROPAGATION]` field + **confidence annotations** on inferred-score dimensions | `[CONFIDENCE_PROPAGATION]` present and well-formed. All 6 dimensions present. Confidence annotations present. |
| Opportunities → Roadmap | Scored opportunities with `<!-- score: id=H-RT-XX ... -->` comment on each card; ID-keyed `[JUSTIFICATION]` Confidence Overview using H-RT-XX IDs | `id=H-RT-XX` present on all opportunity score comments. At least 5 scored opportunities with Quick Win / Foundation / Big Bet labels. |
| Roadmap → Assembly | Phase assignments with H-RT-XX references in placement rationales; ID-keyed `[JUSTIFICATION]` Confidence Overview | All opportunities assigned to a phase. Inherited LC items reference upstream stage (e.g. `Element: H-RT-05 (S3)`). |

## Confidence Propagation Contract

Low-confidence tags (`[Inferred]`, `[Assumption]`) are **not** a client-facing feature — they are an **entry-gate grounding contract** that conditions how every downstream stage interprets each claim.

Under compression, an untagged inference is treated as fact at the first stage boundary and propagated as fact through every subsequent stage. Output reproducibility does not prove input fidelity: a stably-wrong maturity level built on a silently-promoted inference looks exactly as reproducible as a correct one.

### Requirements

| Requirement | Stage | Enforced by |
|-------------|-------|------------|
| Every non-document assertion in B/C/D must carry `[Inferred]` or `[Assumption]` with an appendix item reference | 1 | `check_tagging_completeness()` |
| The **set of element IDs** covered in the JUSTIFICATION block must be stable across runs (B4 — gate is `Element:` field presence, not per-item annotation) | 1 (cross-run) | `check_justification_item_stability()` |
| All 7 hypotheses must carry `id=H-RT-XX` in their `<!-- score: -->` comment; all 8 pain points must carry `<!-- pp-id: PP-RT-XX -->` | 1 | `check_stability.py` (P1 spine) |
| Dimensions resting on `[Inferred]` claims must carry a confidence annotation on the score | 2 | `check_confidence_annotation()` |
| Stage 2 output must include a structured `[CONFIDENCE_PROPAGATION]` field for Stages 3–5 | 2 | `check_propagation_field()` |
| `### Confidence Overview` sentence in every stage's JUSTIFICATION block must not carry a confidence tag | 1–5 | preflight.md Pattern Set 7 |

### What This Does NOT Mean

- Per-claim `[Inferred]` tags are never surfaced to the client — the document-level Confidence Overview is the correct client-facing design
- Completeness does not mean tagging connective tissue — transitions, restatements, and explanations that make no new verifiable assertion are exempt
- A confidence annotation on a maturity level must not change the level assigned — it annotates, it does not re-score

### Output Design Standard

All substage outputs (Maturity Assessment) and the final output (AI Value Blueprint) must render to the **AI Assist BG Corporate Consulting Design System** (validated on the Baros Vision client deliverable). Key tokens: Dark Navy `#1B2A4A` for H1/title/table headers; Medium Blue `#2E5090` for H2; Teal-Blue `#4A6FA5` for H3; Body Charcoal `#2D3748`; Gold Accent `#C17B2C` for callout headers. Typography: Calibri/Carlito (body, H1–H3), Georgia italic (subtitles), Arial (metadata/headers/footers). Severity labels are inline coloured bold text — never coloured cell fills. These are correctness requirements for client-facing parity, not stylistic preferences.

## Scope Boundary: What the Blueprint Does NOT Include

These are explicitly reserved for the full AI Company Audit (€75K–€100K+):

- Detailed implementation roadmap with milestones, dependencies, and capacity planning
- Financial ROI model with scenario analysis, NPV, and sensitivity drivers
- AI governance blueprint with risk tiering, policies, RACI, and stage gates
- Stakeholder interviews and deep process mapping
- Custom financial modeling tied to client P&L
- Cross-dimension correlation analysis
- Evidence coverage requests by dimension
