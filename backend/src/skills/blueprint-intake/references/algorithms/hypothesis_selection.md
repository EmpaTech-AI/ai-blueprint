# Hypothesis Selection Algorithm

**Schema:** `intake_v1.0`
**Section:** D — Opportunities and Hypotheses
**Policy:** FIXED at 7 hypotheses
**Purpose:** Convert the candidate hypothesis pool into a deterministic ranked list of exactly 7.

---

## Input

1. **Pain Points** — the 8 selected by `pain_point_selection.md` (Section C)
2. **Strategic Priorities** — the priorities from PDF 7 (strategic plan)
3. **Industry Hypothesis Library** — pre-curated AI opportunity candidates from `archetypes/<industry>.md`
4. **Previous AI Initiatives** — from PDF 8 (lessons learned constrain feasibility)

## Output

An ordered list of exactly 7 hypotheses, each linked to one or more pain points, ranked by Strategic Value Score.

## Stage 1 — Build the Candidate Pool

For each pain point in Section C:
1. Identify candidate AI hypotheses from the industry library that address it
2. Add candidate hypotheses surfaced by document analysis that don't appear in the library

For each PDF 7 strategic priority not yet addressed by a candidate:
1. Add at least one hypothesis specifically targeting that priority

Deduplicate by hypothesis identity (not by phrasing). If two candidates target the same opportunity, merge them and keep the broader scope.

## Stage 2 — Score Each Candidate

For each hypothesis, compute a Strategic Value Score:

```
Strategic Value Score = Impact × Feasibility × Alignment
```

Each component scored 1–5. Multiplicative (not additive) because a hypothesis weak on any single dimension should not score highly.

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

**If a priority is covered by at least one candidate:** No action needed at this stage. Stage 4 handles displacement if that candidate falls outside the top 7.

### Check 3.2 — Quick Win Minimum

Count candidates with Quick Win classification across the full pool. If fewer than 2 qualify:
- Flag the engagement as **"Foundation-Heavy"** in Section H Reviewer Checklist.
- Do NOT alter classifications or scores to manufacture Quick Wins.

### Check 3.3 — Prerequisite Enabler

Check if any candidate is a prerequisite enabler (governance or compliance). If none:
- Flag the engagement as **"Ungoverned Risk"** in Section H Reviewer Checklist.
- Do NOT alter classifications or scores.

## Stage 4 — Rank and Select Top 7 (Deterministic)

Sort all candidates by Strategic Value Score DESC. Take the **preliminary top 7**.

### Strategic Priority Displacement (apply after preliminary ranking)

For each of the 4 strategic priorities: check if it is represented by at least one hypothesis in the preliminary top 7.

**If a priority is NOT represented:**

1. **Identify the coverage candidate:** The highest-scoring excluded candidate (outside the top 7) that addresses the missing priority.
2. **Identify the displacement target:** In the current top 7, find the candidate with the LOWEST score that does NOT uniquely cover any strategic priority. A candidate "uniquely covers" a priority if removing it would leave that priority unrepresented among the remaining 6.
3. **Apply the swap:** Replace the displacement target with the coverage candidate.
4. **If multiple candidates tie as displacement target:** Apply the tie-breaking hierarchy below to select which one to displace.
5. **Repeat** for each uncovered priority (one swap per uncovered priority).

### Tie-Breaking Hierarchy (apply in order, at every decision point)

When two candidates produce an identical Strategic Value Score:

1. Higher **Impact** component wins
2. Higher **Alignment** component wins
3. Higher **Feasibility** component wins
4. Linked to the **higher-severity pain point** wins (use PP severity rank from Section C; PP#1 > PP#2, etc.)
5. **Alphabetical** by hypothesis title (A before B)

This hierarchy applies identically at: preliminary ranking, displacement target selection, and Stage 5 presentation ordering. It guarantees a unique ordering for any set of candidates.

## Stage 5 — Final Ordering for Presentation (Deterministic)

Hypotheses are presented in this order in the dossier (NOT selection-score order, which is internal only):

1. **Quick Wins** — sorted by Strategic Value Score DESC within this group
2. **Foundation Builders** — sorted by Strategic Value Score DESC within this group
3. **Big Bets** — sorted by Strategic Value Score DESC within this group

**Within-group tie-breaking (apply in order when two hypotheses in the same class have equal scores):**
1. Higher Impact component wins
2. Higher Alignment component wins
3. Higher Feasibility component wins
4. Linked to higher-severity pain point wins (PP#1 > PP#2, etc.)
5. Alphabetical by hypothesis title (A before B)

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
| **Big Bet** | Impact ≥ 4 AND requires both Foundation Builders AND multiple Quick Wins to be live before execution |

A hypothesis cannot be both Quick Win and Big Bet. If criteria conflict, the more conservative classification wins (Foundation Builder > Quick Win, Big Bet > Foundation Builder).

## Worked Example — Meridian Test Case

**Candidate Pool (10 candidates surfaced):**

| # | Hypothesis | Imp | Feas | Align | Score | Classification |
|---|---|---|---|---|---|---|
| H-1 | AI-Assisted Specialist Sourcing | 5 | 3 | 5 | 75 | Foundation Builder |
| H-2 | AI-Powered CV Formatting | 5 | 4 | 5 | 100 | Quick Win |
| H-3 | ATS-Driven Client Status Updates | 4 | 4 | 5 | 80 | Quick Win (post-cutover) |
| H-4 | Candidate Database Revival + Governance | 4 | 3 | 4 | 48 | Foundation Builder |
| H-5 | Interview Scheduling Standardisation (Calendly) | 3 | 5 | 4 | 60 | Quick Win |
| H-6 | Pipeline Visibility Dashboard | 4 | 3 | 3 | 36 | Foundation Builder |
| H-7 | GDPR Compliance Foundation (Sprint 0) | 3 | 4 | 5 | 60 | Foundation Builder (enabler) |
| H-8 | RPO Product Infrastructure | 5 | 2 | 5 | 50 | Big Bet |
| H-9 | Executive Search Workflow Intelligence | 4 | 2 | 4 | 32 | Big Bet |
| H-10 | BD Proposal Automation | 3 | 3 | 2 | 18 | (eliminated) |

**Coverage Check:**
- Priority 1 (Speed): H-1, H-5 cover → ✓
- Priority 2 (RPO Scale): H-8 covers → ✓
- Priority 3 (Smarter Delivery): H-2, H-3 cover → ✓
- Priority 4 (Exec Search Growth): H-9 covers → ✓
- Quick Win count: H-2, H-3, H-5 = 3 ≥ 2 → ✓
- Prerequisite enabler: H-7 → ✓

**Selection — Top 7 by Score:**

| Rank | # | Score | Selected? |
|---|---|---|---|
| 1 | H-2 | 100 | ✓ |
| 2 | H-3 | 80 | ✓ |
| 3 | H-1 | 75 | ✓ |
| 4 | H-5 | 60 | ✓ |
| 4 | H-7 | 60 | ✓ (tied; H-5 higher Impact 3=3, Alignment 4>5? No: H-7 Align=5, H-5 Align=4, so H-7 wins tie-break, but H-5 also selected) |
| 6 | H-8 | 50 | ✓ |
| 7 | H-4 | 48 | ✓ |
| — | H-6 | 36 | dropped |
| — | H-9 | 32 | dropped |

Wait — H-9 covers Priority 4. If H-9 is dropped, Priority 4 is uncovered. **Adjustment applies (Stage 3 Rule 1):** Lower-scored candidate that doesn't cover an uncovered priority gets dropped instead. H-6 has score 36 and doesn't uniquely cover anything (Pipeline Visibility addresses pain point #7 only). H-9 score 32 is the only Priority 4 coverage. **Drop H-6, keep H-9.**

**Final 7:**

| Rank | # | Title | Class |
|---|---|---|---|
| 1 | H-2 | AI-Powered CV Formatting | Quick Win |
| 2 | H-3 | ATS-Driven Client Status Updates | Quick Win (post-cutover) |
| 3 | H-5 | Interview Scheduling Standardisation | Quick Win |
| 4 | H-1 | AI-Assisted Specialist Sourcing | Foundation Builder |
| 5 | H-7 | GDPR Compliance Foundation | Foundation Builder (enabler) |
| 6 | H-4 | Candidate Database Revival + Governance | Foundation Builder |
| 7 | H-8 | RPO Product Infrastructure | Big Bet |
| (8) | H-9 | Executive Search Workflow Intelligence | Big Bet (deferred to AI Audit if Blueprint scope limited to 7) |

Note: Stage 3 Rule 1 (coverage) may force a Big Bet to displace a higher-scoring Foundation Builder. This is intentional — the schema prioritises strategic completeness over local score optimisation.
