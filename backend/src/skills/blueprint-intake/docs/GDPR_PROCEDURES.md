# GDPR and Data Residency Procedures (WF-04)

**Version:** 1.0.0
**Owner:** AI Assist BG — Blueprint Practice / Data Protection Lead
**Last updated:** 2026-05-27
**Applies to:** All Blueprint engagements using `run_intake_automated.py` or the Claude.ai skill interface

---

## Overview

The Blueprint pipeline processes client business data through the Anthropic API. This creates obligations under the EU General Data Protection Regulation (GDPR) and, where applicable, the Bulgarian Personal Data Protection Act (PDPA). This document covers:

1. What data is processed and where
2. Anthropic's role as a data processor
3. Client consent and DPA requirements
4. What PII must NOT be included in materials
5. Data residency and cross-border transfer basis
6. Right-to-erasure procedure
7. Retention and deletion schedule

---

## 1. What Data Is Processed

### Data sent to the Anthropic API

The following categories of data are transmitted to Anthropic when running the Blueprint pipeline:

| Category | Examples | Personal data? |
|----------|---------|---------------|
| Company fundamentals | Revenue, employee count, business model | No (aggregate/company-level) |
| Strategic context | Growth goals, risk factors, planned investments | No (corporate) |
| Pain points | Operational inefficiencies, process descriptions | Rarely — see §4 |
| Technology stack | Software names, vendor contracts, spend | No |
| People & culture | Team size, role breakdown, AI readiness rating | Aggregate only — see §4 |
| Data readiness | CRM quality, data governance maturity | No |
| Budget & timeline | AI budget range, decision-maker title (not name) | No |
| Document content | Financial summaries, org charts, SOPs, etc. | Potentially — see §4 |

### System prompt content

The SKILL.md and reference files loaded as the system prompt contain no client data — they are methodology documents only. No client data leaks into the system prompt.

### What is NOT sent to the API

- Raw PDF binary files — the wrapper notes document availability but does not currently extract and embed PDF text. (Future versions that do extract PDF text must review this section before deployment.)
- API keys, credentials, or payment information
- Individual candidate personal data (see §4)

---

## 2. Anthropic as a Data Processor

When AI Assist BG uses the Anthropic API to process client data, Anthropic acts as a **data processor** under GDPR Article 28. AI Assist BG acts as the **data controller** (or sub-processor on behalf of the client, depending on the DPA structure).

**Key facts about Anthropic's data handling:**

- Anthropic's current DPA is available at `anthropic.com/legal` (verify current version)
- By default, API inputs and outputs are **not used to train models** (unlike Claude.ai consumer tier)
- Anthropic retains API data for up to 30 days for safety monitoring, after which it is deleted
- Anthropic operates out of the United States; data transfer to the US relies on SCCs (Standard Contractual Clauses) — see §5

**Action required:** Before running any client engagement through the API, ensure:
1. AI Assist BG has a signed DPA with Anthropic (enterprise accounts)
2. The client has been informed that their business data will be processed by Anthropic as a sub-processor

---

## 3. Client Consent and DPA Requirements

### Minimum requirements before running an engagement

1. **Engagement agreement:** The client must have signed an engagement letter or service agreement that includes a data processing clause permitting AI Assist BG to use third-party AI processing tools.

2. **Sub-processor notice:** The engagement agreement or a separate data processing addendum must name Anthropic (or "AI language model providers") as a sub-processor with the right to process client business data.

3. **Purpose limitation:** Client data may only be used for the Blueprint diagnostic engagement. It must not be retained beyond the agreed retention period or used for training AI models.

### Recommended DPA clause language (adapt as needed)

> *"The Client acknowledges that AI Assist BG uses third-party AI processing services, including large language model providers, to perform analytical work. Client business data (excluding personal data of natural persons) will be transmitted to these services solely for the purpose of producing the Blueprint diagnostic. AI Assist BG's third-party providers process such data under their own DPA agreements and do not use it for model training."*

Consult your legal counsel before finalizing this language.

---

## 4. PII Handling — What NOT to Include in Materials

### Prohibited content in materials.json and uploaded documents

The following must NOT be included in `materials.json` or in documents uploaded for processing:

| Prohibited | Why | Alternative |
|---|---|---|
| Individual employee names (other than publicly known executives) | PII under GDPR | Use titles: "CEO", "Head of Delivery" |
| Individual salary or compensation data | Sensitive PII | Use averages or bands: "avg EUR 55K" |
| Individual candidate names or CVs | Third-party PII — candidates are not parties to the engagement | Not required for the Blueprint |
| Individual client contact names beyond the known sponsor | PII | Use "engagement sponsor", "CFO" |
| National ID numbers, passport numbers | Sensitive PII | Never required |
| Health or medical information | Special category PII | Never required |
| HR disciplinary records | Sensitive | Never required |

### What IS acceptable

- Executive names that are publicly associated with the company (e.g., CEO name on the company website)
- Aggregate people data (headcount, team sizes, department ratios)
- Role titles without names
- Company-level financials (not individual compensation)

### Document review before upload

Before adding a client document to `documents` in `materials.json`, review it for:
1. Individual names (redact if not publicly known executives)
2. Salary details at the individual level (redact)
3. Candidate CV content (do not include candidate documents)
4. Sensitive HR content (disciplinary, medical — redact or exclude)

Use your PDF editor to redact before saving the document to the `documents/` folder.

---

## 5. Data Residency and Cross-Border Transfer

### Where data goes

Anthropic's API operates primarily from US data centers. When `run_intake_automated.py` calls the API, client business data leaves the EU.

### Legal basis for cross-border transfer

The transfer relies on **Standard Contractual Clauses (SCCs)** included in Anthropic's DPA. This is the standard mechanism under GDPR Chapter V for transfers to countries without an EU adequacy decision (the US does not have a general adequacy decision as of 2026).

### EU data residency requirement

If a client requires that their data remain within the EU:
- The current automation wrapper cannot satisfy this requirement — Anthropic does not currently offer an EU-only API endpoint
- For such clients, the Blueprint engagement must be run using a Claude.ai interface where the operator manually processes materials without sending them to an API (human-in-the-loop only)
- Flag this constraint to the Practice Lead during engagement scoping

### Anthropic retention

Anthropic retains API inputs/outputs for up to 30 days for safety monitoring. This is covered by the SCCs. After 30 days, Anthropic deletes the data. AI Assist BG's own retention policy (see §6) applies to artifacts stored locally.

---

## 6. Retention and Deletion Schedule

| Artifact | Retention period | Deletion trigger |
|----------|-----------------|-----------------|
| `dossier_*.md` | 24 months from engagement close | Retention end OR erasure request |
| `pipeline_result_*.json` | 36 months | Retention end OR erasure request |
| `chunks/chunk_*.md` | 30 days from gate PASS | Automatic or manual cleanup |
| `logs/*.jsonl` | 90 days | Automatic or manual cleanup |
| DOCX deliverable | Delivery + 12 months | Per client deliverable policy |
| `materials.json` | Duration of engagement + 12 months | Retention end OR erasure request |

**Important:** The `materials.json` file itself contains client data and is subject to the same retention and erasure rules as the dossier. Store it in the same engagement folder and include it in any erasure procedure.

---

## 7. Right-to-Erasure Procedure

When a client submits a right-to-erasure request under GDPR Article 17:

### Step 1 — Identify all artifacts

```bash
# Find all engagement refs for this client
grep -rl '"client_name": "CLIENT NAME"' outputs/*/pipeline_result_*.json
```

Note all engagement refs returned.

### Step 2 — Delete local artifacts

For each engagement ref identified:

```bash
ENGAGEMENT_REF="BP-2026-001"
OUTPUT_DIR="outputs"

# Delete primary and debug artifacts
rm -rf "${OUTPUT_DIR}/${ENGAGEMENT_REF}"

# Delete logs
rm -f "${OUTPUT_DIR}/logs/${ENGAGEMENT_REF}_"*.jsonl

# Delete materials (if stored in engagement folder)
rm -f "materials/${ENGAGEMENT_REF}.json"
```

### Step 3 — Delete the DOCX deliverable

Locate the delivered DOCX in the client deliverables folder (Teams, SharePoint, or local archive) and delete it. Record the location and deletion date.

### Step 4 — Record the erasure

Add an entry to the erasure log (maintained by the Data Protection Lead):

```
Date: YYYY-MM-DD
Client: [Client Name]
Engagement refs deleted: BP-2026-001, BP-2026-001-R1
Artifacts deleted: dossier, chunks, pipeline_result, logs, materials.json, DOCX
Requestor: [Name and contact]
Processed by: [Name]
```

### Step 5 — Anthropic data

Anthropic retains API data for up to 30 days. If the erasure request is received within 30 days of the engagement run, contact Anthropic's privacy team (`privacy@anthropic.com`) with the request details and approximate timestamps. After 30 days, Anthropic's data is already deleted.

### Step 6 — Confirm to the client

Respond to the client's erasure request within the GDPR-mandated 30-day window, confirming deletion of all identified data.

---

## 8. Breach Notification

If you discover that client data has been exposed (e.g., committed to a public repository, sent to the wrong recipient, or involved in a security incident):

1. Immediately notify the Practice Lead and Data Protection Lead
2. Document: what data, whose data, how exposed, when discovered
3. The Data Protection Lead determines whether the breach triggers a 72-hour notification obligation to the supervisory authority (CNIL, ICO, CPDP, etc.) and/or client notification
4. Do not attempt to conceal or downplay the incident

---

## Checklist — Before Running Each Engagement

- [ ] Client has signed an engagement agreement with a data processing clause
- [ ] Sub-processor notice covers Anthropic or "AI language model providers"
- [ ] `materials.json` has been reviewed — no prohibited PII categories
- [ ] Uploaded documents have been reviewed and redacted where needed
- [ ] Client does NOT have a strict EU data residency requirement (if they do, escalate)
- [ ] `ANTHROPIC_API_KEY` belongs to an account with a signed Anthropic DPA
