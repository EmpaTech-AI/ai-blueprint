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

| Score | Definition |
|---|---|
| 5 | Resolves the top-ranked pain point AND directly supports a board-approved strategic priority |
| 4 | Resolves a top-3 pain point OR directly supports a strategic priority |
| 3 | Resolves a top-5 pain point |
| 2 | Resolves a bottom-3 pain point or enables future opportunities |
| 1 | Marginal operational benefit |

### Feasibility (1–5)

| Score | Definition |
|---|---|
| 5 | Existing tool already licensed; minimal integration; low organisational change |
| 4 | Tool category proven by industry library; integration documented; moderate change |
| 3 | Tool category exists but no Meridian-equivalent precedent; requires evaluation |
| 2 | Previous attempt failed (per PDF 8) but root cause was process not technology |
| 1 | Previous attempt failed for technology reasons OR no documented industry precedent |

### Alignment (1–5)

| Score | Definition |
|---|---|
| 5 | Directly addresses a named PDF 7 priority owner's stated objective |
| 4 | Addresses a stated priority but not the primary owner's focus |
| 3 | Indirectly supports a stated priority |
| 2 | Supports an unstated but rational operational priority |
| 1 | Neither stated nor obviously needed |

## Stage 3 — Required Coverage

Before final ranking, validate coverage. Adjust if any of the following are not met:

1. **All 4 PDF 7 strategic priorities must have ≥1 candidate hypothesis addressing them.** If a priority is uncovered, lower the score of the lowest-ranked candidate and elevate one that covers the gap.

2. **At least 2 hypotheses must be "Quick Win" classification.** If fewer than 2 candidates qualify, the framework flags the engagement as "Foundation-Heavy" in Section H.

3. **At least 1 hypothesis must be tagged as a prerequisite enabler** (typically governance/compliance). If none qualify, the engagement is flagged as ungoverned-risk in Section H.

## Stage 4 — Rank and Select Top 7

Sort candidates by Strategic Value Score DESC. Take the top 7.

### Tie-Breaking (in order)

1. Higher Impact component wins
2. Higher Alignment component wins (strategic priority alignment beats feasibility on ties — Blueprint targets strategic outcomes, not just easy wins)
3. Higher Feasibility component wins
4. Hypothesis linked to higher-severity pain point wins
5. Alphabetical by hypothesis title

## Stage 5 — Final Ordering for Presentation

Hypotheses are presented in this order in the dossier (NOT score order, which is internal only):

1. Quick Wins first (in score order)
2. Foundation Builders next (in score order)
3. Big Bets last (in score order)

This ordering matches downstream skill expectations (`blueprint-roadmap` assumes Quick Wins come first).

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
