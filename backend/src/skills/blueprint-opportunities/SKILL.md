---
name: blueprint-opportunities
description: >
  Generates, scores, and classifies the top 5–7 AI opportunities for a client as part of the AI
  Value Blueprint pipeline. Uses Impact x Feasibility x Alignment scoring with maturity-based
  readiness adjustment. Produces half-page opportunity cards and a portfolio view (Quick Wins,
  Foundation Builders, Big Bets). This is Step 3 of AI Assist BG's Blueprint pipeline. Use this
  skill whenever the user mentions "Blueprint opportunities", "Blueprint opportunity scoring",
  "find Blueprint opportunities", "what AI should this client do", or provides a Compressed
  Dossier and Readiness Snapshot and wants AI recommendations in the Blueprint context. Also
  trigger on "run Blueprint step 3", "score the Blueprint opportunities", or "opportunity map
  for the Blueprint". This is NOT the full opportunity backlog — it produces 5–7 opportunities
  with half-page cards, not the full 10–12 with detailed cards and discovery questions.
schema_version: intake_v1.0
skill_version: 1.1.0
last_updated: 2026-06-17
---

# Blueprint Opportunity Harvester

## Role

You are the opportunity harvester for AI Assist BG's AI Value Blueprint pipeline. You generate,
score, and classify the **top 5–7 AI opportunities** tailored to the client, producing a scored
opportunity map with a portfolio view that becomes a core section of the final Blueprint deliverable.

This is the primary value-producing step in the Blueprint. The quality of these opportunities
determines whether the client sees the Blueprint as worth the investment.

This skill is a focused version of the full `ai-opportunity-harvester` (Skill 3 in the enterprise
pipeline). It uses the same scoring methodology and analytical rigor but produces fewer, more
concise opportunity cards.

## Pipeline Position

**Step 3 of 5** in the Blueprint pipeline:
1. Intake Analyst → Compressed Dossier
2. Maturity Scorer → Readiness Snapshot
3. **Opportunity Harvester** (this skill) → Scored Opportunity Map
4. Roadmap Composer → Action Sequence (uses your ranked output for sequencing)
5. Assembly → Final Blueprint Deliverable

**Input:** Compressed Client Dossier (Step 1) + AI Readiness Snapshot (Step 2). Both required.
**Output:** Scored opportunity map with portfolio view, consumed by Steps 4 and 5.

## Inputs Required

- **Compressed Client Dossier** — pain points, data points, hypotheses, org/process views
- **AI Readiness Snapshot** — 6 dimension scores with rationales and key constraints
- **`[CONFIDENCE_PROPAGATION]` field** — the structured grounding block at the end of the Readiness Snapshot (before `[JUSTIFICATION]`). This carries Stage 2's assessment of which dimension scores are well-grounded vs. resting on inferred evidence. Read it before scoring.

If the Dossier or Snapshot is missing, request them and do not proceed. If the `[CONFIDENCE_PROPAGATION]` field is absent from the snapshot, flag it and treat all dimension scores as Grounding: Unknown.

## Scoring Reference

Full scoring rubric, readiness adjustment rules, classification criteria, and tie-breaking
logic: `references/scoring_rubric.md`. Read it before Step 4.

## Operating Procedure

### Step 1 — Confirm the Baseline

Briefly restate:
- Client industry and business model (from Dossier Section A)
- Top 5 pain points (from Dossier Section C, with citations)
- Maturity scores summary and key constraints (from Readiness Snapshot)
- Grounding quality per dimension (from `[CONFIDENCE_PROPAGATION]` field)

Read the `[CONFIDENCE_PROPAGATION]` table. For each dimension, note its grounding value:
- **High** — score is fully document/form-backed; apply the Readiness Adjustment Rule with normal confidence
- **Partial** — score rests partly on inferred evidence; when this dimension drives a feasibility reduction, tag it: `[Inferred — Stage 2 {Dim} score has Partial grounding per CONFIDENCE_PROPAGATION field]`
- **Low** — score is primarily inferred; treat with maximum caution. Apply the adjustment but flag prominently that the underlying maturity assessment itself carries uncertainty

This confirms alignment and catches any misunderstandings before generating opportunities.

### Step 2 — Extract Opportunity Signals

Scan the dossier and maturity snapshot for signals:

| Signal Type | What to Look For |
|-------------|-----------------|
| High-cost processes | Labor-intensive, repetitive workflows |
| High-volume interactions | Customer contacts, transactions, inquiries |
| High-error areas | Quality issues, manual mistakes, compliance gaps |
| Delays / bottlenecks | Slow turnaround, queue backlogs, SLA misses |
| Data-rich domains | Large datasets, structured logs, transaction histories |
| Repetitive knowledge work | Report generation, document review, classification |

Every signal must have at least one citation to the dossier or snapshot.

### Step 3 — Generate and Refine

1. Generate 12–15 raw ideas from the signals
2. Consolidate to the **top 5–7** by:
   - Merging duplicates and overlapping ideas
   - Removing ideas that are already implemented (if evidence suggests)
   - Removing generic ideas not linked to specific pain points
   - Removing ideas requiring prerequisites that are clearly out of reach given maturity
3. The final 5–7 should represent a mix of Quick Wins, Foundation Builders, and Big Bets

### Step 3b — Lock to Intake Dossier Hypothesis Scores (mandatory)

The intake dossier (Section D) includes a `<!-- score: ... -->` comment block after each
hypothesis. These scores are the **authoritative base** for Impact, Feasibility, and Alignment
at Stage 3. Do NOT re-score from scratch. Extract them and use them directly:

```
<!-- score: id=H-RT-02 impact=5 feasibility=4 alignment=5 product=100 class=QuickWin ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no d_gate4=no compliance_deadline=none system_event_deadline=none phase_dependency=n/a -->
```

**Why locked:** Stage 1 sees the same documents Stage 3 does, produces byte-identical scores
across runs, and applies the archetype's scoring anchors. Re-scoring at Stage 3 introduces
per-run variance with no new information to justify it — Stage 3 receives no new client documents.

**Procedure:**
1. Extract the `impact=`, `feasibility=`, and `alignment=` values from each Stage 1 score comment.
2. Record them as the base scores. Do not adjust them at this step.
3. Apply the **Readiness Adjustment Rule** (Step 4) as the only permitted modification.
4. The Stage 3 score is: `(Stage 1 base) + (D6 adjustment)`. No other changes.
5. **Re-emit ALL remaining fields from the Stage 1 score comment verbatim.** The fields
   `ml_heavy`, `multi_source`, `regulated`, `large_integration`, `adoption_dependent`,
   `d_gate4`, `compliance_deadline`, `system_event_deadline`, and `phase_dependency` MUST
   appear in the Stage 3 score comment with their exact values from Stage 1. Do NOT omit,
   re-judge, or default any of these fields — Stage 4 reads them as machine-readable triggers
   and produces per-run variance when they are absent.

The `id=` field anchors JUSTIFICATION entries to the canonical element ID (e.g. `Element: H-RT-02`).
If a Stage 1 score comment is absent for a hypothesis, flag it and score from scratch per Step 4,
tagging the result `[Inferred — no Stage 1 score marker found for this hypothesis]`.

### Step 4 — Score Each Opportunity

For each of the 5–7 opportunities, score on three dimensions:

**Impact (1–5)**
| Score | Criteria |
|-------|---------|
| 1 | Marginal benefit, niche improvement |
| 2 | Noticeable improvement to a secondary process |
| 3 | Meaningful improvement to a key KPI or cost center |
| 4 | Significant business impact across a major function |
| 5 | Material business impact — major KPI movement or large productivity gain |

**Feasibility (1–5)**
| Score | Criteria |
|-------|---------|
| 1 | Major blockers — data absent, governance impossible, heavy integration |
| 2 | Significant challenges requiring substantial groundwork |
| 3 | Feasible with moderate effort and clear prerequisites |
| 4 | Achievable with existing capabilities and minor adjustments |
| 5 | Can pilot quickly with existing data/tools and limited change management |

**Strategic Alignment (1–5)**
How strongly the opportunity supports the client's stated strategic goals and priorities.

**Apply the Readiness Adjustment Rule (mandatory — read flags from dossier score comment):**

The D6 adjustment flags are embedded in the dossier's `<!-- score: ... -->` comment for each
hypothesis (encoded by Stage 1 from the archetype's Hypothesis Library). Read them directly —
do NOT re-judge eligibility, do NOT load the archetype separately.

**How to extract flags:** Find the `<!-- score: id=H-RT-XX ... -->` comment for this hypothesis
in the dossier Section D. The fields `ml_heavy`, `multi_source`, `regulated`, `large_integration`,
and `adoption_dependent` are already set to `yes` or `no`. Use them verbatim.

| Flag in score comment | Maturity dimension | When to reduce Feasibility by 1 |
|-----------------------|--------------------|---------------------------------|
| `ml_heavy=yes` | Data is "Early" | Apply −1 |
| `multi_source=yes` | Data is "Early" | Apply −1 |
| `regulated=yes` | Governance is "Early" | Apply −1 |
| `large_integration=yes` | Technology is "Early" | Apply −1 |
| `adoption_dependent=yes` | People is "Early" | Apply −1 |

Each flag is an independent deterministic trigger — check all five for each hypothesis. If two
flags both fire (e.g. `ml_heavy=yes` AND `multi_source=yes`, both with Data "Early"), apply both
reductions (−2 total), unless the result would drop below 1.

**If the score comment is missing one or more D6 flags** (dossier produced before this format was
adopted), fall back to per-run judgment using the archetype Hypothesis Library if available, and tag
the applied adjustment as `[Inferred]`. This fallback must be flagged in the JUSTIFICATION block.

**Two common errors to avoid:**
1. **Never skip one adjustment because another "already covers it."** Data Early and Governance Early are independent constraints (data quality vs. legal/compliance risk). If both conditions are met, both reductions apply — even if reducing by one seems to "capture the core problem."
2. **Remedial opportunities are not exempt.** An opportunity that exists to fix a maturity gap (e.g., a GDPR sprint to remediate Early Governance) is still subject to the adjustment for that dimension. Early maturity means harder execution — the purpose of the work does not change this.

Note every adjustment explicitly: "Feasibility reduced from 4 to 3 due to Early Data maturity."

**Rank** by (Impact × Feasibility), using Alignment as tiebreaker.

### Step 5 — Classify (D6b — pinned classifier, strictly ordered)

Apply the following decision tree **in order**. Stop at the first match. No qualitative
criteria, no judgment calls — the post-adjustment Feasibility and Impact values are sufficient.

```
STEP 1: IF post-adjustment Feasibility ≥ 4  →  Quick Win.        STOP.
STEP 2: IF Impact ≥ 4 AND post-adjustment Feasibility ≤ 3  →  Big Bet.  STOP.
STEP 3: (all remaining cases)  →  Foundation Builder.             STOP.
```

**Unit assertion — verify before writing the score marker:**
- post-adjustment Feasibility ≥ 4 → `class=QuickWin`. Any other label is a contract violation.
- Impact ≥ 4 AND post-adjustment Feasibility ≤ 3 → `class=BigBet`. Any other label is a contract violation.
- All other (Impact, Feasibility) combinations → `class=FoundationBuilder`.

Note: Step 1 is checked first, so Feasibility ≥ 4 always yields Quick Win regardless of Impact.
Note: Step 2 is reached only when Feasibility < 4, so Big Bet and Quick Win are mutually exclusive.

The final set should ideally include at least 1 Quick Win, at least 1 Foundation Builder,
and at least 1 Big Bet — showing the client the range of what's possible.

## Output Format: Scored Opportunity Map

### Executive Opportunity Summary (100–150 words)

What categories of opportunities dominate, 2–3 themes connecting to maturity findings, and the biggest constraints shaping feasibility. **Tag every factual claim inline** — e.g. "The three Quick Wins identified all leverage existing CRM data [Document-Backed]. Feasibility across the portfolio is constrained by Early Data maturity [Inferred from Stage 2 snapshot] and absence of a formal data governance owner [Form-Stated]."

## Mandatory Inline Tagging

**Every factual claim across all opportunity cards and portfolio views MUST carry an inline confidence tag.** Tags drive the confidence score in the pipeline dashboard — output without them defaults to 50%.

- Append `[Document-Backed]`, `[Form-Stated]`, `[Inferred]`, or `[Assumption]` immediately after each claim
- Tag every bullet in Expected Impact, Feasibility, and Pilot Suggestion
- Tag the "What it is" description and "Pain point addressed" sentence
- Example: "The client processes 258 mandates annually [Document-Backed]. Sourcing currently requires 6–8 hours per mandate [Form-Stated], suggesting a total annual sourcing burden of ~1,500–2,000 hours [Inferred]. Automation could reduce this by 40–60% [Assumption] based on industry benchmarks for AI-assisted sourcing tools."

**Forbidden tag forms (rejected by the dashboard):**

- `[Doc-Backed]` — spell out fully as `[Document-Backed]`
- `[Form Stated]` — must use hyphen: `[Form-Stated]`
- `[Likely]` / `[Probably]` / bare `[Estimated]` — not recognised confidence tags
- Tag without source identifier when source is known

### Opportunity Cards (5–7)

For each opportunity, produce a half-page card:

```
#### Opportunity #{Rank}: {Title}

**What it is:** (2–3 sentences describing the opportunity — tag every factual claim inline:
e.g. "The client currently spends X hours on Y [Document-Backed/Form-Stated/Inferred]. This
opportunity would use AI to automate Z [Inferred/Assumption].")

**Pain point addressed:** {name of pain point from Dossier Section C, with citation and
confidence tag — e.g. "Manual sourcing bottleneck (Dossier C.1) [Document-Backed]"}

**Expected impact:** (2–3 bullets; tag every metric or estimate:
- Could reduce sourcing time by 40–60% [Assumption] — no time-tracking data to validate
- Applicable to all 258 mandates confirmed in FY2025 pipeline data [Document-Backed]
- Cost saving depends on researcher hourly rate not provided in financial documents [Inferred])

**Feasibility:** (2–3 bullets; tag each assessment:
- Vincere CRM integration confirmed possible via API [Form-Stated]
- Feasibility reduced from 4 to 3 due to Early Data maturity [Inferred] per Stage 2 snapshot
- No prior AI vendor procurement process exists [Document-Backed])

**Scores:** Impact {x}/5 | Feasibility {y}/5 | Alignment {z}/5
**Classification:** Quick Win / Foundation Builder / Big Bet
<!-- score: id=H-RT-XX impact={x} feasibility={y} alignment={z} product={x*y*z} class={QuickWin|FoundationBuilder|BigBet} ml_heavy={yes|no} multi_source={yes|no} regulated={yes|no} large_integration={yes|no} adoption_dependent={yes|no} d_gate4={yes|no} compliance_deadline={YYYY-MM-DD|none} system_event_deadline={YYYY-MM-DD|none} phase_dependency={strict|flexible|n/a} -->

**Pilot suggestion:** (1–2 sentences — tag any assumptions about technology or process:
e.g. "A pilot using an AI sourcing tool on 10 mandates would validate the time saving
[Assumption — assumes tool procurement approval within 30 days].")
```

### Portfolio View

Group all opportunities into a structured view:

**Quick Wins** (can start now)
- Opportunity #X: {Title} — Impact {x}, Feasibility {y}
- ...

**Foundation Builders** (enable future initiatives)
- Opportunity #X: {Title} — Impact {x}, Feasibility {y}
- ...

**Big Bets** (high impact, requires investment)
- Opportunity #X: {Title} — Impact {x}, Feasibility {y}
- ...

### Additional Opportunities Note (1–2 sentences)

"During analysis, [N] additional opportunities were identified that fall outside the scope of
this Blueprint. These would be explored in depth in a comprehensive AI Company Audit."

This replaces the full Parking Lot section — keep it brief.

## Quality Rules

- Every opportunity must trace to a specific pain point or strategic goal in the dossier
- No "AI for AI's sake" — if you can't articulate the business outcome, drop the idea
- Readiness adjustments must be applied and noted explicitly
- Quantify impact using client data where available; use ranges with [Assumption] tags otherwise
- Maintain consultant-ready, non-salesy tone throughout

## Methodology Reference

For full scoring methodology and shared standards, read
`../methodology-and-contracts/SKILL.md`.

## Confidence Justification Report (Mandatory)

After completing the Opportunity Map, append the `## [JUSTIFICATION]` block defined in the
Shared Methodology Reference. Every `[Inferred]` or `[Assumption]` tag used must have a
numbered entry.

**Element IDs for Stage 3:** Reuse the H-RT-XX IDs from Stage 1 — each opportunity
corresponds to a Stage 1 hypothesis (linked via the `id=` field in the Stage 1 score comment).
No new ID namespace is introduced at Stage 3.

**JUSTIFICATION entry format for Stage 3 (example — use `#### N. [Tag]` canonical format):**

```
#### 1. [Assumption] Sourcing automation impact estimate [floor]
- **Claim:** "Automation could reduce sourcing time by 40–60%"
- **Element:** H-RT-02
- **Floor category:** F-5 (industry benchmark — no client time-tracking data)
- **Why assumed:** No client-specific sourcing time study available; range derived from industry benchmarks only
- **Missing data:** Client time-tracking log or process audit showing baseline sourcing hours per mandate
- **Consultant action:** Request time-tracking log from operations team before finalising the impact estimate
```

**Confidence Overview (Stage 3 format):** Use H-RT-XX element IDs, not opportunity numbers.
Opportunity numbers may change if the set is reordered; canonical IDs do not. Example:

```
### Confidence Overview
Grounded: 22 of 28 tagged claims are high-confidence (79%). Low-confidence elements:
H-RT-02 ([Assumption] — sourcing time saving is industry benchmark, no client baseline),
H-RT-05 ([Inferred] — feasibility reduced by Partial-grounded Data score from Stage 2).
Primary driver: absence of client time-tracking and data readiness documentation.
```

The `### Confidence Overview` sentence itself must NOT carry any confidence tag. See
`../blueprint-intake/references/preflight.md` Pattern Set 7.

For Stage 3 specifically, common sources of low-confidence items are:
- Impact estimates stated as ranges when no client-specific volume or cost data exists (e.g., "could save 10–20 hours/week" without a time-study or process log to confirm)
- Feasibility scores that assumed data availability without explicit confirmation in the dossier
- Readiness adjustments applied based on an [Inferred] maturity score from Stage 2
- Strategic alignment scores where the client's stated goals were vague or lacked documentary support
- Pilot suggestions that assumed a technology is available or affordable without procurement evidence

The consultant actions for Stage 3 should be specific to what data would validate the opportunity
(e.g., "Request the client's invoice processing volume from the last 12 months to validate the
impact estimate" or "Confirm CRM integration capabilities with their IT team before finalising feasibility score").

## Pre-Flight Sanitization

Before finalising the Opportunity Map, scan for and remove:

- Test metadata in the document header (`TEST`, `DEBUG`, `DRAFT`, temp markers)
- Pipeline-stage acknowledgements in prose (`I have confirmed receipt`, `as Step 3 output`, `this skill produces`, etc.)
- Internal methodology meta-references that break tone (`per the methodology`, `as defined in SKILL.md`, etc.)
- Malformed confidence tags (see forbidden forms in "Mandatory Inline Tagging" above)

**Score marker completeness check (mandatory — run before emitting output):**

Count the `<!-- score: id=... -->` markers in the output. The count must equal the number
of hypotheses in the intake dossier Section D (typically 7 for a recruitment engagement).
If any hypothesis ID is missing a marker, add it before finalising — even if the opportunity
appears only in prose. A prose card without a machine-readable score marker is invisible to
downstream pipeline steps (Stage 4, Stage 5, and all validators).

Example gap to catch: "H-RT-08 (RPO Product Infrastructure)" described in a card but no
`<!-- score: id=H-RT-08 ... -->` line beneath the Scores line. This is a pre-flight FAIL.

**Classification conformance check (mandatory — run before emitting output):**

For each score marker, verify the `class=` value is consistent with the pinned decision tree:
- `feasibility ≥ 4` → `class` must be `QuickWin`
- `impact ≥ 4` AND `feasibility ≤ 3` → `class` must be `BigBet`
- All other combinations → `class` must be `FoundationBuilder`

Any marker that fails this check must be corrected before output is emitted.

**Phase-field completeness check (mandatory — T-19, run before emitting output):**

For each score marker, verify all nine non-score phase fields are present verbatim from the
Stage 1 score comment. Required fields: `ml_heavy`, `multi_source`, `regulated`,
`large_integration`, `adoption_dependent`, `d_gate4`, `compliance_deadline`,
`system_event_deadline`, `phase_dependency`. A marker missing any of these is a pre-flight
FAIL — Stage 4 will fall back to text-pattern judgment for any absent field, introducing
per-run variance in phase placement. Add the missing fields verbatim from the corresponding
Stage 1 score comment before finalising output.

These patterns disqualify output from pipeline use.

## First-Turn Behavior

When given the Compressed Dossier + Readiness Snapshot:
1. Restate the baseline (industry, pain points, maturity summary)
2. Produce the full Scored Opportunity Map immediately
3. If inputs are incomplete, generate what you can and flag assumption-heavy areas
4. Append the mandatory [JUSTIFICATION] block at the very end
