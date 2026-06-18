# Opportunity Scoring Rubric

**Skill:** `blueprint-opportunities`
**Version:** 1.0.0
**Schema:** `intake_v1.0`
**Last updated:** 2026-05-28

---

## Overview

Each opportunity is scored on three dimensions using a multiplicative formula:

```
Strategic Value Score = Impact × Feasibility × Alignment
```

All scores are **integers 1–5** only. No fractional scores. The product ranges from 1 (1×1×1)
to 125 (5×5×5).

---

## Dimension 1 — Impact (1–5)

How much business value this opportunity creates if successfully implemented.

| Score | Definition |
|-------|-----------|
| 5 | Material business impact — major KPI movement or large productivity gain affecting the whole organisation |
| 4 | Significant impact across a major function (e.g., halves sourcing time for the delivery team) |
| 3 | Meaningful improvement to a key KPI or cost centre (noticeable, measurable, but limited scope) |
| 2 | Noticeable improvement to a secondary process (useful but not strategically significant) |
| 1 | Marginal benefit; niche or internal improvement with little measurable business effect |

**Borderline test — 4 vs 5:** Does this opportunity change a metric the CEO/MD tracks in their
board report? If yes → 5. If it changes an operational metric visible only to a function head → 4.

---

## Dimension 2 — Feasibility (1–5)

How readily the client can implement this opportunity given their current capabilities and maturity.

| Score | Definition |
|-------|-----------|
| 5 | Can pilot quickly with existing data/tools and limited change management |
| 4 | Achievable with existing capabilities and minor adjustments |
| 3 | Feasible with moderate effort and clear prerequisites |
| 2 | Significant challenges requiring substantial groundwork |
| 1 | Major blockers — data absent, governance impossible, heavy integration requirements |

**Borderline test — 4 vs 5:** Is there any prerequisite the client does NOT currently have?
If no prerequisites are missing → 5. If even one minor prerequisite is missing → 4.

### Readiness Adjustment Rule (mandatory — apply AFTER initial score)

The maturity snapshot from Step 2 may require downward adjustments to Feasibility:

| Maturity Dimension | Condition | Adjustment |
|--------------------|-----------|-----------|
| Data | Score is "Early" | Reduce Feasibility by 1 for any ML-heavy or multi-source initiative |
| Governance | Score is "Early" | Reduce Feasibility by 1 for regulated or high-risk automated decisions |
| People | Score is "Early" | Reduce Feasibility by 1 for solutions requiring widespread user adoption |
| Technology | Score is "Early" | Reduce Feasibility by 1 for large integrations or API-heavy solutions |

**Rules:**
- Adjustments are cumulative — an opportunity can be reduced by up to 4 if all four dimensions are Early
- **Each Early dimension applies independently. Never collapse two applicable adjustments into one on the grounds that one "already captures" the other. Data Early and Governance Early are separate constraints — data quality risk vs. legal/compliance risk respectively. If both apply, both reduce Feasibility.**
- **Remedial opportunities are not exempt. An opportunity whose purpose is to address a maturity gap (e.g., a GDPR sprint that remediates Early Governance) still receives the adjustment. The adjustment measures execution difficulty, not intent — building governance from zero is harder regardless of whether the work is foundational.**
- Adjusted Feasibility has a floor of 1 (never below 1)
- **Every adjustment must be noted explicitly** in the opportunity card: "Feasibility reduced from 4 to 3 due to Early Data maturity [Inferred from Stage 2 snapshot]."
- If no adjustments apply, note "No maturity adjustments required."

---

## Dimension 3 — Strategic Alignment (1–5)

How strongly the opportunity supports the client's stated strategic goals and priorities.

| Score | Definition |
|-------|-----------|
| 5 | Directly addresses a named strategic priority owned by a named executive in the strategic plan |
| 4 | Directly enables a named priority but the connection requires one inference step |
| 3 | Indirectly supports a stated priority (two or more inference steps) |
| 2 | Supports an operational priority not stated in documents but rational given the business model |
| 1 | No connection to any stated priority or evident operational need |

**Borderline test — 4 vs 5:** Can you quote a sentence from the strategic plan or intake form
that names this opportunity's mechanism? If yes → 5. If you need to paraphrase → 4.

---

## Classification Rules

After scoring, classify each opportunity into one of three categories:

| Class | Criteria |
|-------|---------|
| **Quick Win** | Feasibility ≥ 4 (post-adjustment) AND can deliver visible value within 4–8 weeks |
| **Foundation Builder** | Addresses a maturity gap or enables future opportunities; moderate effort; Feasibility 2–4 **and Impact ≤ 3** |
| **Big Bet** | Impact ≥ 4 AND Feasibility ≤ 3; requires significant investment, change management, or maturity growth |

**Edge cases:**
- An opportunity with Feasibility 4 and very high Impact may still be a Foundation Builder if
  it is primarily about fixing an infrastructure gap (e.g., data governance). Use judgment and
  document the classification rationale. **This edge case applies only when Feasibility ≥ 4.**
- **Big Bet takes precedence over Foundation Builder when Impact ≥ 4 AND Feasibility ≤ 3.** The fact that an opportunity also addresses a maturity gap does not change the classification — if Impact ≥ 4 and post-adjustment Feasibility ≤ 3, it is a Big Bet. Classify as Foundation Builder only when Feasibility ≥ 4 or Impact ≤ 3.
- An opportunity cannot be BOTH a Quick Win and a Big Bet. If scores suggest both, re-check
  the Feasibility score — Feasibility ≥ 4 and Impact ≥ 4 is a Quick Win, not a Big Bet.

**Portfolio balance requirement:**
The final 5–7 opportunities SHOULD include at least 1 Quick Win, 1 Foundation Builder, and 1 Big Bet.
If fewer than 2 Quick Wins qualify, flag the portfolio as "Foundation-Heavy" in the output.

---

## Ranking and Ordering

1. Sort all opportunities by Strategic Value Score (Impact × Feasibility × Alignment) DESC
2. Tie-breaking (in order):
   - Higher Impact wins
   - Higher Alignment wins
   - Higher Feasibility wins (post-adjustment)
   - Alphabetical by opportunity title
3. Apply classification: group as Quick Wins → Foundation Builders → Big Bets for the Portfolio View

---

## Machine-Readable Output Format

After the human-readable Scores line in each opportunity card, include the machine-readable
comment block for downstream pipeline consumption:

```
**Scores:** Impact 5/5 | Feasibility 4/5 | Alignment 5/5
**Classification:** Quick Win
<!-- score: id=H-RT-02 impact=5 feasibility=4 alignment=5 product=100 class=QuickWin -->
```

`id` — canonical archetype library ID (required; matches the Stage 1 hypothesis `id=` field).
`class` values: `QuickWin`, `FoundationBuilder`, `BigBet` (no spaces, CamelCase).
`product` — must equal `impact × feasibility × alignment` exactly; the pipeline auto-patches
arithmetic errors and logs a reviewer flag (GATE 3).

---

## Relationship to Intake Dossier Scores

The intake dossier (`blueprint-intake`) produces hypothesis scores using `hypothesis_selection.md`.
Those scores use the same Impact × Feasibility × Alignment formula. The key difference:

- **Intake scores** are evaluated before the maturity snapshot exists — they use archetype-level
  feasibility anchors and do not apply the Readiness Adjustment Rule
- **Opportunity scores** (this skill) apply the Readiness Adjustment Rule from Step 2

Always re-apply the adjustment rule even if intake scores are available. An opportunity that
scored Feasibility 4 at intake may score 3 here after a Data "Early" adjustment.
