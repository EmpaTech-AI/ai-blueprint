# [INDUSTRY NAME] — Archetype

**Schema:** `intake_v1.0`
**Status:** SKELETON (not yet populated)
**Golden Output:** *to be built*
**Covers:** *list sub-industries this archetype applies to*

---

## How to Use This Skeleton

1. Copy this file to `<industry>.md` (lowercase, underscores for spaces)
2. Populate every section with industry-specific content
3. Build a Golden Output dossier using a real or representative test client in this industry
4. Validate the Golden Output against the schema via the harness
5. Update `INDEX.md` with the new mapping and change status to ACTIVE
6. Bump framework version (PATCH increment); add entry to `CHANGELOG.md`

The Recruitment archetype (`recruitment.md`) is the worked example for everything below.

---

## 1. KPI Taxonomy

*The metrics Section B of an intake dossier must surface for clients in this industry.*

### Financial baseline
- *Industry-specific revenue and profitability metrics*
- *Margin structure norms for this industry*

### Operational KPIs
- *Top 5–8 operational metrics that drive performance in this industry*
- *Industry-standard benchmarks where applicable*

### Volume metrics
- *Transaction / unit volume metrics*
- *Productivity metrics per FTE or per unit*

### Client / customer metrics
- *Industry-relevant customer measures*

### Team metrics
- *FTE breakdown norms for the industry*
- *Turnover / retention norms*

### Technology & data
- *Common systems for this industry*
- *Data quality posture norms*

## 2. Pain Point Library

Common pain points for [INDUSTRY]. Target: 12–18 candidates. Format as table:

| ID | Pain Point | Default Severity | Default Impact Area |
|---|---|---|---|
| PP-IND-01 | [pain point] | [High/Medium/Low] | [Impact area(s)] |
| PP-IND-02 | | | |
| ... | | | |

## 3. Hypothesis Library

Common AI opportunities for [INDUSTRY]. Target: 10–15 candidates. Format as table:

| ID | Hypothesis | Typical Impact | Typical Feasibility | Typical Alignment | Default Class |
|---|---|---|---|---|---|
| H-IND-01 | [hypothesis] | [1-5] | [1-5] | [1-5] | [Class] |
| H-IND-02 | | | | | |
| ... | | | | | |

## 4. Archetype Defaults

| Field | Industry Default | Acceptable Range |
|---|---|---|
| Section A word count | *e.g. 300* | *e.g. 240–360* |
| Section B row count | | |
| Section E org bullets | 5 (FIXED) | 5 |
| Section E process bullets | 5 (FIXED) | 5 |
| Open Questions count | | |
| Total tag count (A+B+C+D+E) | | 100–200 |

## 5. Industry Terminology

| Generic Term | [INDUSTRY] Term |
|---|---|
| Customer | |
| Order | |
| Lead time | |
| Inventory | |
| Sales | |
| Account manager | |
| Production | |

## 6. Worked Example Reference

*Pointer to the Golden Output for this archetype once built.*

---

## Validation Checklist Before Submitting a New Archetype

- [ ] All six sections populated, not just the headings
- [ ] Pain Point Library has at least 12 candidates
- [ ] Hypothesis Library has at least 10 candidates
- [ ] Archetype Defaults are realistic (validated against ≥1 known client)
- [ ] Industry Terminology table covers the 8 generic terms above
- [ ] Golden Output produced and passes harness validation
- [ ] INDEX.md updated with routing keywords and ACTIVE status
- [ ] CHANGELOG.md updated with version bump rationale
