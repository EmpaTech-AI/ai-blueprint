// Representative Stage-5 assembled-markdown sample for the admin Document Lab.
//
// This is NOT a pipeline output — it is a fixed fixture that deliberately exercises every
// rendering path the assemblers handle, so the preview reflects how real output is styled
// without running the pipeline:
//   • bold-only "finding" lines (the literal-`**` regression case)
//   • a scorecard table whose first column cells are wrapped in **bold** (the exact PDF bug)
//   • inline **bold** / *italic* inside body paragraphs and table cells
//   • `##` / `###` sub-headings, bullets, numbered items, horizontal rules
//   • a fenced ``` ASCII portfolio diagram (the box-glyph / tofu case)
//   • a markdown portfolio table
//
// Keep it in sync with the section contract in Blueprint_Design_and_Assembly_Spec_v1.md.

export const SAMPLE_CLIENT_NAME = 'Meridian Talent Partners OOD (SAMPLE)';

export const SAMPLE_ASSEMBLED_CONTENT = `# Executive Summary

Meridian Talent Partners OOD is a Sofia-headquartered B2B recruitment and talent solutions firm operating across Bulgaria, Romania, and Poland. The firm generated **EUR 4,823,400** in revenue in FY2025, employs 68 people, and is targeting **EUR 6,000,000** in FY2026 — a 25% growth ambition.

The short answer is that the current model cannot get there without intervention. The path to EUR 6M runs through a set of *specific, sequenced operational changes*, and AI is the enabling mechanism for most of them.

## Three Findings That Matter Most

**Finding 1: The sourcing bottleneck is the primary constraint on every growth target.**

Candidate sourcing consumes 22 of Meridian's 38 average days-to-fill — 58% of total time-to-fill. At 35–40 active mandates per month, this is the structural ceiling on placement volume.

**Finding 2: Three quick wins are available immediately, with no data infrastructure required.**

Consultants spend 95–125 minutes per candidate on CV reformatting — a task six to eight of them already partially automate with personal ChatGPT accounts.

**Finding 3: Data and governance gaps are the critical blockers — and the Vincere migration is the window to fix them.**

The candidate database holds 47,000 records; approximately 35% are stale or invalid.

# AI Readiness Snapshot

The scorecard reflects Meridian's current AI readiness across six dimensions, assessed against uploaded documentation.

| Dimension | Level | Key Evidence |
|---|---|---|
| **Strategy** | Developing | Four board-approved AI-connected priorities; no committed AI budget line. |
| **Data** | **Early** | ~35% of 47,000 candidate records stale; 2023 cleaning project failed; no active integrations. |
| **Technology** | Developing | Named stack (Vincere, M365, LinkedIn Recruiter); Vincere migration 40% complete. |
| **People** | Developing | Named internal AI champion; organic ChatGPT adoption by 6–8 consultants. |
| **Processes** | Developing | Seven-stage SOP v2.1; adherence inconsistent. |
| **Governance** | **Early** | Candidate data flowing into personal ChatGPT accounts with no policy or GDPR assessment. |

### Overall Readiness Pattern

Four of six dimensions sit at Developing; the two Early dimensions — Data and Governance — are structural blockers, not peripheral gaps.

# AI Opportunity Map

Seven opportunities have been identified, scored, and classified. Scores are on a 1–5 scale; the overall opportunity score is Impact × Feasibility.

### Opportunity 1: AI-Powered CV Formatting and Candidate Summary Generation

A company-licensed AI writing tool with a standardised prompt library reduces CV formatting from 95–125 minutes to under 30 minutes per candidate.

| Estimated Impact | Readiness to Implement | Strategic Alignment |
|---|---|---|
| 5 / 5 | 4 / 5 | 5 / 5 |

**Classification:** Quick Win — start immediately
**Opportunity score:** 20

### Opportunity 5: AI-Assisted Specialist Candidate Sourcing

The highest-impact single intervention available. Feasibility is **1 out of 5** — reduced from 3 by two independent Early Data maturity constraints.

| Estimated Impact | Readiness to Implement | Strategic Alignment |
|---|---|---|
| 5 / 5 | 1 / 5 | 5 / 5 |

**Classification:** Big Bet — target start Months 6–9, gated on Opportunities 4 and 7
**Opportunity score:** 5

## Portfolio View

| Opportunity | Impact | Feasibility | Score | Start |
|---|---|---|---|---|
| CV Formatting Automation | 5 / 5 | 4 / 5 | 20 | Immediate |
| Interview Scheduling Standardisation | 3 / 5 | 5 / 5 | 15 | Immediate |
| ATS-Driven Client Status Updates | 4 / 5 | 4 / 5 | 16 | August 2026 |

## How the Portfolio Connects

\`\`\`
NOW              NEXT                 LATER

[CV Formatting]
[Scheduling]
[GDPR Foundation] ──► [Database Revival] ──► [AI Sourcing]
                                             [RPO Infrastructure]
[Vincere Migration] ──► [ATS Client Updates]
\`\`\`

The GDPR Foundation and Vincere migration are the two parallel critical-path items.

# Recommended Action Sequence

The sequence below is determined by two structural realities that override all other considerations.

## Now — Months 1 to 3: Prove Value and Build the Foundation

1. Deploy a company-licensed AI writing tool for CV formatting across the Technology and Engineering team.
2. Mandate Calendly for all interview scheduling and measure the change in coordination time.
3. Engage a GDPR specialist for a scoping engagement — the single highest-priority pre-programme action.

- CV Formatting Automation delivers a visible win within 30 days.
- Calendly standardisation runs in parallel from day one.
- The GDPR Compliance Foundation begins in month one, **not after** the Quick Wins.

*End of AI Value Blueprint (SAMPLE). This is a rendering fixture, not a client deliverable.*`;
