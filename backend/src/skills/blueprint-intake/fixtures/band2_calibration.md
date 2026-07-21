# Band 2 Calibration Fixture — Helvetia Components GmbH (synthetic)

**Purpose:** interpolation test for the band decision table (`archetypes/_core.md` §4) and the
PP-CORE-00 gate's **High (structural)** verdict. Compact profile fixture — for full-pipeline
acceptance a complete document kit should be authored on this profile (backlog).

## Profile (inputs the gates read)

- **Systems:** ERP (live, documented API) ↔ CRM (live) — **two active integrations documented**;
  M365; no data warehouse; monthly reporting semi-automated from ERP exports, consolidated manually
- **INTEGRATION_STATUS (verbatim fixture value):** "The ERP-CRM connector and the ERP-webshop feed
  are the only active integrations; management reporting is consolidated manually in Excel and
  there is no single reporting layer."
- **ORG_FRICTION_SIGNAL:** none-documented (leadership sponsors digitisation; no reversion history)
- **Maturity levels:** Strategy Developing · Data Developing · Technology Developing ·
  People Developing · Processes Developing · Governance Developing

## Expected outputs (a run deviating from these is wrong)

| Check | Expected |
|---|---|
| PP-CORE-00 gate | **High (structural)** — C2 holds (no SSOT), C1 fails (active integrations documented) |
| Section C shape | 5 stated + PP-0 (High) + 2 emergent |
| Layer-1 grade | USABLE (Data Developing + Technology Developing + partial API-capable integrations) |
| Alignment grade | ALIGNED (no friction evidence) |
| **Band** | **2** |
| H-CORE-00 | Promoted if ≥2 agent-shaped selected; posture compressed (genesis faster, fleet earlier) |
| Tier ceiling (internal) | Standard/Pro |
| Anti-check | A run assigning Band 1 (severity fabrication) or Band 3 (gap denial) is a calibration FAIL |
