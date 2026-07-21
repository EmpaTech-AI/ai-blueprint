# MERIDIAN TALENT PARTNERS OOD — Golden Output Example (Operational Benchmark Edition)

**AI Assist BG · Blueprint Practice · CONFIDENTIAL** · 2026-07-20 · Engagement reference BP-TEST-001 / BP-2026-MTP-001 lineage
**Status: OPERATIONAL BENCHMARK — this is the Golden Output Example, manually and personally vetted and confirmed by the senior AI Consultants** (content per AI_Brain_Foundation_Pattern v1.1 §10, the corrected authoritative version, which supersedes the draft docx). This file is the single benchmark of record for quality, consistency, and reasoning — for Meridian and, as the Band 1 worked pattern, for future clients. It carries the complete vetted analytical content **plus** the machine-readable spine the QA gates diff against (canonical IDs, score markers, band verdict), and a first verification run (§4) demonstrating the benchmark in operation.
**Companions:** `2026-07-20_Report_Blueprint_ARIA_Skills_360_Analysis.md` (360° analysis) · `Meridian_Golden_Benchmark_v1_1_PINNED.md` (encoding register §A + derivation proof §B + per-stage pinned artifacts).

---

## 1. Pain Point Register (Prioritized) — the vetted content, with spine

Eight pain points: five form-stated (PP-1 to PP-5, always included per the selection algorithm) plus three emergent from documents (PP-0, PP-6, PP-7), selected on Severity ×3 + Evidence Strength ×2 + Strategic Relevance ×1. Runners-up not promoted: BD proposal effort (4–8 hrs, no template), Operations Director capacity overload (tracked as delivery risk), executive search fee-sharing friction (organisational, not process). Tombstone: former PP-6 (zero system integration) merged into PP-0; former PP-7/PP-8 renumbered to PP-6/PP-7 — all cross-references re-audited.

### PP-0 — Fragmented data infrastructure: no integrated single source of truth
<!-- pp-id: PP-CORE-00 -->
**Severity:** CRITICAL (systemic) · **Scope:** all verticals & departments · **Precedence:** P0 (foundational) · **Absorbs:** former PP-6 (zero system integration)
**Evidence:** Zero active integrations between any systems; all data exchange manual (CSV export, copy-paste); all reporting compiled by hand into Excel — no data warehouse, no BI layer, no single source of truth for operational performance [Document-Backed — tech inventory p.2]. Vincere and Xero expose documented APIs; none used — raw materials exist, the integration layer does not [Document-Backed — tech inventory p.2].
**Severity logic:** breadth × dependency — degrades every function at once; structural cause behind PP-3 and the MD-visibility gap in PP-5; gates internal-data value of PP-1/PP-2. Non-negotiable across engagement scenarios; only remediation scope and sequencing flex with maturity [Inferred].

### PP-1 — Manual candidate sourcing bottleneck
<!-- pp-id: PP-RT-01 -->
**Severity:** CRITICAL (acute)
**Evidence:** 6–8 researcher-hours per mandate across ~35–40 active mandates/month; sourcing consumes 22 of 38 TTF days (58%); LinkedIn AI unreliable for specialist roles; no tool learns from 9 years of placement history [Document-Backed + Form-Stated — intake form S3; sales pipeline p.1–2; SOP p.1–2].
**Impact & audit relevance:** Directly blocks Priority 2 (38→28 days) and revenue-per-FTE. Highest-leverage single process.

### PP-2 — Dead candidate database (47,000 records)
<!-- pp-id: PP-RT-02 -->
**Severity:** HIGH
**Evidence:** 30–40% outdated/missing-skills/duplicated; consultants start fresh on LinkedIn per mandate; 2023 cleaning reverted for lack of governance; Vincere migration proceeding without cleansing stage [Document-Backed + Form-Stated — intake form S3/S6; tech inventory p.2; previous AI initiatives p.2].
**Impact & audit relevance:** Paid-for asset producing zero sourcing value; prerequisite for internal-data matching; migration window is a one-time governance opportunity [Inferred].

### PP-3 — Inconsistent client reporting & transparency
<!-- pp-id: PP-RT-04 -->
**Severity:** HIGH
**Evidence:** Comms 3.1/5 (lowest, unchanged 2+ yrs); ~40% weekly-update adherence; 6 of 12 clients say consultants "go quiet"; 4 of 12 want a dashboard; 2024 template attempt failed in 6 weeks [Document-Backed + Form-Stated — intake form S3; marketing/customer data p.1; SOP p.3; previous AI initiatives p.2].
**Impact & audit relevance:** Gates the 4.2/5 CSAT target; defends against dual-sourcing churn. Client's own conclusion: automated ATS-driven updates — which require a populated ATS first (links to PP-0).

### PP-4 — Manual CV formatting & candidate summaries
<!-- pp-id: PP-RT-03 -->
**Severity:** HIGH
**Evidence:** 1.5–2 consultant-hours per submission; 8–10 hrs per 5-candidate shortlist; done by consultants, not support staff; VA outsourcing failed on quality and overhead [Document-Backed + Form-Stated — intake form S3; SOP p.2–3; previous AI initiatives p.3].
**Impact & audit relevance:** Most cleanly quantified admin burden; explicit ≤30-min target already set. Fastest credible quick win.

### PP-5 — Fragmented interview & offer management
<!-- pp-id: PP-RT-05 -->
**Severity:** MEDIUM
**Evidence:** 4-person panel scheduling takes 3–5 email exchanges over 2–3 days; delays add 3–5 TTF days; offers tracked in personal spreadsheets; MD lacks real-time pipeline visibility [Document-Backed + Form-Stated — intake form S3; sales pipeline p.1; SOP p.3].
**Impact & audit relevance:** Partly configuration/standardisation, not AI — separate honestly in the audit.

### PP-6 — Ungoverned AI use amid immature GDPR posture (emergent)
<!-- pp-id: PP-RT-07 -->
**Severity:** HIGH
**Evidence:** Candidate PII in personal ChatGPT accounts, no policy/assessment; no documented retention; 3 DSARs handled manually/inconsistently; pre-2021 consent incomplete [Document-Backed + Form-Stated — previous AI initiatives p.3–4; intake form S6; tech inventory p.2].
**Impact & audit relevance:** Live compliance exposure predating any recommendation — governance is remediation, not later-phase overhead. Natural fit for the stated initial budget.

### PP-7 — Researcher turnover and knowledge retention (emergent)
<!-- pp-id: PP-RT-10 -->
**Severity:** MEDIUM
**Evidence:** ~35% annual turnover in the 22-person researcher tier (avg tenure 1.3 yrs); knowledge lives in personal inboxes/notes [Document-Backed — org chart p.2; tech inventory p.2].
**Impact & audit relevance:** Raises the value of codifying sourcing knowledge; interacts with H2 2026 hiring (+6–8 researchers if RPO launches).

---

## 2. Opportunity Hypotheses (eight) — the vetted content, with spine

Presentation note (per encoding item A-14): the client-facing rendering of this table carries no scores or ranking — those are produced in the joint working session; the score markers below are the internal reproducibility spine, invisible in rendered output. Layer B annotations (ARIA tier ceiling, adapter status) render in the Build Sheet, not in diagnostic stages (A-15).

### H-0 — AI Company Brain: unified data foundation + AI knowledge layer (Layer 2)
<!-- score: id=H-CORE-00 impact=5 feasibility=2 alignment=5 product=50 class=BigBet ml_heavy=yes multi_source=yes regulated=no large_integration=yes adoption_dependent=yes d_gate4=no compliance_deadline=none system_event_deadline=none phase_dependency=strict -->
**Addresses:** PP-0 (root); unblocks PP-3, PP-5 · **Strategic link:** Cross-cutting — underpins all three FY2026 priorities; direct prerequisite for the Priority-3 AI mandate.
**Key design constraints & timing (vetted):** Raw materials exist (Vincere + Xero APIs, 9 yrs history) but the integration layer does not [tech inventory p.2]. Largest scope, lowest current feasibility. Prerequisites: H-4 (governance foundation) + H-6 (governed data). Phase: decision-intelligence over clean Xero+pipeline data first; candidate/knowledge layer as data proves reliable. Hub build post-July-cutover; design + governance pre-cutover. *Build Sheet annotations (Layer B): Band 1 → Standard tier ceiling; Vincere = non-standard adapter (Custom/roadmap dependency); investment case cited from Blueprint ROI evidence, never the intake budget signal.*

### H1 — AI-Powered CV Formatting + Candidate Summary Generation (draft-only, human-reviewed)
<!-- score: id=H-RT-02 impact=5 feasibility=4 alignment=5 product=100 class=QuickWin ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no d_gate4=no compliance_deadline=none system_event_deadline=none phase_dependency=n/a -->
**Addresses:** PP-4 · **Strategic link:** Priority 3: ≤30 min per candidate. Quality bar set by consultants who rejected the VA; HITL non-negotiable; largely ATS-independent — pre-cutover start.

### H2 — Automated Client Status Reporting from the ATS
<!-- score: id=H-RT-03 impact=4 feasibility=4 alignment=5 product=80 class=QuickWin ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no d_gate4=yes compliance_deadline=none system_event_deadline=none phase_dependency=n/a -->
**Addresses:** PP-3, PP-0 · **Strategic link:** CSAT 3.83→4.20. Client's own conclusion: automation, not templates; a consumer of H-0 — requires populated Vincere + integration layer, post-cutover; tool-enforced, zero new consultant steps.

### H3 — Interview Scheduling Standardisation + Shared Pipeline Visibility
<!-- score: id=H-RT-05 impact=3 feasibility=5 alignment=4 product=60 class=QuickWin ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no d_gate4=no compliance_deadline=none system_event_deadline=none phase_dependency=n/a -->
**Addresses:** PP-5 · **Strategic link:** MD visibility; TTF −3–5 days. Substantially configuration, not AI — separate honestly to protect credibility.

### H4 — AI Use Policy, Company AI Account, Shared Prompt Library (governance foundation)
<!-- score: id=H-RT-07 impact=3 feasibility=4 alignment=5 product=60 class=FoundationBuilder ml_heavy=no multi_source=no regulated=yes large_integration=no adoption_dependent=yes d_gate4=no compliance_deadline=none system_event_deadline=2026-07-31 phase_dependency=n/a -->
**Addresses:** PP-6 · **Strategic link:** Risk remediation + EU AI Act readiness. Immediate; low cost; converts live GDPR exposure into managed capability; prerequisite for scaling every hypothesis including H-0.

### H5 — AI-Assisted Sourcing & Candidate Matching (9 yrs placement history)
<!-- score: id=H-RT-01 impact=5 feasibility=3 alignment=5 product=75 class=FoundationBuilder ml_heavy=yes multi_source=yes regulated=no large_integration=yes adoption_dependent=yes d_gate4=no compliance_deadline=none system_event_deadline=none phase_dependency=strict -->
**Addresses:** PP-1, PP-2 · **Strategic link:** Priority 2: TTF 38→28 days. Generic tools failed on specialist CEE roles twice — CEE-sample pilot mandatory; internal-data variant depends on H-6, consumes H-0; post-cutover for ATS integration.

### H6 — Candidate Database Revival: dedupe, enrich, govern at the migration boundary
<!-- score: id=H-RT-04 impact=4 feasibility=3 alignment=4 product=48 class=FoundationBuilder ml_heavy=yes multi_source=yes regulated=no large_integration=no adoption_dependent=yes d_gate4=no compliance_deadline=none system_event_deadline=2026-07-31 phase_dependency=strict -->
**Addresses:** PP-2, PP-0 · **Strategic link:** Enabler for H-0/H2/H5. One-time window: governance before July cutover (2023 lesson); includes GDPR consent audit. *Build Sheet annotation: maps to H-0's Brain Genesis phase — the pipeline scores it as this separate sibling entity; nesting is Build-Sheet-only.*

### H7 — BD Proposal Automation + RPO Productisation Support
<!-- score: id=H-RT-10 impact=3 feasibility=3 alignment=5 product=45 class=FoundationBuilder ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no d_gate4=no compliance_deadline=none system_event_deadline=none phase_dependency=n/a -->
**Addresses:** Strategic Priority 2 (RPO launch; win rate 34→40%); BD effort (runner-up register, per A-12) · Template + drafting assistance; RPO tier/SLA/pricing documentation; low data dependency — pre-cutover start.

---

## 3. Band Verdict & Roadmap Shape (vetted)

**Meridian = Band 1 (LOW):** Layer 1 fragmented (zero integrations) + org friction (Partner resistance, adoption reversion pattern) → PP-0 CRITICAL (systemic) → H-0 phased, governance-first → roadmap: governance + zero-data quick wins (H4, H1, H7) → Brain Genesis (H6) pre-cutover → brain consumers (H2, H5) post-cutover → H-0 hub build post-cutover.
**Maturity spine:** Data Early · Governance Early · Strategy/Technology/People/Processes Developing → `[BAND_ASSIGNMENT]: Band 1`.
**Phase map (pinned):** Now {H-RT-02, H-RT-05, H-RT-07} · Next {H-RT-03, H-RT-10} · Later {H-RT-01, H-RT-04, H-CORE-00 — each one undivided row; any sub-row split is an acceptance FAIL (T-30)}.

---

## 4. First Verification Run — the benchmark operating as a quality gate

Executed this session: the benchmark's spine was diffed against the current production pipeline's golden dossier (`backend/src/skills/blueprint-intake/golden/recruitment_meridian_v1.md`), exactly as the QA gate prescribes. Result — **divergence correctly detected and localized**, demonstrating the gate does its job:

| Spine field | Benchmark (this file) | Current pipeline golden | Gate verdict |
|---|---|---|---|
| Pain-point ID set | PP-CORE-00, RT-01, 02, 04, 03, 05, 07, **RT-10** | RT-01, 02, 03, 04, 07, **RT-08 (RPO)**, **RT-06 (visibility)**, 05 | 🔴 divergent — RT-08/RT-06 vs CORE-00/RT-10 |
| Hypothesis ID set | H-CORE-00 + RT-{01,02,03,04,05,07,**10**} | RT-{01,02,03,04,05,07,**08**} | 🔴 divergent — 08 vs 10 + H-0 |
| Severity scale | incl. CRITICAL (systemic/acute) | High/Medium-High/Medium/Low only | 🔴 divergent |
| Machine spine present | full (pp-ids, 14-field markers, INTAKE_FACTS refs) | absent in both anchor files | 🔴 divergent |
| Maturity/band | Data/Gov Early, 4× Developing, Band 1 | Data/Gov Early, 4× Developing (no band block) | 🟢 spine agrees; band block new |
| Phase map | Now{02,05,07} Next{03,10} Later{01,04,00} | Now{02,05,07} Next{03} Later{01,04,08} | 🟠 partial — deltas trace exactly to the ID-set changes |

**Reading:** every red is a known, intended delta of the enhancement (the divergences are precisely items A-1…A-15 of the encoding register — nothing unexplained), which is what a functioning benchmark shows: the pipeline's current rules produce the *old* golden; this benchmark defines the *vetted target*; the gap list equals the v1.1 work list. From this point, any pipeline run is measurable against this file mechanically (ID sets, marker fields, band, phase map), which is the guarantee of consistent pain-point identification across reruns: two runs that both match this spine are identical where it matters, by construction.

---

*End of Golden Output Example (Operational Benchmark Edition). Analytical content: vetted and confirmed by the senior AI Consultants (Foundation Pattern §10 corrected version — count line fixed, "systemic" wording, PP-0 scope/precedence, PP-3 cross-reference to PP-0, tombstone for the former PP-6). Spine encoding: per the standing §A register. QA gates armed: n=4 acceptance diff at the v1.1 version event; n=2 delivery double-run diff on every engagement.*

---

**ATTESTATION — Benchmark of Record.** On 2026-07-20, the Practice (Viktor Serafimov, session operator) confirmed on behalf of the senior AI Consultants that this operationalized file faithfully carries their vetted Golden Case and is **CONFIRMED as the benchmark of record** for the AI Value Blueprint pipeline — for the Meridian engagement and as the Band 1 worked pattern for future clients. Confirmation captured in-session (recorded selection: "Confirmed — benchmark of record"). Any future amendment goes through the §A override block at a version event; the ratchet applies — nothing in this file is renumbered or silently rewritten.
