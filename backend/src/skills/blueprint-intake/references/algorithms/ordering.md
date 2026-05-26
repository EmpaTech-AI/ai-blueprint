# Ordering Algorithm

**Schema:** `intake_v1.0`
**Applies to:** Section ordering, item ordering within sections
**Purpose:** Eliminate ordering variance — same inputs always produce same sequence

---

## Section Order (Fixed)

Top-level section order is non-negotiable and locked in `intake_v1.0.md` §3. Validators reject dossiers with mis-ordered sections.

## Section B Row Ordering

Rows in Section B (Key Data Points) are ordered by category, then by within-category specificity.

### Category Order

1. Revenue & Financial Baseline
2. Margin & Profitability
3. Headcount & Team Structure
4. Strategic Targets
5. Operational KPIs
6. Process Volumes
7. Technology Stack & Costs
8. Compliance & Data Readiness
9. Budget & Timeline (intake form data)

### Within-Category Order

- Most aggregate metric first (e.g. "Total FY2025 Revenue" before "Permanent Placement Revenue")
- Current state before targets within the same metric family
- Annual figures before quarterly figures

## Section C Pain Point Ordering

Per `pain_point_selection.md` Stage 4. Summary:

1. Severity DESC
2. Impact Area Canonical Order (below)
3. Evidence Strength DESC
4. Alphabetical by pain point title

### Impact Area Canonical Order

```
Revenue → Cost → Risk → Time → Customer → Compliance → Strategic → Team
```

When a pain point has multiple impact areas, use the leftmost area in this list for ordering purposes.

## Section D Hypothesis Ordering

Per `hypothesis_selection.md` Stage 5. Summary:

1. Quick Wins (in Strategic Value Score order DESC)
2. Foundation Builders (in Strategic Value Score order DESC)
3. Big Bets (in Strategic Value Score order DESC)

## Section E Bullet Ordering

Both sub-sections (Org and Process) have fixed bullet order:

### Org Bullets (in this order):

1. Leadership structure (CEO + direct reports)
2. Delivery function breakdown (largest sub-unit first)
3. Key dependencies / single points of failure
4. Semi-independent or specialised units (if any; otherwise: geographic structure)
5. Cross-office or cross-functional structural notes

### Process Bullets (in this order):

1. Documented process compliance status
2. Key friction point #1 (highest-effort step)
3. Key friction point #2 (lowest-compliance step)
4. Data flow and integration status
5. Leadership visibility / control gaps

## Section F Document Index Ordering

Documents listed in upload order (Doc # column), regardless of category. This matches the intake form's document slot numbering and is the most easily auditable order.

## Section G Open Questions Ordering

By "claim confidence impact" DESC: questions that, if answered, would upgrade the most claims appear first.

## Section H Reviewer Checklist Ordering

Fixed category order:

1. Highest-risk numbers to verify
2. Contradictions detected between form and documents
3. Low-confidence extractions
4. Document quality issues

Within each category, items ordered by severity DESC, then alphabetically.

## [JUSTIFICATION] Block Ordering

Numbered entries in body-text appearance order. The first `[Inferred]` or `[Assumption]` tag encountered when reading top-to-bottom is Item 1, the second is Item 2, etc. This ensures the appendix is traversable in parallel with the body.

## Tie-Breaking Default

When any of the rules above produce a tie not explicitly addressed, the final tie-breaker is: **alphabetical by primary visible text (title, statement, or first bullet)**. This guarantees full determinism.
