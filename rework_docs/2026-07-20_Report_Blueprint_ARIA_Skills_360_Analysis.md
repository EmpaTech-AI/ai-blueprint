# AI Value Blueprint × ARIA Enhancement — 360° Feasibility, Regression-Risk & Skills-Change Analysis

**AI Assist BG · Blueprint Practice · CONFIDENTIAL** · 2026-07-20 · Prepared by Claude (Fable 5) on Viktor Serafimov's instruction
**Evidence base:** all four `rework_docs/` files (Meridian Golden Case draft, AI Brain Foundation Pattern v1.1, ARIA Productization 360, Blueprint v35/v35.1 Era M report) read in full, cross-checked against the complete production pipeline in `backend/src/skills/` (all 6 SKILL.md files, all selection/ordering algorithms, schema `intake_v1.0`, archetype libraries, both Meridian anchor dossiers, preflight rules, and the harness check inventory).
**Scope per instruction:** prompt/skill-level analysis only. No changes were made to any project file; this report is the only artifact produced.

---

## 0. Executive Summary

**Verdict: the enhancement is strategically sound and feasible — and the two-layer architecture you chose (diagnostic content inside the pipeline via a governed `intake_v1.1` schema bump; commercial/ARIA logic outside it in a standalone `blueprint-aria-spec` skill) is the correct boundary. I confirm every one of its four stated rationales independently from the pipeline evidence.** The PP-0/H-0 pattern is diagnosable from evidence surfaces the pipeline already captures (the current Meridian golden dossier's Section E already documents "no integrations… all reporting via CSV exports into Excel"), so PP-0 instantiation is grounded, not fabricated, for Band 1/2 clients — and the Band 3 anti-hallucination contract is exactly the right guardrail for the opposite case.

**Benchmark status: the Golden Case is accepted in this analysis as the authoritative, senior-consultant-vetted ground truth for what DONE and GOOD looks like — its pain-point register and hypothesis map are treated as correct by definition.** The critical finding is therefore not that the golden case is wrong, but that **the pipeline's written rules cannot yet derive it**: the vetted output embodies at least three pieces of senior-consultant judgment (pain-pool eligibility, absorption targets, presentation order) that exist nowhere in the pinned algorithms. I found 6 hard gaps (selection, count, ordering, severity vocabulary, linkage, and phase capacity) where the written contracts must be updated to encode the benchmark — until they are, acceptance runs against the golden case will fail by construction, and runs will fork on exactly the surfaces you care most about (which pain points get selected). These are enumerated in §3 with the precise rule changes that close each gap. A small number of items (R-7, R-8) are internal inconsistencies *within the rework document stack itself* — between the golden case and the Foundation Pattern's own two-layer boundary — which the Foundation Pattern already schedules as P0 sign-off items; those need a recorded Practice decision, not a re-vetting of the analytical content.

**Separately — and this is the highest-leverage finding of the whole review — the current framework already contains five internal contradictions that actively generate the run-to-run inconsistency you are fighting today, independent of ARIA.** The most serious: the two "golden" anchor dossiers (`golden/` and `examples/`) disagree with each other on hypothesis ordering and JUSTIFICATION format, and **neither contains the machine-readable spine the skills mandate** (zero `<!-- score: -->` markers, zero `<!-- pp-id: -->` comments, no `INTAKE_FACTS` block, no `Selection score` lines). Every run reads a worked example that contradicts the written contract and must silently reconcile the two — that reconciliation is per-run judgment, i.e., variance. Fixing this is cheap and delivers an immediate consistency win (§4).

**Sequencing recommendation (differs from the Foundation Pattern's plan in one place):** keep P0 (golden-case fixes) and P1 (T-10⁹ acceptance on current schema) exactly as planned; build Layer B (`blueprint-aria-spec`) in parallel after TR1 — it is read-only over pipeline outputs and can derive the PP-0 verdict, band, and H-0 recommendation itself from `intake_v1.0` outputs in an interim mode, so ARIA can be sold and delivered commercially **without touching the pinned pipeline at all**. For Layer A, I recommend **folding the `intake_v1.1` content bump into the ADR-001 Approach 3 (render-from-contract) build rather than running it as a separate prose-era schema bump** — Era M proved incremental prose-pinning is exhausted, and Layer A as planned would add several brand-new free-prose surfaces (PP-0 template text, tombstone notes, band language, severity-logic prose) to exactly the architecture that just failed its acceptance on free-prose surfaces. One re-acceptance cycle instead of two, and the new content lands as pinned template content on day one (§5).

Section 6 gives the full per-skill change specification; §7 the cross-industry consistency architecture; §8 an honest statement of what "identical output" can and cannot mean.

---

## 1. What Was Reviewed

| Source | Role in this analysis |
|---|---|
| `Meridian_Client_Golden case example.docx` | The draft golden output (9-count defect, stale PP-6 cross-ref — both already corrected in the Foundation Pattern appendix) |
| `AI_Brain_Foundation_Pattern_v1_0.md.docx` (v1.1) | The methodology doc: two-layer doctrine, PP-0 template, H-0 promotion gate, band calibration, two-layer implementation split §9, corrected golden case §10 |
| `2026-07-20_Report_ARIA_Productization_360.docx` | ARIA product state, Foundry model, tiering, Build Sheet concept, roadmap |
| `Blueprint_v35_Report_FrameV4_Consolidated_Full_EraM.md` | Acceptance state: Era M 4/6 → v35.1 nominal 5/6 contested; T-30/T-31 `[C]` unvalidated; T-10⁹ owed; ADR-001 committed post-6/6 |
| `backend/src/skills/` (production) | Full pipeline: orchestrator 2.1.0, intake 2.1.0, maturity 1.1.0, opportunities 1.1.0, roadmap 1.1.0, assembly 1.0.0, methodology-and-contracts, all algorithms, schema, archetypes, goldens, preflight, harness inventory |

Authority note: the Foundation Pattern §10 appendix is treated as the authoritative golden case (it explicitly corrects the draft docx). The draft docx should be marked superseded to prevent two golden truths circulating — see R-17.

---

## 2. Strategic Assessment — Is the Approach Sound?

### 2.1 What is right (endorsements, verified against the pipeline)

1. **The two-layer split is correct, and each §9.2 rationale independently checks out against the code-level evidence:**
   - *T-30 collision*: H-0's downstream value is its decomposition (Brain Genesis → governance gate → consumers), but Era M's KR3 failure (S-40/REG-16) was precisely a model decomposing one scored entity across phases — proven **intermittent**, so it cannot be retired by a clean run. Scoring H-0 undivided inside the pipeline and decomposing it only in the Build Sheet is the only placement consistent with the T-30 BLOCKER.
   - *Cadence mismatch*: pipeline changes at acceptance-cycle speed (n=4, version events); ARIA pricing/adapters/gate-status change at sales speed. Coupling them would force a full re-acceptance per price change or silently invalidate lineage. Verified: the versioning policy in the orchestrator and the "all 5 skills version-bumped together" rule make this cost real.
   - *Diagnostic integrity*: Stage 3 carries a "non-salesy tone" quality rule; embedding tiers into diagnostic stages converts an audit into a brochure. Verified in `blueprint-opportunities/SKILL.md` Quality Rules.
   - *Blast radius under ADR-001*: Layer B embedded would create five new client-facing emission surfaces to leak-gate; standalone it creates one. Consistent with the S-01…S-43 emission-surface history.

2. **PP-0 is evidence-grounded for the Meridian class of client.** The current production golden dossier already contains the full PP-0 evidence base verbatim (Section E: "Data flows are entirely manual: no integrations exist between any systems; all reporting produced via CSV exports into Excel; Vincere ATS and Xero have documented APIs but neither has been used"). Instantiating PP-0 is therefore a re-aggregation of already-captured evidence, not new discovery — exactly what a template-instantiation rule (rather than hoped-for emergence) is suited to. This is the strongest argument that PP-0 can be made *deterministic*.

3. **The Band contract is the right shape for cross-client consistency.** Pinned expected-output columns per band ("an expected-output contract — pinned columns, not prose vibes") is the same design philosophy that fixed maturity scoring (the D3/D4 gates) — generalized. Band 3 as an anti-hallucination regression test is the single most important safeguard in the whole enhancement: it converts "will the system force-fit CRITICAL PP-0 onto a healthy client?" from a worry into a testable acceptance criterion.

4. **The sequencing discipline is right.** Nothing lands before T-10⁹ credits and TR1 closes; the golden case only becomes the pinned benchmark at the v1.1 version event; the orchestrator pointer ships in the same version event. This respects the ratchet and the "never mid-engagement" rule.

5. **The commercial logic holds.** The Blueprint→ARIA handoff (Compressed Dossier → tenant config; Maturity Snapshot → tier; Opportunity Map → agents) reuses the three locked pipeline outputs read-only. Maturity gating as a pricing router ("don't sell Premium to a company that can't absorb it") is both a delivery-protection and a credibility asset. Meridian as the demo tenant closes the loop elegantly.

### 2.2 Where the strategy carries real risk (summary — details in §3)

- **The benchmark is currently unreachable**: the golden case's emergent pain-point selection cannot be produced by the pinned selection formula as written (R-1), the hypothesis count and ordering contracts collide (R-3, R-5), and one hypothesis violates the linkage validation rule (R-2). A benchmark the pipeline structurally cannot emit is a permanent acceptance failure — the Foundation Pattern itself states this principle (§9.1); the remaining work is to actually make the golden case derivable, rule by rule.
- **Layer A on the prose architecture re-arms the fork cycle**: adding PP-0 template prose, tombstone notes, band verdicts, and severity-logic paragraphs to a free-prose emission pipeline creates new unpinned surfaces of exactly the class that produced S-39/S-40/S-41/S-43. (§5 gives the mitigation: fold Layer A into Approach 3.)
- **Diagnostic-integrity erosion at the margins**: the corrected golden case itself still carries Layer B content inside the Layer A artifact (R-7) — tier ceilings and adapter routing sit in the H-0 row of §10.2. The boundary you defined is right; the golden case does not yet obey it.
- **H-0 raises decomposition pressure by design.** H-0 is an entity whose *entire downstream value* is its decomposition — the temptation for the model to split it in the roadmap ("Brain Genesis pilot now, full brain later") is structurally higher than for any previous Big Bet. T-30's clause (c) is still a phrasing denylist (E-1 refinement owed). The seeded-split test at the v1.1 acceptance **must include an H-0 split case**, and the E-1 structural refinement (row-count invariant + ID-required placement) should ship with v1.1, not after it.

---

## 3. Regression-Risk Register — Codification Gaps Between the Vetted Benchmark and the Pinned Rules

**Reading direction for this section: the golden case is ground truth; the written rules are what change.** Each item states the gap, the evidence, and the rule change that makes the pipeline derive the vetted output. Items R-1…R-6 were **BLOCKER-class for P0/P2** (acceptance against the benchmark fails by construction until the rules encode it). R-7…R-12 are design decisions the Practice must record — including two places where the rework documents disagree *with each other* — to avoid new fork surfaces.

> **RESOLUTION STATUS (end of session, 2026-07-20): every item below carries a recorded resolution — none remains open.** The resolutions live in the pinned benchmark's §A encoding register (`Meridian_Golden_Benchmark_v1_1_PINNED.md`, 18 items, adopted as standing) and its §B derivation proof: **R-1**→A-1/A-2/A-3 · **R-2**→A-12 · **R-3**→A-6 · **R-4**→A-4/A-5 · **R-5**→A-11 · **R-6**→A-13 (scope corrected in §10 — the Meridian benchmark itself is capacity-clean) · **R-7**→A-15 · **R-8**→A-15 · **R-9**→A-14 · **R-10**→the §C/§D/§E per-stage artifacts · **R-11**→A-2 + §B.4 band table · **R-12**→A-10 · **R-13** (§10)→A-8/A-9. The later-added **A-16/A-17/A-18** close the remaining previously-symbolic surfaces: the Section H category 2 expected-contradictions register, the verbatim INTAKE_FACTS block, and the SHA-256 input-fixture manifest — all derived from the fully ingested input pack. The findings below are preserved unedited as the analysis record (ratchet).

### R-1 — The golden emergent pain-point set is not derivable from the pinned selection formula ⛔

The corrected golden case selects emergent = **{PP-0 fragmented data, PP-6 GDPR, PP-7 researcher turnover}**. The pinned algorithm (`pain_point_selection.md`) with its own worked-example scores produces emergent = **{GDPR 30, RPO-product-gap 25, pipeline-visibility 25}** — turnover scores **17** and cannot enter the top 3 under any tie-break. Since the golden selection is the vetted-correct answer, this proves the *algorithm* is missing rules the senior consultants applied implicitly — the benchmark stands; the formula must be extended to derive it.

Reconstructing the vetted judgment, three rules must be added to the written algorithm:
1. **PP-0 instantiation** (always-in when evidenced) — written in the Foundation Pattern §3. ✔ covered.
2. **Absorption**: pipeline-visibility (25) is absorbed into PP-0 as a no-SSOT symptom — written in §3 ("absorb any emergent no-integration/no-SSOT pain point into PP-0"). ✔ covered, but note it silently merges the old PP7 partly into PP-5's evidence as well ("MD has no real-time pipeline visibility" now sits in PP-5) — the absorption rule must state where absorbed evidence lands.
3. **Pool eligibility** — *not written anywhere*: RPO-product-gap (25) vanishes entirely (neither selected nor runner-up), and exec-search fee-sharing (19) is excluded as "organisational, not process." The implicit rule is: **the Section C candidate pool contains only operational/process pains; missing-product ambitions and organisational-structure frictions are ineligible** (tracked as opportunities or delivery risks instead). Only with this rule does turnover (17) become the third emergent.

**Remedy (P0 + P2):** codify the eligibility rule as a typed classification in the pain-pool definition (e.g., an `eligibility` column in the archetype Pain Point Library: `process | organisational | product-gap`, with only `process` eligible for Section C), update the archetype (PP-RT-08 RPO and PP-RT-09 exec-search reclassified), and republish the worked example in `pain_point_selection.md` showing the corrected golden derivation end-to-end (PP-0 instantiated → visibility absorbed → RPO/exec-search ineligible → GDPR 30, turnover 17 selected). Until this table exists, two conscientious runs can legitimately disagree on the most important output of the entire pipeline.

### R-2 — H-7 violates the hypothesis→pain-point linkage contract ⛔

Golden case H-7 (BD proposal automation + RPO productisation) links to "BD effort **(runner-up PP)**" — a pain point *not* in Section C. Current contract (schema §4.6 + harness): "Each hypothesis must link to ≥1 pain point in Section C. Hypotheses without a linked pain point fail validation."

**Remedy (pick one, pin it):** (a) allow linkage to a named strategic priority as an alternative anchor (schema change: `Linked Pain Point(s) OR Strategic Priority`), or (b) re-anchor H-7 to a selected PP (it plausibly links to PP-0 via proposal data fragmentation — weaker but compliant), or (c) keep a "runner-up register" as a formal dossier element that hypotheses may link to. Option (a) is cleanest — it matches how the hypothesis library already covers priorities with zero pain-point coverage (Check 3.1).

### R-3 — Hypothesis count: FIXED-at-7 vs golden's 8 ⛔

The golden case has 8 hypotheses (H-0 + 7). "7" is hard-wired in: schema §4.6 (FIXED at 7), intake Chunk 2 + Checkpoint 2 template (7 slots), orchestrator GATE 3 ("exactly N markers… typically 7"), opportunities pre-flight ("must equal the number of hypotheses… typically 7"), roadmap GATE-4 ("all 7 opportunities assigned").

Additionally, H-0's selection mechanics are undefined: does H-0 *compete* for a top-7 slot on score (at Impact 5 × Feasibility 1–2 × Alignment 5 = 25–50 it would displace H-RT-04 at 16 and reshuffle the set), or is it an **always-in additional slot** when the promotion gate passes?

**Remedy:** pin the count policy as **"7 + H-0 (GATED)"** — H-0 occupies a reserved slot when and only when the promotion gate passes; it never displaces a scored candidate; the core 7 are selected exactly as today. This preserves the entire existing selection spine (zero regression surface on the proven ×4 selection) and makes the gate the only new decision point. Update every "7" reference in the same version event, and pin the per-band expected counts (Band 1/2: 8 PPs incl. PP-0 + 8 hypotheses incl. H-0; Band 3: 8 PPs *without* PP-0 — or 7+opportunity-reframe — decide and write it).

### R-4 — Severity vocabulary and pain-point ordering both break ⛔

(a) The golden uses **CRITICAL (systemic)** and **CRITICAL (acute)**; the schema enum is `High / Medium-High / Medium / Low`. Ordering (`ordering.md`) sorts by Severity DESC — undefined for the new values.
(b) The golden case order is **PP-0 first, then PP-1…PP-5 in original form-stated order, then emergent** — which violates the current pinned "Severity DESC" combined ordering (a strict reading would place PP-6 GDPR (HIGH) before PP-5 interview (MEDIUM); the golden does the opposite).

**Remedy:** extend the severity enum (`Critical (systemic) > Critical (acute) > High > Medium-High > Medium > Low`) and pin the new ordering rule explicitly. Note the golden's implicit ordering (PP-0 → stated-in-form-order → emergent-by-score) is actually *more* input-stable than severity ordering (form order never varies), so I recommend adopting it as the v1.1 ordering contract — but either choice must be written; a benchmark that contradicts the pinned ordering algorithm forks every run. Add the new PP-0 fields (`Scope`, `Precedence: P0`, `Absorbs`, severity-logic line) to schema §4.5.

### R-5 — H-0 "promoted to the top" vs pinned presentation ordering; golden renumbers everything ⛔

The promotion gate says "promote H-0 to the **top** of the opportunity map." Stage 5 presentation ordering is pinned as Quick Wins → Foundation Builders → Big Bets; H-0 (a Big Bet) would present *last*. Moreover the golden case's numbering (H-1 sourcing, H-2 CV, H-3 reporting, …) matches neither the current golden dossier's positions (H1 CV, H2 ATS, H3 scheduling, …) nor any output of the pinned ordering algorithm — and position labels are load-bearing downstream ("downstream skills reference hypotheses by position label").

**Remedy:** redefine "promote" as *include in the selected set* (selection semantics), not *rank first* (presentation semantics). Pin one presentation rule — recommended: **H-0 always presented first, remaining 7 in the existing QW→FB(enabler)→FB→BB order**, since "the foundational rung leads" is the whole narrative point and a fixed slot-1 is deterministic. Then regenerate the golden case's numbering to match the pinned ordering, and re-audit every cross-reference (the tombstone discipline the Foundation Pattern already prescribes).

### R-6 — Roadmap phase capacity breaks mechanically with H-0 ⛔

Current Meridian phase map: Now {02, 05, 07}, Next {03}, Later {01, 04, 08}. H-0 is `phase_dependency=strict` ⇒ Later, unconditionally (correct per T-27/T-30). That makes **Later = 4 items**, violating the pinned "maximum 3 items per phase," and the capacity rule's remedy ("bump to the next phase") is undefined for Later — there is no next phase. This is per-run-judgment territory, i.e., a guaranteed fork surface.

**Remedy:** pin "Now and Next capped at 3; **Later uncapped**" (or cap 4). Rationale to record: Now/Next caps protect executive attention and delivery capacity; Later is a horizon, not a workload commitment.

### R-7 — Layer B content inside the Layer A golden artifact (boundary self-violation) ⚠

The corrected golden case §10.2 H-0 row contains: "Band 1 → **ARIA Standard ceiling**; Vincere = **non-standard adapter (Custom/roadmap dependency)**; investment case cited from Blueprint ROI evidence…" — tier routing and adapter logic are Layer B by the Foundation Pattern's own §9.2. If this row is pinned as pipeline benchmark content, the diagnostic emits product tiering — the exact "brochure" failure §9.2 warns against, and a new leak class for the S-registry.

**Remedy (P0):** strip tier/adapter/pricing language from the pipeline-facing H-0 definition. The pipeline H-0 names the *capability* ("governed unified-data + AI-knowledge layer / AI Company Brain") and its evidence, prerequisites (H-5 governance, H-4 governed data), and strategic-link=cross-cutting. Tier ceiling, adapter availability, and the §8 honesty flags render in the **Build Sheet** (and, where leadership wants ARIA named in the client deliverable, as a deliberate pinned string in Stage 5 Section 7 "Recommended Next Steps" — which already legitimately names AI Assist BG services). Add `ARIA`, tier names, and price patterns to the preflight forbidden-pattern sets for Stages 1–4.

### R-8 — Nesting contradiction: are H-4/H-5 separate bets or phases of H-0? ⚠

Foundation Pattern §4: "**Inside H-0** (phases, not separate bets): Brain Genesis — the data-governance/revival hypothesis; Governance gate — the AI-policy/GDPR hypothesis." But golden §10.2 lists H-4 (database revival) and H-5 (AI policy) as **separate scored hypotheses**. A run following §4 literally would absorb them (emitting 6 core hypotheses); a run following §10.2 keeps 8. That is a selection-set fork seeded by the methodology doc itself.

**Remedy (P0):** rewrite §4 to state explicitly: *in the pipeline*, H-4 and H-5 remain separate sibling entities with their own pain-point linkages and scores (they are independently actionable and independently evidenced); *in the Build Sheet*, they map onto H-0's phase structure (Brain Genesis, governance gate). The pipeline never nests; only the Build Sheet does. This is the same one-entity-one-score discipline T-30 enforces, applied in reverse.

### R-9 — "Pre-scoring inputs … no scores, no ranking" vs the mandatory score spine ⚠

Golden case §2 says the hypotheses "carry no Impact/Feasibility/Alignment scores, no ranking." The pipeline's entire reproducibility architecture (T-21 anchors, T-02 locks, Stage 3 score-lock, Stage 4 field-driven placement, GATE 3) depends on every hypothesis carrying a visible `Selection score` line and a machine `<!-- score: -->` marker. If a run imitates the golden's scoreless presentation, the downstream pipeline collapses.

**Remedy:** classify this as a **presentation-layer rule**: the internal dossier keeps the full score spine (invisible HTML markers + Selection score lines, exactly as today); the *client-facing rendering* of the hypothesis table (Stage 5 / handoff document) omits scores and ranking. State this in the golden case header ("this artifact is the client-facing rendering; the underlying dossier carries the full machine spine — see pinned per-stage benchmarks"). Better yet, resolve the ambiguity structurally per R-10.

### R-10 — The golden case is a hybrid artifact; benchmarks must be per-stage ⚠

The golden case mixes Stage 1 content (pain register, hypothesis table), Stage 4 content (phasing/sequencing constraints in the design-constraints column), and Stage 5 presentation (client-facing prose, no scores). The acceptance machinery (n=4, KR grid) evaluates **per-stage artifacts**.

**Remedy (P0/P2):** derive from the golden case **three pinned per-stage benchmark artifacts**: (i) Stage 1 Section C/D content benchmark (with full machine spine), (ii) Stage 4 phase-map benchmark (Now/Next/Later with H-0 in Later, Later-cap amended), (iii) Stage 5 rendered-sections benchmark. The prose "golden case" remains the leadership-facing statement of intent; the pipeline pins against the three derived artifacts.

### R-11 — Band assignment is prose, not a decision table ⚠

"Data + Technology drive the Layer 1 grade; People + Processes drive alignment; Governance gates phasing; Strategy sets alignment scores" is directionally clear but not deterministic — mixed cases (Data Early + People Established; Technology Developing + adoption-resistance evidence) will fork. The band drives PP-0's severity verdict, H-0 posture, tier ceiling, and roadmap shape — it must be as pinned as D3/D4.

**Remedy (P2):** add a **`[BAND_ASSIGNMENT]` machine block** to Stage 2 output (modeled on `[CONFIDENCE_PROPAGATION]`), derived by a pinned decision table from the six levels plus two Document-Backed evidence conditions (integration status; org-friction signals), with calibration examples in the SKILL.md exactly like the D3/D4 gates have ("→ Meridian = Band 1 on every run; a run that assigns Band 2 is wrong"). Downstream (aria-spec, and v1.1 Stage 1 PP-0 gate) read the block, never re-derive.

### R-12 — The H-0 promotion gate's "agent-shaped" test is judgment ⚠

"≥2 agent-shaped opportunities" is currently a definition in prose ("recurring, cadence-runnable knowledge work over grounded company data…"). Left as prose, the gate fires differently across runs.

**Remedy (P2):** add an **`agent_shaped` (yes/no) column to every archetype Hypothesis Library row** — a Practice-team determination, exactly like the D6 flags — so the gate is `count(selected where agent_shaped=yes) ≥ 2`, a lookup. The PP-0 instantiation gate similarly needs D3/D4-style artifact conditions (e.g., PP-0 at CRITICAL-systemic iff zero-integrations + manual-consolidated-reporting are Document-Backed; degrade to HIGH-structural when integrations exist but are partial; opportunity-reframe when Layer 1 is sound). Both gates get calibration rows for all three bands.

---

## 4. Defects in the Current Framework That Cause Inconsistency Today (independent of ARIA)

These predate the enhancement and are almost certainly contributing to the variance you observe. All are cheap to fix and belong in the v1.1 version event (or an immediate docs-consistency patch if you accept a version bump for it).

| # | Defect | Evidence | Why it forks runs |
|---|---|---|---|
| D-1 | **Two divergent anchor dossiers.** `blueprint-intake/SKILL.md` Step 4 anchors on `examples/recruitment_meridian_v1.md`; the archetype §6 anchors on `golden/recruitment_meridian_v1.md`. They differ: golden has FW-02 enabler-first ordering (GDPR at H4); examples has the pre-FW-02 order (Sourcing at H4). Examples also lacks the golden's full Strategic-Priority-Coverage entry | 172-line diff | The model reads both files in one run and receives two contradictory exemplars for Section D ordering — the exact surface (intra-section ordering) flagged as forking (S-43 class) |
| D-2 | **Both anchors lack the mandatory machine spine.** Zero `<!-- score: -->` markers, zero `<!-- pp-id: -->`, no `INTAKE_FACTS` block, no `Selection score` lines in either golden or examples | grep counts = 0 across both files | The strongest behavioral anchor (a complete worked document) contradicts the written contract (14-field score markers, pp-ids, Section I). Reconciling exemplar-vs-contract is per-run judgment |
| D-3 | **JUSTIFICATION format contradiction across canonical files.** `intake_v1.0.md` §4.11 and the golden dossier use the old `**Item N —** / Class: / Why not higher:` format; `methodology-and-contracts` + intake SKILL.md mandate `#### N. [Tag]` + `Claim/Element/Why/Missing/Action`; `preflight.md` Pattern Set 6 *enforces the old format* ("must open directly with `**Item 1 —`") while the SKILL.md says it must open with `### Confidence Overview` | direct file comparison | The schema says "when schema and SKILL.md disagree, the schema wins" — so the schema is instructing the deprecated format. Three files, two formats, one precedence rule pointing the wrong way |
| D-4 | **Dead cross-reference for INTAKE_FACTS.** SKILL.md cites "intake_v1.0 §4.9" for the INTAKE_FACTS validation rule; schema §4.9 is Open Questions; the schema's top-level structure (11 elements) has no Section I at all | `intake_v1.0.md` §3, §4.9 | The single-source-of-truth document does not define the pipeline's single-source-of-truth block |
| D-5 | **Stale orchestrator text.** "Until this file exists at the path above, the pipeline operates on prose guidance only" — the file exists | orchestrator SKILL.md Methodology Reference | Minor, but stale meta-statements erode the authority of the contract files the whole discipline depends on |

**Recommendation:** collapse to **one** anchor dossier (delete or fully sync `examples/`; point SKILL.md Step 4 and archetype §6 at the same path), regenerate it fully schema-conformant **with the complete machine spine** so exemplar and contract agree byte-for-byte, unify the JUSTIFICATION format everywhere (canonical `#### N. [Tag]` — fix schema §4.11 and preflight Pattern Set 6), and formalize Section I in the schema. Do this in the v1.1 event so it rides the same re-acceptance.

---

## 5. Sequencing Recommendation — Amended P0–P5

The Foundation Pattern's plan (P0 golden fixes → P1 T-10⁹ → P2 v1.1 bump → P3 aria-spec → P4 orchestrator pointer → P5 hardening) is right in structure. Two amendments:

### 5.1 Amendment 1 — Layer B first, with an interim derivation mode

`blueprint-aria-spec` has no pipeline dependency (P3 is already marked parallel). Go further: specify its v1 to **derive** the PP-0 verdict, band, and H-0/tier recommendation *itself* from the three locked `intake_v1.0` outputs (the evidence is already in Section E/B + the maturity snapshot — verified above). That gives you:
- ARIA sellable/deliverable now (the Q3 rocks and the offer-ladder gap don't wait for a pipeline re-acceptance);
- zero regression surface (read-only consumer, one emission surface, own leak/name gates);
- a live testbed for the band decision table and honesty-flag gates *before* they are frozen into v1.1.

When v1.1 lands, aria-spec switches from derive-mode to read-mode (consuming PP-0/H-0/`[BAND_ASSIGNMENT]` directly) — a simplification, not a rewrite. Interim caveat to record: until v1.1, the client-facing Blueprint document itself will not show PP-0/H-0 (they exist only in the Build Sheet layer); the pinned benchmark remains the v1.0 golden. This is an acceptable, explicitly temporary divergence from the golden-case aspiration.

### 5.2 Amendment 2 — Fold Layer A into the ADR-001 Approach 3 build (one re-acceptance, not two)

The current plan implies two full n=4 re-acceptance cycles: one for the v1.1 prose-era schema bump (P2), another when Approach 3 (render-from-contract) lands post-6/6. Era M's own conclusion — "incremental pinning has reached its limit… the only construction complete-by-design against unseen forks and free-prose emissions is render-from-contract" — argues directly against inserting a new prose-era content bump in between, because Layer A adds several **new free-prose surfaces** (PP-0 template paragraph, severity-logic line, tombstone notes, absorption notes, band language, "Impact & audit relevance" fields) to exactly the architecture that just failed on free-prose surfaces. Each would need its own T-XX pin, re-opening the J→M relocation cycle you have already diagnosed as exhausted.

**Recommended sequence:**

| Phase | Work | Gate |
|---|---|---|
| P0 | Golden-case fixes per §3 (R-1…R-10 resolutions written; three per-stage benchmark artifacts derived; Layer B content stripped) + the §4 anchor-file consolidation decisions agreed | Sign-off: golden derivable end-to-end from written rules |
| P1 | T-10⁹ on current schema (unchanged): v35.1 build, n=4 + seeded split, delivery-copy extraction, bundle, fixture rename | 6/6 credited |
| P2′ | **Approach 3 template build + intake_v1.1 content together**: deliverables render from pinned contracts; PP-0/H-0/band content lands as template content + schema fields + algorithm rules; D-1…D-5 fixed in the same event; E-1 (T-30 structural refinement) shipped; all 5 skills + validators + goldens bumped together | Full n=4 re-acceptance vs the three pinned benchmark artifacts, including a seeded **H-0 split** and a **Band 3 fixture** run |
| P3 | aria-spec v1 (derive-mode) — starts immediately after TR1, parallel to P1 | Build Sheet correct for all 3 bands; own leak/name gates |
| P4 | Orchestrator pointer + aria-spec switch to read-mode | same version event as P2′ |
| P5 | Universal hardening on 1–2 real imperfect intakes (unchanged) | correct band + H-0 posture + recommendation gating on thin evidence |

If leadership needs PP-0/H-0 in the client-facing Blueprint sooner than Approach 3 can be built, the fallback is the original P2 (prose-era v1.1) — but then budget explicitly for the new-surface pinning cost and treat the Approach 3 re-acceptance as a known second bill. The choice is a timeline/cost decision; the engineering risk asymmetry favors folding.

---

## 6. Skill-by-Skill Change Specification

Everything below is scoped to the v1.1 version event (P2′) unless marked otherwise. All five skills + validators + goldens bump together; the orchestrator refuses mixed versions (existing policy — keep).

### 6.1 New/changed reference files (the contract layer)

| File | Change |
|---|---|
| `references/intake_v1.1.md` (new version) | Section C policy: 8 PPs = 5 stated + PP-0 (GATED on instantiation gate) + 2 emergent when PP-0 fires, else 5+3. New severity enum + `Precedence` + `Scope` + `Absorbs` fields (R-4). New ordering contract (R-4b). Section D policy: 7 + H-0 (GATED on promotion gate) (R-3). Linkage rule amendment (R-2). Section I INTAKE_FACTS formalized in the top-level structure with correct § numbering (D-4). JUSTIFICATION format unified to `#### N. [Tag]` (D-3). "Impact & audit relevance" per-PP field added |
| `algorithms/pain_point_selection.md` | New Stage 0: PP-0 instantiation gate (D3/D4-style Document-Backed artifact conditions + band degrade path, R-12). Absorption/tombstone procedure incl. where absorbed evidence lands (R-1.2). Pool-eligibility rule + typed candidate classes (R-1.3). Fully re-derived Meridian worked example matching the corrected golden |
| `algorithms/hypothesis_selection.md` | H-0 generation rule: reserved slot, never displaces (R-3). Promotion gate as deterministic lookup: PP-0 instantiated AND `count(agent_shaped=yes) ≥ 2` (R-12). Strategic-link value `cross-cutting` (never pinned to one priority — Foundation Pattern §4). Stage 5 ordering: H-0 slot-1, then existing clusters (R-5). Updated worked example |
| `algorithms/ordering.md` | New Section C ordering (PP-0 → stated form-order → emergent by score, or severity-DESC with the new enum — whichever P0 decides). H-0 presentation slot |
| `archetypes/_core.md` (new) | The universal CORE pattern: PP-CORE-00 + H-CORE-00 canonical entries (IDs — recommend a cross-archetype `CORE` namespace so every industry shares them), typical scores, D6 flags (`ml_heavy=yes multi_source=yes large_integration=yes adoption_dependent=yes`), `d_gate4`, `phase_dependency=strict`, instantiation/promotion gates, band decision table. Every archetype references it — the pattern is written once, not per industry |
| `archetypes/recruitment.md` | Add `agent_shaped` column to all 13 hypothesis rows; add `eligibility` column to the Pain Point Library (PP-RT-08, PP-RT-09 → non-process classes); pointer to `_core.md`; H-0/PP-0 Meridian calibration rows |
| `references/preflight.md` | Fix Pattern Set 6 to the canonical JUSTIFICATION opening (D-3). New pattern set: product/tier language in Stages 1–4 (`ARIA`, `Standard/Pro/Premium` tier names, `€/mo`, `setup fee`) (R-7). New pattern: tombstone/absorption notes must not appear in client-facing copies |

### 6.2 `blueprint-intake` (Stage 1)

- Chunk plan: Chunk 2 budget +~400 words (PP-0 + H-0); Checkpoint 2 template extended to 8 PP slots + conditional 8th hypothesis slot with an explicit `H-0 gate: fired/not-fired` line (makes the gate outcome operator-visible per run — the WL-15 fail-open lesson).
- INTAKE_FACTS: add two verbatim-copy fields feeding the new gates deterministically — `INTEGRATION_STATUS` (the verbatim integration/SSOT statement from the tech inventory, or `none-documented`) and optionally `ORG_FRICTION_SIGNAL`. Same T-14 character-for-character discipline. This keeps Stage 1's PP-0 gate and Stage 2's band table reading pinned inputs, not re-deriving prose.
- Anchor consolidation per §4 (single golden, full machine spine, regenerated to v1.1).
- The golden-anchoring instruction (Step 4) should explicitly say: *the golden demonstrates the contract; where golden and schema ever disagree, the schema wins and the divergence is a defect to report* — closing the exemplar-vs-contract reconciliation gap permanently.

### 6.3 `blueprint-maturity` (Stage 2)

- New `[BAND_ASSIGNMENT]` machine block (R-11) after `[CONFIDENCE_PROPAGATION]`: pinned decision table over the six levels + the two INTAKE_FACTS evidence fields; Meridian calibration example ("→ Band 1 on every run; Band 2 is wrong"), plus a Band 2 and Band 3 calibration example each.
- No change to the 6 dimensions, D3/D4 gates, or the Evidenced-Absence rule — they are working (maturity 6/6 across every era since H) and the band derives *from* them. Do not let band logic bleed into dimension scoring (same discipline as the 2A annotation rule: the band annotates the profile; it never re-scores a dimension).

### 6.4 `blueprint-opportunities` (Stage 3)

- Marker-count language 7 → "7 + H-0 when present; must equal Stage 1 Section D count" (R-3).
- H-0 handled identically to all others: locked to Stage 1 scores, D6 adjustments applied (verify the arithmetic produces the intended Big Bet: with Data/Technology Early and three D6 flags firing, post-adjustment Feasibility floors at 1 — confirm classification and the score-comment worked example in the SKILL.md).
- Tone rule reinforcement: extend the non-salesy rule with the explicit product-language prohibition (R-7). The opportunity card for H-0 describes the capability and its consumers; the *offer* lives downstream.

### 6.5 `blueprint-roadmap` (Stage 4)

- Phase capacity amendment: Now/Next capped at 3, Later uncapped (R-6) — with the design rationale recorded in the internal note style already used for the strict-dependency rule.
- GATE-4 self-check: "all 7" → "all Stage 3 opportunities (7 or 8)".
- H-0: no special-casing — `phase_dependency=strict` ⇒ Later flows through the existing pinned rule. Explicitly add to the SKILL.md's internal design note: *H-0 is never decomposed into phase rows; Brain Genesis/governance phasing belongs to the Build Sheet* (reinforcing T-30 at the surface where Era M's fork occurred).
- Seeded-split acceptance case must include an H-0 split (R-18 rationale, §2.2).

### 6.6 `blueprint-assembly` (Stage 5)

- Section 3 (Key Findings) template: leads with the systemic finding (PP-0) when present — pinned template content under Approach 3, not free prose.
- Section 7 (Next Steps): ARIA appears here and only here in the client document, as a named AI Assist BG service recommendation, rendered from a pinned string, conditional on the aria-spec gates passing (§8 honesty flags) — the "earned recommendation" principle from Foundation Pattern §9.2.
- Band language: internal only. The client sees the 6-dimension snapshot narrative as today; band is routing metadata (Stage 2 block + Build Sheet).
- Word-count band: verify 5,000–7,000 still holds with the added content; adjust chunk budgets.

### 6.7 `blueprint-orchestrator`

- GATE 3 marker count: "= Stage 1 Section D count (7, or 8 incl. H-0)".
- Cross-stage hypothesis identity check: title-match list updated; H-0 included; note that H-0's title is a CORE-library constant (paraphrase-immune).
- Post-Gate-5 conditional pointer to `blueprint-aria-spec` (P4; one line, same version event).
- Version table updated; schema gate `intake_v1.1`; remove the stale "until this file exists" sentence (D-5).

### 6.8 `methodology-and-contracts`

- Inter-skill contract table: marker counts, `[BAND_ASSIGNMENT]` handoff row (Stage 2 → aria-spec/Stage 3), CORE-library reference.
- JUSTIFICATION format: already canonical here — becomes the single definition all other files point to (D-3).

### 6.9 `blueprint-aria-spec` (new, Layer B)

- Standalone; invoked conditionally post-Gate-5; read-only over the three locked outputs; versioned independently; one emission surface (Build Sheet YAML + honesty-flag report) with its own leak/name gates.
- v1 = derive-mode (§5.1): computes PP-0 verdict, band, tier from v1.0 outputs. v2 = read-mode against v1.1 blocks.
- Encodes all five §8 honesty flags **as gates, not prose**: no evidenced investment case → no recommendation emitted; unsupported work-management system → `adapter_status: custom-roadmap`; ARIA security gate open → `delivery_blocked: true`; band ceiling enforced; data-quality risk flagged from D4 evidence.
- Own golden set: three Build Sheets (Band 1 = Meridian, Band 2, Band 3 — the Band 3 golden shows the *no-recommendation/opportunity-reframe* output, which is the anti-hallucination benchmark).

### 6.10 Harness (noted for completeness — you scoped this session skills-only)

Validators bump in the same event: section/count checks for the new policies, severity enum, `[BAND_ASSIGNMENT]` well-formedness, marker count, `check_stability.py` spine extended with PP-CORE-00/H-CORE-00, E-1 count-invariant + ID-required placement for T-30, and the Band-3 + seeded-H-0-split fixtures added to the acceptance battery.

---

## 7. Consistency Architecture at Scale — Different Companies, Industries, Countries

The question "how do we make output consistent for *any* client" decomposes into three layers, and the enhancement — properly executed — strengthens all three:

### 7.1 The three-layer content model (make it explicit)

1. **CORE layer (universal):** PP-0/H-0 templates, instantiation/promotion gates, band contract, severity/ordering/JUSTIFICATION/citation standards. Industry-agnostic, written once in `_core.md` + the schema. ARIA's "nearly every company has this problem" thesis is what makes a universal layer possible — use it as the backbone, not a bolt-on.
2. **Archetype layer (per industry):** KPI taxonomy, pain library (typed for eligibility), hypothesis library **with all anchor columns** (Typical I/F/A, D6 flags, `d_gate4`, deadlines, `phase_dependency`, `agent_shaped`, eligibility). This is where determinism actually comes from — the T-21 score anchors and flag lookups are what made the Meridian spine reproduce ×4. **An industry without a ratified archetype cannot produce consistent output, by construction** — the generic skeleton has no anchor tables, so every score is per-run judgment.
3. **Client layer:** INTAKE_FACTS verbatim fields + document evidence. Everything client-specific enters through pinned, verbatim-copy fields — never through re-derivation.

### 7.2 The archetype factory (the real scaling bottleneck)

The INDEX already sketches it; make it a hard rule: **no consistency-sensitive engagement runs on a skeleton archetype.** New-industry onboarding checklist (~1–2 days each, per the INDEX estimate, plus acceptance):
1. Build the archetype (libraries + all anchor/flag columns + CORE reference + terminology + regulatory-regime notes).
2. Build a synthetic golden case for that industry (the Meridian pattern — fictional but realistic, full document set).
3. Produce the golden output and ratify it with senior consultants (the same vetting the Meridian golden case got).
4. Run **n=4 acceptance against the golden** before the archetype goes ACTIVE.
5. For each new *country/regime*: the `Regulatory Regime` header field already parameterizes GDPR/non-EU/sector framing — extend the archetype with a regime note block rather than forking the archetype.

For a client arriving in an industry with no archetype: either (a) build the archetype first (sell the timeline honestly), or (b) run generic-skeleton mode with the Section H flag and *explicitly downgraded consistency expectations*. Never silently mix the modes.

### 7.3 Band contract as the cross-industry stabilizer

The band table is industry-agnostic by design (Layer 1 state + org alignment). Pinning per-band expected-output columns (PP-0 verdict, H-0 posture, tier ceiling, roadmap shape) gives every engagement — any industry — a structural skeleton the model fills rather than invents. Build the **Band 2 and Band 3 synthetic fixtures now** (they don't exist anywhere yet); they are as important as the Meridian golden: Band 3 is the fabrication regression test, Band 2 is the interpolation test.

### 7.4 Delivery-time QA (the "run it twice" discipline, formalized)

Your stated operating need — "when a new client submits data and we re-run to double-check, output must be very close" — is a *production* protocol, distinct from n=4 *acceptance*. Formalize it as the standard delivery run-book:
1. Run the pipeline twice on the same inputs (n=2 delivery check).
2. Diff the **decision spine** mechanically (`check_stability.py`: selection sets by canonical ID, per-ID scores, maturity levels, band, phase map). Spine identical → proceed; spine divergent → do not hand-pick a run; treat it as an incident (file the fork surface, à la S-registry) because a spine fork on ratified anchors indicates a contract gap, not bad luck.
3. Prose differences between the two runs are expected pre-Approach-3 and irrelevant post-Approach-3 (the template renders identically from an identical spine).
4. Extract only from the delivery endpoint (`/delivery`) — the Era M lesson (S-42) institutionalized as an operator rule.

### 7.5 The codification loop (how the system keeps getting more consistent)

The RPO-vs-turnover finding (R-1) is the template for a standing practice: **every time a senior consultant's vetted judgment disagrees with the algorithm's output, the disagreement is resolved by writing a rule or re-rating an anchor — never by leaving the judgment tacit.** The golden case revealed at least three tacit expert rules (pool eligibility, absorption targets, presentation order). Each future engagement review should feed the same loop: divergence → named rule → worked example updated → version event. That loop, plus Approach 3, is the durable answer to non-determinism — the model's freedom shrinks monotonically toward exactly the surfaces where its judgment is wanted.

---

## 8. What "Identical Output" Can and Cannot Mean (expectation setting for the Practice)

The goal statement asks that reasoning, pain-point identification, and hypothesis mapping be "identical" across runs on the same input. Precision about what is achievable:

- **Achievable and already proven ×4:** identical *decision spine* — selection sets (by canonical ID), per-ID scores, maturity levels, phase map, dates, names. This is what the anchor tables + verbatim-copy fields + pinned decision trees deliver, and the independent Era M re-run confirms it holds even while other surfaces fork.
- **Achievable only via Approach 3:** identical *document structure and phrasing* on client-facing deliverables. No amount of prompt pinning makes free prose byte-identical — Era M is the formal proof (a comment/marker strip is prose-blind; every pin relocates the fork to the next unpinned degree of freedom). Render-from-contract removes the free-text channel, making the deliverable a deterministic function of the spine.
- **Never fully identical (and shouldn't be):** internal working prose (rationale sentences inside JUSTIFICATION entries, dimension rationales) will vary in wording while remaining semantically stable. The acceptance definition should say so explicitly: *spine byte-identical; templated surfaces byte-identical; residual prose semantically equivalent and confined to non-client surfaces.*

Framing the guarantee this way to the consultant team is important for the trust objective: they should verify the spine diff (mechanical, 30 seconds), not eyeball prose similarity.

---

## 9. Immediate Action Checklist (in order)

1. **P0 codification package — bring the written rules in sync with the vetted benchmark** — ✅ **COMPLETE (2026-07-20).** Delivered as the 18-item §A encoding register (adopted as standing), the §C/§D/§E pinned per-stage artifacts with full machine spine, the §B derivation proof, and the §G/§H/§I completion pins (verbatim INTAKE_FACTS, expected-contradictions register, input-fixture manifest) in `Meridian_Golden_Benchmark_v1_1_PINNED.md`; attestation recorded in `Meridian_Golden_Output_BENCHMARK_v1_1.md` ("CONFIRMED as the benchmark of record", 2026-07-20). The consult-team review request for the four judgment encodings (A-1, A-4, A-8, A-9) is drafted; any amendment goes through the version-event override block. Remaining sub-item for the version event: mark the draft docx superseded; fix the non-canonical `[Inferred — justification register]` tag.
2. **Anchor-file consolidation decision** (can ride the v1.1 event): one golden, full machine spine, JUSTIFICATION format unified across schema/preflight/skills (D-1…D-5).
3. **T-10⁹** exactly as already planned (operator setup: fixture rename, seeded split, bundle, `/delivery` extraction). Nothing else lands first.
4. **`blueprint-aria-spec` v1 (derive-mode)** after TR1, parallel to #3 — with the three-band Build Sheet goldens and honesty-flag gates.
5. **Decision: P2 vs P2′** — prose-era v1.1 bump vs folding Layer A into the Approach 3 build. Recommendation: P2′ (one re-acceptance, no new prose surfaces); accept P2 only if PP-0/H-0 must appear in the client-facing Blueprint before Approach 3 can be built.
6. **Build Band 2 + Band 3 fixtures** and add the seeded H-0-split case to the acceptance battery.
7. **Adopt the n=2 delivery run-book** (§7.4) as standard practice effective immediately — it works on the current pipeline today and directly addresses the consultant-trust objective.

---

## 10. Addendum — Full Derivability Proven; the Benchmark Is Now Operationalized

During conversion of the vetted golden case into pinned per-stage form, two findings were added and one was corrected:

**R-13 (new) — the hypothesis set also embeds unwritten library judgments.** Mapping the vetted 8 hypotheses to canonical IDs shows the selected set changed from the current golden's {01,02,03,04,05,07,**08**} to {01,02,03,04,05,07,**10**} + H-0: RPO Infrastructure (H-RT-08, score 50) is out; a re-scoped "BD Proposal Automation + RPO productisation support" (H-RT-10) is in — which the current anchors (18) cannot produce. The vetted judgment implies three library changes: exclude H-RT-08/H-RT-09 as standalone product-build bets for Band 1 clients, absorb H-RT-06 (Pipeline Visibility Dashboard) as an H-0 consumer, and re-anchor the re-scoped H-RT-10 at 3×3×5=45.

**R-6 (corrected scope)** — with H-RT-08 out of the set, the Meridian benchmark's Later phase holds exactly 3 items ({01, 04, H-0}) and is **capacity-clean under the existing cap**. The Later-cap amendment remains necessary as a general rule (any future client with ≥4 strict Big Bets) but is not a Meridian-benchmark blocker.

**Derivability is now proven, not just prescribed.** Under the concrete 18-item delta in the companion document's §A, the pinned algorithms reproduce the vetted golden case *exactly* — pain-point set and order (byte-identical), hypothesis set and positions, H-0 promotion gate (deterministic: agent-shaped count = 2), band (1), and a capacity-clean phase map (verified arithmetic in its §B). The vetted benchmark has been converted into operational pinned form with the complete machine spine:

→ **`Meridian_Golden_Benchmark_v1_1_PINNED.md`** — the three per-stage benchmark artifacts (Section C spine, Section D with full 14-field score markers, Stage 4 phase summary), the derivation proof, the acceptance and n=2 delivery QA gates, and the §A encoding register (18 items). The analytical content is the consultants' already-confirmed golden case, unchanged; the §A defaults are its faithful encoding into written rules and are **adopted as standing** — the document serves as the `intake_v1.1` acceptance benchmark as of today, with a version-event override block available should the Practice wish to amend any encoding item.

**Ground-truth verification and final pins (added end-of-session, 2026-07-20).** The complete actual Meridian input pack (`ValueBlueprint docs/` + `test/`: intake form answers + all 8 client documents + testing guide) was fully ingested and the vetted benchmark verified against the true sources — every load-bearing evidence claim traces verbatim (PP-0's zero-integrations/no-SSOT lines on tech inventory p.2; the turnover, GDPR, SOP-timing, and satisfaction evidence on their cited pages; `SYSTEM_EVENT_CUTOVER=2026-07-31` per the last-day rule). This ingestion enabled the three completion pins A-16/A-17/A-18 (§H expected-contradictions register CR-1…CR-5, §G verbatim INTAKE_FACTS block incl. `REVENUE_RANGE: €2M–€10M`, §I SHA-256 fixture manifest), closing the last surfaces that were symbolic or judgment-dependent. Practice attestation is recorded at the end of `Meridian_Golden_Output_BENCHMARK_v1_1.md`: **"CONFIRMED as the benchmark of record" (2026-07-20)** — captured in-session by Viktor Serafimov on behalf of the senior AI Consultants, with amendments governed by the §A override block at the version event.

*End of report. No pipeline/skill files were modified — the deliverables live in `rework_docs/`. All findings are traceable to the cited files; the derivation gaps (R-1, R-13) were reconstructed from the algorithms' own worked-example scores against the corrected golden case in AI_Brain_Foundation_Pattern §10, and closed by the §A delta. §3 carries the full R→A resolution ledger; nothing remains open on the benchmark side.*
