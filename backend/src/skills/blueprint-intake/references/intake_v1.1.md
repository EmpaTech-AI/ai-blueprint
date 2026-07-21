# Perfect Intake Output — Schema Specification

**Schema version:** `intake_v1.1`
**Owner:** AI Assist BG — Blueprint Practice
**Applies to:** `blueprint-intake` skill output (Step 1 of 5)
**Status:** Active (supersedes `intake_v1.0` for all new engagements; v1.0 remains on file for lineage — engagements in flight finish under their started version)
**Ratification:** version event 2026-07-21, transcribing the Meridian Golden Benchmark v1.1 §A encoding register (Practice confirmation 2026-07-20)
**Companions:** `algorithms/`, `citation_rules.md`, `source_registry.md`, `confidence_thresholds.md`, `preflight.md`, `archetypes/INDEX.md`, `archetypes/_core.md`

---

## 1. Purpose

This schema locks the structure of every Compressed Client Dossier produced by `blueprint-intake`. The schema is **the single source of truth** — when the schema and prose guidance in `SKILL.md` disagree, the schema wins; when the schema and the Golden Output disagree, the schema wins and the divergence is a defect to report. Outputs that do not conform fail validation and are rejected by the harness before being passed downstream.

**What changed from v1.0 (summary):** PP-CORE-00 instantiation + pool eligibility (§4.5), severity enum extension, H-CORE-00 gated slot (§4.6), linkage rule extension (§4.6), Section I INTAKE_FACTS formalized with two new fields (§4.11), Section H category 2 extended to document↔document conflicts with a per-fixture expected-contradictions register (§4.10), JUSTIFICATION entry format unified to the canonical `#### N. [Tag]` form (§4.12 — the v1.0 `Item N —` form is retired everywhere).

## 2. Count Policies

| Policy | Behaviour | Used For |
|---|---|---|
| **FIXED** | Exact integer count required | Identity-shaping counts |
| **BOUNDED** | Integer range with archetype default; ±20% tolerance | Density counts |
| **GATED** | Count or element conditional on a deterministic gate; harness checks gate-consistency | PP-CORE-00, H-CORE-00, Open Questions |

## 3. Top-Level Document Structure

Every dossier contains the following elements in this exact order. Any deviation fails validation.

```
1. Header Block             (metadata)
2. Document Receipt         (table of uploaded files + parse status)
3. Section A                (Executive Summary)
4. Section B                (Key Data Points)
5. Section I                (INTAKE_FACTS machine block — emitted at end of Chunk 1, physically after Section B)
6. Section C                (Detected Pain Points)
7. Section D                (Opportunities and Hypotheses)
8. Section E                (Org and Process Views)
9. Section F                (Document Index)
10. Section G               (Open Questions)
11. Section H               (Reviewer Checklist)
12. [JUSTIFICATION] Block   (mandatory appendix)
```

## 3a. Heading Format Requirements

Unchanged from v1.0: Section headings H2 (`## A) Executive Summary`); Pain Point and Hypothesis headings H3 with Unicode em-dash U+2014 (`### Pain Point 1 — Title`); `## [JUSTIFICATION]` H2. Forbidden alternates (bold text, triple/double hyphens, en-dash, wrong heading level) fail validation.

**v1.1 additions:** the PP-0 heading is `### Pain Point 0 — Fragmented data infrastructure: no integrated single source of truth`; the H-0 heading is `### Hypothesis 0 — AI Company Brain — unified data foundation + AI knowledge layer` (positional numbering: PP-0/H-0 are position 0; the rest number 1–N).

## 4. Field Specifications

### 4.1 Header Block (mandatory)

As v1.0 (Client Legal Name UPPERCASE, fixed Document Title / Prepared by / Classification / Pipeline Position strings, Date, Engagement Reference), with:

| Field | v1.1 value |
|---|---|
| Schema Version | `intake_v1.1` |
| Industry Archetype | From `archetypes/INDEX.md` |
| Company Size Band / Document Richness / Regulatory Regime | As v1.0 (operator-declared) |

### 4.2 Document Receipt

Unchanged from v1.0.

### 4.3 Section A — Executive Summary

Unchanged from v1.0: FIXED 4 paragraphs, target 300 words (WARN > 400, FAIL > 430), ≥2 citations per paragraph, per-paragraph content mandates.

### 4.4 Section B — Key Data Points

Unchanged from v1.0 (BOUNDED, archetype default; canonical sources; one tag per row; 8 mandatory metric categories).

### 4.5 Section C — Detected Pain Points

- **Policy:** FIXED at 8 = 5 form-stated + PP-CORE-00 (GATED) + 2 emergent, **or** 5 + 3 emergent when the PP-0 gate does not fire
- **Pool eligibility (v1.1):** only `process`-class candidates enter the emergent pool (`algorithms/pain_point_selection.md` Stage 0; archetype `eligibility` column). Organisational frictions → delivery risks; product-gaps → opportunity context. Notable ineligible candidates appear in the Section H runner-up register.
- **PP-CORE-00 gate:** `archetypes/_core.md` §2 — deterministic Document-Backed conditions; absorption + tombstone rules apply
- **Selection:** `algorithms/pain_point_selection.md` · **Ordering:** `algorithms/ordering.md` (PP-0 → form order → emergent by score)
- **Severity enum (v1.1):** `Critical (systemic)` / `Critical (acute)` / `High` / `Medium-High` / `Medium` / `Low`
- **Per-pain-point fields** (all mandatory; PP-0 additionally carries Scope / Precedence / Absorbs and the severity-logic sentence):

```markdown
### Pain Point N — Title with Descriptive Subtitle
<!-- pp-id: PP-RT-XX -->        ← or PP-CORE-00; the line immediately after the heading

Statement: [Single paragraph plain-language description]

Evidence:
- [3–5 bullets, one citation tag each]

Impact area: [Revenue / Cost / Risk / Time / Customer / Compliance / Team / Strategic]
Severity: [v1.1 enum value]
Impact & audit relevance: [1–2 sentences — what this blocks or gates, and what the audit should verify]
Confidence: [Confidence tag with brief justification]
```

### 4.6 Section D — Opportunities and Hypotheses

- **Policy:** 7 hypotheses + H-CORE-00 (GATED — `archetypes/_core.md` §3 promotion gate; reserved slot, never displaces)
- **Selection:** `algorithms/hypothesis_selection.md` (v1.1 pool filters: `band1_pool`, `h0_consumer`) · **Ordering:** H-0 slot 0, then Quick Wins → Foundation Builders (enabler tier first) → Big Bets
- **Per-hypothesis fields:** as v1.0 (description with ≥1 numerical anchor; 3–5 supporting-evidence bullets; What we'd validate next; Classification; Linked Pain Point(s); mandatory `Selection score` line; mandatory `<!-- score: ... -->` 14-field marker per SKILL.md)
- **Linkage rule (v1.1 extension):** every hypothesis links to ≥1 Section C pain point, **or** — when its natural anchor is a non-selected/ineligible candidate — to a named strategic priority plus the runner-up register entry, in the form `Linked Pain Point(s): Strategic Priority N (name); <candidate> (runner-up register)`. Hypotheses with neither linkage fail validation.
- **H-0 handling:** one undivided entity, one score marker, fixed title and cross-cutting strategic-link strings, capability/evidence/prerequisites content only — no product names, tiers, or pricing (preflight Pattern Set 8). Sub-entity decomposition anywhere in Sections C–D or downstream stages is a T-30 violation.

### 4.7 Section E — Org and Process Views

Unchanged from v1.0 (FIXED 5 + 5 with coverage mandates).

### 4.8 Section F — Document Index

Unchanged from v1.0.

### 4.9 Section G — Open Questions

Unchanged from v1.0 (GATED 3–6; each must reference an evidence gap that would upgrade ≥1 claim).

### 4.10 Section H — Reviewer Checklist

FIXED 5 categories, each ≥1 item:

1. **Highest-risk numbers to verify** — numeric variances and verification items (including document↔document numeric variances, e.g. conflicting targets)
2. **Contradictions detected** — **directional or factual conflicts**, form↔document **or document↔document** (v1.1 extension). When the engagement runs on a pinned fixture with an expected-contradictions register (e.g. the Meridian benchmark §H), a conforming run surfaces the register's FAIL-level rows in their expected categories; cross-run comparison diffs the CR-ID sets.
3. **Low-confidence extractions** — as v1.0
4. **Document quality issues** — as v1.0
5. **Strategic Priority Coverage** — as v1.0, plus (v1.1): record every `band1_pool` exclusion with its score and re-entry condition, and every `h0_consumer` tombstone. The uncovered-priority documentation format is unchanged.

**Tombstone / runner-up register (v1.1, lives under category 5 or as a trailing block):** absorbed candidates ("absorbed into PP-0; evidence relocated to PP-RT-XX"), runner-up pains with eligibility classes, pool exclusions. Internal only — Stage 5 never renders tombstones to the client (preflight Pattern Set 8).

### 4.11 Section I — INTAKE_FACTS Canonical Block (mandatory)

Emitted at the end of Chunk 1 (after Section B, before Checkpoint 1). HTML comment block; the single source of truth for downstream stages. Fields (all v1.0 rules + T-14 verbatim-copy discipline apply):

```
CLIENT_NAME · CEO_NAME · INDUSTRY · ARCHETYPE · HEADCOUNT · REVENUE_RANGE ·
JURISDICTION_LIST · TOP_PRIORITIES · KEY_METRIC_1 · KEY_METRIC_2 · SYSTEM_EVENT_CUTOVER ·
INTEGRATION_STATUS · ORG_FRICTION_SIGNAL
```

**v1.1 field rules:**
- `REVENUE_RANGE` — the form's stated range **exactly as stated** (a dropdown answer like `€2M–€10M` is copied character-for-character; never substitute a point figure from documents).
- `KEY_METRIC_1/2` — first (and next) quantitative claim in document read-sequence, **prose sentences only**: table cells, header dates, and figure captions are excluded. Copy the clause verbatim up to the next period.
- `INTEGRATION_STATUS` *(new)* — the verbatim integration/SSOT statement from the tech inventory or equivalent (e.g. the "no active integrations…" sentence), or the literal `none-documented`. Feeds the PP-CORE-00 gate and the Stage 2 Layer-1 grade deterministically.
- `ORG_FRICTION_SIGNAL` *(new)* — the verbatim strongest documented adoption-resistance/reversion statement, or `none-documented`. Feeds the Stage 2 Alignment grade.
- A dossier missing this block fails schema validation (this section, §4.11 — the v1.0 dead-pointer to "§4.9" is corrected).

### 4.12 [JUSTIFICATION] Block

- **Policy:** mandatory; opens with `### Confidence Overview` (tag-free meta-sentence), then one numbered entry per distinct `[Inferred]`/`[Assumption]` claim.
- **Entry format — the ONLY valid form (v1.1 unification; the v1.0 `Item N —` format is retired):**

```markdown
#### N. [Inferred|Assumption] {5–8 word label} [floor]?
- **Claim:** "{verbatim from body}"
- **Element:** {H-RT-XX / H-CORE-00 / PP-RT-XX / PP-CORE-00 / dimension / "n/a"}
- **Floor category:** {F-N — advisory}
- **Why inferred|assumed:** {evidence gap}
- **Missing data:** {what would upgrade the tag}
- **Consultant action:** {one concrete step}
```

- Every selected element must be covered by ≥1 entry via `Element:` (the B4 floor gate). Distinct-claim and dedup rules as v1.0. Entries lacking `[Tag]` after the number are unparsed (v24 P3a) — preflight rejects them.

## 5. Validation Rules Summary

The harness (`harness/validate_intake.py`) enforces mechanically; schema-aware by the `Schema Version` header (v1.0 dossiers validate under v1.0 rules). v1.1 additions: PP-0/H-0 gate-consistency (PP-CORE-00 present ⟺ gate evidence cited; H-CORE-00 present ⟺ PP-CORE-00 present), severity enum, `pp-id`/`score id` accept `CORE` namespace, Section I block + new fields, linkage rule extension, JUSTIFICATION canonical-format-only.

## 6. Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | May 2026 | Initial schema (Meridian test case audit findings) |
| 1.1 | July 2026 | CORE pattern (PP-0/H-0), eligibility + pool filters, severity enum, ordering contract, Section H cat-2 extension + CR register, INTAKE_FACTS formalization + 2 fields, JUSTIFICATION format unification. Transcribes Meridian Golden Benchmark v1.1 §A (A-1…A-18) |
