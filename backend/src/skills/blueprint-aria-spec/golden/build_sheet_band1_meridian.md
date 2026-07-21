# Golden Build Sheet — Band 1 (Meridian Talent Partners OOD, BP-TEST-001)

Demonstrates: `proceed` with full phasing, Standard tier cap, custom-adapter caveat, delivery-blocked caveat handling.

```yaml
# ARIA Build Sheet — MERIDIAN TALENT PARTNERS OOD — BP-TEST-001 — 2026-07
recommendation: proceed
gates: {G1: pass, G2: pass, G3: custom-roadmap, G4: delivery_blocked, G5: tier-capped}
tenant:
  name: MERIDIAN TALENT PARTNERS OOD
  brand: {logo: TBD, colors: TBD, persona_name: client-chosen, language: en (BG, RO, PL operations)}
  band: 1
  tier_recommendation: standard — Band 1 ceiling (fragmented Layer 1 + documented senior-partner friction); do not propose above
  org: {owner: CEO Popov; leaders: Operations Director Mihailova (champion/interim IT), Senior Partner Ivanov, Senior Partner Georgieva, Head of BD Draganova, RPO Manager Nowak}
  work_mgmt: {system: Vincere ATS (cutover 2026-07-31) + Xero (REST API, clean); adapter_status: custom-roadmap — Vincere is an ATS, not a supported work-mgmt adapter; Xero adapter supported}
  brain_seed: {source_systems: [Vincere, Xero, M365/SharePoint], doc_categories: [financial, org, pipeline, SOP, customer, tech, strategy, initiatives], restricted_zones: [candidate PII pending consent audit]}
  data_quality_flags: ["~35% of 47K candidate records stale (tech inventory p.2) — gate candidate-layer behind governed cleanup", "2023 cleaning failure without governance — do not repeat", "Xero data clean and reconciled — light up decision-intelligence here first"]
h0_delivery_phases:
  - phase: governance-gate
    anchors: [H-RT-07]        # Data Protection Compliance Foundation — prerequisite; system_event_deadline=2026-07-31
  - phase: brain-genesis
    anchors: [H-RT-04]        # Candidate Database Revival at the migration boundary
    timing: governance rules pre-cutover (2026-07-31); hub build post-cutover
  - phase: consumers
    anchors: [H-RT-03, H-RT-01]  # automated client reporting; sourcing/matching intelligence (data permitting)
agents: [reporting-digest (from H-RT-03), sourcing-intelligence (from H-RT-01, post-genesis)]
cadence: {proposed: weekly client-status digest + weekly ops brief; confirm at onboarding}
gates_and_sensitivities: {sealed: candidate PII until consent audit completes; send-protocol: human-confirmed client comms; restricted: pre-2021 consent-incomplete records}
investment_case: "Sourcing consumes 22 of 38 TTF days across 35–40 mandates/month; client-comms scored 3.1/5 with automated ATS updates as the client's own named fix; both are consumers of the unified data foundation. Budget signal (€10K–€50K, in discussion) is used only to phase tranche 1 (governance-gate), not as justification."
caveats:
  - "G3: Vincere adapter is Custom/roadmap — Standard delivery scopes Xero + M365 first; ATS integration follows adapter availability"
  - "G4: ARIA pre-tenant security gate open at issue date — Build Sheet is for planning; no committed delivery date until the gate closes"
  - "G5: Band 1 → Standard only; revisit tier after Brain Genesis re-assessment"
  - "Data-quality: candidate layer gated behind governed cleanup; two prior CEE tool failures (LinkedIn AI, Lusha) mandate a CEE-sample pilot for any sourcing tool"
```
