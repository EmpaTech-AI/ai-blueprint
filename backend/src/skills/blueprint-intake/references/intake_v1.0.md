# Perfect Intake Output — Schema Specification

**Schema version:** `intake_v1.0`
**Owner:** AI Assist BG — Blueprint Practice
**Applies to:** `blueprint-intake` skill output (Step 1 of 5)
**Status:** Active
**Companions:** `algorithms/`, `citation_rules.md`, `source_registry.md`, `confidence_thresholds.md`, `archetypes/INDEX.md`

---

## 1. Purpose

This schema locks the structure of every Compressed Client Dossier produced by `blueprint-intake`. The schema is **the single source of truth** — when the schema and prose guidance in `SKILL.md` disagree, the schema wins. Outputs that do not conform to this schema fail validation and are rejected by the harness before being passed downstream.

## 2. Count Policies

Three policies govern how counts are constrained. Each field declares its policy.

| Policy | Behaviour | Used For |
|---|---|---|
| **FIXED** | Exact integer count required | Identity-shaping counts where varying the count changes the analytical shape of the dossier |
| **BOUNDED** | Integer range with archetype default; ±20% tolerance permitted | Density counts where genuine variation between clients is expected |
| **GATED** | Integer range with quality gate; harness flags if the lowest-ranked item falls below quality threshold | Conditional counts where forcing inclusion produces filler |

## 3. Top-Level Document Structure

Every dossier contains the following sections in this exact order. Any deviation fails validation.

```
1. Header Block             (metadata)
2. Document Receipt         (table of uploaded files + parse status)
3. Section A                (Executive Summary)
4. Section B                (Key Data Points)
5. Section C                (Detected Pain Points)
6. Section D                (Opportunities and Hypotheses)
7. Section E                (Org and Process Views)
8. Section F                (Document Index)
9. Section G                (Open Questions)
10. Section H               (Reviewer Checklist)
11. [JUSTIFICATION] Block   (mandatory appendix)
```

## 4. Field Specifications

### 4.1 Header Block (mandatory)

Required fields:

| Field | Format | Notes |
|---|---|---|
| Client Legal Name | UPPERCASE, single line | Must match intake form Section 1 |
| Document Title | "Compressed Client Dossier — AI Value Blueprint" | Fixed string |
| Prepared by | "AI Assist BG — Blueprint Intake Analyst" | Fixed string |
| Date | Month YYYY | E.g. "May 2026" |
| Classification | "Internal — Not for Client Distribution" | Fixed string |
| Pipeline Position | "Step 1 of 5 → Feeds Maturity Scorer, Opportunity Harvester, Roadmap Composer, Assembly" | Fixed string |
| Schema Version | `intake_v1.0` | Must match this schema version |
| Industry Archetype | From `archetypes/INDEX.md` | E.g. "Recruitment & Talent Solutions" |
| Engagement Reference | Optional | If provided in intake form, must appear here |

Forbidden in header: test metadata strings (`TEST \d`, `temp \d+`, `TEMP\d+`), pipeline-stage markers, orchestrator handoff acknowledgements. Pre-flight sanitization removes these (see `pipeline/preflight.md`).

### 4.2 Document Receipt (mandatory)

Required: a table with columns `# | Filename | Category | Parse Status` containing **one row per uploaded document**. Parse Status must be one of: `High confidence`, `Medium confidence`, `Low confidence`, `Failed`. Any `Failed` or `Low confidence` row triggers a Section H Reviewer Checklist entry.

### 4.3 Section A — Executive Summary

- **Policy:** FIXED at 4 paragraphs
- **Word count:** BOUNDED 250–350 words total (±20% = 200–420 acceptable)
- **Citations per paragraph:** Minimum 2
- **Mandatory content per paragraph:**

| Paragraph | Mandatory Content |
|---|---|
| 1 | Company identification, geography, business model, revenue + headcount baseline |
| 2 | Strategic context: top priorities (must cite intake form Section 2 + at least one document) |
| 3 | Top operational constraint with quantified evidence (must cite ≥2 documents) |
| 4 | Inflection point / change context + named internal champion + named resistance points |

### 4.4 Section B — Key Data Points

- **Policy:** BOUNDED, archetype default applies (Recruitment: 35–50 rows)
- **Format:** Table with columns `Metric / Data Point | Value | Source | Confidence Tag`
- **Source column:** Must use canonical source names from `source_registry.md`
- **Confidence Tag column:** Must use one of the four tags in `confidence_thresholds.md`
- **Mandatory metric categories** (each must contribute ≥1 row):
  1. Financial baseline (revenue, growth, margin, profit)
  2. Headcount and structure (total FTEs, delivery FTEs, key role counts)
  3. Strategic targets (FY targets with quantified figures)
  4. Operational KPIs (time-to-fill, win rate, conversion, or industry equivalents)
  5. Process volumes (mandates per period, transactions per period, or equivalents)
  6. Technology stack and costs (named systems with annual costs from PDF 6)
  7. Compliance/data readiness (GDPR posture, consent status, data quality)
  8. Budget & timeline (from intake Section 7)

### 4.5 Section C — Detected Pain Points

- **Policy:** FIXED at 8 pain points
- **Selection:** See `algorithms/pain_point_selection.md`
- **Ordering:** See `algorithms/ordering.md`
- **Per-pain-point fields** (all mandatory):

```
Pain Point N — [Title with descriptive subtitle]

Statement: [Single paragraph plain-language description]

Evidence:
- [Bullet 1 with citation]
- [Bullet 2 with citation]
- [Bullet 3 with citation]
- [Optional: Bullets 4-5 if needed for completeness]

Impact area: [One or more of: Revenue / Cost / Risk / Time / Customer / Compliance / Team / Strategic]
Severity: [High / Medium-High / Medium / Low]
Confidence: [Confidence tag with brief justification]
```

Minimum 3 evidence bullets per pain point. Maximum 5.

### 4.6 Section D — Opportunities and Hypotheses

- **Policy:** FIXED at 7 hypotheses
- **Selection:** See `algorithms/hypothesis_selection.md`
- **Ordering:** See `algorithms/ordering.md`
- **Per-hypothesis fields** (all mandatory):

```
Hypothesis N — [Title]

[1-2 paragraph description with embedded citations and at least one numerical anchor]

Supporting evidence: [List of 3-5 citations, each on its own bullet]

What we'd validate next: [Single sentence, specific and actionable]

Classification hypothesis: [Quick Win / Foundation Builder / Big Bet]
Linked Pain Point(s): [Reference to Section C item numbers, e.g. "PP1, PP3"]
```

Each hypothesis must link to ≥1 pain point. Hypotheses without a linked pain point fail validation.

### 4.7 Section E — Org and Process Views

- **Policy:** FIXED at 5 organisational bullets + 5 process bullets
- **Org bullets must cover:** Leadership structure, delivery function breakdown, key dependencies, semi-independent units (if any), geographic structure
- **Process bullets must cover:** Documented process compliance, key friction points, data flow integrity, manual handoffs, leadership visibility gaps

### 4.8 Section F — Document Index

- **Policy:** One row per document received in intake
- **Format:** Table with columns `Doc # | Filename | Category | Key Data Extracted | Issues`
- **Issues column:** Must be populated with either `None` or a specific note (e.g. "Unaudited — formal audit pending July 2026")

### 4.9 Section G — Open Questions

- **Policy:** GATED 3–6 items
- **Per-item fields:** Question + Why It Matters (2 sentences)
- **Gate criterion:** Each question must reference an evidence gap that, if filled, would change the confidence rating of ≥1 dossier claim

### 4.10 Section H — Reviewer Checklist

- **Policy:** FIXED 4 mandatory categories
- **Categories** (each must contain ≥1 specific item):
  1. Highest-risk numbers to verify
  2. Contradictions detected between form and documents
  3. Low-confidence extractions
  4. Document quality issues

### 4.11 [JUSTIFICATION] Block

- **Policy:** Mandatory; one numbered entry per `[Inferred]` and `[Assumption]` tag used anywhere in the dossier
- **Per-entry fields:**

```
Item N — [Short claim title]
Claim: [Verbatim from main body]
Class: [Inferred or Assumption]
Why not higher: [Specific evidence gap]
What resolves: [Specific source/action]
Confidence: [High / Medium / Low]
```

Entries that fail to specify *what would resolve* the lower tag fail validation. This is the discipline mechanism — every weak tag carries its own action item.

## 5. Validation Rules Summary

The harness (`harness/validate_intake.py`) enforces every rule in this section. Outputs that fail any rule are rejected. See `harness/validate_intake.py` for implementation.

| Rule | Failure Mode |
|---|---|
| Section count | Missing or duplicated sections |
| Count policies | Field counts outside FIXED / BOUNDED / GATED bounds |
| Citation format | Untagged quantitative claims, malformed tags |
| Source registry | Non-canonical source names |
| Confidence tag use | Tags not matching `confidence_thresholds.md` definitions |
| Justification completeness | Inferred/Assumption tag without matching justification entry |
| Pre-flight sanitization | Test metadata, leaked preambles, forbidden phrases |
| Hypothesis-Pain Point linkage | Hypothesis with no linked pain point |
| Schema version | Header missing or wrong schema version |

## 6. Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | May 2026 | Initial schema based on Meridian Talent Partners test case audit findings |
