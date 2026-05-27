# Manufacturing — Archetype

**Schema:** `intake_v1.0`
**Status:** PENDING VALIDATION (archetype populated — Golden Output to be built before marking ACTIVE)
**Golden Output:** *to be built — use a Baros Vision representative dossier as the first candidate*
**Covers:** Discrete manufacturing, process manufacturing, industrial production, factory operations, OEM, job shop, contract manufacturing

---

## 1. KPI Taxonomy

The metrics Section B must surface for a manufacturing client. Sourced from the eight Blueprint PDFs where available; form responses where documentation is unavailable.

### Financial baseline
- Total revenue and YoY growth (financial summary p.1)
- Revenue split by product line / customer segment (financial summary p.1)
- Gross margin by product category (financial summary p.2)
- EBITDA margin and trend (financial summary p.2)
- Direct cost structure: materials vs. labour vs. overhead split (financial summary p.2)
- Cost per unit produced (financial summary p.3)

### Operational KPIs
- Overall Equipment Effectiveness (OEE) — Availability × Performance × Quality (sales pipeline / SOP p.2)
- First Pass Yield (FPY) — % of units passing QC without rework (SOP p.3)
- Scrap rate and rework rate (SOP p.3)
- Machine utilisation rate per production line (tech inventory p.2; form: technology)
- Planned vs unplanned downtime ratio (tech inventory p.2)
- Average cycle time per unit (SOP p.2)
- On-Time Delivery (OTD) rate to customer committed date (sales pipeline p.1)

### Volume metrics
- Units produced per shift / month / year (financial summary p.3)
- Output per production FTE (financial summary p.3)
- Active production orders (WIP inventory value and count) (sales pipeline p.1)
- Batch size and changeover frequency (SOP p.2)
- Throughput vs. theoretical capacity (SOP p.2)
- Inbound goods rejection rate (SOP p.3)

### Customer metrics
- Active customer count and top-5 revenue concentration (marketing/customer data p.1)
- Order fulfilment cycle time (from confirmed order to delivery) (sales pipeline p.2)
- Customer complaint and return rate (marketing/customer data p.2)
- On-time delivery performance by customer segment (marketing/customer data p.2)
- Customer satisfaction or NPS (marketing/customer data p.1)

### Team metrics
- Total FTEs split: production operators / engineers / maintenance / QA / management (org chart p.1)
- Shift structure and coverage (org chart p.2)
- Overtime % of total labour hours (org chart p.2; financial summary p.2)
- Maintenance team size and reactive-vs-planned split (org chart p.2)
- Safety incident rate (OSHA recordable rate or equivalent) (org chart p.3)

### Technology & data
- ERP system + version + annual cost (tech inventory p.1)
- MES (Manufacturing Execution System) presence, coverage, and data capture (tech inventory p.1)
- SCADA / PLC / sensor network coverage (tech inventory p.2)
- Data historian availability (AVEVA, OSIsoft PI, or equivalent) (tech inventory p.2)
- Quality management system (QMS) software (tech inventory p.1)
- Maintenance management system (CMMS) presence (tech inventory p.1)
- AI/ML tools currently in use, governed vs ungoverned (tech inventory p.2; previous AI initiatives p.4)

---

## 2. Pain Point Library

Common pain points for manufacturing firms. Use as candidates during selection; promote those backed by document evidence per `pain_point_selection.md`.

| ID | Pain Point | Default Severity | Default Impact Area |
|---|---|---|---|
| PP-MF-01 | Unplanned equipment downtime with no predictive capability | High | Cost/Risk/Time |
| PP-MF-02 | Manual quality inspection creating throughput bottleneck | High | Cost/Quality/Time |
| PP-MF-03 | Demand forecasting inaccuracy driving inventory imbalance | High | Cost/Revenue |
| PP-MF-04 | Production scheduling done in spreadsheets without real-time data | High | Time/Cost/Strategic |
| PP-MF-05 | Supplier delivery visibility gaps causing line stoppages | High | Cost/Risk |
| PP-MF-06 | Knowledge concentrated in experienced workers with no capture mechanism | High | Risk/Strategic |
| PP-MF-07 | Manual data entry from production floor to ERP causing lag and errors | Medium-High | Time/Quality |
| PP-MF-08 | Defect root cause analysis taking days without pattern detection | Medium-High | Cost/Quality |
| PP-MF-09 | Energy consumption not optimised by production schedule | Medium | Cost/Compliance |
| PP-MF-10 | Manual compliance documentation (ISO, CE, industry certifications) | Medium | Time/Compliance |
| PP-MF-11 | No real-time production visibility for operations management | Medium | Strategic/Risk |
| PP-MF-12 | Incoming goods inspection labour-intensive and inconsistently recorded | Medium | Time/Cost |
| PP-MF-13 | Worker safety incidents not predicted — reactive safety culture | Medium | Risk/Team |
| PP-MF-14 | Maintenance reactive rather than planned — high emergency repair costs | High | Cost/Risk |
| PP-MF-15 | Customer order changes handled manually — slow response time | Medium | Customer/Revenue |

The 5 form-stated pain points always make the list. The selection algorithm picks 3 more from this library + any document-surfaced emergent candidates.

---

## 3. Hypothesis Library

Common AI opportunities for manufacturing firms. Each has a typical Impact × Feasibility × Alignment range; actual scores come from `hypothesis_selection.md`.

| ID | Hypothesis | Typical Impact | Typical Feasibility | Typical Alignment | Default Class |
|---|---|---|---|---|---|
| H-MF-01 | Predictive Maintenance (ML on sensor/IoT data from equipment) | 5 | 2 | 4 | Big Bet |
| H-MF-02 | Computer Vision Quality Inspection (automated defect detection) | 5 | 2 | 4 | Big Bet |
| H-MF-03 | AI-Powered Demand Forecasting (ML on sales history + external signals) | 4 | 3 | 4 | Foundation Builder |
| H-MF-04 | Production Scheduling Optimisation (constraint-based AI scheduler) | 4 | 3 | 3 | Foundation Builder |
| H-MF-05 | Supply Chain Risk Intelligence (supplier monitoring + early warning) | 4 | 3 | 4 | Foundation Builder |
| H-MF-06 | Energy Consumption Optimisation (production schedule × energy pricing) | 3 | 4 | 3 | Quick Win |
| H-MF-07 | Automated Compliance Documentation (ISO/CE report generation) | 3 | 4 | 4 | Quick Win |
| H-MF-08 | Worker Safety Leading Indicator Monitoring (near-miss pattern detection) | 4 | 3 | 3 | Foundation Builder |
| H-MF-09 | Inventory Optimisation (ML-driven reorder point and safety stock) | 4 | 3 | 4 | Foundation Builder |
| H-MF-10 | Defect Root Cause AI Assistant (pattern matching across QC records) | 3 | 3 | 4 | Foundation Builder |
| H-MF-11 | Expert Knowledge Capture (AI-assisted SOP extraction from senior workers) | 4 | 2 | 4 | Big Bet |
| H-MF-12 | Real-Time Production Dashboard (MES + ERP + sensor integration) | 3 | 4 | 4 | Quick Win |
| H-MF-13 | Supplier Performance Scoring (automated scorecard from delivery + quality data) | 3 | 3 | 3 | Foundation Builder |

The selection algorithm picks 7. Coverage rules ensure at least one Quick Win, one Foundation Builder, and one Big Bet are represented. For manufacturing clients with immature data infrastructure, Big Bets (H-MF-01, H-MF-02, H-MF-11) often require data foundation work first and move to later phases.

---

## 4. Archetype Defaults (for BOUNDED schema fields)

| Field | Manufacturing Default | Acceptable Range |
|---|---|---|
| Section A word count | 300 words | 250–350 (hard ceiling — no ±20% expansion) |
| Section B row count | 42 rows | 35–50 |
| Section E org bullets | 5 (FIXED) | 5 |
| Section E process bullets | 5 (FIXED) | 5 |
| Open Questions count | 4 | 3–6 |
| Reviewer Checklist items per category | 1–2 | 1–3 |
| Tags per pain point evidence section | 4 | 3–5 |
| Tags per hypothesis | 4 | 3–5 |
| Total tag count (Section A+B+C+D+E) | 130 | 100–200 |

**Manufacturing-specific Section B notes:** Manufacturing dossiers should prioritise OEE, downtime data, and FPY in Section B. If the client does not track OEE formally, note the absence as a data gap and use available proxies (uptime logs, maintenance records). Section B rows for manufacturing tend to have more `[Inferred]` tags than recruitment dossiers because operational metrics are rarely compiled into a single management summary document.

---

## 5. Industry Terminology

When citing or naming concepts in dossier prose, prefer these manufacturing-specific terms:

| Generic Term | Manufacturing Term |
|---|---|
| Customer | Customer / OEM / end-user (use whichever the client uses) |
| Order | Production order / work order / job |
| Lead time | Manufacturing lead time / cycle time (clarify which) |
| Inventory | Raw materials / WIP / finished goods (specify the tier) |
| Sales | Orders received / order intake |
| Account manager | Key account manager / sales engineer |
| Production | Manufacturing / fabrication / assembly |
| Pre-screening | Incoming goods inspection / inbound quality control |
| Quality check | First Article Inspection (FAI) / in-process inspection / final inspection |
| Defect | Non-conformance / reject / scrap (use whichever the client uses in their QMS) |
| Maintenance | Planned maintenance / predictive maintenance / corrective maintenance |
| Shift | Production shift / run (some manufacturers say "run" for batch production) |

---

## 6. Worked Example Reference

Golden Output is to be built. The first candidate engagement is the Baros Vision manufacturing client (context available from the Baros Vision data referenced in the framework backlog). Until the Golden Output is produced and validated:

- Use this archetype file alongside `_template_skeleton.md` for structural guidance
- Use the Recruitment Golden Output (`golden/recruitment_meridian_v1.md`) as a structural reference for section layout, citation density, and JUSTIFICATION block format — substitute manufacturing-specific content
- Do not run the manufacturing archetype in production without the Golden Output as a regression anchor

To build the Golden Output (follow `CONTRIBUTING.md` procedure):
1. Select a representative manufacturing client (real or synthetic)
2. Produce a dossier using this archetype
3. Run `bash harness/gate.sh <dossier_path>` — must PASS
4. Commit the passing dossier to `golden/manufacturing_<client>_v1.md`
5. Update this file's status to ACTIVE and Golden Output pointer above
6. Update `INDEX.md` routing from `_template_skeleton.md` to `manufacturing.md` with status ACTIVE
7. Bump framework version (MINOR — new archetype), update `CHANGELOG.md`

---

## Validation Checklist (before marking ACTIVE)

- [x] KPI Taxonomy — 6 categories populated, 40+ metrics
- [x] Pain Point Library — 15 candidates with severity and impact area
- [x] Hypothesis Library — 13 candidates with scoring anchors and classification
- [x] Archetype Defaults — based on manufacturing norms (to be verified against first live engagement)
- [x] Industry Terminology — 11 generic-to-manufacturing mappings
- [ ] Golden Output produced using a real or representative manufacturing client
- [ ] Golden Output validates clean against schema (harness PASS)
- [ ] INDEX.md updated with ACTIVE status and corrected routing
- [ ] CHANGELOG.md updated with version bump
