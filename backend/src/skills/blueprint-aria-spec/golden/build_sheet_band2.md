# Golden Build Sheet — Band 2 (synthetic: Helvetia Components GmbH — mid-market manufacturer)

Demonstrates: `proceed` with compressed genesis (usable Layer 1, aligned org), Pro-capped, supported adapters.
Fixture profile: ERP + CRM live with partial integrations and documented APIs; Data Developing, Technology Developing, People/Processes Developing, no documented resistance; PP-0 instantiated at **High (structural)** (no SSOT, but integrations partial and API-capable).

```yaml
# ARIA Build Sheet — HELVETIA COMPONENTS GMBH — BP-FIXTURE-B2 — 2026-07
recommendation: proceed
gates: {G1: pass, G2: pass, G3: pass, G4: delivery_blocked, G5: within-ceiling}
tenant:
  name: HELVETIA COMPONENTS GMBH
  brand: {logo: TBD, colors: TBD, persona_name: client-chosen, language: de/en}
  band: 2
  tier_recommendation: pro — Band 2 ceiling Standard/Pro; aligned org + usable API-capable stack absorbs the fuller fleet
  org: {owner: Geschäftsführer (CEO); leaders: Ops lead, Finance lead, Sales lead (named per dossier INTAKE_FACTS)}
  work_mgmt: {system: M365 + Planner (supported adapter); ERP: documented API — supported}
  brain_seed: {source_systems: [ERP, CRM, M365], doc_categories: standard 8, restricted_zones: [HR records]}
  data_quality_flags: ["CRM contact data partially stale — genesis includes targeted dedupe; ERP clean"]
h0_delivery_phases:
  - phase: governance-gate
    anchors: [governance sibling ID from the engagement map]
    timing: compressed — runs inside genesis (aligned org, no live compliance exposure documented)
  - phase: brain-genesis
    anchors: [governed-data sibling ID]
    timing: direct Layer-2 build; genesis faster (usable Layer 1)
  - phase: consumers
    anchors: [agent-shaped selected IDs]
    timing: fleet ignites earlier than Band 1 (no cleanup gate on primary data)
agents: [ops-digest, exception-drift-watch, reporting-automation]
cadence: {proposed: daily ops brief + weekly digest; confirm at onboarding}
gates_and_sensitivities: {sealed: HR records; send-protocol: human-confirmed external comms}
investment_case: "Cites the engagement's documented manual-reporting hours and stockout/exception costs from the opportunity map — Blueprint evidence only; budget signal used for tranche phasing only."
caveats:
  - "G4: pre-tenant security gate status must be re-checked at contract; no committed date while open"
  - "Band 2 posture: compressed phasing is conditional on the genesis data-checks confirming the 'usable' grade — degrade to Band 1 phasing if genesis finds systematic quality failure"
```
