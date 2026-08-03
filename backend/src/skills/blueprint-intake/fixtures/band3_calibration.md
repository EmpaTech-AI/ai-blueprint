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

## [DATA_INVENTORY] (added 31 Jul 2026 — this fixture is the ONLY case that exercises the top of the C1 and D4 scales)

Before this addition the fixture described its stack in prose ("integrated stack, managed
integrations"), which the pre-F13b prose gate could read but the counted gate cannot. Two branches
have therefore never fired anywhere in the kit: C1's `>60% + reconciling SSOT → PP-0 not instantiated`
row, and `Data = Established`. Both are the branches that protect a *good* client from an
inappropriate recommendation, so an untested pass path is the worst one to leave untested.

### Core Systems
| System | Record classes held | Core? | Core because (stated priority) | Confidence |
|---|---|---|---|---|
| erp | finance, orders | yes | Priority 1 — margin per lane | [Document-Backed] |
| tms | shipments, carrier_performance | yes | Priority 2 — on-time delivery | [Document-Backed] |
| wms | inventory | yes | Priority 3 — warehouse throughput | [Document-Backed] |
| bi_warehouse | analytics | yes | Priority 1 — operational reporting | [Document-Backed] |
| sharepoint | documents | no | n/a | [Document-Backed] |

### Integrations
| System A | System B | Mechanism | Status | Active? | Confidence |
|---|---|---|---|---|---|
| erp | bi_warehouse | scheduled | functioning | yes | [Document-Backed] |
| tms | bi_warehouse | event | functioning | yes | [Document-Backed] |
| wms | bi_warehouse | scheduled | functioning | yes | [Document-Backed] |

### Record Classes
| Record class | System of record | Load-bearing? | Load-bearing because | Rating | Rating because | Confidence |
|---|---|---|---|---|---|---|
| finance | erp | yes | Priority 1 — margin per lane | Reliable | system-generated, nightly feed to BI, DQ SLA met | [Document-Backed] |
| orders | erp | yes | Priority 1 — margin per lane | Reliable | system-generated, nightly feed to BI | [Document-Backed] |
| shipments | tms | yes | Priority 2 — on-time delivery | Reliable | event-streamed to BI, <5% incomplete | [Document-Backed] |
| carrier_performance | tms | yes | Priority 2 — on-time delivery | Reliable | derived in BI from shipment events | [Document-Backed] |
| inventory | wms | yes | Priority 3 — warehouse throughput | Reliable | cycle-counted, nightly feed to BI | [Document-Backed] |
| analytics | bi_warehouse | yes | Priority 1 — operational reporting | Reliable | the SSOT itself; governed dashboards | [Document-Backed] |

<!-- inventory: n_core=4 active_integrations=3 integration_coverage=1.00 designated_ssot=bi_warehouse
ssot_reconciles_all_load_bearing=yes load_bearing_degraded_or_absent=0 data_grade=Established
pp0_severity=none governance_owner=Head of Data (M. Lindqvist) governance_owner_named=yes
governance_standard_documented=yes governance_standard_operative=yes -->

**Coverage:** 3 active ÷ (4 core − 1) = **1.00**. SharePoint is `Core?=no` (documents support no stated
priority), so it neither raises `n_core` nor contributes an integration — the case that shows why the
core filter matters: counting it would give 3 ÷ 4 = 0.75, still >60%, but the principle holds.

**G1–G3 evidence (the reachability check for the Established gate):**

| ID | Artifact in this profile |
|---|---|
| G1 | Head of Data (M. Lindqvist) named accountable for data quality |
| G2 | Documented DQ SLAs — freshness ≤24h, completeness ≥95% per feed |
| G3 | Quarterly DQ review minutes on record **and** automated completeness checks in the BI ingestion layer |

> **G3 is why the fixture profile above was extended.** The original profile named an owner and DQ
> SLAs but said nothing about the standard ever being applied. Under the ratified G1–G3 gate that
> profile would have graded Data = **Developing**, dropping Layer 1 to USABLE and the band to **2** —
> silently breaking this fixture's own pinned Band 3. A synthetic client that is *genuinely* governed
> plausibly has review minutes or an automated control, so the gate is reachable and the fixture
> states the evidence. Had it not been reachable, the gate would have been too strict and G3 would
> have been relaxed instead. That is the calibration this fixture exists to provide.

## Expected outputs (a run deviating from these is wrong)

| Check | Expected |
|---|---|
| **Integration Coverage (C1)** | **1.00** — the only case in the kit above 0.60 |
| **PP-0 severity from C1** | **none** — coverage >0.60 AND the SSOT reconciles every load-bearing class |
| **Data grade (D4 Step 4)** | **Established** — all classes Reliable AND G1+G2+G3 hold; the only case in the kit that reaches it |
| PP-CORE-00 gate | **Not instantiated** — Layer 1 is sound; the Layer-2 gap is an opportunity framing, never a fabricated pain |
| Section C shape | 5 stated + 3 emergent (v1.0-style accounting; no PP-0) |
| Layer-1 grade | SOUND |
| Alignment grade | ALIGNED |
| **Band** | **3** |
| H-CORE-00 | **Not emitted** (promotion gate requires PP-0). Agent-shaped opportunities compete normally |
| aria-spec | `recommendation: withhold — pattern not present` + opportunity-reframe note (see `blueprint-aria-spec/golden/build_sheet_band3.md`) |
| Client deliverable | No product recommendation sentence anywhere |
