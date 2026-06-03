# Smoke Test Fixture — Contrasting Archetype
## AI Value Blueprint · Intake Input

**Purpose:** Generalization smoke run per v10 §7. Deliberately contrasts Meridian on all four axes:

| Axis | Meridian (primary fixture) | This fixture |
|------|---------------------------|-------------|
| Sector | Recruitment | Discrete manufacturing |
| Size band | Small (68 employees) | Mid (280 employees) |
| Document richness | Standard | Sparse (limited documentation) |
| Regulatory regime | EU / GDPR | Non-EU (UK post-Brexit) |

This is a **synthetic test case** — company and data are fictional but representative of a
mid-size UK industrial manufacturer. Use it to verify: (a) the Evidenced-Absence rule scores
correctly when capabilities are genuinely present vs. genuinely absent, (b) the manufacturing
archetype and mid size-band produce sensible counts without false validation failures, (c)
the Non-EU regulatory regime does not surface GDPR references in pain points or hypotheses.

---

## Intake Form Responses

### Section 1 — Company Fundamentals

- **Company name:** Veritas Pressings Ltd
- **Industry:** Manufacturing — discrete manufacturing, precision metal pressings
- **Geography:** West Midlands, United Kingdom (post-Brexit; ICO / UK GDPR applies, not EU GDPR)
- **Employees:** 280 (220 production floor, 35 technical/engineering, 25 commercial/admin)
- **Revenue range:** £18–22M annual turnover
- **Business model:** B2B contract manufacturer; supplies tier-1 automotive OEMs and aerospace
  integrators. Mix: 65% repeat orders from 4 key accounts, 35% spot/project work.
- **Departments:** Production (4 lines), Engineering/Quality, Maintenance, Commercial, Finance, HR

### Section 2 — Strategic Context

- **Top 3 priorities (next 12 months):**
  1. Reduce unplanned downtime — target OEE from current ~61% to 75% within 18 months
  2. Win a new tier-1 aerospace customer (requires AS9100 certification upgrade)
  3. Reduce scrap/rework rate from 4.2% to below 2% — directly impacts margin

- **Biggest competitive threat:** Lower-cost Eastern European pressings manufacturers entering
  UK market via EU-based tier-1 customers. Price pressure on commodity lines.

- **Growth target:** 12% revenue growth in FY27, driven by aerospace vertical expansion.

- **Active initiatives:** ISO 9001 re-certification underway. ERP replacement shortlist in progress
  (SAP B1 vs. Microsoft Business Central — decision expected Q3). No active AI initiatives.

### Section 3 — Operational Pain Points

1. **Unplanned downtime with no early warning** — Line 2 (oldest press, 2009) averages 14 hours
   unplanned downtime per month. Maintenance team is reactive; no sensor data on press condition.

2. **Manual production scheduling in spreadsheets** — Scheduler uses Excel. When a job runs
   long or a machine goes down, the entire schedule is manually rebuilt. Takes 2–4 hours per
   disruption. No visibility of knock-on effects across lines.

3. **Scrap and rework not traced to root cause** — QC records defects on paper log sheets.
   No pattern analysis. Engineering investigates individual incidents but can't see trends.
   Rework consumes estimated 8% of labour capacity.

4. **ERP data quality too poor to rely on** — Current ERP (Sage 200) has 6 years of
   inconsistently entered data. Material costs are often wrong, job costing is unreliable.
   Finance reconciles manually at month-end. Migration to new ERP is complicated by data quality.

5. **No real-time production visibility for commercial team** — Account managers cannot see live
   job status. Customer queries about delivery dates require phoning the production floor.
   Estimated 3–5 such queries per day per account manager.

- **What they've tried:** Piloted a paper-based 5S system on Line 1 (partial success). Explored
  a CMMS vendor (Limble) — not purchased due to budget cycle. No AI or ML tooling trialled.

- **What didn't work:** A previous OEE tracking spreadsheet was abandoned because production
  supervisors didn't maintain it consistently.

### Section 4 — Technology Landscape

- **Core systems:**
  - ERP: Sage 200 (on-premise, end-of-support 2027) — replacement in progress
  - Quality: Paper-based defect logs + Excel summary sheets (no QMS software)
  - Maintenance: No CMMS — maintenance log is a shared Excel workbook
  - Finance: Sage 200 + Xero for bank reconciliation
  - CRM: None — account management in spreadsheets and email

- **AI tools in use:** None formally. Two engineers use ChatGPT for drafting technical reports
  (personal accounts, not IT-sanctioned, no data governance).

- **Data infrastructure:** No data warehouse. Sage 200 is the primary data store.
  Production floor has no sensor network; machine status is recorded by operators on shift reports.
  Line 3 and 4 PLCs export runtime data to a shared drive CSV — used ad hoc, no systematic analysis.

- **IT team:** 1 IT Manager (generalist). No in-house data engineering capability.

### Section 5 — People and Culture

- **Leadership AI attitude:** MD is cautious but open — "Show me a clear ROI and I'll back it."
  Operations Director actively interested; attended a Manufacturing AI conference in 2024 and
  has been the internal advocate for exploring AI since. No formal AI strategy or budget line.

- **AI training done:** None. One workshop on "Industry 4.0 basics" attended by Engineering team
  in 2023. No formal AI literacy program.

- **Internal champion:** Operations Director (Steve Marsh) — drives the agenda but has no
  technical AI background. Will need external support to translate interest into a plan.

- **Resistance points:** Production supervisors sceptical of any system that "creates more
  paperwork." Previous failed OEE spreadsheet reinforced this. Union shop steward has raised
  concerns about "surveillance technology on the floor" — not blocking but needs managing.

### Section 6 — Data Readiness

- **Structured data available:**
  - 6 years of Sage 200 job costing records (quality poor — see pain points)
  - 3 years of shift reports (paper, partially digitised as scanned PDFs)
  - Line 3/4 PLC CSV exports (2 years, ad hoc, no schema documentation)
  - QC defect logs (paper — no digital equivalent)

- **Most valuable data location:** The PLC CSV exports from Lines 3/4 are the most structured
  and machine-generated; most likely to support an AI use case. Everything else requires
  significant data preparation.

- **Data governance/ownership:** No formal data governance. IT Manager owns the ERP.
  Production data is effectively owned by the Operations Director but there is no policy.

- **Compliance constraints:** UK GDPR (ICO) for employee data. No special category data.
  Customer contracts include data confidentiality clauses (standard tier-1 OEM terms).
  AS9100 certification being pursued — will impose stricter process documentation requirements.

### Section 7 — Budget and Timeline

- **Budget allocated for AI:** No dedicated AI budget. Capital expenditure budget for FY27 is
  £420K (allocated to ERP replacement and Line 2 press refurbishment). Any AI initiative would
  need to compete within operational improvement budget (~£80K discretionary).

- **Ideal timeline to first results:** Operations Director wants to see "something working" within
  6 months. MD wants ROI evidence before committing to a larger programme.

---

## Uploaded Document Summaries

*Note: Documents are sparse and low-quality — consistent with a document richness tier of
`sparse`. This is intentional for the smoke test: the validator must accept lower Section B
row counts and tag totals without false failures.*

### Document 1 — Financial Summary (Low confidence parse)
- FY2024 revenue: £19.4M (down from £20.1M FY2023)
- Gross margin: 28.3% (industry benchmark ~32% for precision pressings)
- EBITDA: £1.2M (6.2% — below target of 8%)
- Labour cost as % of revenue: 41% (high — reflects rework and overtime)
- Top 4 customers: 63% of revenue (concentration risk flagged by auditors)
- **Parse confidence: Medium** — management accounts only; no P&L breakdown by product line

### Document 2 — Org Chart (Medium confidence parse)
- MD → Operations Director → 4 Production Supervisors (one per line)
- MD → Engineering Manager → 6 engineers (QC + process)
- MD → Finance Manager → 2 staff
- MD → Commercial Manager → 3 account managers
- Maintenance team (5): reports to Operations Director
- **Parse confidence: Medium** — org chart is a PowerPoint slide; some roles unclear

### Document 3 — Production Shift Reports (Low confidence parse — scanned PDFs)
- Sample of 12 shift reports from Q4 2024 (paper-based, partially legible)
- Line 2 downtime events visible: 3 events averaging 4.7 hours each in Q4 2024
- Scrap counts present but inconsistently recorded (some shifts blank)
- No structured machine runtime data
- **Parse confidence: Low** — scanned documents; text extraction partial

### Document 4 — PLC CSV Export Sample (High confidence parse)
- Line 3 data: cycle time per part, machine status (running/idle/fault), shift date
- 8 months of data (May–Dec 2024), ~42,000 rows
- Columns: timestamp, machine_id, cycle_time_s, part_count, fault_code, operator_id
- Average cycle time: 47.3s (target: 44s); fault codes present but not mapped to descriptions
- **Parse confidence: High** — structured CSV, clean schema

### Document 5 — Sales Pipeline / Order Book (Medium confidence parse)
- Active orders: 47 live jobs across 4 lines
- On-time delivery rate: 84% (target 95%; customer SLA threshold 90%)
- Average order lead time: 6.2 weeks (target 5 weeks)
- Largest account (Automotive OEM A): 31% of revenue, 18 active jobs
- **Parse confidence: Medium** — extracted from Sage 200 export; some fields incomplete

---

## Smoke Test Validation Targets

When this fixture is processed through the pipeline, the reviewer must confirm:

1. **Evidenced-Absence principle (Fix A):** People dimension should score Developing (not Early).
   Steve Marsh as Operations Director champion + MD's stated openness are positive signals.
   The absence of formal AI training or AI strategy is absence-of-record, not evidenced absence
   of People capability. If People scores Early, the principle has not been applied.

2. **Evidenced absence fires correctly:** Governance should score Early. There is no formal data
   governance policy, no AI ethics guideline, no risk framework — and the shift report and ERP
   data quality issues provide positive evidence that governance processes are absent or failing.
   This is genuinely evidenced absence, not just an unrecorded item.

3. **Profile-relative counts (Fix C):** With archetype=manufacturing, size-band=mid,
   richness=sparse, the validator should PASS with lower Section B rows (22–38 range)
   and lower total tags (70–150 range). If it FAILs on count violations, the profile
   registry is not working correctly.

4. **No GDPR references in output:** Pain points and hypotheses must reference "data protection
   compliance" or "applicable data protection regulation" — not "GDPR" or "EU GDPR". This is
   a UK Non-EU engagement.

5. **Manufacturing archetype hypothesis selection:** At least one Quick Win should be feasible
   (H-MF-06, H-MF-07, or H-MF-12 are likely candidates given the data). Big Bets requiring
   sensor networks (H-MF-01 Predictive Maintenance) should score low feasibility given the
   sparse sensor infrastructure — they may appear but should rank below Foundation Builders.

---

*Smoke test fixture — synthetic data — not a real client engagement.*
*Prepared for v10 generalization validation per §7 of v10 spec.*
