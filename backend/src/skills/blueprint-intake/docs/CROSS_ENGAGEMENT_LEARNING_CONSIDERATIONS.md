# Cross-Engagement Learning — Strategic Considerations (RM-03)

**Version:** 1.0.0
**Owner:** AI Assist BG — Blueprint Practice (strategic decision — not a technical spec)
**Last updated:** 2026-05-27
**Decision required by:** Practice Lead + Data Protection Lead before any implementation begins

---

## What This Is About

The current Blueprint framework is **stateless across engagements**. Each engagement starts fresh. The skill sees only the current client's materials; it has no memory of prior clients or how previous engagements went.

This document describes what cross-engagement intelligence could look like, what decisions must be made before enabling it, and what early architectural choices in the current system preserve or close off the option.

**This is a product strategy question, not a technical one.** Do not implement without explicit sign-off from the Practice Lead and Data Protection Lead.

---

## What Cross-Engagement Learning Could Enable

### Pattern intelligence
"Of 15 recruitment engagements, 12 flagged candidate database quality as a top pain point. This is now a Tier 1 pain point in the recruitment library."

This is low-risk — it uses aggregate, anonymised pattern data to improve the archetype library. We already do this informally (the recruitment archetype pain point library was built from qualitative knowledge of past engagements). Formalising this as a data-driven process is low-controversy.

### Benchmark intelligence
"Your OEE of 67% places you below the 25th percentile for SME manufacturers in the EU. Industry median is 74%."

This requires actual client data from multiple engagements to compute a benchmark. It is high-value for clients but high-risk: it uses one client's data to contextualise another's. This requires explicit consent from every client whose data contributes to the benchmark pool.

### Hypothesis outcome tracking
"Of 7 AI-Powered CV Formatting hypotheses selected across recruitment engagements, 6 resulted in implemented projects. This hypothesis has high completion probability."

This requires tracking what happens after the Blueprint — did the client implement the opportunity? This is longitudinal data collection that goes beyond the current engagement scope.

### Predictive selection calibration
"Based on prior engagements, recruitment firms with >40 staff and poor CRM data quality almost always select AI-Assisted Sourcing and Candidate Database Revival. Auto-suggest these hypotheses with higher prior scores."

This is the most powerful form of cross-engagement learning but also the most complex. It requires enough engagements (minimum ~20 per archetype) to make statistically meaningful predictions.

---

## Decisions That Must Be Made First

### 1. Client consent model

**Option A — Explicit opt-in per client**
Each client signs an addendum authorising their anonymised engagement data to contribute to AI Assist BG's benchmark and learning pool. Preferred for compliance. Requires re-consenting existing clients.

**Option B — Implicit opt-in via engagement terms**
Include cross-engagement anonymised learning as a clause in the standard engagement agreement. All new clients automatically consent unless they opt out. Simpler operationally, but requires legal review.

**Option C — No cross-engagement use of client data**
AI Assist BG uses only publicly available benchmarks and its own practitioners' expertise to improve the framework. Zero risk, zero benefit from actual client data.

**Recommendation:** Decide Option A or C first. Do not implement Option B without legal counsel review.

### 2. Anonymisation standard

Before any client data enters a cross-engagement pool, it must be anonymised such that:
- No individual or company can be identified from the dataset
- Aggregates are only published when the contributing sample size is ≥ 5 (k-anonymity principle)
- Revenue and financial data are suppressed or banded (e.g. "€1M–€5M" not exact figures)

### 3. Data residency for the learning store

Where does the cross-engagement data live?
- **EU-only residency** (required if any client has an EU data residency requirement)
- **AI Assist BG controlled infrastructure** (not Anthropic, not other third parties)
- **Retention period** — how long does historical engagement data contribute to the pool?

This is independent of where individual engagement dossiers are stored (covered in `docs/ARTIFACT_LIFECYCLE_POLICY.md`). The learning store is a separate, aggregate data system.

### 4. Right to erasure from the learning pool

If a client exercises their GDPR right to erasure, their data must be removable from:
- Their individual dossier artifacts (covered by existing procedure)
- The cross-engagement learning pool

If the learning pool has already computed aggregates from that client's data, and those aggregates can no longer be disaggregated, the right-to-erasure obligation may be technically impossible to fulfil completely. This must be resolved before enabling learning that uses identifiable client-level features.

**Safest approach:** The learning pool stores only pre-anonymised, aggregated features (e.g. "pain point X appeared in 60% of engagements in this archetype") — not individual client records. This eliminates the right-to-erasure complication.

---

## Architectural Decisions to Make Now (Even Without Committing to Cross-Engagement Learning)

These early decisions preserve optionality without committing to implementation:

### Keep `pipeline_result_*.json` structured

The pipeline result JSON (produced by `run_intake_automated.py`) already contains enough metadata to support cross-engagement analysis: gate pass rate, model, cost, chunk durations. It does NOT contain dossier content.

**Decision:** Do not change the `pipeline_result_*.json` schema in ways that remove these fields. They are useful for quality monitoring (QA-04) regardless of cross-engagement learning.

### Do not embed client-identifying data in log files

The current structured logs (`.jsonl`) contain `engagement_ref` and `client_name`. Do not add fields containing client financial data, health data, or individual contact names to these logs.

### Keep dossier files separately from aggregated metrics

The current design separates:
- Individual dossier markdown files (`outputs/<ref>/dossier_*.md`) — contain client data
- Pipeline result JSON (`outputs/<ref>/pipeline_result_*.json`) — contain metadata only
- Log files (`outputs/logs/*.jsonl`) — contain operational events only

This separation is the right architecture for cross-engagement learning: the learning store would be built from metadata + anonymised features, not from raw dossier content.

---

## Recommended Path

1. **Now:** Continue with stateless framework. Collect production data via `monitor_production.py` (gate pass rates, costs, durations — no client content).

2. **After 10 engagements:** Review the qualitative patterns informally. Update archetype libraries based on practitioner observation (this is already permitted and does not require cross-engagement data infrastructure).

3. **After 25–30 engagements:** If the pattern intelligence use case is valuable, draft the client consent clause and present to legal counsel. Only then evaluate the technical implementation.

4. **Do not build the data infrastructure before the consent model is decided.** Building first and deciding governance later is the most common GDPR compliance failure mode.

---

## Summary

| Consideration | Current state | What needs to change before enabling |
|---|---|---|
| Client data in cross-engagement pool | Not done | Legal consent model decision |
| Anonymisation standard | Not defined | Define k-anonymity rules |
| Data residency for learning store | Not applicable | Decide EU-only vs. flexible |
| Right to erasure from pool | Not applicable | Resolve technically (or use aggregate-only approach) |
| Architectural readiness | Partial (good separation exists) | No changes needed yet |
| Practitioner knowledge sharing | Done informally (archetype libraries) | Continue; formalise when volume warrants |
