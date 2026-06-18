# Recruitment & Talent Solutions — Archetype

**Schema:** `intake_v1.0`
**Status:** ACTIVE
**Golden Output:** `golden/recruitment_meridian_v1.md`
**Covers:** Permanent placement, executive search, RPO, contract staffing, HR consulting

---

## 1. KPI Taxonomy

The metrics Section B must surface for a recruitment firm. Sourced from the eight Blueprint PDFs.

### Financial baseline
- Total revenue and YoY growth (financial summary p.1)
- Revenue split by service line: perm placement, exec search, contract, RPO (financial summary p.1)
- Gross margin, EBITDA, net margin (financial summary p.2)
- Revenue per delivery FTE (financial summary p.3)
- Days Sales Outstanding (financial summary p.3)
- Mandate win rate vs target (financial summary p.3)

### Operational KPIs
- Average time-to-fill (TTF) by role tier (sales pipeline p.3)
- TTF gap vs strategic target (strategic plan p.2)
- Sourcing phase duration as % of TTF (sales pipeline p.3)
- Submission-to-offer phase duration (sales pipeline p.3)
- Offer acceptance rate (sales pipeline p.1)
- Mandates opened vs closed by quarter (sales pipeline p.1)

### Volume metrics
- Active mandates per month (form: pain points)
- Permanent placements per year (financial summary p.3)
- Executive mandates per year (financial summary p.3)
- Average shortlist size (SOP p.3 or form)
- Sourcing time per mandate (SOP p.2)
- CV formatting time per candidate (SOP p.3)

### Client metrics
- Active client count (marketing/customer data p.2)
- Client repeat business rate (marketing/customer data p.2)
- Top 5 client revenue concentration (marketing/customer data p.2)
- Client satisfaction overall + per-dimension (marketing/customer data p.1)
- Client churn count + reasons (marketing/customer data p.2)

### Team metrics
- Total FTEs and split: delivery / operations / BD (org chart p.1)
- Delivery tier breakdown: Partners / Senior Consultants / Consultants / Researchers (org chart p.2)
- Researcher turnover rate (org chart p.2)
- Office distribution (org chart p.1)

### Technology & data
- ATS / CRM system + annual cost (tech inventory p.1)
- LinkedIn Recruiter seat count + annual cost (tech inventory p.1)
- Candidate database size and stale-record % (tech inventory p.2; form: pain points)
- Other named tools with costs (tech inventory p.1)
- AI tools in use, governed vs ungoverned (tech inventory p.2; previous AI initiatives p.4)

## 2. Pain Point Library

Common pain points for recruitment firms. Use as candidates during selection; promote those backed by document evidence per `pain_point_selection.md`.

| ID | Pain Point | Default Severity | Default Impact Area |
|---|---|---|---|
| PP-RT-01 | Manual candidate sourcing bottleneck | High | Revenue/Time |
| PP-RT-02 | Unusable historical candidate database | High | Cost/Time |
| PP-RT-03 | CV formatting consuming consultant time | High | Cost/Time |
| PP-RT-04 | Client communication inconsistency | High | Customer/Revenue |
| PP-RT-05 | Interview & offer coordination friction | Medium | Time/Customer |
| PP-RT-06 | No real-time pipeline visibility for leadership | Medium-High | Risk/Time |
| PP-RT-07 | Ungoverned AI use creating data protection compliance risk | High | Compliance/Risk |
| PP-RT-08 | RPO product not formally structured | High | Strategic/Revenue |
| PP-RT-09 | Executive search practice operating semi-independently | Medium | Strategic/Team |
| PP-RT-10 | High researcher turnover (>25%) | Medium | Team/Cost |
| PP-RT-11 | Cold outreach conversion below industry average | Medium | Revenue |
| PP-RT-12 | Manual BD proposal creation | Medium | Time/Revenue |
| PP-RT-13 | Fragmented client account management | Medium | Customer |
| PP-RT-14 | No standard SOP adoption by senior staff | Medium | Quality/Strategic |
| PP-RT-15 | Cross-border placement complexity | Low-Medium | Compliance/Time |

The 5 form-stated pain points always make the list. The selection algorithm picks 3 more from this library + any document-surfaced emergent candidates.

## 3. Hypothesis Library

Common AI opportunities for recruitment firms. Each has a typical Impact × Feasibility × Alignment range; actual scores come from `hypothesis_selection.md`.

### Readiness Adjustment Eligibility Flags (D6 — ACTIVE, ratified 2026-06-18)

The five flags below determine whether the Stage 3 Readiness Adjustment Rule fires for each
hypothesis. When a flag is `yes` AND the corresponding maturity dimension is "Early", the
Opportunity Harvester MUST reduce Feasibility by 1 for that opportunity — it is a deterministic
lookup, not a per-run judgment. This makes the −1 rule stable across runs.

| Flag | Maturity dimension | Fires when |
|------|--------------------|-----------|
| `ml_heavy` | Data | The opportunity requires ML inference, model training, or multi-dataset joins |
| `multi_source` | Data | The opportunity requires data from 2+ distinct systems or pipelines |
| `regulated` | Governance | The opportunity makes automated decisions in a regulated or high-risk context |
| `large_integration` | Technology | The opportunity requires a substantial API or systems integration |
| `adoption_dependent` | People | The opportunity requires widespread user adoption or change-management investment |

**Status: ACTIVE — ratified by Practice team (Viktor Serafimov) on 2026-06-18.**

**Design note — H-RT-02 `regulated = no`:** CV formatting is rule-based reformatting, not an
automated decision in a regulated context. Keep this flag `no`. Setting it `yes` would drop
Feasibility from 4 to 3, and the D6b pinned classifier would then force `class=BigBet` for
an opportunity the practice team has confirmed is a Quick Win. The two fixes (D6 flags + D6b
classifier) constrain each other at this exact point.

| ID | Hypothesis | Typical Impact | Typical Feasibility | Typical Alignment | Default Class | `ml_heavy` | `multi_source` | `regulated` | `large_integration` | `adoption_dependent` |
|---|---|---|---|---|---|---|---|---|---|---|
| H-RT-01 | AI-Assisted Specialist Sourcing (Loxo/Gem/Fetcher/native ATS) | 5 | 3 | 5 | Foundation Builder | yes | yes | no | yes | yes |
| H-RT-02 | AI-Powered CV Formatting + Summary Generation | 5 | 4 | 5 | Quick Win | no | no | no | no | no |
| H-RT-03 | ATS-Driven Automated Client Status Updates | 4 | 4 | 5 | Quick Win (post-cutover) | no | no | no | no | no |
| H-RT-04 | Candidate Database Revival + AI Matching | 4 | 3 | 4 | Foundation Builder | yes | yes | no | no | yes |
| H-RT-05 | Interview Scheduling Standardisation (Calendly/equivalent) | 3 | 5 | 4 | Quick Win | no | no | no | no | no |
| H-RT-06 | Pipeline Visibility Dashboard (Power BI + ATS API) | 4 | 3 | 3 | Foundation Builder | no | yes | no | yes | no |
| H-RT-07 | Data Protection Compliance Foundation (Sprint 0 enabler) | 3 | 4 | 5 | Foundation Builder | no | no | yes | no | yes |
| H-RT-08 | RPO Product Infrastructure (AI-enabled delivery layer) | 5 | 2 | 5 | Big Bet | yes | yes | no | yes | yes |
| H-RT-09 | Executive Search Workflow Intelligence | 4 | 2 | 4 | Big Bet | yes | yes | no | no | yes |
| H-RT-10 | BD Proposal Automation (template + AI personalisation) | 3 | 3 | 2 | Foundation Builder | no | no | no | no | no |
| H-RT-11 | Automated Candidate Pre-Screening (chatbot or async) | 3 | 3 | 3 | Foundation Builder | no | no | no | no | yes |
| H-RT-12 | AI-Powered Job Description Generation | 2 | 4 | 2 | Quick Win | no | no | no | no | no |
| H-RT-13 | Predictive Time-to-Fill Modelling | 3 | 2 | 3 | Big Bet | yes | yes | no | no | no |

The selection algorithm picks 7. Coverage rules ensure all 4 strategic priorities have at least one selected hypothesis.

## 4. Archetype Defaults (for BOUNDED schema fields)

| Field | Recruitment Default | Acceptable Range |
|---|---|---|
| Section A word count | 300 words | 250–350 (hard ceiling — no ±20% expansion) |
| Section B row count | 40 rows | 35–50 |
| Section E org bullets | 5 (FIXED) | 5 |
| Section E process bullets | 5 (FIXED) | 5 |
| Open Questions count | 4 | 3–6 |
| Reviewer Checklist items per category | 1–2 | 1–3 |
| Tags per pain point evidence section | 4 | 3–5 |
| Tags per hypothesis | 4 | 3–5 |
| Total tag count (Section A+B+C+D+E) | 130 | 100–200 |

## 5. Industry Terminology

When citing or naming concepts in dossier prose, prefer these recruitment-industry terms:

| Generic Term | Recruitment Term |
|---|---|
| Customer | Client |
| Order | Mandate |
| Lead time | Time-to-fill (TTF) |
| Stock | Candidate database / pipeline |
| Sales | BD (Business Development) |
| Account manager | Consultant |
| Production | Delivery |
| Pre-screening | Sourcing / longlisting |

## 6. Worked Example Reference

The Golden Output dossier `golden/recruitment_meridian_v1.md` demonstrates every rule in this archetype applied to the Meridian Talent Partners OOD test case. Read it alongside this archetype for the full picture.

When producing a dossier for a new recruitment client, use that Golden Output as a structural reference — copy the section layout, citation density, and language conventions — while substituting the client's specific data.
