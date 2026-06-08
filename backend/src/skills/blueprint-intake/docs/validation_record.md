# Validation Record — Blueprint Intake Pipeline

**Schema:** `intake_v1.0`
**Maintained by:** AI Assist BG · Blueprint Practice
**Last updated:** June 2026 (v10 batch)

This document records what has been validated, what has been confirmed as a known-gap, and the
cross-matrix roadmap for expanding validation coverage beyond the primary archetype.

---

## v10 Validation Batch Summary

### Engagement: Meridian Talent Partners (primary archetype)

| Axis | Value |
|---|---|
| Archetype | Recruitment & Talent Solutions |
| Size band | Small (68 employees) |
| Document richness | Standard |
| Regulatory regime | EU / GDPR |
| Runs | 4 (vik_t1, vik_t2, ivan_t1, ivan_t2) |

#### Results

| Check | Result | Notes |
|---|---|---|
| People maturity reproducibility | CONFIRMED CLOSED | 4/4 runs: People = Developing; Evidenced-Absence principle defeated the trigger condition |
| Evidenced-Absence principle (Fix A) | VALIDATED | Positive signals establish Developing; unrecorded items logged as gaps not downgrades; other 5 dimensions unchanged |
| Selected-hypothesis-set stability | CONFIRMED CLOSED | All 4 runs: H6 = "Candidate Database Revival"; V9 Pipeline-Visibility fork does not recur |
| Schema counts | HELD | 8 pain points, 7 hypotheses, all 4 runs |
| v9 confidence-propagation contract | INTACT | [CONFIDENCE_PROPAGATION] present all 4; Overall grounding: Partial all 4 |
| Justification-set stability (floor) | PENDING | 8/7/7/7 pattern diagnosed as downstream of ~20% LC-tagging CV; floor-subset fix implemented; post-fix run not yet executed |

#### Justification residual diagnosis

The 8/7/7/7 justification count variance is correctly attributed to the ~20% low-confidence
tagging CV tracked since v6. The floor-subset fix (v10, `check_stability.py` + `confidence_thresholds.md §1C`)
separates obligatory tags (F-1 through F-5) from discretionary tags. Floor-subset stability is
now the gate; discretionary variance is observed, not blocked. Post-fix confirmation batch pending.

---

## Post-Fix Runs Required (Business Side)

The following runs are not yet executed. They require pipeline execution against real or
synthetic engagement inputs and cannot be completed from the development side alone.

| # | Run | Purpose | Expected result | Dependency |
|---|---|---|---|---|
| 1 | `check_stability.py` on v10 Meridian batch | Confirm instrument detects expected PASS (hypothesis, PP) and FAIL (justification full-set) on pre-fix dossiers | selected-set PASS, justification FAIL | v10 dossier files (vik_t1, vik_t2, ivan_t1, ivan_t2) |
| 2 | Post-fix Meridian batch (small, standard, EU) | Confirm justification floor stable after fix; People 4/4 Developing; no regression | Floor stable; People Developing; schema 8/7; propagation present | Execute pipeline on Meridian materials with v10 fixes active |
| 3 | Veritas Pressings Ltd run | Contrasting-archetype: manufacturing, mid, sparse, Non-EU | People=Developing (Evidenced-Absence holds); Governance=Early (evidenced absence fires); no GDPR references; no false count failures | Execute pipeline on `fixtures/smoke_test_manufacturing_input.md` |

---

## Cross-Matrix Roadmap

The primary validated cell is **Recruitment × Small × Standard × EU**. All other cells are
unvalidated. The table below logs the roadmap priority. Cells marked `VALIDATED` have been
confirmed by a completed engagement run and a passing stability check. All others are pending.

### Dimensions

- **Sector**: Recruitment, Manufacturing, Professional Services, Financial Services, Technology,
  Retail, Healthcare, Logistics, Construction
- **Size band**: micro (<20), small (20–100), mid (100–500), large (500+)
- **Document richness**: sparse, standard, heavy
- **Regulatory regime**: EU/GDPR, Non-EU, Sector-specific

### Priority validation targets

| Priority | Cell | Rationale | Status |
|---|---|---|---|
| P1 | Recruitment × Small × Standard × EU | Primary archetype; Golden Output available | **VALIDATED** (Meridian v1) |
| P2 | Manufacturing × Mid × Sparse × Non-EU | Veritas fixture ready; tests Evidenced-Absence + regime neutralisation | **PENDING** (fixture built; run not executed) |
| P3 | Recruitment × Small × Standard × Non-EU | Tests regime neutralisation on known-good archetype | Not started |
| P4 | Recruitment × Micro × Sparse × EU | Tests size-band + richness modifiers together | Not started |
| P5 | Recruitment × Large × Heavy × EU | Tests upper bound of size + richness modifiers | Not started |
| P6 | Manufacturing × Small × Standard × EU | Manufacturing archetype on baseline profile | Not started |
| P7 | Professional Services × Small × Standard × EU | First skeleton-only archetype promoted to PENDING VALIDATION | Not started |

### Cells explicitly deferred

The following are architecturally supported (the validation harness accepts them) but are not
on the active roadmap until P1–P3 are confirmed:

- All Sector-specific regulatory regime cells (requires a client in financial services or healthcare)
- Large size-band cells beyond P5
- All skeleton-only archetypes beyond Professional Services

---

## Regression Guards

These items must not degrade across any new run, regardless of archetype or profile:

| Guard | How to verify |
|---|---|
| Evidenced-Absence principle: People holds at Developing when positive signals present | Re-run Meridian; confirm People = Developing |
| Evidenced-Absence fires correctly: Governance = Early when absence is evidenced | Run Veritas; confirm Governance = Early |
| FIXED counts unchanged by profile modifiers: 8 PP / 7 H / 5+5 Section E bullets | Validate any run; count must be exact |
| v9 confidence-propagation contract intact | [CONFIDENCE_PROPAGATION] present; Overall grounding: Partial (Meridian) |
| No GDPR references in Non-EU engagement output | Run Veritas; grep output for "GDPR" |
| No global count band re-introduced for justification | Inspect `check_stability.py` — must not gate on justification count range |
| Selection cutoff (0/12) unchanged | Any run; confirm cutoff behaviour in hypothesis selection |

---

## Validation Record Format

When a new run is executed and passes, add a row to the summary table above and append a
subsection below this line with:
- Engagement reference (anonymised if required)
- Run date and operator
- Full stability check output (JSON or human report)
- Any anomalies and their resolution

*No post-fix run records yet — this section will be populated after the business-side runs complete.*
