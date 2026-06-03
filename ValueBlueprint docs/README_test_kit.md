# Blueprint Test Kit — Meridian Talent Partners OOD
## AI Value Blueprint Testing Package | BP-TEST-001

---

## What This Kit Is

This is a complete, realistic test dataset for the AI Value Blueprint pipeline. It contains
**all questionnaire answers** and **all 8 document uploads** needed to run a full end-to-end
Blueprint pipeline for a fictional but thoroughly realistic test client.

---

## The Test Client: Meridian Talent Partners OOD

**Industry:** Recruitment & Talent Acquisition / Professional Services
**Headquarters:** Sofia, Bulgaria | Offices in Bucharest, Romania and Warsaw, Poland
**Revenue:** €4,823,400 (FY2025) | **Employees:** 68 FTEs | **Founded:** 2017
**Business Model:** B2B — permanent placement, executive search, contract staffing, RPO
**Why this industry:** Tests the Professional Services hallucination hotspots (Section 6 of
the industry guide). Different from existing test engagements (Manufacturing: BP-001,
Logistics: BP-002). Rich enough to produce high-quality Blueprint output.

**Design Intent — What This Client Should Surface:**

| Blueprint Step | What to Expect |
|----------------|----------------|
| Intake (Step 1) | Rich materials → high-confidence dossier. Clear pain points with corroborating evidence across form AND documents. Multiple contradictions to surface (form says "partially clean data"; tech inventory shows ~35% stale). |
| Maturity (Step 2) | Mixed maturity profile: Technology = Developing (mid-migration), Data = Early (poor quality, no governance), Process = Early-Developing (documented but unenforced), Governance = Early (GDPR gaps), People = Developing (organic AI interest, resistance from senior staff), Strategy = Developing (clear plan but early execution). |
| Opportunities (Step 3) | 5–7 well-grounded opportunities: AI-assisted sourcing, candidate database revival, CV formatting automation, automated client reporting, scheduling automation, RPO product tooling. Should NOT produce generic "AI analytics platform" slop. |
| Roadmap (Step 4) | Maturity gating should push data-heavy opportunities to Next/Later; Quick Wins in Now include ChatGPT formalisation (very high feasibility) and CV formatting automation. |
| Assembly (Step 5) | Should test score consistency between steps; no internal tags visible; client name "Meridian Talent Partners" consistent throughout. |

---

## File List

| # | Filename | Document Category | Quality Level |
|---|----------|-------------------|---------------|
| 00 | `00_questionnaire_answers.md` | Intake form (all 7 sections) | **Rich** across all sections |
| 01 | `01_financial_summary_FY2025.pdf` | Financial Summary (REQUIRED) | **Rich** — full P&L, KPIs, revenue breakdown |
| 02 | `02_org_chart_team_structure.pdf` | Org Chart / Team Structure (REQUIRED) | **Rich** — all departments, headcount, roles |
| 03 | `03_sales_pipeline_data.pdf` | Sales / Pipeline Data (REQUIRED) | **Rich** — pipeline stages, TTF analysis, client data |
| 04 | `04_process_documentation_sop.pdf` | Process Documentation (REQUIRED) | **Rich** — 4 core SOPs with adherence data |
| 05 | `05_marketing_customer_data.pdf` | Marketing / Customer Data (OPTIONAL) | **Rich** — satisfaction survey, client base, BD |
| 06 | `06_technology_inventory.pdf` | Technology Inventory (OPTIONAL) | **Rich** — full stack, data quality assessment |
| 07 | `07_strategic_plan_FY2026.pdf` | Strategic Documents (OPTIONAL) | **Rich** — CEO strategic plan, financial targets |
| 08 | `08_previous_ai_initiatives.pdf` | Previous AI / Digital Initiatives (OPTIONAL) | **Rich** — 6 past initiatives with lessons learned |

**All 4 REQUIRED categories present. All 4 OPTIONAL categories present.**
**Expected Pre-Pipeline Assessment: SUFFICIENT — PROCEED**

---

## Expected Form Quality Score

Using the scoring rubric from `intake-form-quality-scoring.md`:

| Section | Score | Rationale |
|---------|-------|-----------|
| Section 1 — Company Fundamentals | 3 (Rich) | Sub-vertical named, revenue range given, headcount by dept, geography detailed, business model clear |
| Section 2 — Strategic Context | 3 (Rich) | Three named priorities with specific targets (TTF 38→28 days, revenue €4.8M→€6M, RPO launch Q4), active initiatives listed |
| Section 3 — Operational Pain Points | 3 (Rich) | 5 pain points with concrete metrics (6–8 hrs sourcing, 47K stale records, 1.5–2 hrs CV formatting), prior attempts described |
| Section 4 — Technology Landscape | 3 (Rich) | Named systems with context, AI tools listed, infrastructure described, IT team size stated |
| Section 5 — People & Culture | 3 (Rich) | Leadership stance described with context, training noted, champion identified, resistance points articulated with root cause |
| Section 6 — Data Readiness | 3 (Rich) | Partial clean data acknowledged, valuable data locations listed, GDPR constraints described specifically |
| Section 7 — Budget & Timeline | 2 (Adequate) | Budget in discussion (not confirmed), range given (€10K–€50K), timeline stated ("ASAP") |

**Expected Form Quality Score: ~95% (Excellent) → Pipeline should PROCEED immediately**

---

## Key Data Points to Verify During Testing

These are the specific numbers and claims the pipeline should extract, cite, and carry
consistently through all 5 steps:

### Financial Anchors
- Total FY2025 revenue: **€4,823,400** (from Doc 1, line 1 of revenue summary)
- YoY growth: **11.6%** vs FY2024 (€4,322,100)
- EBITDA margin: **8.7%** (€421,200)
- Net profit: **€340,740** (7.1% margin)
- Technology & software spend: **€142,800** (FY2025); rising to ~€168K in FY2026
- Executive search = **18% of revenue** (current) → target **30%**
- Revenue per delivery FTE: **€114,843** vs €120K target

### Operational Anchors
- Average time-to-fill: **38 days** (FY2025 average all permanent roles)
- Sourcing phase alone: **22 of 38 days** (58% of TTF)
- Sourcing time per mandate: **6–8 hours** of researcher time
- Active mandates per month: **35–40**
- Candidate database size: **~47,000 records**, ~**35% stale/poor quality**
- CV formatting time: **1.5–2 hours per candidate**, **8–10 hours per shortlist**
- Client satisfaction — "Communication & transparency": **3.1 / 5.0** (lowest rated)
- Offer acceptance rate: **82%**
- Mandate win rate: **34%** (target 40%)
- Total employees: **68 FTEs**

### Technology Anchors
- ATS migration (Zoho → Vincere): **40% complete** as of May 2026; target July 2026
- Vincere license cost: **€18,000/year**, 68 seats
- LinkedIn Recruiter: **12 seats**, **€38,400/year**
- No data integrations between any systems
- ChatGPT used informally by **6–8 consultants** (personal accounts, no company policy)
- No BI platform, no data warehouse

### People Anchors
- CEO attitude: **Open — interested but cautious** (attended half-day workshop Oct 2025)
- Internal champion: **Operations Director** (Elena Mihailova)
- Researcher/Resourcer turnover: **~35% annually**
- GDPR: **3 Right to Erasure requests** in past year, handled manually and inconsistently
- ChatGPT GDPR risk: candidate data in personal (non-company) accounts = compliance gap

---

## Cross-Document Consistency Check (for QG-FINAL testing)

These facts appear in MULTIPLE documents and must be consistent:

| Fact | Doc 1 | Doc 2 | Doc 3 | Doc 4 | Doc 7 |
|------|-------|-------|-------|-------|-------|
| Total headcount: 68 | ✓ (FTE cost table) | ✓ (explicit) | ✓ (implied) | — | ✓ |
| FY2025 revenue: €4,823,400 | ✓ | — | ✓ (quarterly implied) | — | ✓ |
| Time-to-fill: 38 days avg | ✓ (KPI table) | — | ✓ (TTF table) | ✓ (mentioned) | ✓ |
| 3 offices: Sofia, Bucharest, Warsaw | ✓ (rent line) | ✓ | ✓ (client list) | — | — |
| LinkedIn Recruiter 12 seats €38,400 | ✓ (sourcing costs) | — | — | ✓ | — |
| Vincere migration 40% complete | — | ✓ (ops note) | ✓ (pipeline note) | ✓ (process) | ✓ |

---

## Designed Contradictions / Nuances (for testing pipeline vigilance)

These are intentional tensions the intake analyst should surface:

1. **Form vs. Doc tension on data quality:** Form says "Partially — some areas are clean." Tech inventory says ~35% of 47,000 records are stale. The document is more specific and more damning — the pipeline should cite the doc, not just the form.

2. **AI tool adoption vs. no formal policy:** Form mentions informal ChatGPT use; Doc 8 describes it as GDPR risk. The pipeline should flag this as a compliance gap, not just a "technology in use" positive.

3. **RPO as "initiative underway" vs. "new product":** Form describes RPO pilot in strategic context as existing initiative; Doc 7 describes it as a new product to be launched. Both are true (existing informal → formalising as product). The pipeline should note this nuance.

4. **Senior consultant resistance vs. CEO enthusiasm:** Form states leadership attitude as "Open — interested but cautious." Doc 7 (CEO foreword) and Doc 8 both reveal that senior Partners (who drive most revenue) are sceptical of AI. The maturity scorer should score "People" conservatively given this specific resistance.

5. **Vincere as "foundation" assumption:** The form implies Vincere will fix the data problem. Doc 8 (initiative 3: database cleaning) shows that without governance, data quality reverts. The pipeline should not assume Vincere migration = data readiness.

---

## Suggested Testing Scenarios

### Scenario A — Full Pipeline (Standard)
Run all 5 steps sequentially with all 9 files. Expected result: high-quality Blueprint, mostly Green gates. Good for baseline performance testing.

### Scenario B — Reduced Materials (Stress Test)
Remove Docs 7 and 8 (optional categories). Expected result: still Sufficient pre-screen; some [Insufficient Evidence] flags on strategic alignment scoring in Step 3. Good for testing degradation gracefully.

### Scenario C — Form Only (Thin Materials)
Provide only the questionnaire answers (Doc 00), no uploaded PDFs. Expected result: Pre-pipeline assessment = Marginal or Insufficient. Tests the pre-pipeline quality screens. Intake should produce many [Form-Stated] tags and few [Document-Backed] tags.

### Scenario D — GDPR / Compliance Sensitivity Check
Focus on whether the pipeline correctly identifies GDPR as a feasibility constraint on data-intensive AI opportunities (candidate scoring, database mining). The pipeline should NOT propose "AI candidate matching using your 47K record database" in the Now phase without first flagging the GDPR audit as a prerequisite.

---

*Test kit designed and generated by AI Assist BG internal tooling. Company "Meridian Talent Partners OOD" is entirely fictional. All financial data, personnel, and client names are invented for testing purposes only. May 2026.*
