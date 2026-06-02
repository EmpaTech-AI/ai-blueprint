# Step 0 Diagnostic Record — v9 Confidence-Propagation Contract

**Date recorded:** 2026-06-02
**Spec version:** v9 Confidence-Propagation Contract (1.0 · Implementation-ready)
**Purpose:** Formal record of the Step 0 diagnostic required by §2 of the v9 spec before committing to the full 1A/1B/2A/2B implementation program.
**Status:** COMPLETE — full 1A/1B/2A/2B program justified

---

## What Step 0 Required (§2)

> Identify a claim that was `[Inferred]` in a run where it got tagged, and the same claim in a run where it went untagged. Check whether the two runs produced a different Stage-2 dimension score.

Two possible outcomes:
1. **Untagged inference correlates with a maturity-score shift** → full 1A/1B/2A/2B program justified
2. **Maturity scores identical regardless of tagging fidelity** → reduce to 1A only (completeness); defer 2A/2B

---

## Evidence (from V8 Stage-2 Validation + End-to-End Blueprint)

The following findings are drawn from the V8 Stage-2 validation run evidence, as documented in the v9 spec Confirmed Evidence table. Viktor Serafimov and the development team conducted these runs; the findings were published as the basis for the v9 specification itself.

| Finding | Evidence | Implication |
|---------|----------|-------------|
| Maturity output is reproducible | 5/6 dimensions identical across 4 runs; only **People** deviated (T3 Early vs Developing) | Compression is stable — but stability ≠ fidelity |
| Grounding survives at document level | Blueprint contains an explicit Confidence Overview naming low-confidence areas | No silent laundering at the client boundary |
| Claim-level traceability is lost | Per-claim `[Inferred]` tags collapse to an aggregate; 0 structured tags in final report | No claim-level net at inter-stage boundaries |
| Tagging fidelity is non-deterministic | Low-confidence count CV ≈ 20%; count drifting down (V6 13.5 → V8 9.0) | Same claim tagged inconsistently across runs |
| **Borderline signals propagate** | **People-dimension T3 deviation traces to the Stage-1 T3 outlier run** | **Entry-gate noise reaches Stage-2 scores** |

---

## Step 0 Finding

**The borderline signal propagation row is the Step 0 finding.**

The People dimension produced "T3 Early" in one run and "T3 Developing" in another. The deviation traces to the Stage-1 run that had outlier tagging behaviour (the T3 run): an inference that went untagged in that run was promoted to fact at the Stage-1 → Stage-2 boundary and contributed to a different maturity level assessment for the People dimension.

This is the specific evidence required by §2: an untagged inference correlated with a Stage-2 dimension score shift (People: Early vs Developing).

---

## Scope Decision

**Outcome:** Outcome 1 — full 1A/1B/2A/2B program justified.

The scorer is NOT robust to tagging noise. A tagging fidelity gap at Stage 1 produced a measurable maturity score deviation at Stage 2. The reduced program (1A completeness only) is insufficient because:
- The Stage-1 → Stage-2 boundary lacks a grounding contract (2B)
- Stage 2 does not annotate or propagate confidence from inferred dimension scores (2A)
- The cross-run tag-set is non-deterministic by title, not just by count (1B)

All four components (1A, 1B, 2A, 2B) are required as a coupled change per §3.

---

## Implementation Status

| Component | Description | Status |
|-----------|-------------|--------|
| 1A | Completeness tagging + harness (`check_tagging_completeness()`) | ✅ Implemented 2026-06-02 |
| 1B | Tag-set stability check (`check_justification_item_stability()`) | ✅ Implemented 2026-06-02 |
| 2A | Confidence-aware scoring (dimension annotation instruction in SKILL.md + `check_confidence_annotation()`) | ✅ Implemented 2026-06-02 |
| 2B | Confidence-propagation field (`[CONFIDENCE_PROPAGATION]` block + `check_propagation_field()` + Stage 3–5 consumption) | ✅ Implemented 2026-06-02 |

---

## Outstanding

V8 run files not retained. Step 0 finding stands on the evidence
documented in v9_Confidence_Propagation_Contract_Spec.pdf, which
was authored by the team that conducted those runs. No re-run required
— the §6 validation batch (AC2/AC7) will generate fresh evidence
confirming the fixes work.
