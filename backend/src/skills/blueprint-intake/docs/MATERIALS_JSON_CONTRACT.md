# Materials JSON Contract (WF-02)

**Version:** 1.0.0
**Owner:** AI Assist BG — Blueprint Practice
**Last updated:** 2026-05-27

---

## Purpose

This document defines the exact structure of `materials.json` — the input file consumed by `run_intake_automated.py` to drive a Blueprint intake engagement. It is the contract between whoever prepares the materials (operator / intake coordinator) and the automation wrapper.

A `materials.json` that violates this contract will be rejected at the start of the wrapper run with an error message, before any API call is made.

---

## Top-Level Structure

```json
{
  "engagement_ref": "BP-2026-001",
  "client_name": "Meridian Talent Solutions",
  "industry": "Recruitment",
  "engagement_notes": "Optional free-text notes for the analyst",
  "intake_form": { ... },
  "documents": [ ... ]
}
```

### Field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `engagement_ref` | string | **Yes** | Unique engagement identifier. Format: `BP-YYYY-NNN` (e.g. `BP-2026-001`). Must be URL-safe (alphanumeric + hyphens only). Used as the output directory name. |
| `client_name` | string | **Yes** | Full client company name as it should appear in the dossier header. Do not abbreviate. |
| `industry` | string | **Yes** | Industry archetype. Must match a ACTIVE archetype in `archetypes/INDEX.md`. Currently valid: `Recruitment`. |
| `engagement_notes` | string | No | Free-text context for the analyst. Not passed to the model — used for human reference only. |
| `intake_form` | object | **Yes** | Structured intake form responses. See §Intake Form Object below. |
| `documents` | array | No | Uploaded client documents. See §Documents Array below. If omitted or empty, the dossier is produced from form responses only (lower confidence). |

---

## Intake Form Object

The `intake_form` object mirrors the 7 sections of the Blueprint intake form. All 7 sections are required. Individual fields within each section are optional — missing fields result in gaps the skill will note with `[Assumption]` tags.

```json
{
  "intake_form": {
    "company_fundamentals": {
      "legal_name": "Meridian Talent Solutions Ltd.",
      "founded": "2014",
      "headquarters": "London, UK",
      "employee_count": "45",
      "annual_revenue_eur": "3200000",
      "business_model": "Contingency and retained recruitment for financial services",
      "key_geographies": ["UK", "Ireland", "Germany"]
    },
    "strategic_context": {
      "primary_growth_goal": "Grow revenue 25% in FY2026 without adding headcount",
      "key_risks": ["Consultant burnout", "Fee compression", "CRM data quality"],
      "planned_investments": "ATS upgrade scheduled Q2 2026",
      "prior_strategic_review": "Board deck circulated Jan 2026"
    },
    "pain_points": {
      "top_pain_point": "Manual sourcing takes 6-8 hours per mandate",
      "second_pain_point": "Client reporting is manual and inconsistent",
      "other_pain_points": "CV formatting takes 45 mins per candidate; candidate follow-up falls through the cracks",
      "impact_estimate": "Estimated 30% of consultant time lost to non-billable admin"
    },
    "technology": {
      "ats": "Vincere (migrating from Bullhorn Q2 2026)",
      "crm": "Salesforce (basic configuration, low adoption)",
      "communication": "Microsoft Teams, Outlook",
      "other_tools": "LinkedIn Recruiter, CV-Library, JobAdder (being deprecated)",
      "monthly_tech_spend_eur": "8500",
      "ai_tools_currently_used": "None formally; some consultants use ChatGPT ad hoc"
    },
    "people_culture": {
      "delivery_team_size": "28 consultants",
      "support_team_size": "7 (ops, finance, marketing)",
      "ai_readiness_self_assessment": "3/5 — open but cautious; some resistance from senior consultants",
      "training_budget_available": "Yes, approx EUR 15,000 for FY2026",
      "change_sponsor": "CEO (Sarah Chen) is the AI champion"
    },
    "data_readiness": {
      "crm_data_quality": "Poor — many duplicate records, inconsistent tagging",
      "candidate_data_structured": "Partially — CVs stored as PDFs, not parsed",
      "historical_data_available": "5 years of placement data in Bullhorn",
      "gdpr_compliance": "Basic — GDPR policy exists but not fully enforced",
      "data_governance_owner": "No dedicated owner; shared between ops and IT"
    },
    "budget_timeline": {
      "ai_budget_eur": "30000",
      "timeline_preference": "First results visible within 6 months",
      "decision_maker": "CEO + CFO joint sign-off required above EUR 10,000",
      "preferred_engagement_model": "Phased — prove value before scaling"
    }
  }
}
```

### Allowed field values

- All monetary values: integers or strings representing EUR amounts (no currency symbol in the value)
- Employee counts: integers or strings
- Dates: ISO 8601 (`YYYY-MM-DD`) or natural language (`Q2 2026`, `January 2026`)
- Lists: use JSON arrays where appropriate (e.g. `"key_geographies"`)
- Self-assessments: string descriptions or `N/5` rating strings

### Handling sensitive fields

Do NOT include the following in `materials.json`:
- Individual client contact names (except publicly known executives)
- Individual candidate names or personal data
- Raw salary data at the individual level
- Bank account or payment information

See `docs/GDPR_PROCEDURES.md` for full PII handling rules.

---

## Documents Array

Each element in `documents` represents one uploaded client file.

```json
{
  "documents": [
    {
      "type": "financial_summary",
      "path": "documents/meridian_financial_summary_fy2025.pdf",
      "name": "FY2025 Financial Summary",
      "notes": "Management accounts only — audited accounts not available"
    },
    {
      "type": "org_chart",
      "path": "documents/meridian_org_chart_jan2026.pdf",
      "name": "Org Chart January 2026"
    },
    {
      "type": "strategic_plan",
      "path": "documents/meridian_board_deck_fy2026.pdf",
      "name": "FY2026 Board Presentation"
    }
  ]
}
```

### Document field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | **Yes** | Document category from the Source Registry. Must match a canonical name or alias in `references/source_registry.md`. |
| `path` | string | **Yes** | Path to the file, relative to the directory containing `materials.json`. |
| `name` | string | No | Human-readable document name. Used in dossier citations. Defaults to the filename if omitted. |
| `notes` | string | No | Analyst notes about the document (e.g. "draft version", "partial data"). Passed to the skill as context. |

### Valid document types (from source_registry.md)

| `type` value | Canonical name | Notes |
|---|---|---|
| `financial_summary` | Financial Summary | P&L, management accounts, revenue breakdown |
| `org_chart` | Org Chart | Team structure, reporting lines |
| `sales_pipeline` | Sales Pipeline | Active mandates, conversion data, BD activity |
| `SOP` | SOP | Process documentation, standard operating procedures |
| `marketing_customer_data` | Marketing/Customer Data | Client satisfaction, marketing metrics |
| `tech_inventory` | Tech Inventory | Technology stack, software costs |
| `strategic_plan` | Strategic Plan | Board decks, annual plans, strategy documents |
| `previous_ai_initiatives` | Previous AI Initiatives | Prior AI project reviews or assessments |

### Missing documents

If a client has not provided a document category, do not include it in the array. The skill will note the gap in Section G (Open Questions). Do not include placeholder entries with dummy paths — the wrapper detects missing paths and logs a warning, but the skill will also notice the document is missing.

---

## Complete Example

A minimal valid `materials.json`:

```json
{
  "engagement_ref": "BP-2026-001",
  "client_name": "Meridian Talent Solutions",
  "industry": "Recruitment",
  "intake_form": {
    "company_fundamentals": {
      "employee_count": "45",
      "annual_revenue_eur": "3200000"
    },
    "strategic_context": {},
    "pain_points": {
      "top_pain_point": "Manual sourcing takes 6-8 hours per mandate"
    },
    "technology": {
      "ats": "Vincere"
    },
    "people_culture": {},
    "data_readiness": {},
    "budget_timeline": {
      "ai_budget_eur": "30000"
    }
  }
}
```

A minimal valid file works but produces a lower-confidence dossier. The skill will tag more claims as `[Assumption]` when form fields are sparse.

---

## Validation Rules

The wrapper performs these checks before making any API call:

| Rule | What is checked |
|------|----------------|
| Required fields present | `engagement_ref`, `client_name`, `industry`, `intake_form` |
| `engagement_ref` format | Alphanumeric + hyphens only; used as a filesystem path |
| `industry` is a string | Not validated against the archetype registry (harness validates this) |
| `intake_form` is an object | Must be a JSON object (not a string or array) |
| `documents[*].path` exists | Warning logged if path not found; does not abort the run |

---

## Edge Cases

**Q: What if the client provides documents after the intake form?**
Add the new documents to `materials.json` and re-run the wrapper with a new engagement ref (e.g. `BP-2026-001-R1`). Do not mutate a `materials.json` after the first run has produced a dossier — treat each run as immutable.

**Q: What if the client uses a currency other than EUR?**
Convert all monetary values to EUR before writing `materials.json`. The skill uses EUR throughout per AI Assist BG style. Note the conversion rate in `engagement_notes`.

**Q: What if the client declines to provide certain form sections?**
Leave those sections as empty objects (`{}`). Do not fabricate values. The skill will note the gaps.

**Q: What if we have more than 8 documents?**
Include all documents. The skill selects which to cite; having more context is better than less. Ensure each document has the correct `type` so the Source Registry mapping works.
