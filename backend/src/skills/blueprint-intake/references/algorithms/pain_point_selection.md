# Pain Point Selection Algorithm

**Schema:** `intake_v1.1`
**Section:** C — Detected Pain Points
**Policy:** FIXED at 8 pain points
**Purpose:** Convert the candidate pain point pool into a deterministic ranked list of exactly 8.
**v1.1 change summary:** Stage 0 (pool eligibility), Stage 0b (PP-CORE-00 instantiation gate + absorption), emergent slot accounting, severity enum, new combined ordering. Ratified via the Meridian Golden Benchmark v1.1 (§A items A-1…A-5).

---

## Input

1. **Stated pain points** — the 5 explicitly listed in intake form Section 3 (always included; never dropped)
2. **Emergent pain points** — candidate pain points surfaced by document analysis that were not stated in the intake form
3. **Archetype Pain Point Library** — including the `eligibility` column and the CORE pattern (`archetypes/_core.md`)

## Output

An ordered list of exactly 8 pain points: 5 stated + PP-0 + 2 emergent (when the PP-0 gate fires), or 5 stated + 3 emergent (when it does not).

## Stage 0 — Pool Eligibility Filter (v1.1 — apply BEFORE any scoring)

Classify every emergent candidate using the archetype library's `eligibility` column (or, for document-surfaced candidates not in the library, by the same definitions):

- **`process`** — a broken, slow, expensive, or error-prone *operating process that exists today*. Eligible for the Section C pool.
- **`organisational`** — a structure, incentive, or adoption friction (semi-independent units, fee-sharing tension, SOP non-adoption, capacity overload). NOT eligible — record as a delivery risk (Section E/H) and feed the band Alignment grade.
- **`product-gap`** — a missing product, service line, or growth ambition (an offering that does not exist yet). NOT eligible — it is opportunity context for Section D, not a pain.

Ineligible candidates never enter the scoring pool. Record notable ones in the Section H runner-up register (they remain valid hypothesis anchors per the linkage rule in `intake_v1.1.md` §4.6).

## Stage 0b — PP-CORE-00 Instantiation Gate (v1.1)

Evaluate the deterministic gate in `archetypes/_core.md` §2 against the client's systems/integration evidence:

- **Gate fires (Critical (systemic) or High (structural))** → instantiate PP-0 at position 0 with the fixed template fields (Scope, Precedence P0, severity logic line). PP-0 occupies one emergent slot → **2** scored emergent slots remain.
- **Gate does not fire** → no PP-0; **3** scored emergent slots (v1.0 behaviour).

**Absorption:** any emergent candidate whose substance is no-integration / no-SSOT / no-consolidated-visibility is absorbed into PP-0 (removed from the pool, tombstone note in Section H, evidence relocation per `_core.md` §2). Absorption happens before Stage 2 scoring.

## Stage 1 — Always Include Stated Pain Points

The 5 stated pain points from intake Section 3 are always included. Their statements may be sharpened using document evidence, but their inclusion is non-negotiable. This is the floor.

## Stage 2 — Score Emergent Candidates

For each remaining eligible emergent candidate, compute a Selection Score:

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

## Stage 3 — Rank and Select Top Emergent

Sort eligible emergent candidates by Selection Score DESC. Take the top **2** (PP-0 instantiated) or top **3** (PP-0 not instantiated).

### Tie-Breaking (in order)

1. Higher Severity component wins
2. Higher Evidence Strength component wins
3. Higher Strategic Relevance component wins
4. Earlier impact area in canonical order wins (see `ordering.md`)
5. Alphabetical by pain point title

## Stage 4 — Combined List Ordering (v1.1)

Order the final 8 as one list:

1. **PP-0 first** (Precedence P0), when instantiated
2. **The 5 form-stated pain points in their original form order** (the order the client stated them in Section 3 — input-stable, never re-derived)
3. **Emergent pain points by Selection Score DESC** (tie-break per Stage 3)

Severity labels use the v1.1 enum (`_core.md` §6): `Critical (systemic)` > `Critical (acute)` > `High` > `Medium-High` > `Medium` > `Low`. Note the ordering contract above is positional (P0 → form order → score order), NOT a severity sort — form order is stable across runs by construction; severity is displayed, not sorted on.

The result: the same input set always produces the same 8 pain points in the same order.

## Worked Example — Meridian Test Case (v1.1, matches the Golden Benchmark)

**Stage 0 — eligibility filter on the emergent pool:**

| # | Candidate | Class | Pool? |
|---|---|---|---|
| E-1 | RPO Product Does Not Exist | product-gap (PP-RT-08) | ✗ → runner-up register (H-linkage anchor) |
| E-2 | Ungoverned AI Use / GDPR Compliance Risk | process (PP-RT-07) | ✓ |
| E-3 | No Real-Time Pipeline Visibility | process, no-SSOT symptom | **absorbed into PP-0** (Stage 0b) |
| E-4 | Executive Search Semi-Independent | organisational (PP-RT-09) | ✗ → delivery risk |
| E-5 | 35% Researcher Turnover | process (PP-RT-10) | ✓ |
| E-6 | Cold Outreach Conversion Below Average | process (PP-RT-11) | ✓ |
| E-7 | Slack/Teams Tool Duplication | process | ✓ |
| E-8 | Warsaw Office Lacks Local Ops Support | organisational | ✗ → delivery risk |

**Stage 0b — PP-0 gate:** tech inventory p.2 documents "no active integrations between any systems… CSV exports, copy-paste" (C1 ✓) and "no data warehouse, BI platform… no single source of truth for operational performance" (C2 ✓), both Document-Backed → **PP-0 instantiated at Critical (systemic)** → 2 emergent slots.

**Stages 2–3 — scoring the eligible pool:**

| # | Candidate | Sev | Evid | Strat | Score | Selected? |
|---|---|---|---|---|---|---|
| E-2 | Ungoverned AI / GDPR | 5 | 5 | 5 | 30 | ✓ (slot 1) |
| E-5 | Researcher turnover | 3 | 3 | 2 | 17 | ✓ (slot 2) |
| E-6 | Cold outreach conversion | 2 | 3 | 2 | 14 | ✗ |
| E-7 | Slack/Teams duplication | 1 | 2 | 1 | 8 | ✗ |

**Stage 4 — final order (byte-identical to the Golden Benchmark §C):**

| Pos | pp-id | Pain Point | Severity |
|---|---|---|---|
| 0 | PP-CORE-00 | Fragmented data infrastructure: no integrated single source of truth (absorbs pipeline-visibility) | Critical (systemic) |
| 1 | PP-RT-01 | Manual candidate sourcing bottleneck | Critical (acute) |
| 2 | PP-RT-02 | Dead candidate database (47,000 records) | High |
| 3 | PP-RT-04 | Inconsistent client reporting & transparency | High |
| 4 | PP-RT-03 | Manual CV formatting & candidate summaries | High |
| 5 | PP-RT-05 | Fragmented interview & offer management (incl. relocated MD-visibility evidence) | Medium |
| 6 | PP-RT-07 | Ungoverned AI use amid immature GDPR posture | High |
| 7 | PP-RT-10 | Researcher turnover and knowledge retention | Medium |

Section H records: tombstone (E-3 absorbed into PP-0; MD-visibility evidence line relocated to PP-RT-05), runner-up register (BD proposal effort, Ops Director capacity overload, exec-search fee-sharing — with eligibility classes).

This output is mechanically reproducible: any compliant run on the same input produces the same 8 pain points in the same order.
