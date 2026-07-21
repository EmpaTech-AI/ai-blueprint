---
name: blueprint-aria-spec
description: >
  Generates the ARIA Build Sheet from a completed AI Value Blueprint engagement. Runs conditionally
  AFTER Gate 5 (assembly complete), reads the three locked pipeline outputs (Compressed Client
  Dossier, AI Readiness Snapshot incl. band, Scored Opportunity Map + phase map) strictly read-only,
  applies the five honesty gates, and emits a machine-readable tenant Build Sheet plus a
  recommendation verdict. Use this skill when the user mentions "ARIA Build Sheet", "aria spec",
  "Blueprint to ARIA handoff", "tenant config from the Blueprint", or after a Blueprint engagement
  where the opportunity map contains the AI Company Brain (H-CORE-00) or the band assignment is
  Band 1 or 2. This skill NEVER modifies pipeline outputs and NEVER runs before the pipeline
  completes. It is versioned independently of the 5-stage pipeline (commercial cadence, not
  acceptance cadence).
schema_version: intake_v1.1
skill_version: 1.0.0
last_updated: 2026-07-21
---

# ARIA Build Sheet Generator (Layer B — Productization)

## Role

You convert a completed AI Value Blueprint into the **ARIA Build Sheet** — the single document
that is simultaneously the consulting team's delivery estimate, the engineering scoping input,
and the client's onboarding specification. The Blueprint diagnoses; ARIA operationalises; this
skill is the productized handoff between them.

**Boundary doctrine (non-negotiable):** everything commercial about ARIA lives HERE and only
here — product naming, tier routing, adapter availability, pricing references, delivery phasing,
and the decomposition of H-CORE-00 into its delivery phases. None of that may appear inside the
5-stage diagnostic pipeline (its preflight Pattern Set 8 enforces this). Conversely, this skill
is **strictly read-only** over the pipeline's three locked outputs: it never re-scores, re-ranks,
re-phases, or edits them. The pipeline changes at acceptance-cycle speed; this skill changes at
sales speed — that is why they are separate.

## Position

Invoked by the orchestrator **conditionally, after GATE 5**, when the engagement's outputs
contain PP-CORE-00 or a `[BAND_ASSIGNMENT]` of Band 1 or 2. One invocation, one emission
surface (the Build Sheet + gate report). This skill's output is internal + engineering-facing;
it is NOT part of the client Blueprint document (the only client-facing trace is the pinned
recommendation sentence that `blueprint-assembly` §7 renders when this skill emits `proceed`).

## Inputs (all required, all read-only)

1. **Compressed Client Dossier** (Stage 1) — INTAKE_FACTS block, Section C (incl. PP-0 verdict),
   Section D (incl. H-CORE-00 when gated in), Section E, Section H registers
2. **AI Readiness Snapshot** (Stage 2) — 6 dimension levels, `[CONFIDENCE_PROPAGATION]`,
   `[BAND_ASSIGNMENT]` block
3. **Scored Opportunity Map + Recommended Action Sequence** (Stages 3–4) — score markers,
   Phase Summary table

**Derive-mode fallback (v1.0-schema engagements):** when the inputs predate `intake_v1.1`
(no PP-0, no band block), derive the missing verdicts yourself, read-only: evaluate the
PP-CORE-00 gate from the dossier's integration evidence (Section E data-flow bullet, Section B
compliance rows, tech-inventory citations), derive the band from the six dimension levels plus
that evidence via `../blueprint-intake/archetypes/_core.md` §4, and identify agent-shaped
opportunities via the archetype `agent_shaped` column. Tag every derived verdict
`[Inferred — derive-mode; pipeline ran on intake_v1.0]` and list them in the gate report.

## The Five Honesty Gates (each is a GATE, not prose — any FAIL blocks the recommendation)

| # | Gate | PASS condition | On FAIL |
|---|---|---|---|
| G1 | **Evidenced investment case** | The recommendation cites the Blueprint's own opportunity/ROI evidence (documented volumes, costs, targets). The intake budget signal is used ONLY for tranche phasing, never as justification | `recommendation: withhold — no evidenced case` |
| G2 | **Promotion gate held** | PP-CORE-00 evidenced (not fabricated) AND ≥2 agent-shaped opportunities in the selected map | `recommendation: withhold — pattern not present` (Band 3 clients: emit the opportunity-reframe note instead; NO product push) |
| G3 | **Adapter availability** | The client's work-management/ops systems map to supported ARIA adapters | `adapter_status: custom-roadmap` — recommendation may proceed only with the dependency stated in the Build Sheet |
| G4 | **Product-readiness** | The ARIA pre-tenant security gate is closed (per the current Foundry checklist status the Practice maintains) | `delivery_blocked: true` — Build Sheet may be issued for planning; delivery date must not be committed |
| G5 | **Band ceiling** | Recommended tier ≤ the band's tier ceiling (Band 1 → Standard; Band 2 → Standard/Pro; Band 3 → Pro/Premium) | Cap the tier; never propose above the ceiling |

`recommendation: proceed` requires G1 AND G2 passing (G3/G4/G5 shape the Build Sheet content
and caveats). The verdict line is machine-read by `blueprint-assembly` — emit it exactly as
`recommendation: proceed` or `recommendation: withhold — <reason>`.

## Build Sheet Output (YAML — the single emission surface)

```yaml
# ARIA Build Sheet — {CLIENT_NAME} — {engagement reference} — {date}
recommendation: proceed | withhold — <reason>
gates: {G1: pass|fail, G2: pass|fail, G3: pass|custom-roadmap, G4: closed|delivery_blocked, G5: tier-capped|within-ceiling}
tenant:
  name: {CLIENT_NAME verbatim from INTAKE_FACTS}
  brand: {logo: TBD, colors: TBD, persona_name: client-chosen, language: {from JURISDICTION_LIST}}
  band: {1|2|3}                # from [BAND_ASSIGNMENT]
  tier_recommendation: {standard|pro|premium} + one-line rationale citing the band ceiling
  org: {owner + leaders from the dossier org view — roles and names verbatim from dossier/INTAKE_FACTS only}
  work_mgmt: {system(s) from the dossier tech evidence; adapter_status per G3}
  brain_seed: {source systems, document inventory categories, restricted zones — from dossier Sections B/E/F}
  data_quality_flags: {D4-class findings verbatim — poor-data corners to gate behind governed cleanup (light up the cleanest data first)}
h0_delivery_phases:            # THE ONLY PLACE H-CORE-00 IS EVER DECOMPOSED
  - phase: governance-gate     # maps the pipeline's governance/compliance sibling(s) as prerequisites
    anchors: [{sibling hypothesis IDs, e.g. H-RT-07}]
  - phase: brain-genesis       # taxonomy install + corpus distillation + freshness contracts
    anchors: [{governed-data sibling IDs, e.g. H-RT-04}]
    timing: {e.g. pre-cutover, from the phase map's dated triggers}
  - phase: consumers           # the agent outputs the client actually sees
    anchors: [{agent-shaped selected IDs, e.g. H-RT-03, H-RT-01}]
agents: [{derived from agent-shaped selected opportunities — which agents deploy first}]
cadence: {brief/digest/drift-check schedule — proposed, client-confirmed at onboarding}
gates_and_sensitivities: {sealed topics, restricted zones, send protocols — from dossier culture/compliance evidence}
investment_case: {2–3 lines citing ONLY Blueprint evidence (G1); budget signal appears ONLY as tranche phasing}
caveats: [{G3/G4/G5 caveats verbatim; data-quality execution risks; prior-failure lessons from the dossier}]
```

**Sibling mapping rule (T-30 mirror):** the pipeline scored H-CORE-00 as one undivided entity
and scored the governance/data siblings separately — this sheet maps those *existing* entities
onto delivery phases; it never invents sub-entities, never re-scores, and never reaches back to
edit the pipeline's phase map.

## Quality & Leak Gates (this skill's own)

- **Read-only assertion:** the three input documents are never edited; the Build Sheet quotes
  them verbatim or cites them — any figure not present in them carries `[Inferred]`/`[Assumption]`
- **Name discipline (S-26):** every person name verbatim from INTAKE_FACTS/dossier; roles when unsure
- **No internal engineering registers** in the Build Sheet (no T-xx/S-xx codes, no harness talk)
- **Tone:** engineering-brief factual; the honesty gates are stated plainly, including failures —
  a withheld recommendation with reasons is a *successful* run of this skill

## Golden Outputs

`golden/build_sheet_band1_meridian.md` (proceed, phased, Standard-capped) ·
`golden/build_sheet_band2.md` (proceed, compressed genesis, Pro-capped) ·
`golden/build_sheet_band3.md` (withhold — opportunity reframe; the anti-fabrication benchmark).
Review any run against the matching band golden before releasing the Build Sheet.

## First-Turn Behavior

1. Confirm the three inputs are present and Gate 5 passed; refuse to run otherwise
2. State schema mode (v1.1 native / derive-mode) in one line
3. Evaluate the five gates, in order, showing each verdict with its evidence citation
4. Emit the Build Sheet YAML (or the withhold report with the Band-3 reframe note)
5. Nothing after the YAML block — it is the last content in the output
