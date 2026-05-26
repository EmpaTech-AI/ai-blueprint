# Industry Archetype Index

**Schema:** `intake_v1.0`
**Purpose:** Map detected client industries to archetype files. Used by the intake skill to load the correct exemplar.

---

## Routing Logic

The intake skill detects industry from intake form Section 1 ("What industry are you in?") and applies this routing table.

| Detected Industry Keywords | Archetype File | Status |
|---|---|---|
| recruitment, talent, staffing, executive search, RPO, HR consulting | `recruitment.md` | ACTIVE |
| manufacturing, industrial, factory, production, plant, fabrication | `_template_skeleton.md` (planned: `manufacturing.md`) | SKELETON ONLY |
| professional services, consulting, advisory, audit, accountancy, law | `_template_skeleton.md` (planned: `professional_services.md`) | SKELETON ONLY |
| financial services, fintech, banking, asset management, insurance | `_template_skeleton.md` (planned: `financial_services.md`) | SKELETON ONLY |
| software, SaaS, technology, IT services | `_template_skeleton.md` (planned: `technology.md`) | SKELETON ONLY |
| retail, e-commerce, consumer goods | `_template_skeleton.md` (planned: `retail.md`) | SKELETON ONLY |
| healthcare, medical, pharmaceutical, biotech | `_template_skeleton.md` (planned: `healthcare.md`) | SKELETON ONLY |
| logistics, transportation, supply chain, 3PL | `_template_skeleton.md` (planned: `logistics.md`) | SKELETON ONLY |
| construction, engineering, real estate, property | `_template_skeleton.md` (planned: `construction.md`) | SKELETON ONLY |
| (no match) | `_template_skeleton.md` | FALLBACK |

## Detection Algorithm

1. Extract intake form Section 1 verbatim text.
2. Lowercase and tokenise.
3. For each row in the routing table, check if any keyword matches any token.
4. First match (in table order) wins.
5. If no match, use the fallback skeleton + flag in Section H Reviewer Checklist.

## What an Archetype Provides

Each archetype file contains:

1. **KPI Taxonomy** — the operational metrics specific to the industry that Section B should surface
2. **Pain Point Library** — the 12-18 most common pain points for the industry, with severity defaults
3. **Hypothesis Library** — the 10-15 most common AI opportunities for the industry, with classification defaults
4. **Archetype Defaults** — recommended counts and bands for BOUNDED schema fields
5. **Industry Terminology** — preferred terms (e.g. "time-to-fill" vs "lead time" — both mean elapsed time but used in different industries)
6. **Worked Example Reference** — pointer to the Golden Output dossier for this archetype

## Adding a New Archetype

1. Copy `_template_skeleton.md` to `<industry>.md`
2. Populate all 6 sections (see template structure)
3. Build a Golden Output dossier using a realistic test case in that industry
4. Validate the Golden Output against the schema
5. Update this INDEX with the new mapping and status `ACTIVE`
6. Bump the framework version (PATCH increment) and update `CHANGELOG.md`

## Currently Active Archetypes

| Archetype | Validated Golden Output | Industries Covered |
|---|---|---|
| Recruitment & Talent Solutions | `golden/recruitment_meridian_v1.md` | Permanent placement, executive search, RPO, contract staffing, HR consulting |

## Backlog (in priority order)

1. Manufacturing — covers premium glass / industrial / process manufacturing (relevant to existing Baros Vision engagement context)
2. Professional Services — consulting, advisory, audit firms
3. Financial Services — banking, asset management, insurance
4. Technology / SaaS

Each backlog item adds ~3–4 hours of construction work (2h archetype + 1–2h Golden Output + validation).
