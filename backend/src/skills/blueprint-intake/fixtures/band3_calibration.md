# Band 3 Calibration Fixture — Nordwind Logistics A/S (synthetic)

**Purpose: the anti-fabrication regression test.** This is the case where the evidence honestly
does NOT support PP-0 — the system must not manufacture severity. Any run that instantiates a
Critical or High PP-CORE-00 on this profile, or force-emits H-CORE-00 as a pain-driven
recommendation, is a **calibration failure** regardless of how well-written the output is.

## Profile (inputs the gates read)

- **Systems:** ERP ↔ TMS ↔ WMS ↔ BI warehouse — **integrated stack, live data warehouse, BI
  layer with governed dashboards**; named data owner; documented data-quality SLAs
- **INTEGRATION_STATUS (verbatim fixture value):** "All core operational systems feed the central
  warehouse via managed integrations; the BI layer is the single source of truth for operational
  reporting."
- **ORG_FRICTION_SIGNAL:** none-documented
- **Maturity levels:** Strategy Established · Data Established · Technology Established ·
  People Developing · Processes Established · Governance Established

## Expected outputs (a run deviating from these is wrong)

| Check | Expected |
|---|---|
| PP-CORE-00 gate | **Not instantiated** — Layer 1 is sound; the Layer-2 gap is an opportunity framing, never a fabricated pain |
| Section C shape | 5 stated + 3 emergent (v1.0-style accounting; no PP-0) |
| Layer-1 grade | SOUND |
| Alignment grade | ALIGNED |
| **Band** | **3** |
| H-CORE-00 | **Not emitted** (promotion gate requires PP-0). Agent-shaped opportunities compete normally |
| aria-spec | `recommendation: withhold — pattern not present` + opportunity-reframe note (see `blueprint-aria-spec/golden/build_sheet_band3.md`) |
| Client deliverable | No product recommendation sentence anywhere |
