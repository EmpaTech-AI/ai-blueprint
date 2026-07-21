# CORE Pattern — Universal Entries (All Archetypes)

**Schema:** `intake_v1.1`
**Status:** ACTIVE — ratified via the Meridian Golden Benchmark v1.1 (Practice confirmation 2026-07-20; §A encoding register items A-2, A-6, A-7, A-10)
**Applies to:** every industry archetype. Each archetype file references this CORE library; the entries below are written once here and are never duplicated per industry.
**Companion:** the AI Brain Foundation Pattern (methodology) and `rework_docs/Meridian_Golden_Benchmark_v1_1_PINNED.md` (benchmark of record).

---

## 1. Why a CORE layer exists

Nearly every operating company carries the same structural pain — fragmented data infrastructure with no integrated single source of truth — and the corresponding foundational opportunity (a governed unified-data + AI-knowledge layer). These are **pattern entries you instantiate under deterministic gates, not discoveries you hope to make**. Putting them in one cross-archetype library guarantees every industry archetype behaves identically on this pattern, which is a precondition for cross-client output consistency.

Two-layer doctrine (fixed): **Layer 1** is the client's existing systems — never replaced wholesale, only connected, adapted, governed; the maturity band grades this layer. **Layer 2** is the governed unified-data + AI-knowledge layer we architect above it. PP-CORE-00 is precisely the gap between Layer 1 reality and Layer 2 readiness.

---

## 2. PP-CORE-00 — Universal Pain Point Template

**Title (fixed string):** Fragmented data infrastructure: no integrated single source of truth
**Scope:** all verticals & departments · **Precedence:** P0 (foundational) · **Impact area:** Strategic/Risk/Time

### Instantiation gate (deterministic — evidence conditions, not judgment)

Evaluate in Stage 1 (intake), from the client's own systems/integration evidence (tech inventory or equivalent). `[Inferred]` and `[Assumption]` claims can **never** satisfy a condition — you cannot infer your way to PP-0.

| Verdict | Conditions (all at Document-Backed or Form-Stated confidence) |
|---|---|
| **Critical (systemic)** — instantiate as PP-0, position 0 | (C1) zero or near-zero active integrations between core systems is documented, AND (C2) operational reporting is manually consolidated (exports/copy-paste into spreadsheets) or an explicit "no single source of truth" statement is documented |
| **High (structural)** — instantiate as PP-0, position 0 | Integrations are partial but the stack is usable and API-capable; no SSOT exists; C2 holds but C1 fails (some active integrations documented) |
| **Not instantiated** — no PP-0 in Section C | Layer 1 is sound: integrated, governed, reasonably clean. The gap is Layer 2 itself — record as an **opportunity framing** in Section D context, never as a fabricated pain. Forcing Critical PP-0 onto such a client is a calibration failure (the Band 3 anti-hallucination test) |

**Severity logic (include verbatim in the PP-0 card):** breadth × dependency, not per-instance pain — it degrades every function at once and gates the value of every other pain point. This is a different kind of Critical from an acute, localised one; two Criticals in one register are reconcilable (systemic vs acute).

### Absorption rule (anti-double-count — non-negotiable)

Any emergent candidate whose substance is "no integration / no SSOT / no consolidated visibility" is **absorbed into PP-0**: it does not enter the emergent scoring pool as a separate candidate. Record a tombstone note in Section H ("former candidate X absorbed into PP-0"). Evidence lines from the absorbed candidate may relocate to the most closely related pain point's evidence block (e.g., an executive-visibility line relocating to an interview/offer-management pain) — record the relocation in the tombstone. Never score the same evidence twice; never silently renumber.

### Slot accounting

When PP-0 is instantiated, it occupies one of the emergent slots: Section C = 5 form-stated + PP-0 + **2** scored emergent. When not instantiated: 5 + **3** scored emergent (unchanged v1.0 behaviour).

---

## 3. H-CORE-00 — Universal Foundational Hypothesis

**Title (fixed string):** AI Company Brain — unified data foundation + AI knowledge layer
**Strategic link (fixed string):** Cross-cutting — underpins all stated priorities. *(Never pin H-0 to a single priority line.)*

| Typical Impact | Typical Feasibility | Typical Alignment | Default Class | `ml_heavy` | `multi_source` | `regulated` | `large_integration` | `adoption_dependent` | `d_gate4` | `compliance_deadline` | `system_event_deadline` | `phase_dependency` | `agent_shaped` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 | 2 | 5 | Big Bet | yes | yes | no | yes | yes | no | none | none | **strict** | n/a |

### Promotion gate (deterministic — both conditions required)

1. **PP-CORE-00 is instantiated** for this client (either verdict level), AND
2. the selected top-7 hypothesis set contains **≥ 2 entries with `agent_shaped=yes`** (a lookup on the archetype library column — see §5; never a per-run judgment).

When the gate passes, H-CORE-00 enters a **reserved additional slot** (Section D = 7 + H-0). It never competes for, and never displaces, a scored top-7 candidate. When the gate fails, H-CORE-00 is not emitted and Section D remains exactly 7.

### Non-negotiable handling rules

- **One undivided scored entity.** H-0 carries exactly one score marker and one Phase-Summary row. Its internal decomposition (Brain Genesis → governance gate → consumer agents) lives ONLY in the downstream Build Sheet (`blueprint-aria-spec`) — never inside the 5-stage pipeline, where entity decomposition is a guarded regression (T-30 BLOCKER). A run emitting a "pilot scoping" or "Brain Genesis" sub-row for H-0 is an acceptance FAIL.
- **Siblings stay siblings.** Governance/compliance hypotheses and data-revival hypotheses (e.g., recruitment H-RT-07, H-RT-04) remain separate scored entities with their own pain linkages. The Build Sheet maps them onto H-0's phase structure; the pipeline never nests them.
- **Consumers are absorbed.** A library hypothesis flagged `h0_consumer=yes` (e.g., a standalone reporting/visibility dashboard) is excluded from the candidate pool when H-0's gate passes (tombstone in Section H) — it is an output of the brain, and keeping both double-counts the same value. When H-0 is not promoted, the consumer competes normally.
- **Layer boundary.** The pipeline H-0 card carries capability + evidence + prerequisites only. Product naming (ARIA), tier ceilings, adapter availability, and pricing render exclusively in the Build Sheet — and, where the Build Sheet's gates pass, as the single pinned sentence in Stage 5 Section 7 (see `blueprint-assembly`). Emitting tier/pricing language in Stages 1–4 is a preflight FAIL (Pattern Set 8).

---

## 4. Band Assignment (decision table — consumed by blueprint-maturity `[BAND_ASSIGNMENT]`)

Derived after the six dimensions are scored. Two grades, then a pinned lookup — no interpolation prose.

**Layer-1 grade** (Data + Technology dimensions + integration evidence):

| Grade | Conditions |
|---|---|
| FRAGMENTED | Data = Early, OR the PP-CORE-00 gate returned Critical (systemic) (zero-integration evidence) |
| USABLE | Data = Developing AND Technology ≥ Developing AND integrations partial/API-capable (PP-0 verdict High (structural) or better) |
| SOUND | Data = Established AND Technology = Established AND no PP-0 instantiated |

**Alignment grade** (People + Processes dimensions + friction evidence):

| Grade | Conditions |
|---|---|
| FRICTION | People = Early, OR documented adoption resistance / reversion pattern at Document-Backed or Form-Stated confidence (named resistors, failed-adoption history) |
| ALIGNED | Neither condition above holds |

**Band lookup (pinned; conservative bias):**

| | FRICTION | ALIGNED |
|---|---|---|
| **FRAGMENTED** | Band 1 | Band 1 |
| **USABLE** | Band 1 | Band 2 |
| **SOUND** | Band 2 | Band 3 |

Band consequences (internal routing — never client-facing prose): Band 1 → PP-0 Critical (systemic), H-0 phased governance-first, tier ceiling Standard. Band 2 → PP-0 High (structural), H-0 compressed, ceiling Standard/Pro. Band 3 → no PP-0, H-0-as-engagement framing via the Build Sheet only, ceiling Pro/Premium.

**Calibration (Meridian Talent Partners):** Data Early + zero integrations → FRAGMENTED; Senior-Partner resistance + reversion history (template, VA, cleaning) → FRICTION → **Band 1 on every run.** A run assigning Band 2 or 3 to Meridian is wrong. **Band 3 regression test:** a client with integrated/governed Layer 1 must yield no PP-0, no forced H-0 pain framing — see `fixtures/band3_calibration.md`.

---

## 5. Columns every archetype Hypothesis Library must carry (v1.1)

In addition to the v1.0 columns (Typical I/F/A, Default Class, five D6 flags, `d_gate4`, `compliance_deadline`, `system_event_deadline`, `phase_dependency`):

| Column | Values | Meaning |
|---|---|---|
| `agent_shaped` | yes/no | Recurring, cadence-runnable knowledge work over grounded company data with human oversight (digests, drift checks, automated reporting, matching intelligence). Config-only work and one-off drafting aids are **no** — this is the credibility control against "it's just ChatGPT with extra steps" |
| `h0_consumer` | yes/no | The hypothesis is an output/consumer of the brain (reporting, visibility, digest surfaces). Excluded from the pool when H-0 promotes |
| `band1_pool` | yes/no | `no` = excluded from the default candidate pool when PP-0 is Critical (systemic) — standalone product-build bets a fragile Layer 1 cannot carry |

And every archetype Pain Point Library must carry:

| Column | Values | Meaning |
|---|---|---|
| `eligibility` | process / organisational / product-gap | Only `process` pains enter the Section C candidate pool. Organisational-structure frictions are tracked as delivery risks; missing-product ambitions are opportunity context, not pains |

---

## 6. Severity enum (v1.1 — used by Section C and the ordering algorithm)

`Critical (systemic)` > `Critical (acute)` > `High` > `Medium-High` > `Medium` > `Low`

`Critical (systemic)` is reserved for PP-CORE-00 (breadth × dependency). `Critical (acute)` marks a localised pain that directly blocks a board-level priority at the highest evidenced intensity (e.g., the single highest-leverage process bottleneck). At most one of each is expected in a register; two acute Criticals require explicit evidence differentiation in Section H.
