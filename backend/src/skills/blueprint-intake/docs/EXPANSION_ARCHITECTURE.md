# Cross-Industry Expansion Architecture — the Scaling Playbook

**AI Assist BG · Blueprint Practice · v1.0 · 2026-07-22**
**Status:** Operational playbook (operationalizes §7 of the 2026-07-20 360° analysis)
**Question answered:** how to organize, structure, and expand the Blueprint so it produces consistent, coherent, accurate outputs across different companies, industries, sectors, and countries.

---

## 1. The architecture: three content layers + one rendering layer

Consistency at scale comes from a strict layering — every piece of content the engine emits
belongs to exactly one layer, and each layer has its own change cadence and QA gate:

| Layer | Contents | Where it lives | Changes at | QA gate |
|---|---|---|---|---|
| **CORE (universal)** | PP-CORE-00 + gate, H-CORE-00 + gate, band decision table, severity enum, eligibility classes, ordering/JUSTIFICATION/citation contracts | `archetypes/_core.md`, `references/intake_v1.1.md`, algorithms | Version events only (n=4 re-acceptance) | Full acceptance battery |
| **ARCHETYPE (per industry)** | KPI taxonomy, pain library (+`eligibility`), hypothesis library (+anchors, D6 flags, `agent_shaped`, `h0_consumer`, `band1_pool`), terminology, defaults | `archetypes/<industry>.md` | Archetype version events | Per-archetype golden + n=4 activation gate (§3) |
| **CLIENT (per engagement)** | INTAKE_FACTS verbatim fields, document evidence, form answers | Engagement inputs (checksummed) | Per engagement | Pre-registered expectation manifest + n=2 delivery protocol |
| **RENDERING** | Heading skeletons, section templates, permit lists, the pinned §7 sentence | Stage heading contracts + `permit_manifest_<schema>.json` → (terminal) ADR-001 render-from-contract templates | With the schema | Heading census + allowlist on every stage |

**The invariant that makes cross-industry consistency possible:** determinism comes from the
archetype anchor tables (T-21 score anchors + flag columns), not from the model's judgment.
An industry without a ratified archetype **cannot** produce consistent output, by construction
— the generic skeleton has no anchors, so every score is per-run judgment. Rule: **no
consistency-sensitive engagement ever runs on the skeleton.**

## 2. What is universal vs. what varies (the portability contract)

**Never re-derived per industry (CORE):** the PP-0/H-0 pattern and gates; the band table
(FRAGMENTED/USABLE/SOUND × FRICTION/ALIGNED); eligibility classes (process/organisational/
product-gap); the 6 maturity dimensions + D3/D4-style evidence gates; selection formulas and
tie-breakers; the two-layer diagnostic/commercial boundary; count policies; the machine spine
(pp-ids, 14-field markers, INTAKE_FACTS).

**Varies per archetype (and only here):** which pains/hypotheses exist, their typical scores
and flags, KPI rows Section B must surface, industry terminology, BOUNDED defaults.

**Varies per country/regime (parameterized, never forked):** the `Regulatory Regime` header
field (EU/GDPR · Non-EU · Sector-specific) reframes every Governance-related pain/hypothesis;
currency and language conventions are style parameters; jurisdiction list flows from
INTAKE_FACTS. **Rule: a new country never creates a new archetype** — it adds a regime note
block to the existing one. Sector-specific regulation (healthcare, financial services) enters
as a regime, with its enforcement-date semantics feeding the existing `compliance_deadline`
machinery unchanged.

## 3. The Archetype Factory — activating a new industry (the gate that protects quality)

An archetype moves SKELETON → PENDING → **ACTIVE** only through this sequence (est. 3–5 days
of construction + one acceptance cycle; the INDEX backlog order stands: Manufacturing →
Professional Services → Financial Services → Technology/SaaS):

1. **Build the archetype file** from `_template_skeleton.md`: 12–18 pains with `eligibility`
   classes; 10–15 hypotheses with Typical I/F/A anchors ratified by the Practice, all D6
   flags, `d_gate4`/deadline semantics, `phase_dependency`, `agent_shaped`, `h0_consumer`,
   `band1_pool`; KPI taxonomy; terminology table; reference `_core.md` (never duplicate it).
2. **Author the synthetic golden case** (the Meridian pattern): a fictional company with a
   full 8-document kit + intake form, deliberately planted contradictions (with a CR register),
   and a Band-1-like profile. Fixture hygiene: never named after team members; checksummed.
3. **Senior-consultant vetting** of the golden output — the same manual confirmation the
   Meridian golden received. Signoff is recorded in the benchmark file and in the
   pre-registration manifest's `signoff` block (this is where the "vetted by senior AI
   Consultants" requirement is operationalized per industry).
4. **Encode, don't hope:** run the derivation proof — the algorithms must reproduce the vetted
   golden mechanically. Every gap becomes a written rule (the §A register pattern), never a
   tacit understanding. Direction is always rules → benchmark.
5. **Pre-register expectations** (`harness/expected/<fixture>_expected.json`, signed) and add
   the archetype's band-2/band-3 calibration fixtures (the anti-fabrication tests — PP-0 must
   NOT fire on the healthy fixture).
6. **Activation gate:** n=4 acceptance vs the expectation manifest + the full seeded battery
   (seeded drop, seeded deadline-defer, seeded H-0 split) + heading census on every stage +
   delivery-path extraction with the bundle. 6/6 or the archetype stays PENDING. Update
   INDEX.md and the permit manifest; bump versions per the four-layer checklist (OPERATIONS.md).

## 4. Engagement-time consistency (any industry, any country — the standing protocol)

1. Inputs checksummed → 2. expectation manifest exists for pinned fixtures / spine-diff for
live clients → 3. run twice (n=2), diff the decision spine mechanically (`check_stability.py`
+ `check_expectation.py`, ~30 seconds) → 4. spine identical → proceed; divergent → **stop,
file the fork as a finding** (a spine fork on ratified anchors is a contract gap that will
recur — the fix is a rule, not a re-roll) → 5. gates (GATE 1/3/5) → 6. Build Sheet only
through the aria-spec honesty gates.

## 5. What "identical" means at every scale (the promise, calibrated)

- **Decision spine** (pain/hypothesis sets + order, all scores, maturity, band, phases, names):
  **byte-identical across runs, mechanically verified** — this holds today and is the promise
  to consultants and clients.
- **Structure** (sections, headings, tables): identical by contract; enforced by heading
  skeletons + allowlist now, **by construction under ADR-001 render-from-contract** — which is
  the committed terminal architecture precisely because prose-era pinning re-arms at every
  scope expansion (Era M → Era N evidence). Every new archetype multiplies free-prose
  surfaces; templates are what make industry #5 as stable as industry #1.
- **Wording of narrative prose**: semantically stable, not byte-identical, until ADR-001 lands.

## 6. Scaling risks and their standing controls

| Risk | Control |
|---|---|
| New archetype re-arms selection/phase forks (the Era-N lesson) | Activation gate = full seeded battery per archetype; expectation manifest per fixture |
| Severity/eligibility drift between industries | CORE enums + eligibility classes are CORE-layer — archetypes cannot redefine them |
| PP-0 fabrication on healthy clients in new sectors | Band-3 calibration fixture mandatory per archetype |
| Regime mistakes (GDPR language for non-EU client) | `Regulatory Regime` header is operator-declared; preflight rejects mismatched regime references |
| Version splits across the four layers | OPERATIONS.md four-layer checklist; permit manifest regenerated from schema |
| Tacit consultant judgment re-entering as variance | The codification loop: every golden-vs-run divergence becomes a written rule or a re-rated anchor at a version event — never left tacit |
