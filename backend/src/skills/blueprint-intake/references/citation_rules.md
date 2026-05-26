# Citation Rules

**Schema:** `intake_v1.0`
**Purpose:** Eliminate the largest source of run-to-run variance in citation density. Same evidence produces same tags.

---

## Core Principle

**One tag per discrete claim.** If a claim is supported by multiple sources, list all sources inside a single tag, separated by semicolons. Never split one claim's citation across multiple tags.

## Tag Format

```
[<Confidence-Tag> — <canonical_source_1> (<page_or_section>); <canonical_source_2> (<page_or_section>); ...]
```

### Components

- **Confidence-Tag**: One of `Document-Backed`, `Form-Stated`, `Document-Backed + Form-Stated`, `Inferred`, `Assumption` (see `confidence_thresholds.md`)
- **Canonical source name**: Must match `source_registry.md` exactly — no aliases, no abbreviations
- **Page or section**: Required for PDFs (e.g. `p.2`, `p.1-2`); for forms, use form section (e.g. `pain points`, `strategic context`)
- **Separator**: ` — ` (em dash with spaces) between confidence tag and sources; `; ` (semicolon space) between sources

### Valid Examples

```
[Document-Backed — financial summary p.1]
[Document-Backed — sales pipeline p.3; SOP p.2]
[Form-Stated — pain points]
[Document-Backed + Form-Stated — tech inventory p.1; form: technology]
[Inferred — derivation per appendix item 4]
[Assumption — appendix item 7]
```

### Invalid Examples (and Why)

```
WRONG: [Document-Backed — process docs p.2]    REASON: "process docs" not in source registry; must be "SOP"
WRONG: [Document-Backed — SOP p.2] [Document-Backed — sales pipeline p.3]    REASON: One tag per claim, not multiple
WRONG: [Doc-Backed — SOP p.2]    REASON: Confidence tag must be spelled fully
WRONG: [Document-Backed — SOP]    REASON: Page or section required for PDFs
```

## When a Statement Has Multiple Claims

Each discrete claim gets its own tag. The harness treats a "claim" as a fact-bearing assertion. Quantitative claims, named entities, and statements about state always require tagging.

**Example — Decomposition:**

> "Meridian employs 68 FTEs across three offices, generating €4,823,400 in FY2025 revenue at 71.3% gross margin."

This contains THREE discrete claims:
1. 68 FTEs across three offices → tag with org chart citation
2. €4,823,400 FY2025 revenue → tag with financial summary citation
3. 71.3% gross margin → tag with financial summary citation

Recommended formulation:

> "Meridian employs 68 FTEs across three offices [Document-Backed — org chart p.1], generating €4,823,400 in FY2025 revenue [Document-Backed — financial summary p.1] at a 71.3% gross margin [Document-Backed — financial summary p.2]."

When all three claims happen to come from the same source-and-page, the tags may consolidate:

> "Meridian generated €4,823,400 in FY2025 revenue at 71.3% gross margin [Document-Backed — financial summary p.1-2]."

But the harness counts these as multiple claims and verifies the page range covers both facts.

## Required Tagging

The following statement types **always** require a citation tag:

1. Any quantitative claim (numbers, percentages, dates, counts)
2. Any named entity (company, person, product, system, document)
3. Any statement about a state, status, or condition
4. Any statement of a target, goal, or planned action
5. Any direct quote from form or document
6. Any classification (severity, priority, impact area)

## Tag-Free Statements (Allowed)

The following statement types do not require tags:

1. Logical connectors and transitions ("This means", "As a result", "Therefore")
2. Generic methodology references ("Per the AI Value Blueprint methodology")
3. Schema-defined headers and labels
4. Internal cross-references ("See Section D")

## Tag Density Expectations

Based on the Recruitment archetype (other archetypes have their own bands):

| Section | Expected tags | Hard floor | Hard ceiling |
|---|---|---|---|
| A — Executive Summary | 12–18 | 8 | 24 |
| B — Key Data Points | 35–50 (one per row) | 30 | 60 |
| C — Pain Points (8 PPs × ~5 evidence bullets) | 35–45 | 24 | 56 |
| D — Hypotheses (7 H × ~4 citations) | 24–34 | 20 | 42 |
| E — Org and Process Views | 8–14 | 6 | 20 |
| F — Document Index | 0 (table format, sources implicit) | 0 | 0 |
| G — Open Questions | 0–4 | 0 | 8 |
| H — Reviewer Checklist | 0–4 | 0 | 8 |

**Total expected tag count:** 114–169
**Hard pass band:** 100–200

A dossier with <100 or >200 tags fails validation as either under-cited or over-tagged.

## Migration from Existing Skill Outputs

The two failed runs (TEST 1: 109 tags, TEST 2: 147 tags) both fall within the pass band — meaning total counts aren't the problem, density drift between sections is. The schema-locked tag-per-claim rule combined with bounded per-section ranges eliminates this drift.
