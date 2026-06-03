# Intake Form Quality Scoring

**AI Value Blueprint Pipeline — Pre-Step-1 Quality Screen**
**Owner:** AI Assist BG
**Document Version:** v1.0
**Date:** 2026-05-18

---

## Purpose

This document defines the pre-pipeline quality screen applied to every client intake form before the AI Value Blueprint pipeline begins execution. The intake form contains 7 sections covering the full scope of information the pipeline requires to produce a reliable, defensible Blueprint. Each section's response is scored for completeness and specificity before any pipeline step is triggered.

The purpose of this screen is to prevent wasted pipeline compute on thin or incomplete inputs. A Blueprint produced from vague inputs will fail quality gates, require heavy remediation, and deliver low confidence scores — outcomes that damage client trust and consulting credibility. Catching insufficiency before Step 1 is faster, cheaper, and more professional than discovering it at Step 4.

The pre-pipeline screen scores each of the 7 sections independently, applies section weights, calculates a Form Quality Score, and issues a proceed/hold/reject decision. Where uploaded documents exist, a cross-check assesses whether document quality can offset thin form sections. The output is a standardized Pre-Pipeline Assessment Report that the orchestrator attaches to the Blueprint session before Step 1 begins.

---

## Scoring Rubric Per Section

Each section is scored on a 0–3 scale across four quality levels.

---

### Section 1: Company Fundamentals

**Covers:** Industry vertical, company size, revenue range, employee count, department breakdown, geographic footprint, business model (B2B/B2C/marketplace/etc.)

| Level | Points | Criteria |
|-------|--------|----------|
| Rich | 3 | Specific industry sub-vertical named, ARR or revenue range given, headcount by department broken down, geography detailed (HQ + remote locations), business model described with customer type |
| Adequate | 2 | Industry named, approximate size given, revenue range indicated, some department structure mentioned, business model clear |
| Thin | 1 | Only a company category given with no specifics — no revenue, no headcount detail, no departments |
| Missing | 0 | Section blank, "N/A", "Not sure", or single-word answer only |

**Rich example:**
"SaaS B2B, €12M ARR, 85 employees across 4 departments (Sales 22, Engineering 35, Marketing 12, Operations 16), headquartered in Munich with remote team in Sofia. We sell subscription-based project management software to mid-market professional services firms."

**Thin example:**
"Software company, medium size."

**Why this matters:** Company Fundamentals anchor the AI Maturity scoring model and determine which industry benchmarks apply throughout the Blueprint. Without revenue range and department structure, the Opportunity Sizing module cannot calibrate effort-to-return estimates.

---

### Section 2: Strategic Context

**Covers:** Top 3 business priorities for the next 12–18 months, biggest competitive threat, growth targets (revenue, market share, geographic), active strategic initiatives already underway

| Level | Points | Criteria |
|-------|--------|----------|
| Rich | 3 | Three named priorities with specific targets (e.g., "Reduce churn from 14% to 8% by Q3"), competitive threat named and described, growth target quantified, active initiatives listed with status |
| Adequate | 2 | Priorities listed with reasonable context, competitive pressure acknowledged, growth direction stated, some active initiatives mentioned |
| Thin | 1 | Generic priorities ("grow revenue", "improve efficiency") with no specifics, threat vague, no targets stated |
| Missing | 0 | Section blank, "N/A", or "Not applicable" |

**Rich example:**
"Priority 1: Reduce customer churn from 14% to 8% by Q3 2026. Priority 2: Launch in the UK market by September. Priority 3: Reduce COGS by 15% through automation. Biggest threat is [Competitor X] who undercut us on price last quarter. Active initiatives: new CRM rollout (60% complete), pricing restructure (planning phase)."

**Thin example:**
"We want to grow and improve customer satisfaction. Competition is tough."

**Why this matters:** Strategic priorities directly drive the ranking and prioritization of AI opportunities in Step 3. Without specific priorities, opportunity scoring defaults to generic weightings that may not reflect the client's actual situation.

---

### Section 3: Operational Pain Points

**Covers:** Top 5 processes that are slow, expensive, or error-prone; what has already been attempted to fix them; what didn't work and why

| Level | Points | Criteria |
|-------|--------|----------|
| Rich | 3 | Five processes named with concrete metrics (time spent, error rate, cost, headcount involved), previous attempts described with outcome, root cause noted where known |
| Adequate | 2 | At least 3 processes named with some context, at least one previous attempt mentioned, general sense of what hasn't worked |
| Thin | 1 | One or two vague problems mentioned without metrics or context, no previous attempts described |
| Missing | 0 | Section blank, "N/A", or generic statements like "everything takes too long" |

**Rich example:**
"1. Manual invoice matching: 3 FTE spend 60% of their time, 8% error rate, €45K/year rework cost. Tried RPA in 2023 — failed due to unstructured vendor formats. 2. Sales proposal generation: avg 4 hours per proposal, 40 proposals/month. 3. Customer onboarding: 14-day average, clients complain. 4. Monthly reporting: finance team spends 3 days per cycle pulling data manually. 5. Support ticket routing: 22% misrouted on first pass."

**Thin example:**
"Sales is slow and reporting takes a long time. We tried some tools but they didn't work."

**Why this matters:** Operational Pain Points are the primary input to the Opportunity Identification module in Step 3. Vague pain points produce vague opportunities, which score low on the feasibility and impact dimensions of the Opportunity Matrix.

---

### Section 4: Technology Landscape

**Covers:** Core business systems (ERP, CRM, HRM, etc.), AI or automation tools currently in use, data infrastructure (cloud, on-prem, data warehouse), IT team size and capability

| Level | Points | Criteria |
|-------|--------|----------|
| Rich | 3 | Named systems with vendor and approximate version/tier, AI tools listed with use case and adoption rate, infrastructure described (cloud provider, warehouse tool if any), IT team size and key roles stated |
| Adequate | 2 | Main systems named, some AI tools mentioned, infrastructure type indicated (cloud/hybrid/on-prem), IT capability broadly described |
| Thin | 1 | Only a few system names dropped with no context, no AI tools mentioned, infrastructure unknown |
| Missing | 0 | Section blank, "We use standard software", or no systems named |

**Rich example:**
"CRM: Salesforce Enterprise (300 licenses). ERP: SAP S/4HANA (on-prem, 2021 version). HRM: BambooHR. Data: Azure cloud, Snowflake data warehouse, no formal BI tool yet. AI tools: GitHub Copilot (used by 8 engineers), ChatGPT Enterprise (used ad hoc by Sales). IT team: 6 people — 1 IT manager, 3 developers, 1 data engineer, 1 support."

**Thin example:**
"We use Salesforce and some Microsoft tools. Small IT team."

**Why this matters:** The Technology Landscape determines the AI Readiness dimension of the Maturity Model and directly constrains which AI opportunities are technically feasible in the 0–90 day, 90–180 day, and 6–12 month horizons. Without knowing the data infrastructure, the pipeline cannot assess data readiness independently.

---

### Section 5: People and Culture

**Covers:** Leadership attitude toward AI (enthusiastic/cautious/skeptical), AI-related training completed to date, internal champion identity, known resistance points or cultural blockers

| Level | Points | Criteria |
|-------|--------|----------|
| Rich | 3 | Leadership stance described with specific anecdotes or quotes, training completed named with scope and recency, internal champion named with role and influence level, resistance points described with root cause (fear of job loss, past failed project, compliance culture, etc.) |
| Adequate | 2 | Leadership stance characterized, some training mentioned, champion indicated, resistance acknowledged |
| Thin | 1 | Vague statement about being "open to AI", no training mentioned, no champion named |
| Missing | 0 | Section blank, "N/A", or single word ("positive") |

**Rich example:**
"CEO is enthusiastic — pushed AI onto the board agenda. CFO is skeptical after a failed RPA project in 2022 (lost €80K). CTO is the internal champion. We ran a 2-day AI Literacy workshop in March 2025 (42 of 85 staff attended). Main resistance is in Operations — team lead Maria openly says AI will eliminate jobs. Compliance team requires all AI tools to be EU-hosted."

**Thin example:**
"Management is open to AI. Some people are worried about jobs."

**Why this matters:** People and Culture inputs feed the Change Readiness assessment and directly influence the implementation timeline realism and risk flags in the Blueprint recommendations.

---

### Section 6: Data Readiness

**Covers:** Structured vs. unstructured data split, location of most valuable data, data governance and ownership, compliance constraints (GDPR, HIPAA, sector-specific regulations)

| Level | Points | Criteria |
|-------|--------|----------|
| Rich | 3 | Data types described with approximate volumes, valuable data locations named (specific systems or repositories), ownership model clear (who controls data decisions), compliance constraints named with specific requirements |
| Adequate | 2 | Data types broadly described, key data locations indicated, some governance noted, compliance requirements mentioned |
| Thin | 1 | "We have data in various systems" type response with no specifics, compliance not addressed |
| Missing | 0 | Section blank, "N/A", or "our IT team handles that" |

**Rich example:**
"Structured: CRM (5 years of deal data, ~120K records), ERP (transactional data since 2018), Snowflake warehouse (updated nightly). Unstructured: 8 years of support tickets in Zendesk, contract PDFs on SharePoint (unindexed). Data owner for CRM is Head of Sales; ERP owned by Finance. GDPR applies — all personal data must remain in EU. No sector-specific regulation. Data quality known issue: CRM duplicate rate estimated at 18%."

**Thin example:**
"We have customer data and financial data. GDPR applies."

**Why this matters:** Data Readiness is the most common reason AI projects fail post-recommendation. The pipeline uses Section 6 to flag data readiness risks on each opportunity and to calibrate the effort estimates for data preparation work.

---

### Section 7: Budget and Timeline Signals

**Covers:** Whether a budget has been allocated for AI initiatives, the approximate range, ideal timeline to first visible results, any hard deadlines

| Level | Points | Criteria |
|-------|--------|----------|
| Rich | 3 | Budget range stated (even approximate), timeline to first results given with rationale, hard deadlines or board commitments named, investment approval process described |
| Adequate | 2 | Budget existence confirmed, rough timeline indicated, some context on urgency |
| Thin | 1 | "We have some budget" or "as soon as possible" without any specifics |
| Missing | 0 | Section blank, "N/A", "TBD", or "not decided yet" |

**Rich example:**
"Board has approved €150K for AI initiatives in 2026. First results expected before Q3 board meeting (September). One hard constraint: no new vendor contracts can be signed after July 15 due to fiscal year lock. Looking for at least one visible win within 90 days to build internal confidence."

**Thin example:**
"We have budget available. Timing is flexible."

**Why this matters:** Budget and timeline signals determine which opportunities are actionable in the near term vs. aspirational. Without them, the pipeline cannot meaningfully differentiate between Quick Wins and Strategic Plays in the Opportunity Matrix.

---

## Section Weighting

Not all sections contribute equally to Blueprint reliability. Weighting reflects how directly each section drives the pipeline's scoring and output modules.

| Section | Weight Multiplier | Rationale |
|---------|------------------|-----------|
| 1 — Company Fundamentals | ×1.5 | Anchors industry benchmarks, maturity calibration, and opportunity sizing across all steps |
| 2 — Strategic Context | ×1.5 | Drives opportunity prioritization and strategic fit scoring in Steps 2–3 |
| 3 — Operational Pain Points | ×1.5 | Primary input to opportunity identification; vague pain points propagate errors to all downstream outputs |
| 4 — Technology Landscape | ×1.5 | Determines AI Readiness dimension and technical feasibility of every opportunity |
| 5 — People and Culture | ×1.0 | Important for change readiness and risk flags, but partially offset by document analysis (org charts, HR materials) |
| 6 — Data Readiness | ×1.0 | Critical but partially offset by data infrastructure documents and system exports if provided |
| 7 — Budget and Timeline | ×0.75 | Useful context for prioritization and horizon planning, but does not block maturity or opportunity analysis |

**Rationale for differential weighting:** Sections 1–4 are used in every scoring model and every output module of the pipeline. A gap in any one of these creates compounding errors across Steps 1–5. Sections 5–6 are important but the pipeline can partially compensate using uploaded documents (org charts, data dictionaries, compliance policies). Section 7 affects output framing but does not alter the underlying analysis.

---

## Form Quality Score Calculation

### Formula

```
Form Quality Score (%) =
  Sum of (Section Score × Section Weight)
  ─────────────────────────────────────────  × 100
  Maximum Possible Weighted Score
```

### Maximum Possible Weighted Score

| Section | Max Raw Score | Weight | Max Weighted |
|---------|--------------|--------|--------------|
| 1 — Company Fundamentals | 3 | ×1.5 | 4.5 |
| 2 — Strategic Context | 3 | ×1.5 | 4.5 |
| 3 — Operational Pain Points | 3 | ×1.5 | 4.5 |
| 4 — Technology Landscape | 3 | ×1.5 | 4.5 |
| 5 — People and Culture | 3 | ×1.0 | 3.0 |
| 6 — Data Readiness | 3 | ×1.0 | 3.0 |
| 7 — Budget and Timeline | 3 | ×0.75 | 2.25 |
| **Total** | | | **26.25** |

### Worked Example

A client scores: Section 1 = 3, Section 2 = 2, Section 3 = 1, Section 4 = 2, Section 5 = 2, Section 6 = 1, Section 7 = 0

```
Weighted sum = (3×1.5) + (2×1.5) + (1×1.5) + (2×1.5) + (2×1.0) + (1×1.0) + (0×0.75)
             = 4.5 + 3.0 + 1.5 + 3.0 + 2.0 + 1.0 + 0.0
             = 15.0

Form Quality Score = 15.0 / 26.25 × 100 = 57.1%
Classification: Marginal — Proceed with caution
```

---

## Thresholds and Decisions

| Score Range | Classification | Decision |
|-------------|---------------|----------|
| 80–100% | Excellent | Proceed immediately. Inputs are sufficient to drive reliable scoring across all pipeline modules. Pipeline is likely to achieve Green confidence gates at Steps 2–5. |
| 65–79% | Adequate | Proceed. Inputs cover most requirements but some sections lack specificity. Pipeline may score Amber at one or two quality gates. Budget extra remediation time (est. +2–4 hours) and note which sections were Adequate or Thin in the Pre-Pipeline Report. |
| 50–64% | Marginal | Proceed with caution. Contact client to request supplementary detail on all Thin (score 1) sections before launching the pipeline. If the client cannot provide additional detail within 48 hours, escalate to the engagement lead. Pipeline will likely require significant remediation and may produce Amber or Red quality gates on opportunity sizing and maturity scoring. |
| Below 50% | Insufficient | Do NOT proceed. Contact client immediately. The Pre-Pipeline Report must list every section scoring 0 or 1, explain specifically what "Rich" quality looks like for that section, and provide the client with 3–5 concrete example questions to guide their supplementary response. Resubmit for re-scoring before Step 1 begins. |

### Critical Section Override Rule

Regardless of the overall Form Quality Score, if **any** of Sections 1, 2, or 3 scores 0 (Missing), the pipeline must not proceed. These sections are foundational to the entire output. A score of 0 on any of them means the pipeline would be generating outputs with no basis in the client's actual situation.

---

## Document Sufficiency Cross-Check

After scoring the intake form, assess whether uploaded supporting documents compensate for thin or missing form sections. Documents cannot fully replace a well-completed form section but can reduce the effective risk of proceeding.

### Document Offset Table

| Thin/Missing Section | Compensating Document Types | Maximum Offset | Effective Risk After Offset |
|---------------------|----------------------------|----------------|----------------------------|
| Section 1 — Company Fundamentals | Detailed org chart, company overview deck, annual report or financial summary, LinkedIn company page export | Up to +0.5 effective points | Medium — quantitative data (revenue, headcount by dept) may still be absent |
| Section 2 — Strategic Context | Board presentation, strategic plan document, OKR spreadsheet, investor update | Up to +1.0 effective points | Low-Medium — strategy docs often contain explicit priorities and targets |
| Section 3 — Operational Pain Points | Process maps, SOPs, audit reports, customer complaint logs, support ticket exports | Up to +0.5 effective points | Medium-High — documents rarely quantify time/cost of broken processes as precisely as a thoughtful form answer |
| Section 4 — Technology Landscape | IT architecture diagram, software license inventory, vendor contracts list, IT team org chart | Up to +1.0 effective points | Low-Medium — architecture docs typically name all systems and infrastructure |
| Section 5 — People and Culture | HR training records, change management reports, past AI initiative post-mortems, all-hands meeting notes | Up to +0.5 effective points | Medium — culture and resistance are rarely documented candidly in formal materials |
| Section 6 — Data Readiness | Data dictionary, data catalog export, GDPR compliance policy, data governance framework, ERD diagrams | Up to +1.0 effective points | Low-Medium — technical data docs can substitute well for form detail |
| Section 7 — Budget and Timeline | Budget approval email, project charter, board resolution, financial planning spreadsheet | Up to +0.5 effective points | Medium — budget docs may exist but not be shared due to sensitivity |

### Document Offset Application Rules

1. Offsets are applied to the **risk assessment narrative** in the Pre-Pipeline Report, not to the numeric Form Quality Score. The score reflects the form only.
2. The orchestrator must confirm that uploaded documents have been reviewed and contain the compensating information — do not assume a document offsets a section unless the relevant content is actually present.
3. Even with maximum document offsets, a section scoring 0 (Missing) on the form cannot be raised above a Medium effective risk classification. Document offsets reduce risk; they do not eliminate it.
4. Sections 1, 2, and 3 scoring 0 trigger the Critical Section Override Rule regardless of documents uploaded.

---

## Pre-Pipeline Report Format

The orchestrator generates a standardized Pre-Pipeline Assessment Report before Step 1 begins. This report is attached to the Blueprint session record and referenced in the final deliverable's Confidence Score.

### Report Structure

```
────────────────────────────────────────────────────
AI VALUE BLUEPRINT — PRE-PIPELINE ASSESSMENT REPORT
────────────────────────────────────────────────────

Client:           [Client Name]
Assessment Date:  [Date]
Assessed By:      [Orchestrator / Analyst Name]
Session ID:       [Blueprint Session ID]

────────────────────────────────────────────────────
SECTION SCORES
────────────────────────────────────────────────────

Section 1 — Company Fundamentals:       [0–3]  [Missing/Thin/Adequate/Rich]
Section 2 — Strategic Context:          [0–3]  [Missing/Thin/Adequate/Rich]
Section 3 — Operational Pain Points:    [0–3]  [Missing/Thin/Adequate/Rich]
Section 4 — Technology Landscape:       [0–3]  [Missing/Thin/Adequate/Rich]
Section 5 — People and Culture:         [0–3]  [Missing/Thin/Adequate/Rich]
Section 6 — Data Readiness:             [0–3]  [Missing/Thin/Adequate/Rich]
Section 7 — Budget and Timeline:        [0–3]  [Missing/Thin/Adequate/Rich]

────────────────────────────────────────────────────
FORM QUALITY SCORE
────────────────────────────────────────────────────

Weighted Score:     [X.XX] / 26.25
Form Quality Score: [XX.X]%
Classification:     [Excellent / Adequate / Marginal / Insufficient]

────────────────────────────────────────────────────
CRITICAL SECTION OVERRIDE
────────────────────────────────────────────────────

Sections 1/2/3 scoring 0:  [Yes — list sections / No]
Override triggered:         [Yes / No]

────────────────────────────────────────────────────
DOCUMENT SUFFICIENCY CHECK
────────────────────────────────────────────────────

Documents uploaded:
  [ ] Org chart / company overview
  [ ] Strategic plan / board materials
  [ ] Process maps / SOPs
  [ ] IT architecture / system inventory
  [ ] HR / training records
  [ ] Data dictionary / governance docs
  [ ] Budget / project charter

Thin sections with document offset:
  Section [X]: Thin form score, offset by [document name] — Effective risk: [Low/Medium/High]
  Section [X]: Missing form score, no compensating document found — Effective risk: High

────────────────────────────────────────────────────
DECISION
────────────────────────────────────────────────────

Decision:  [PROCEED / PROCEED WITH CAUTION / HOLD / DO NOT PROCEED]

Conditions / Actions Required:
  - [List specific actions if Hold or Do Not Proceed, or notes if Proceed with Caution]
  - [If requesting client supplementary detail: list each section, what is missing,
     and what Rich quality looks like for that section]

Estimated pipeline quality impact:
  - AI Maturity Scoring (Step 2):         [Low / Medium / High risk of thin output]
  - Opportunity Identification (Step 3):  [Low / Medium / High risk of thin output]
  - Opportunity Sizing (Step 3):          [Low / Medium / High risk of thin output]
  - Roadmap Reliability (Step 4):         [Low / Medium / High risk of thin output]
  - ROI Confidence (Step 5):              [Low / Medium / High risk of thin output]

────────────────────────────────────────────────────
NOTES
────────────────────────────────────────────────────

[Any additional context, anomalies, or flags not captured in the structured fields above]

────────────────────────────────────────────────────
```

### Report Delivery

- The Pre-Pipeline Assessment Report is stored in the Blueprint session folder before Step 1 begins.
- If the decision is PROCEED or PROCEED WITH CAUTION, the report is appended to the Step 1 context so the AI Maturity Scoring module is aware of which sections carry elevated uncertainty.
- If the decision is HOLD or DO NOT PROCEED, the report is sent to the client-facing analyst to manage the client communication. No pipeline steps are initiated.
- The Pre-Pipeline Assessment Report's risk flags are referenced by the Confidence Score algorithm at each subsequent quality gate to correctly weight evidence from thin input sections.

---

## Version History

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| v1.0 | 2026-05-18 | AI Assist BG | Initial release — 7-section rubric, weighted scoring formula, thresholds, document offset table, and Pre-Pipeline Report format |
