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

## 3a. Heading Format Requirements

The following markdown heading formats are MANDATORY. Using bold text (`**...**`) or any other formatting in place of the specified heading level will cause the harness regex to fail the dossier — even when the underlying content is correct. This was the root cause of all gate failures in the V3 analysis runs.

| Element | Required Markdown Format | Example |
|---|---|---|
| Section headings (A–H) | H2 | `## A) Executive Summary` |
| Pain Point headings | H3 + em-dash (U+2014) | `### Pain Point 1 — Manual Candidate Sourcing Bottleneck` |
| Hypothesis headings | H3 + em-dash (U+2014) | `### Hypothesis 1 — AI-Powered CV Formatting` |
| JUSTIFICATION block heading | H2 | `## [JUSTIFICATION]` |

**Em-dash character:** Always use the Unicode em-dash U+2014 (—). Do NOT use:
- Triple hyphens `---`
- Double hyphens `--`
- En-dash `–` (U+2013)

**Forbidden alternates that WILL fail validation:**
- `**Pain Point 1 --- Title**` — bold text with triple hyphens
- `**Pain Point 1 — Title**` — bold text (even with correct em-dash)
- `#### Pain Point 1 — Title` — H4 instead of H3
- `## Pain Point 1 — Title` — H2 instead of H3
- `### Pain Point 1 - Title` — hyphen instead of em-dash

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
- **Word count:** Target 300 words. Target ceiling: **400 words** (WARN above this). Hard ceiling: **430 words** (FAIL above this). The standard ±20% BOUNDED tolerance does NOT apply to Section A. Aim for the 280–340 window; validator warns above 400, fails above 430.
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

```markdown
### Pain Point N — Title with Descriptive Subtitle

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

The `### Pain Point N — Title` line is a markdown H3 heading with a Unicode em-dash (—). See §3a for the full heading format requirements and forbidden alternates.

Minimum 3 evidence bullets per pain point. Maximum 5.

### 4.6 Section D — Opportunities and Hypotheses

- **Policy:** FIXED at 7 hypotheses
- **Selection:** See `algorithms/hypothesis_selection.md`
- **Ordering:** See `algorithms/ordering.md`
- **Per-hypothesis fields** (all mandatory):

```markdown
### Hypothesis N — Title

[1-2 paragraph description with embedded citations and at least one numerical anchor]

Supporting evidence:
- [Citation bullet 1]
- [Citation bullet 2]
- [Citation bullet 3]
- [Optional: bullets 4-5]

What we'd validate next: [Single sentence, specific and actionable]

Classification: [Quick Win / Foundation Builder / Foundation Builder (enabler) / Big Bet]
Linked Pain Point(s): [Reference to Section C item numbers, e.g. "PP1, PP3"]
**Selection score:** Impact [N] × Feasibility [N] × Alignment [N] = **[product]**
```

**Classification values:**
- `Quick Win` — Feasibility ≥ 4, no dependency on incomplete foundational work, addresses top-4 pain point
- `Foundation Builder` — prerequisite for other hypotheses, or addresses a structural gap
- `Foundation Builder (enabler)` — same as Foundation Builder, AND is a hard dependency for ≥1 other selected hypothesis; presented before plain Foundation Builders in Section D regardless of score (FW-02)
- `Big Bet` — Impact ≥ 4, requires Foundation Builders and Quick Wins to be live first

The `### Hypothesis N — Title` line is a markdown H3 heading with a Unicode em-dash (—). See §3a for the full heading format requirements and forbidden alternates.

The `Selection score` line is **mandatory** in every hypothesis. It makes the algorithm's scoring visible for auditability — when two runs select different hypotheses, the score line explains why. Downstream reviewers and the harness use this line to verify that scores match the classification and that the tie-breaking hierarchy was applied correctly.

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

- **Policy:** FIXED 5 mandatory categories
- **Categories** (each must contain ≥1 specific item):
  1. Highest-risk numbers to verify
  2. Contradictions detected between form and documents
  3. Low-confidence extractions
  4. Document quality issues
  5. Strategic Priority Coverage

**Category 5 — Strategic Priority Coverage** is mandatory in every dossier. Its content depends on outcome:

_When all stated priorities are represented in the top 7:_
> List each priority from PDF 7 (or intake form Section 2) with the hypothesis that covers it and its score. One line per priority. Example: "Executive Search Growth (PDF 7, p.4) → Hypothesis 5 — AI-Assisted Specialist Sourcing (Score: 75)"

_When ≥1 stated priority is NOT represented in the top 7:_
> For each unrepresented priority, include all of the following:
> - **Priority stated:** Quote the priority verbatim from PDF 7 or intake form
> - **Candidate evaluated:** The hypothesis considered for this priority, with its Score (Impact × Feasibility × Alignment = product)
> - **Why it did not qualify:** Which higher-scoring hypothesis displaced it, and what the score gap was
> - **What would change the outcome:** The specific condition under which this hypothesis would enter the top 7 (e.g., "Feasibility would need to reach 3, which requires X prerequisite to be in place")
> - **Algorithm note:** One sentence positioning the finding as an algorithm assessment, not an oversight — e.g., "Our scoring algorithm evaluated [Priority] via [Hypothesis] and found feasibility constrained by [specific factor]. This is not a gap in the analysis — it is an honest assessment of current execution conditions."

This category is the mechanism for demonstrating algorithmic intelligence on strategic priorities. A reviewer reading the deliverable should never be able to say "you missed their top priority" — the answer must be visible inside the dossier with a clear explanation.

### 4.11 [JUSTIFICATION] Block

- **Policy:** Mandatory. One numbered entry per **distinct** `[Inferred]` or `[Assumption]` claim used anywhere in the dossier body.

**Distinct claim rule:** Two tags represent the same claim if and only if (a) the verbatim claim text is identical AND (b) the derivation chain or evidence gap is identical. When this is true, one appendix entry covers both tags; each body occurrence must reference the shared entry as `[Inferred — appendix item N]` or `[Assumption — appendix item N]`.

**Practical guidance:** If three sentences in a hypothesis body each contain a separate `[Inferred]` tag derived from different evidence chains, those are three distinct claims requiring three appendix entries. If the same derived figure appears in two different sections (e.g., "revenue per FTE of £103k" in Section A and in Section D), that is one claim requiring one appendix entry — reference it in both body locations as `[Inferred — appendix item N]`.

**When in doubt, create separate entries.** The harness validates that every `[Inferred]` and `[Assumption]` tag in the body has at least one matching appendix entry by claim text. It does not penalise for having more entries than the strict minimum.

- **Per-entry fields:**

```
Item N — [Short claim title]
Claim: [Verbatim from main body — exact quote]
Class: [Inferred or Assumption]
Why not higher: [Specific evidence gap — name the missing source]
What resolves: [Specific source or action that would upgrade this tag]
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
