# Schema Evolution Plan (RM-02)

**Version:** 1.0.0
**Owner:** AI Assist BG — Blueprint Practice
**Review date:** After 3–6 months of production engagements (target: November 2026)
**Last updated:** 2026-05-27

---

## Purpose

This document describes the planned review and evolution process for schema `intake_v1.0`. Premature schema changes are worse than no changes — they break backward compatibility and require migration of all prior dossiers. The 3–6 month window allows enough production engagements to surface real patterns before changing the contract.

---

## What to Measure (Starting Now)

Begin collecting this data from the first production engagement. These metrics determine whether and how the schema should evolve.

### Section B signal quality
Track which Section B row categories produce the most downstream value:
- Which KPI categories are cited most frequently in Section D hypotheses?
- Which KPI categories are never cited in downstream skills?
- Which KPIs are consistently missing (client doesn't track them)?

**Hypothesis:** Financial baseline and operational KPI rows drive 80% of Section D selections. Compliance/data readiness rows drive Open Questions but rarely hypotheses. If this holds at 10+ engagements, consider making compliance rows optional in v2.0.

### Pain point clustering
Across 10+ recruitment engagements, do the 8 selected pain points cluster into:
- A small number of universal types (always selected)
- A long tail of client-specific types (rarely selected)

**Hypothesis:** 4–5 pain points will appear in every recruitment dossier (manual sourcing, database quality, reporting, CV formatting, governance). If so, the library structure can be reorganised into Tier 1 (always consider) vs Tier 2 (client-specific).

### Hypothesis follow-through
Of the 7 hypotheses selected in Step 1, how many survive into the final client deliverable (Step 5) without being removed or substantially changed?
- If >80% survive: the selection algorithm is well-calibrated
- If <60% survive: the selection is generating hypotheses that don't hold up to downstream scrutiny → algorithm needs tightening

### JUSTIFICATION appendix coverage
What % of JUSTIFICATION entries are:
- `[Inferred]` with high confidence ("confirm with X") vs. low confidence ("cannot determine without Y")
- `[Assumption]` that the client later confirms vs. those that turn out to be wrong

Track this across the first 10 engagements to understand where the most uncertainty lies.

---

## Planned Review (November 2026)

At the 3–6 month mark, the Practice Lead and technical lead should answer:

1. **Is the 8+7 count policy right?** Should it be 6+6 for shorter engagements or 10+8 for larger clients?
2. **Is Section B at 40 rows the right depth?** Is it too detailed for small clients, too shallow for complex ones?
3. **Do the archetype libraries need expanding?** Are consultants frequently ignoring library candidates in favour of emerging pain points that should be added to the library?
4. **Should the confidence tag taxonomy expand?** Has `[Document-Backed + Form-Stated]` been useful? Has it confused downstream skills?
5. **Is the JUSTIFICATION structure producing actionable consultant actions?** Are the "What resolves:" entries being followed up?

---

## Triggering a Schema Bump

From `docs/OPERATIONS.md` §When to Bump the Schema:

**Do bump `intake_v2.0`** if any of the following are true after the review:
- Changing the pain point count from 8 to a different fixed value
- Changing the hypothesis count from 7 to a different fixed value
- Adding or removing a mandatory top-level section
- Changing the confidence tag set (e.g. adding `[Reviewed]` as a 5th tag)

**Do NOT bump** if:
- Adding new pain point candidates to an archetype library
- Adding new industry archetypes
- Improving algorithm explanations
- Changing Section B row count bands (these are BOUNDED, not FIXED)

**Breaking change protocol for `intake_v2.0`:**
- All existing dossiers validated under `intake_v1.0` remain valid under `intake_v1.0`
- The harness will use the schema version declared in the dossier header — it will not auto-upgrade
- New engagements start under `intake_v2.0`
- Downstream skills must be updated before use with `intake_v2.0` dossiers
- Coordinate the schema bump with a skill version bump across all 5 Blueprint skills

---

## Candidate Changes Queued for v2.0 Review

These are hypotheses to evaluate at the review — not decisions:

| Candidate change | Hypothesis | Evidence needed |
|---|---|---|
| Make compliance/data rows in Section B optional | They rarely drive downstream citations | Track citation references across 10+ engagements |
| Add Section B row count to archetype defaults (currently one size fits all) | Large clients need 50+ rows; small ones need 25 | Track actual row counts vs client size |
| Add a `[Reviewed]` tag for Assumption items the client has since confirmed | Downstream skills inherit uncertainty that no longer exists post-review | Test with 3 engagements where a client review session happened |
| Split pain points into Tier 1 (universal) and Tier 2 (client-specific) selection | Production evidence suggests ~5 universal pain points exist per archetype | Track which pain points appear in >80% of engagements |
| Add a "competitive context" section | Clients often ask about competitors; the dossier has no place for this | Assess whether Step 3 (Opportunities) would use this data |

None of the above are approved changes. They require production evidence before a decision is made.

---

## Process After the Review

1. Practice Lead and technical lead meet to review the collected metrics
2. Draft proposed schema changes; assign each a `BREAKING` or `NON-BREAKING` label
3. For BREAKING changes: plan migration path (update all skills, create migration tool)
4. For NON-BREAKING: schedule implementation immediately
5. Communicate to team 2 weeks before any breaking change goes live
6. Update `CHANGELOG.md` with rationale tied to production evidence (not just "decided to change it")
