# Permanent Archetype-Free Golden — LunaCart (v1.1 batch, 2026-08-03)

**Status: PINNED. This case must NEVER acquire an ACTIVE archetype.**

## Why this fixture exists

Every other pinned case in the kit is archetype-active. That is how five remediation cycles came to
validate the entire guard layer on Meridian alone, and how four properties reported as *pipeline
achievements* — A6's 24/24 maturity determinism, D6b's 4/4, the Class-G guard layer's operation, S5's
clean strip — turned out to be **properties of the test case**. LunaCart v1 was the first run against a
case with no ACTIVE archetype, and it exposed all four in a single batch.

The v1.1 batch then scored **88%, equal to Meridian v38, with impact-weighted harm 1.86 against v38's
2.99** — the first number in the programme that is both generalising and good.

**The hazard this fixture guards against is the obvious next step.** Building `retail.md` would make
LunaCart archetype-active and return the kit to four archetype-active goldens — rebuilding the exact
blind spot that took two weeks to find. The cost of preventing that is the pinning, not the archetype.

> **Ordering rule, agreed with the Practice 2026-08-03: pin this case BEFORE building any retail
> archetype. Build retail if the matched ACTIVE pair is wanted — but this case does not become it.**

## What is pinned

### Identity
| | |
|---|---|
| Industry | E-commerce / DTC retail (Slovenia; Ljubljana HQ, Vienna warehouse) |
| Archetype resolution | **`generic` (SKELETON ONLY)** — no ACTIVE archetype, by design |
| Batch of record | LunaCart v1.1, 4 runs, `pipeline=v37.4 sha=84b30295e1b73fa09c92d68c9bd65d8b0abfb085` |
| Overall completeness | 88% (core 88.7 / secondary 85.9) |
| Impact-weighted harm | 1.86, largest single item 0.45 (24% concentration) |

### Pinned values — 4/4 across the batch
| Value | Pinned | Notes |
|---|---|---|
| `n_core` | **7** | Shopify, NetSuite, Postgres, SkuVault, Zendesk, Returnly, Klaviyo |
| Active integrations | **2** | Shopify→Postgres, NetSuite→Postgres — both scheduled and functioning |
| **Integration Coverage** | **0.33** | `2 ÷ (7−1)`; confirmed by A11's recompute from the runs' own tables |
| `ssot_reconciles_all_load_bearing` | **no** | Postgres exists; returns/CS/inventory do not feed it |
| **PP-CORE-00 severity** | **High (structural)** | `_core.md` §2.1: coverage in (0.25, 0.60] |
| **Data grade** | **Early** | D4 Step 4: returns + cs_interactions load-bearing and Degraded |
| Layer-1 grade | FRAGMENTED | `Data = Early` sets it regardless of coverage (`_core.md` §4) |
| Band | **1** | FRAGMENTED is Band 1 in both the FRICTION and ALIGNED columns |
| Section C / D | 8 / 7 + H-0 | |
| `band1_pool=no` exclusions | **0**, declared | The rule fires at Critical only; PP-0 is High (A16) |

**`Data = Early` + `PP-0 High (structural)` is the combination NO v1 run produced** — T1 got severity
right and the letter wrong, T2–T4 the reverse. It is the settled answer under the F13a/F13b definitions
and it reproduced 4/4 in v1.1. That pairing is the single most valuable thing pinned here.

### Guard states this case is expected to exercise
| Guard | Expected on this case | Why it matters |
|---|---|---|
| **A4 / A9** | `UNAVAILABLE (no_archetype_match)`, per family, with the reading rule printed | The ONLY case in the kit that exercises the honest-unavailability path |
| **A11–A15** | run and pass | Archetype-independent by construction — this proves it |
| **A16** | PP-0 High, 0 exclusions, empty-set declaration present | |
| **A16c** | not exercised (no exclusions to root) | Meridian covers the rooted path |
| Gate A coverage | `PARTIAL — 1 of 3 families, 8 of 24 value-checks` | The declaration this case made gradeable |

## The guard that keeps this fixture honest

A document cannot stop someone building `retail.md`. `archetypeFreeGolden.test.ts` asserts, mechanically:

1. **No ACTIVE archetype claims e-commerce/retail/DTC.** If `INDEX.md` ever routes retail to an ACTIVE
   archetype file, the test fails and names this fixture as the reason.
2. **At least one industry in `INDEX.md` remains non-ACTIVE**, so the kit can never consist entirely of
   archetype-active cases.
3. **The pinned inventory recomputes to coverage 0.33, PP-0 High, Data Early** from the tables below —
   read from this file, so the pins and the code cannot drift apart.

If the Practice later decides retail should be built and LunaCart re-run as the matched ACTIVE pair,
that is a legitimate decision — but it must be taken deliberately, by editing this fixture and its
test, not discovered afterwards when a batch stops detecting archetype-conditional behaviour.

## [DATA_INVENTORY] (pinned)

### Core Systems
| System | Record classes held | Core? | Core because (stated priority) | Confidence |
|---|---|---|---|---|
| shopify | orders, products | yes | Priority 1 — revenue growth | [Document-Backed] |
| netsuite | finance | yes | Priority 3 — margin | [Document-Backed] |
| postgres | analytics | yes | Priority 1 — operational reporting | [Document-Backed] |
| skuvault | inventory | yes | Priority 3 — stock accuracy | [Document-Backed] |
| zendesk | cs_interactions | yes | Priority 4 — CS automation | [Document-Backed] |
| returnly | returns | yes | Priority 2 — return rate | [Document-Backed] |
| klaviyo | marketing_performance | yes | Priority 1 — marketing ROAS | [Document-Backed] |

### Integrations
| System A | System B | Mechanism | Status | Active? | Confidence |
|---|---|---|---|---|---|
| shopify | postgres | scheduled (daily) | functioning | yes | [Document-Backed] |
| netsuite | postgres | scheduled (daily) | functioning | yes | [Document-Backed] |
| returnly | postgres | manual | functioning | no | [Document-Backed] |
| zendesk | postgres | none | unbuilt | no | [Document-Backed] |
| skuvault | postgres | none | unbuilt | no | [Document-Backed] |

### Record Classes
| Record class | System of record | Load-bearing? | Load-bearing because | Rating | Rating because | Confidence |
|---|---|---|---|---|---|---|
| orders | shopify | yes | Priority 1 — revenue growth | Reliable | system-generated, daily feed to Postgres | [Document-Backed] |
| returns | returnly | yes | Priority 2 — return rate 34.2% → <28% | Degraded (siloed) | no active feed to Postgres; quality 2/5 | [Document-Backed] |
| cs_interactions | zendesk | yes | Priority 4 — CS automation | Degraded (siloed) | no active feed to Postgres; quality 2/5 | [Document-Backed] |
| inventory | skuvault | no | n/a | Degraded | siloed from the analytical layer | [Document-Backed] |
| marketing_performance | klaviyo | yes | Priority 1 — marketing ROAS | Reliable | system-generated, reported in Postgres | [Document-Backed] |
| finance | netsuite | no | n/a | Reliable | system-generated, daily feed to Postgres | [Document-Backed] |

<!-- inventory: n_core=7 active_integrations=2 integration_coverage=0.33 designated_ssot=postgres
ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=2 data_grade=Early
pp0_severity=High governance_owner=none governance_owner_named=no
governance_standard_documented=no governance_standard_operative=no -->

**Note on the annotated cells above.** `scheduled (daily)` and `Degraded (siloed)` are deliberate: they
are the annotated forms the v1.1 runs actually emitted, and they false-fired A14 and A13 until the
v37.5 normalisation sweep. Keeping them here means the fixture regression-tests the tolerance, not just
the arithmetic.
