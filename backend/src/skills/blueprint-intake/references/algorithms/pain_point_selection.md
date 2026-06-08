# Pain Point Selection Algorithm

**Schema:** `intake_v1.0`
**Section:** C — Detected Pain Points
**Policy:** FIXED at 8 pain points
**Purpose:** Convert the candidate pain point pool into a deterministic ranked list of exactly 8.

---

## Input

1. **Stated pain points** — the 5 explicitly listed in intake form Section 3 (always included; never dropped)
2. **Emergent pain points** — candidate pain points surfaced by document analysis that were not stated in the intake form

## Output

An ordered list of exactly 8 pain points: the 5 stated + 3 emergent, ranked by severity then impact area.

## Stage 1 — Always Include Stated Pain Points

The 5 stated pain points from intake Section 3 are always included. Their statements may be sharpened using document evidence, but their inclusion is non-negotiable. This is the floor.

## Stage 2 — Score Emergent Candidates

For each emergent candidate, compute a Selection Score:

```
Selection Score = (Severity × 3) + (Evidence Strength × 2) + (Strategic Relevance × 1)
```

Each component scored 1–5:

### Severity (1–5)

| Score | Definition |
|---|---|
| 5 | Blocks a board-approved priority (PDF 7) OR creates regulatory exposure |
| 4 | Materially affects revenue, cost, or customer outcomes |
| 3 | Affects internal efficiency or team capacity |
| 2 | Minor operational friction |
| 1 | Latent risk only |

### Evidence Strength (1–5)

| Score | Definition |
|---|---|
| 5 | Quantified in ≥2 documents AND form |
| 4 | Quantified in ≥2 documents |
| 3 | Quantified in 1 document + form |
| 2 | Quantified in 1 document only |
| 1 | Form-stated only with no document corroboration |

### Strategic Relevance (1–5)

| Score | Definition |
|---|---|
| 5 | Direct lever for a PDF 7 strategic priority |
| 4 | Indirect lever for a PDF 7 strategic priority |
| 3 | Enables a downstream AI opportunity |
| 2 | Affects an operational KPI tracked in PDF 1 or PDF 3 |
| 1 | None of the above |

## Stage 3 — Rank and Select Top 3 Emergent

Sort emergent candidates by Selection Score DESC. Take the top 3.

### Tie-Breaking (in order)

1. Higher Severity component wins
2. Higher Evidence Strength component wins
3. Higher Strategic Relevance component wins
4. Earlier impact area in canonical order wins (see `ordering.md`)
5. Alphabetical by pain point title

## Stage 4 — Combined List Ordering

Once 8 pain points are selected (5 stated + 3 emergent), order them as one list per `ordering.md`:

1. Severity DESC
2. Impact area in canonical order (Revenue → Cost → Risk → Time → Customer → Compliance → Strategic → Team)
3. Evidence Strength DESC
4. Alphabetical by title

The result: the same input set always produces the same 8 pain points in the same order.

## Worked Example — Meridian Test Case

**Stated (5, always included):**

| # | Title | Severity | Evidence | Strategic | Score |
|---|---|---|---|---|---|
| Stated-1 | Manual Candidate Sourcing | 5 | 5 | 5 | (always-in) |
| Stated-2 | Unusable Candidate Database | 4 | 5 | 4 | (always-in) |
| Stated-3 | Client Communication Inconsistency | 4 | 5 | 5 | (always-in) |
| Stated-4 | CV Formatting Consumes Consultant Time | 4 | 5 | 5 | (always-in) |
| Stated-5 | Interview & Offer Coordination | 3 | 4 | 3 | (always-in) |

**Emergent candidates surfaced from document analysis (8 candidates):**

| # | Title | Sev | Evid | Strat | Score |
|---|---|---|---|---|---|
| E-1 | RPO Product Does Not Exist | 4 | 4 | 5 | 25 |
| E-2 | Ungoverned AI Use / Live Data Protection Compliance Risk | 5 | 5 | 5 | 30 |
| E-3 | No Real-Time Pipeline Visibility | 4 | 5 | 3 | 25 |
| E-4 | Executive Search Practice Operates Semi-Independently | 3 | 3 | 4 | 19 |
| E-5 | 35% Researcher Turnover | 3 | 3 | 2 | 17 |
| E-6 | Cold Outreach Conversion Below Industry Average | 2 | 3 | 2 | 14 |
| E-7 | Slack/Teams Tool Duplication | 1 | 2 | 1 | 8 |
| E-8 | Warsaw Office Lacks Local Operations Support | 2 | 2 | 2 | 12 |

**Selection:**

- Rank 1: E-2 (Score 30) → Selected
- Rank 2: E-1 (Score 25) → Tie with E-3
  - Severity tie-break: E-1 (4) vs E-3 (4) → tied
  - Evidence tie-break: E-1 (4) vs E-3 (5) → **E-3 wins**
  - Wait — re-check: E-3 has Severity 4, Evidence 5, Strategic 3, Score = (4×3) + (5×2) + (3×1) = 12+10+3 = 25
  - E-1 has Severity 4, Evidence 4, Strategic 5, Score = (4×3) + (4×2) + (5×1) = 12+8+5 = 25
  - Tied. Severity tied. Evidence: E-3 (5) > E-1 (4). E-3 selected first.
- Rank 2: E-3 → Selected
- Rank 3: E-1 → Selected

**Result: 8 pain points = Stated 1-5 + E-2, E-3, E-1**

Reordered per canonical algorithm:

| Position | PP | Severity | Impact Area |
|---|---|---|---|
| 1 | Manual Candidate Sourcing Bottleneck | High | Revenue/Time/Cost |
| 2 | Unusable Candidate Database | High | Cost/Time/Strategic |
| 3 | CV Formatting Consuming Consultant Time | High | Cost/Time/Revenue |
| 4 | Client Communication Inconsistency | High | Customer/Revenue |
| 5 | Ungoverned AI use creating data protection compliance risk | High | Compliance/Risk |
| 6 | RPO Product Does Not Exist | High | Strategic/Revenue |
| 7 | No Real-Time Pipeline Visibility | Medium-High | Risk/Time |
| 8 | Interview & Offer Coordination Friction | Medium | Time/Customer |

This output is mechanically reproducible: any compliant run on the same input produces the same 8 pain points in the same order.
