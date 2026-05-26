# Source Name Registry

**Schema:** `intake_v1.0`
**Purpose:** Lock canonical source names. Eliminates Defect 5 — same document cited under multiple aliases.

---

## Rule

When citing any source, use the canonical name from this registry exactly. The harness rejects any tag with a non-canonical source name.

## PDF Sources

Standardised on the 8-category Blueprint intake set. When uploaded filenames differ, the category mapping (per `SKILL.md` Layer 2) determines which canonical name applies.

| Category | Canonical Name | Acceptable Aliases (auto-normalised) | Page Format |
|---|---|---|---|
| 1. Financial Summary | `financial summary` | `financial_summary`, `P&L`, `management accounts`, `finance` | `p.N` or `p.N-M` |
| 2. Org Chart | `org chart` | `org_chart`, `organisational structure`, `team structure`, `org` | `p.N` |
| 3. Sales / Pipeline | `sales pipeline` | `sales_pipeline`, `pipeline data`, `BD report`, `pipeline` | `p.N` |
| 4. Process Documentation / SOPs | `SOP` | `process docs`, `process documentation`, `processes`, `SOPs`, `process documentation v2.1` | `p.N`, `step N.N` |
| 5. Marketing / Customer Data | `marketing/customer data` | `marketing data`, `customer data`, `client satisfaction survey`, `marketing` | `p.N` |
| 6. Technology Inventory | `tech inventory` | `technology inventory`, `tech stack`, `systems inventory`, `IT inventory` | `p.N` |
| 7. Strategic Documents | `strategic plan` | `strategy doc`, `board deck`, `annual plan`, `FY26 plan`, `strategic plan FY2026` | `p.N` |
| 8. Previous AI Initiatives | `previous AI initiatives` | `prior AI`, `AI history`, `previous AI doc`, `AI initiative review` | `p.N`, `initiative N` |

## Form Sources

The intake form has 7 sections (per `SKILL.md` Layer 1). Form citations use the canonical form-section name.

| Form Section | Canonical Tag-Source | Notes |
|---|---|---|
| 1. Company Fundamentals | `form: company fundamentals` | Industry, size, geography |
| 2. Strategic Context | `form: strategic context` | Priorities, threats, initiatives |
| 3. Operational Pain Points | `form: pain points` | The 5 stated pain points + "what we tried" |
| 4. Technology Landscape | `form: technology` | Systems and tools narrative |
| 5. People & Culture | `form: people & culture` | Leadership attitude, resistance |
| 6. Data Readiness | `form: data readiness` | Data quality, governance, compliance |
| 7. Budget & Timeline | `form: budget & timeline` | Investment and urgency signals |

## Multi-Source Citations

When a claim is supported by both a PDF and a form section, the tag uses both:

```
[Document-Backed + Form-Stated — tech inventory p.1; form: technology]
```

The Confidence Tag is upgraded to `Document-Backed + Form-Stated` per `confidence_thresholds.md`.

## Page Citation Granularity

- For PDFs: use specific page numbers when the source has more than 1 page. `p.N` for single-page sources is acceptable but `(p.1)` or omission is not.
- For SOP step references: `step N.N` format is permitted (e.g. `SOP step 3.3`).
- For ranges: use `p.N-M` (no spaces).

## Adding New Sources

If a new document category is required (beyond the 8), it must be added to this registry before being cited. This is a schema-level change requiring a version bump.

## Validator Behaviour

The harness loads this registry at startup. Any tag whose source name does not match a canonical name (or an exact alias listed in the table) fails validation.

The validator's normalisation function applies these mappings:

```python
def normalise_source(s: str) -> str:
    # Implementation in harness/validate_intake.py
    ...
```

Output dossiers should use canonical names directly. The alias mapping exists for safety, not as an authorised alternative.
