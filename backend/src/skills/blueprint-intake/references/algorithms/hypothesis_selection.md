# Hypothesis Selection Algorithm

**Schema:** `intake_v1.1`
**Section:** D — Opportunities and Hypotheses
**Policy:** 7 hypotheses + H-CORE-00 in a reserved slot when its promotion gate passes (GATED — see Stage 4b)
**Purpose:** Convert the candidate hypothesis pool into a deterministic ranked list of exactly 7 (+ H-0 when gated in).
**v1.1 change summary:** Stage 1 pool filters (`band1_pool`, `h0_consumer` columns), Stage 4b H-CORE-00 reserved slot, Stage 5 H-0 presentation position. Ratified via the Meridian Golden Benchmark v1.1 (§A items A-6…A-11).

---

## Input

1. **Pain Points** — the 8 selected by `pain_point_selection.md` (Section C)
2. **Strategic Priorities** — the priorities from PDF 7 (strategic plan)
3. **Industry Hypothesis Library** — pre-curated AI opportunity candidates from `archetypes/<industry>.md`
4. **Previous AI Initiatives** — from PDF 8 (lessons learned constrain feasibility)

## Output

An ordered list of exactly 7 hypotheses (+ H-CORE-00 in its reserved slot when gated in), each linked to one or more pain points (or a named strategic priority per the v1.1 linkage extension), ranked by Strategic Value Score.

## Stage 1 — Build the Candidate Pool

For each pain point in Section C:
1. Identify candidate AI hypotheses from the industry library that address it
2. Add candidate hypotheses surfaced by document analysis that don't appear in the library

For each PDF 7 strategic priority not yet addressed by a candidate:
1. Add at least one hypothesis specifically targeting that priority

Deduplicate by hypothesis identity (not by phrasing). If two candidates target the same opportunity, merge them and keep the broader scope.

**Pool filters (v1.1 — deterministic column lookups, applied after the pool is built):**

1. **`band1_pool=no` exclusion:** when PP-CORE-00 was instantiated at `Critical (systemic)` in Section C, remove every candidate whose archetype row carries `band1_pool=no` (standalone product-build bets a fragile Layer 1 cannot carry — e.g. H-RT-08, H-RT-09 in the recruitment archetype). Record each exclusion in Section H with its score, so the reviewer sees the trade-off.
2. **`h0_consumer=yes` absorption:** when the H-CORE-00 promotion gate will pass (evaluate the gate on the provisional top-7 — see Stage 4b), remove every candidate whose row carries `h0_consumer=yes` (e.g. H-RT-06 Pipeline Visibility Dashboard) — it is an output of the brain; keeping both double-counts the same value. Tombstone in Section H. When H-0 is not promoted, these candidates compete normally.

## Stage 2 — Score Each Candidate

For each hypothesis, compute a Strategic Value Score:

```
Strategic Value Score = Impact × Feasibility × Alignment
```

Each component scored 1–5. Multiplicative (not additive) because a hypothesis weak on any single dimension should not score highly.

**Score anchor rule (T-21 — mandatory):** For each hypothesis drawn from the archetype Hypothesis Library, start from the archetype's **Typical Impact**, **Typical Feasibility**, and **Typical Alignment** columns as the base score. Use those values unchanged unless a specific passage in the client's uploaded documents provides direct evidence that the client's situation differs from the typical case. If you adjust a component, cite the verbatim document passage that justifies it. If no adjustment evidence exists, use the archetype value as-is — do NOT re-derive from scratch.

For hypotheses not in the archetype library (document-surfaced candidates only), score from scratch using the anchored definitions below.

This anchor eliminates per-run score variance on library hypotheses — the same archetype inputs always produce the same base scores, so the same top-7 ranking. It is the Stage-1 equivalent of the T-02 lock that Stage 3 applies to Stage-1 scores.

### Impact (1–5)

Scores are INTEGER ONLY (1, 2, 3, 4, or 5). No fractional scores. Apply the first matching rule.

| Score | Anchored Definition |
|---|---|
| 5 | Hypothesis directly resolves PP#1 (the top-ranked pain point by severity score) AND its title or mechanism is named as an objective in PDF 7 (strategic plan) |
| 4 | Hypothesis resolves PP#2 or PP#3 by title/mechanism, OR it is the sole mechanism that addresses a named PDF 7 priority (i.e., removing this hypothesis would leave that priority uncovered) |
| 3 | Hypothesis resolves PP#4 or PP#5 |
| 2 | Hypothesis resolves PP#6, PP#7, or PP#8, OR it enables a future opportunity without directly resolving a current pain point |
| 1 | Hypothesis has no direct pain point linkage; benefit is marginal or entirely internal to another hypothesis |

**Borderline test — Impact 4 vs 5:** Does removing this hypothesis leave PP#1 unaddressed? If yes AND it also targets a PDF 7 priority → 5. Otherwise → 4.

**Borderline test — Impact 3 vs 4:** Is this hypothesis the ONLY candidate covering a named PDF 7 priority? If yes → 4, because removing it creates a coverage gap.

### Feasibility (1–5)

Scores are INTEGER ONLY. Apply the first matching rule using evidence from the uploaded documents.

| Score | Anchored Definition |
|---|---|
| 5 | Client already licenses the specific tool named in the hypothesis (confirmed in tech inventory PDF) AND the use case is a standard feature of that tool |
| 4 | Tool category has ≥3 named vendor implementations in the archetype hypothesis library AND PDF 8 (previous AI initiatives) contains no record of a failed attempt in this category |
| 3 | Tool category exists in the market but client holds no current license AND PDF 8 contains no precedent (neither success nor failure) for this category |
| 2 | PDF 8 documents a previous attempt in this category where the root cause of failure was identified as process or change management (not technology itself) |
| 1 | PDF 8 documents a previous technology failure in this category, OR no documented industry precedent exists in the archetype library |

**Borderline test — Feasibility 4 vs 5:** Is the specific tool (not just category) already licensed by the client? If yes → 5. If the client has a tool in the category but not this specific one → 4.

**Borderline test — Feasibility 2 vs 3:** Does PDF 8 exist and describe any prior attempt in this category? If yes and the failure was process-based → 2. If PDF 8 is absent or silent on this category → 3.

### Alignment (1–5)

Scores are INTEGER ONLY. Alignment measures fit with the client's stated strategic priorities (PDF 7 or intake form Section 2 if PDF 7 is absent).

| Score | Anchored Definition |
|---|---|
| 5 | The hypothesis title or its named mechanism appears verbatim (or near-verbatim) as a named objective in PDF 7; the primary owner of that objective is identifiable |
| 4 | Hypothesis directly enables a named PDF 7 priority, but the connection requires one inference step (e.g., "AI-assisted sourcing" enables the "speed to placement" priority without being named identically) |
| 3 | Hypothesis resolves a dependency that indirectly supports a stated priority (two or more inference steps between the hypothesis outcome and the stated priority) |
| 2 | Hypothesis addresses an operational priority not stated in PDF 7 or the form, but rational given the business model and documented KPIs |
| 1 | No connection to any stated priority or evident operational need |

**Borderline test — Alignment 4 vs 5:** Can you quote a sentence from PDF 7 that names this hypothesis's mechanism? If yes → 5. If the link requires you to paraphrase → 4.

## Stage 3 — Required Coverage Enforcement (Deterministic)

Apply these checks IN ORDER before Stage 4 ranking. Do NOT adjust existing candidate scores.

### Check 3.1 — Strategic Priority Coverage

List the 4 priorities from PDF 7 (or intake form Section 2 if PDF 7 is absent or incomplete).

For each priority, scan the candidate pool and identify which candidates address it.

**If a priority has zero candidates:** Add a new candidate to the pool specifically targeting that priority. Score it per Stage 2 rules. It will compete on score in Stage 4 like any other candidate.

**If a priority is covered by at least one candidate:** No action needed at this stage. If all of that priority's candidates fall below the top-7 score cutoff in Stage 4, the gap is documented in Section H (Strategic Priority Coverage — Reviewer Checklist item 5). The selection is NOT altered to force coverage. Selection is determined by score only.

### Check 3.2 — Quick Win Minimum

Count candidates with Quick Win classification across the full pool. If fewer than 2 qualify:
- Flag the engagement as **"Foundation-Heavy"** in Section H Reviewer Checklist.
- Do NOT alter classifications or scores to manufacture Quick Wins.

### Check 3.3 — Prerequisite Enabler

Check if any candidate is a prerequisite enabler (governance or compliance). If none:
- Flag the engagement as **"Ungoverned Risk"** in Section H Reviewer Checklist.
- Do NOT alter classifications or scores.

## Stage 4 — Rank and Select Top 7 (Deterministic)

Sort all candidates by Strategic Value Score DESC. Take the **top 7**. This is the final selection — no swaps, displacements, or coverage-based adjustments are made after this step.

**Strict cutoff rule:** The 7th-highest score is included; the 8th is not. Ties in score are broken by the Tie-Breaking Hierarchy below. Strategic priority status DOES NOT alter which hypotheses are selected. A lower-scored hypothesis is NEVER substituted for a higher-scored one to achieve priority coverage.

**If a strategic priority is not represented in the top 7:** Document it in Section H item 5 (Strategic Priority Coverage). Explain which hypothesis was evaluated for it, what it scored, which selected hypothesis it scores below, and what specific condition would raise its score into the top 7. Do NOT alter the selection. See SKILL.md for the mandatory Section H format.

### Tie-Breaking Hierarchy (apply in order, at every decision point)

When two candidates produce an identical Strategic Value Score:

1. Higher **Impact** component wins
2. Higher **Alignment** component wins
3. Higher **Feasibility** component wins
4. Linked to the **higher-severity pain point** wins (use PP severity rank from Section C; PP#1 > PP#2, etc.)
5. **Alphabetical** by hypothesis title (A before B)

This hierarchy applies identically at: Stage 4 ranking and Stage 5 presentation ordering. It guarantees a unique ordering for any set of candidates.

## Stage 4b — H-CORE-00 Reserved Slot (v1.1, GATED)

After the top 7 are fixed, evaluate the H-CORE-00 promotion gate (`archetypes/_core.md` §3):

1. PP-CORE-00 was instantiated in Section C (either verdict level), AND
2. the selected top-7 set contains ≥ 2 hypotheses with `agent_shaped=yes` in the archetype library (a column lookup — never re-judged).

**Gate passes** → H-CORE-00 enters a reserved **additional** slot (Section D = 7 + H-0). It never displaces a scored candidate; the top-7 selection above is untouched. Emit H-0 with the fixed title, cross-cutting strategic link, archetype-anchored scores (5 × 2 × 5 = 50), and full marker per the CORE library row — **one undivided entity, one score marker** (its decomposition belongs exclusively to the downstream Build Sheet; T-30).

**Gate fails** → Section D is exactly 7; no H-0. Do not force it. Record the gate evaluation (pass/fail + which condition) in the Checkpoint 2 block.

## Stage 5 — Final Ordering for Presentation (Deterministic)

Hypotheses are presented in this order in the dossier (NOT selection-score order, which is internal only):

0. **H-CORE-00 first** (when gated in) — labelled `H-0`; the foundational rung leads the map. Position labels H1–H7 below are assigned to the remaining 7 only
1. **Quick Wins** — sorted by Strategic Value Score DESC within this group
2. **Foundation Builders** — **two-tier ordering** within this group (FW-02):
   - **Tier 1:** `Foundation Builder (enabler)` entries first — sorted by Strategic Value Score DESC among themselves
   - **Tier 2:** Plain `Foundation Builder` entries next — sorted by Strategic Value Score DESC among themselves
3. **Big Bets** — sorted by Strategic Value Score DESC within this group

**Within-cluster and within-tier tie-breaking — applies to ALL three clusters (Quick Wins, Foundation Builder tiers, Big Bets). Apply in order when two hypotheses in the same cluster or tier have equal scores:**
1. Higher Impact component wins
2. Higher Alignment component wins
3. Higher Feasibility component wins
4. Linked to higher-severity pain point wins (PP#1 > PP#2, etc.)
5. Alphabetical by hypothesis title (A before B)

This hierarchy is identical for every cluster. Quick Wins and Big Bets are single-tier groups; Foundation Builders have two tiers (enabler, plain) — apply the hierarchy within each tier independently. The harness (HR-05) validates score-DESC ordering in every cluster; a swap within any cluster is a FAIL regardless of how small the score gap.

Position labels **H1 through H7** are assigned AFTER this ordering is complete. H1 is the first Quick Win (or first Foundation Builder if no Quick Wins), etc. Downstream skills reference hypotheses by position label; the ordering must therefore be identical across all runs on identical inputs.

This ordering matches downstream skill expectations (`blueprint-roadmap` assumes Quick Wins come first).

## Stage 6 — Score Visibility in Output (Mandatory)

Every hypothesis in Section D of the dossier MUST include a `Selection score` line as the final field:

```
**Selection score:** Impact [N] × Feasibility [N] × Alignment [N] = **[product]** | [Classification]
```

Example:
```
**Selection score:** Impact 5 × Feasibility 4 × Alignment 5 = **100** | Quick Win
```

**Why this is required:** When two runs on identical inputs select different hypotheses, the visible score line allows immediate diagnosis of where the scoring diverged. Without it, variance is detected but not explainable. The score line is an audit trail, not a decoration. The harness will validate that every Section D hypothesis contains a correctly formatted score line.

## Classification Rules

Each hypothesis is classified by Feasibility × Phase Dependency:

| Classification | Criteria |
|---|---|
| **Quick Win** | Feasibility ≥ 4 AND no dependency on incomplete foundational work AND addresses a top-4 pain point |
| **Foundation Builder** | Feasibility ≥ 3 AND is itself a prerequisite for one or more other hypotheses, OR addresses a structural gap |
| **Foundation Builder (enabler)** | Same as Foundation Builder, AND is a hard prerequisite for ≥1 other selected hypothesis (e.g., a data protection compliance sprint before any model trained on personal data). Enabler status is declared explicitly so presentation ordering places it before non-enabler Foundation Builders. |
| **Big Bet** | Impact ≥ 4 AND requires both Foundation Builders AND multiple Quick Wins to be live before execution |

A hypothesis cannot be both Quick Win and Big Bet. If criteria conflict, the more conservative classification wins (Foundation Builder > Quick Win, Big Bet > Foundation Builder).

**When to use `Foundation Builder (enabler)` vs. plain `Foundation Builder`:** Only use the enabler sub-class when there is a directional dependency — another hypothesis in the selected top 7 CANNOT start until this one delivers its output. A hypothesis that is merely "nice to do first" or "reduces risk" is a plain Foundation Builder.

## Worked Example — Meridian Test Case (v1.1, matches the Golden Benchmark)

**Candidate Pool with v1.1 filters applied** (PP-CORE-00 fired at Critical (systemic) in Section C):

| ID | Hypothesis | Imp | Feas | Align | Score | Pool status |
|---|---|---|---|---|---|---|
| H-RT-02 | AI-Powered CV Formatting + Summary Generation | 5 | 4 | 5 | 100 | in |
| H-RT-03 | ATS-Driven Automated Client Status Updates | 4 | 4 | 5 | 80 | in |
| H-RT-01 | AI-Assisted Specialist Sourcing | 5 | 3 | 5 | 75 | in |
| H-RT-05 | Interview Scheduling Standardisation | 3 | 5 | 4 | 60 | in |
| H-RT-07 | Data Protection Compliance Foundation (Sprint 0) | 3 | 4 | 5 | 60 | in |
| H-RT-04 | Candidate Database Revival + Governance | 4 | 3 | 4 | 48 | in |
| H-RT-10 | BD Proposal Automation + RPO Productisation Support | 3 | 3 | 5 | 45 | in (re-anchored v1.1) |
| H-RT-11 | Automated Candidate Pre-Screening | 3 | 3 | 3 | 27 | in |
| H-RT-13 | Predictive Time-to-Fill Modelling | 3 | 2 | 3 | 18 | in |
| H-RT-12 | AI-Powered Job Description Generation | 2 | 4 | 2 | 16 | in |
| H-RT-06 | Pipeline Visibility Dashboard | 4 | 3 | 3 | 36 | **absorbed** — `h0_consumer=yes`, H-0 gate passes (tombstone) |
| H-RT-08 | RPO Product Infrastructure | 5 | 2 | 5 | 50 | **excluded** — `band1_pool=no` (PP-0 Critical (systemic)); recorded in Section H |
| H-RT-09 | Executive Search Workflow Intelligence | 4 | 2 | 4 | 32 | **excluded** — `band1_pool=no`; recorded in Section H |

**Coverage Check:**
- Priority 1 (Speed): H-RT-01, H-RT-05 → ✓
- Priority 2 (RPO Scale): H-RT-10 (re-scoped, Alignment 5) → ✓
- Priority 3 (Smarter Delivery): H-RT-02, H-RT-03 → ✓
- Priority 4 (Exec Search Growth): sole candidate H-RT-09 is band-excluded → document in Section H item 5 (see below)
- Quick Win count: H-RT-02, H-RT-03, H-RT-05 = 3 ≥ 2 → ✓ · Prerequisite enabler: H-RT-07 → ✓

**Selection — Top 7 by Score:** {H-RT-02 100, H-RT-03 80, H-RT-01 75, H-RT-05 60, H-RT-07 60 (tie: H-RT-07 Alignment 5 > H-RT-05 4 — both selected), H-RT-04 48, H-RT-10 45}. Cutoff: H-RT-11 (27) is 8th — dropped.

**Stage 4b — H-0 gate:** PP-CORE-00 instantiated ✓; agent-shaped in selected set = {H-RT-01, H-RT-03} = 2 ≥ 2 ✓ → **H-CORE-00 promoted into its reserved slot** (5 × 2 × 5 = 50, Big Bet, `phase_dependency=strict`).

**Final presentation (Stage 5):**

| Pos | ID | Title | Class |
|---|---|---|---|
| H-0 | H-CORE-00 | AI Company Brain — unified data foundation + AI knowledge layer | Big Bet (slot 0, gated) |
| H1 | H-RT-02 | AI-Powered CV Formatting + Summary Generation | Quick Win |
| H2 | H-RT-03 | ATS-Driven Automated Client Status Updates | Quick Win (post-cutover) |
| H3 | H-RT-05 | Interview Scheduling Standardisation | Quick Win |
| H4 | H-RT-07 | Data Protection Compliance Foundation | Foundation Builder (enabler) |
| H5 | H-RT-01 | AI-Assisted Specialist Sourcing | Foundation Builder |
| H6 | H-RT-04 | Candidate Database Revival + Governance | Foundation Builder |
| H7 | H-RT-10 | BD Proposal Automation + RPO Productisation Support | Foundation Builder |

**Section H — Priority 4 documentation (required):** H-RT-09 (Executive Search Workflow Intelligence, 4 × 2 × 4 = 32) is the sole Priority-4 candidate and is band-excluded (`band1_pool=no` — a standalone product-build bet while Layer 1 is fragmented). Condition to re-enter: PP-0 remediated below Critical (systemic) (post-Brain-Genesis re-assessment) AND documented senior-partner commitment lifting Feasibility to 3. This is an algorithm assessment of execution conditions, not a gap in strategic understanding. Also record: H-RT-08 band-exclusion (50), H-RT-06 tombstone (h0_consumer).
