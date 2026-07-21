# Blueprint v35 (T-10⁸) → v35.1 — Full Reproducibility & Acceptance Report — **Frame v4.0 (Consolidated, Comprehensive · Era M)**

**AI Assist BG · Blueprint Practice · CONFIDENTIAL** · Engagement BP-2026-MTP-001 (Meridian Talent Partners OOD) · the **T-10⁸ acceptance run** (first true n=4 acceptance attempt) + the **v35.1 remediation** + an **independent n=4 re-run verification** · build lineage v34→v34.1→v34.2→v34.3→v34.4→v34.5(T-29 allowlist + delivery contract) ≡ **v35** → **v35.1** (T-30, T-31) · 1 July 2026

> **Frame v4.0 carry-forward note.** Same consolidated frame as v27→v34. **No prior register removed, rewritten, or renumbered. Eras A–L preserved in full; Era M (v35 / v35.1) appended.** Era M records the **first tally regression since Era G**: the T-10⁸ acceptance came back **4/6** — **KR3 forked at T4** by *opportunity decomposition* (splitting a strict Big Bet into a Next "Pilot Scoping" row + a Later "Full Deployment" row — S-40/REG-16), and **KR5 failed whole-pipeline** but was diagnosed as **raw-handoff extraction, not a strip regression** (S-41/S-42/REG-17), with the **client Stage-5 deliverable clean ×4**. **v35.1** shipped two `[C]` fixes: **T-30** (decomposition BLOCKER) and **T-31** (delivery-only export). An **independent n=4 re-run** (this session) confirms the pinned spine ×4 and finds the **decomposition fork absent on re-run** — proving it *intermittent*, which is the sharpest evidence yet that a clean re-run cannot retire it. **Gate: 5/6 nominal, KR3 contested; nothing credited until the conforming T-10⁹ delivery-copy n=4.** Supersedes the n=2 partial verification.

---

## §C0 — Control Block

| Field | Value |
|---|---|
| Batch | v35 (T-10⁸) — first true n=4 acceptance; + v35.1 remediation; + independent n=4 re-run |
| **Era M verdict** | **4/6 — regression (first since G).** KR3 🔴 (T4 decomposition, S-40); KR5 🔴→diagnosed raw-copy (S-41/S-42), S5 clean ×4; KR4 ⏳ carried (raw/empty tags); KR6 🟢 on output (Popov ×4, zero firm-surname bleed; the Montin fixture-label is a test-validity item, not a product surface — see Test-Validity & Operator Backlog). |
| **v35.1 remediation** | **T-30** decomposition BLOCKER `[C]`; **T-31** delivery-only export `[C]`. Provenance realigned v34.5≡v35 → **v35.1**. **Neither credited to the tally.** |
| **Independent n=4 re-run** | Pinned spine reproduces ×4 `[P]`; **KR3 decomposition ABSENT ×4** (intermittent → latent-regression, *not* a pass); S5 clean ×4 `[P]`; S1–S4 free-prose scaffold forks; KR6 clean ×4; KR4 LC=0. |
| **Era L verdict (preserved)** | v34: T-28 closed operator/checkpoint leak ×4; leak relocated to *forms* (S-35/S-36). 5/6, KR5 open a third era → allowlist (T-29). |
| **Era K / J / I / H (preserved)** | K: T-27 fixed phase ×4, leak→Stage-1 (5/6). J: grounding cured + S5 leak closed, phase regressed (5/6). I: fix set failed all surfaces (4/6). H: spine locked, first KR3 pass (4/6). |
| Headline (mixed) | The allowlist era ended one relocation and exposed two more: a **pin on an entity that did not bind its sub-entities** (decomposition), and **coverage proven on one delivery path that was not coverage** (staged raw copies). The number went *down*, and honestly so. |
| The architectural finding | Incremental pinning has reached its limit (first net-negative register era since v32). The by-construction cure is **Approach 3 / ADR-001: render deliverables from a pinned contract** — no free-text document channel. Era M is its strongest case. |
| Names confirmed | CEO **Dimitar Popov** ×4 (only leadership name in any slot); firm surnames Petrov/Gumushian/Kara **0** in all bodies; **Montin** title-label only; body staff (Mihailova/Nowak/Ivanov/Georgieva/Stoyanov/Draganova) the legitimate Meridian cast. *(§30-note.)* |
| Still owed (test-validity / operator — see Backlog, not product KRs) | seeded residual/split run · reviewer-metadata bundle · single-source build stamp (T-07) · fixture rename (S-33) |
| Provenance | `[P]` proven-from-artifact · `[C]` coded-not-validated · `[X]` reconstructed/asserted · `[D]` decision |
| Governing rules | **Ratchet · Two-grain · Stable-ID · n=4-never-n=2 · "the document confirms it, not the merge"** |

**The Era M one-paragraph state.** The T-10⁸ acceptance run regressed to **4/6**. Decision-spine values still reproduce ×4. **KR3 forked at T4**: the phase pin (T-27, `strict ⇒ Later`, durable through K–L) bound whole opportunities but not their sub-components; T4 split a strict Big Bet into "Pilot Scoping" (Next) + "Full Deployment" (Later), and T-27's last-wins `id→phase` map saw only the Later row and passed (S-40/REG-16). **KR5 failed whole-pipeline** — S1–S4 staged outputs carried raw markers, a literal `T-21`, "Step N" narration, and score-comment field tokens across all four runs — **but the Stage-5 client deliverable was clean ×4**, and the failure was diagnosed as **raw-handoff extraction (S-42), not a strip regression** (S-41 = the S4 field tokens). **KR4 carried** (Stage-3 arrived raw/scaffold-laden; not re-certified). **KR6 clean on output** (Popov ×4; Petrov/Gumushian/Kara 0; the "Montin" title-label is a test-fixture artifact, not a product surface — reclassified to the Backlog). **v35.1** shipped T-30 (decomposition BLOCKER) and T-31 (delivery-only export), both `[C]`. An **independent n=4 re-run** confirmed the spine ×4 and, decisively, found **no decomposition in any of the four runs** — the fork is intermittent, so the clean re-run is a judgment-stable green (a latent regression until pinned), not a pass. **Tally: 5/6 nominal, KR3 contested.**

**Eras L/K/J/I/H states (preserved).** L: T-28 closed operator/checkpoint leak ×4; leak relocated to forms (S-35/S-36); denylist→allowlist (T-29). K: T-27 fixed phase ×4; leak→Stage-1 (T3). J: D-9 grounding de-conflation (AA 7 ×4) + T-23 Stage-5 envelope; phase regressed. I: v32 fix set failed every touched surface. H: spine locked, first KR3 pass.

---

## §C-MAP — Canonical Section Map (Era M rows in-place)

| Layer | Reads | Answers |
|---|---|---|
| 0 Control | §C0–§C-JUST | what / resume / backlog |
| 1 Executive | preamble · **§T-10⁸** scorecard · §33 · §37 | the verdict |
| 2 Narrow | §34.1–§34.4 (re-run n=4) | per-run |
| 3 Wide | §35.1 eras A–**M** · §35.2–§35.4 · §39 | trends + regressions |
| 4–5 SRF / deep-dive | §0–§22 | body + per-stage |
| 6 Synthesis | §29 (A1–**A44**) · §30 (S-01…**S-42**, S-43 cand.) · **§30-B backlog** · §31 | unified thesis |
| 7 Registers | §24–§26 | data + DoD |
| 8 Self/Frame | §32 · §38 · **§40 / §40-I…L / §40-M** | spec + grounding arc |
| 9 Comparison | **§VIII** report-to-report (L→M) | last-two-report delta |
| 10 Appendix | **§IX** business-justification (carried) · **§30-note** name scan | leadership + names |

---

## §C-TASK — Task Register — all prior tasks preserved, Era M status applied

| Task | Description | Era L (v34) | **Era M (v35/v35.1)** |
|---|---|---|---|
| T-21/T-22 | selection anchor / date keystone | ✅ ×4 | ✅ ×4 (re-run) |
| T-24 / D-9 | grounding de-conflation (AA pinned 7) | ✅ ×4 | ⏳ not re-certified (raw/empty tags; LC=0) |
| T-27 | phase pin (`strict ⇒ Later`) + BLOCKER | ✅ ×4 | 🔴 **defeated by decomposition (T4)** → T-30 |
| T-28 | whole-pipeline leak coverage (all stages) | ✅ operator/checkpoint ×4 | ✅ at S5; staged-download path exposed → T-31 |
| **T-29** | permit-only allowlist strip (WS-A1 PERMIT lists) | 🔴 open (P0) | ✅ built v34.2–34.5; effective on S5; **S1–S4 delivery unverified** |
| **T-30** *(NEW, v35.1)* | **decomposition BLOCKER** (reads every Phase-Summary row; blocks non-Later strict, same-ID->1-phase, ID-less split rows) | — | ✅ `[C]` coded — **clause (c) is a phrasing denylist; structural refinement recommended (E-1)** |
| **T-31** *(NEW, v35.1)* | **delivery-only per-stage export** (`/step/:step/delivery` stripped; raw relabelled `RAW-handoff.txt`) | — | ✅ `[C]` coded — **raw relabel is soft; internal-gate recommended** |
| stoplist | firm-surname guard | clean ×4; Montin untestable | ✅ clean ×4 (Montin = fixture title-label; test-validity item → Backlog, not a KR) |
| T-30-refine | structural refinement of T-30 (count-invariant + ID-required) | — | 🔴 recommended (E-1), Viktor veto on timing |
| T-07 | build provenance / single-source stamp | ⏳ | 🔴 label drift v34.5≠v35 realigned to v35.1; **bundle still not supplied** |

---

## §C-PLAN — Project Plan — revised by Era M *(`/project-planner`)*

| Phase | Tasks | Milestone | State |
|---|---|---|---|
| P0a/b spine | T-21/T-22 | spine ×4 | ✅ (re-run ×4) |
| P0c Leak (S5) | T-23→T-28 | S5 clean ×4 | ✅ (J; held ×4 in re-run) |
| P0c″ Leak (allowlist, all forms) | T-29 | only permitted sections survive ×4 | 🟠 S5 ✅; **S1–S4 delivery unverified** |
| **P0d Leak (delivery path)** | **T-31** | staged extraction pulls stripped copies ×4 | 🔴 `[C]` — **T-10⁹ first test** |
| **P3d Phase (sub-entity)** | **T-30** | no strict Big Bet or sub-component in Now/Next ×4; **seeded split caught** | 🔴 `[C]` — **unvalidated; intermittency proves a natural clean run is not evidence** |
| P2 Grounding | T-24/D-9 | AA pinned, honest ×4 | ⏳ carried (re-certify on clean copies) |
| P5 Names | stoplist | no firm surname ×4 | ✅ **clean ×4** (fixture rename is an operator/test-validity precondition → Backlog, not a product KR) |
| P-Verify | **T-10⁹** | 6/6 DoD | After v35.1 build + delivery-copy extraction + seeded split + bundle + rename |

**Critical path (Era M → T-10⁹).** T-30 + T-31 (done, `[C]`) → **operator setup** (fixture rename S-33 to make Montin testable — a test-validity precondition, not a product fix) → **T-10⁹ (v35.1 build, n=4 + seeded split, extract from `/step/:step/delivery`, bundle attached)** → Practice extraction → 6/6. **Risks:** (R-a) T-30 false-positive on a legitimately undivided roadmap — mitigated by +3 tests, verify at extraction; (R-b) T-10⁹ still uses the raw endpoint — mitigated by the `RAW-handoff.txt` relabel + extraction-source check; (R-c) a *new* surface forks at T4 — expected per the thesis, log and continue; (R-d, **new**) T-30 clause (c) denylist relocates to novel split-phrasing — mitigated by folding in the count-invariant + ID-required structural refinement (E-1).

---

## §C-JUST — Justification Feedback on Frame v4.0 (Era M)

Era M is the first era the frame has had to report a *regression* in four rounds, and the two-grain rule earns its keep in the opposite direction from Eras J–L: where "5/6, 5/6, 5/6" masked a migrating defect, "5→4" must not mask real mechanism progress (S5 clean ×4; n=4 caught a T4 fork n=2 would have passed — the fifth demonstration of the n=4 rule). The ratchet preserves every prior closure and failure. **WL-16 is promoted to controlling lesson:** a pin on an entity must bind its sub-entities, and coverage proven on one delivery path is not coverage. The frame's job this era is to (a) hold the honest 4/6, (b) separate the two failures cleanly — KR3 a real content/logic fork (copy-independent, fixed by T-30) vs KR5 a raw-copy extraction artifact (fixed by the delivery endpoint) — and (c) name the terminal fix: incremental pinning is exhausted, and Approach 3 (render-from-contract) is the by-construction end of the relocation cycle. A dual-provenance note: the T-10⁸ verdict is `[X]` (from the acceptance extraction / Viktor's investigation), while the independent re-run is `[P]` (direct artifact); Era M is the first era with both streams, and they agree on the spine and sharpen the KR3 diagnosis.

---
---

# ════════════════════════════════════════════
# READING SPINE
# ════════════════════════════════════════════

## §T-10⁸ — Acceptance-Gate Scorecard (executive centrepiece, Era M)

| # | Condition | Result (T-10⁸ acceptance) | Verdict |
|---|---|---|---|
| 1 | **KR3 phase:** all strict ⇒ Later, **undivided** ×4 | T1/T2/T3 clean; **T4 splits H-RT-01/04 into Next "Pilot Scoping" + Later "Full Deployment"** | 🔴 **FAIL** (S-40) |
| 2 | **KR5 (whole pipeline):** zero scaffold/markers in all 5 delivery stages ×4 | S1–S4 raw markers/field-tokens ×4; **S5 clean ×4** | 🔴 **FAIL** — diagnosed raw-copy extraction (S-42), not a strip regression |
| 3 | **KR4 grounding:** honest + AA pinned 7 | Stage-3 arrived raw/scaffold-laden; not re-certified | ⏳ **CARRIED** (durable 3 eras) |
| 4 | **KR6 names:** no firm surname ×4; role-name = INTAKE_FACTS ×4 | Popov ×4; Petrov/Gumushian/Kara 0 | 🟢 **PASS** (on output; Montin fixture-label → Backlog) |
| 5 | **No decision-layer regression:** scores/selection/date/maturity ×4 | reproduce ×4 | 🟢 PASS |
| 6 | **Provenance / bundle / rename / seeded run** | absent | ⛔ launch condition unmet |

**Outcome:** decision spine holds ×4, but **KR3 forks at T4 and KR5 fails whole-pipeline (raw copies)** → **4/6, the first regression since Era G.** *(Eras H–L scorecards preserved in lineage.)*

---

## §33 Master RAG Matrix — substage × lens (Era M deltas)

Deltas vs Era L: **Roadmap 🔴 on placement** (T4 decomposition, S-40 — a *new* fork class); **S1–S4 🔴 on integrity** (raw-copy markers whole-pipeline); **S5 stays 🟢** (clean ×4).

| Substage | Structural | Content | Skill-Criteria | Quality | Reproducibility | Traceability |
|---|---|---|---|---|---|---|
| 1 Intake | 🟢 8/7 | 🟢 selection ×4 | 🟠 **raw markers/`T-21`/INTAKE_FACTS in raw copy** | 🟠 | 🟢 values ×4 | 🟠 raw-copy |
| 2 Maturity | 🟢 6/6 ×4 | 🟢 anchors ×4 | 🟠 INTAKE_FACTS narration (raw) | 🟢 | 🟢 ×4 | 🟢 |
| 3 Opportunity | 🟢 3/1/3 ×4 | 🟢 adjustment ×4 | 🟠 "Step N" decision-tree narration (raw) | ⏳ grounding not re-certified | 🟢 scores per-ID ×4 | 🟠 raw-copy |
| 4 Roadmap | 🔴 **T4 decomposition (S-40)** | 🟢 phase set ×4 | 🔴 **field tokens in driver column (S-41)** + "from Stage 1 score comment" | 🔴 scaffold-in-copy | 🟢 phase set ×4 (re-run) | 🟠 |
| 5 Assembly | 🟢 7 sections ×4 | 🟢 **leak clean ×4** | 🟢 | 🟢 | 🟢 | 🟠 no build SHA |

**Read:** the lone-red split into two — a *content/logic* fork at Roadmap (decomposition, T4) and a *whole-pipeline* integrity red on S1–S4 raw copies — while the client-facing S5 stayed green. The two-grain picture: wide 5→4; narrow, one divergent run on phase + a path-coverage gap on leak.

---

# NARROW FRAME (§34) — Era M, n=4 *(independent re-run, `[P]`)*

## §34.1 Metrics — per run

| Metric | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| Selection {01,02,03,04,05,07,08} | ✓ | ✓ | ✓ | ✓ |
| Per-ID scores (02=100,03=80,05=60,07=45,01=25,08=25,04=16) | ✓ | ✓ | ✓ | ✓ |
| Maturity anchors (Data/Gov Early; 4× Developing) | ✓ | ✓ | ✓ | ✓ |
| Portfolio 3/1/3 | ✓ | ✓ | ✓ | ✓ |
| **Phase set** Now{02,05,07}/Next{03}/Later{01,04,08} | ✓ | ✓ | ✓ | ✓ |
| **All Big Bets undivided → Later (no decomposition)** | ✓ | ✓ | ✓ | ✓ |
| CEO Popov / firm-surname bleed 0 | ✓ / 0 | ✓ / 0 | ✓ / 0 | ✓ / 0 |
| HTML-comment markers (`<!--`) | 0 | 0 | 0 | 0 |
| **S5 delivery clean** | ✓ | ✓ | ✓ | ✓ |
| **S1–S4 free-prose scaffold** | light | **heaviest** | medium | near-clean |
| S4 "from Stage 1 score comment" | **absent** | ×4 | ×4 | ×4 |

## §34.2 Narrow comparison grid

| Angle | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| Spine / selection / scores / maturity / phase-set | 🟢 | 🟢 | 🟢 | 🟢 |
| **Decomposition (KR3 fork)** | 🟢 | 🟢 | 🟢 | 🟢 *(re-run; original T-10⁸ T4 forked — intermittent)* |
| S5 delivery clean | 🟢 | 🟢 | 🟢 | 🟢 |
| **S1–S4 prose-scaffold** | 🟠 | 🔴 | 🟠 | 🟢 |

**The pins are green in every run; the reds are on unpinned surfaces. The decomposition fork is absent on re-run — which is exactly why a clean re-run cannot retire it.**

## §34.3 Per-test cards
- **T1** — spine clean; phase set correct; the odd-one-out that keeps "from Stage 1 score comment" *out* of S4; lightest scaffold.
- **T2** — spine clean; **heaviest scaffold** (methodology paragraph in S1: "T-21 Score Anchor Rule applied … no re-derivation"; INTAKE_FACTS narration S1/S2; "Step N" ×4 S3; provenance narration ×4 S4).
- **T3** — spine clean; medium scaffold; H-RT-07 titled "GDPR Compliance Foundation" (title drift, S-39).
- **T4** — spine clean; **near-clean on scaffold** (0 step-narration, 0 INTAKE_FACTS), only S4 provenance narration. On the original T-10⁸ this was the *decomposition* run; on re-run it is clean — the intermittency, in one cell.

## §34.4 Narrow success-criteria grid

| Criterion | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| SC-7 Phase set (undivided Later) | ✅ | ✅ | ✅ | ✅ (re-run) |
| SC-2 No scaffold (S1–S4, any form) | 🟠 | ❌ | 🟠 | ✅ |
| SC-2b S5 delivery clean | ✅ | ✅ | ✅ | ✅ |
| SC-5 Decision layer (scores/selection/maturity) | ✅ | ✅ | ✅ | ✅ |

---

# WIDE FRAME (§35)

## §35.1 Era definitions (A–M)
…J grounding+leak fixed, phase regressed (5/6) · K phase refixed, leak→Stage-1 (5/6) · L T-28 closes operator/checkpoint leak ×4, leak→forms (5/6) · **M — v35 · T-10⁸ (NEW).** First true n=4 acceptance: **KR3 forks at T4 by decomposition (S-40); KR5 whole-pipeline diagnosed raw-copy (S-42), S5 clean ×4. 4/6 — first regression since G.** v35.1 ships T-30/T-31 `[C]`; independent re-run confirms spine ×4 and decomposition-intermittent. **The allowlist era ends incremental pinning; Approach 3 is the terminal fix.**

## §35.2 Wide comparison grid (stage × era J→M)
| Stage | J (v33) | K (v33.3) | L (v34) | **M (v35)** |
|---|---|---|---|---|
| 1 Intake | clean 🟢 | 🔴 narration (T3) | 🟢 ×4 (T-28) | 🟠 raw-copy markers (staged) |
| 2 Maturity | 6/6 🟢 | 6/6 🟢 | 6/6 🟢 | 6/6 🟢 |
| 3 Opportunity | de-conflated 🟢 | 🟢 | 🟢 AA 7 ×4 | 🟢 scores ×4 / ⏳ grounding not re-certified |
| 4 Roadmap | placement forks 🔴 | fixed 🟢 | 🔴 S-35/S-36 forms | 🔴 **decomposition (T4, S-40)** + field tokens (S-41) |
| 5 Assembly | clean 🟢 | clean 🟢 | clean 🟢 | **clean ×4 🟢** |

## §35.3 Wide success-criteria grid (criterion × era)
| Criterion | J | K | L | **M** |
|---|---|---|---|---|
| Selection / scores / maturity | ✅ | ✅ | ✅ | ✅ |
| Phase vector | ❌ | ✅ | ✅ | 🔴 **(sub-entity, T4)** |
| Grounding honest | ✅ | ✅ | ✅ | ⏳ carried |
| No leak (whole pipeline, delivery copies) | 🟠 (S5) | ❌ (S1) | ❌ (forms) | 🟠 **S5 ✅×4 / S1–S4 raw** |

## §35.4 Era M-vs-L delta (the required comparison)
| Surface | L (v34) | M (v35) | Δ | Why |
|---|---|---|---|---|
| Phase vector | 🟢 ×4 | 🔴 **T4 decomposition** | **REGRESSED** | pin bound whole opp, not sub-components (WL-16) |
| Scaffold form (operator/checkpoint) | 🟢 ×4 (T-28) | 🟢 (S5) | held at S5 | T-28 durable at assembly |
| Whole-pipeline leak (S1–S4) | forms (S-35/S-36) | raw-copy markers ×4 | relocated to **copy/path** | staged-download served raw (S-42) |
| S5 delivery | 🟢 | 🟢 ×4 | held | strip works at assembly |
| Grounding / AA | 🟢 ×4 | ⏳ not re-certified | carried | raw/empty tags (LC=0) |
| KR tally | 5/6 | **4/6** | **−1** | first regression since G |

**One-line delta:** *Era L relocated the leak to forms and held 5/6; Era M relocated the fork to opportunity sub-components (T4) and the leak to the raw delivery path, and the number fell to 4/6 — the two surfaces we believed pinned both moved in one era.*

---

## §36 Brainstorming Conclusions (Era M) *(`/brainstorming` — assumption test + alternatives)*
**Belief on trial:** *"T-27 (phase pin, `strict ⇒ Later`) closes KR3 durably."* **Refuted at T4:** the pin bound the *entity's* phase but not its *sub-entities*; the model split the entity and placed a sub-component in Next. **Sharpened corollary (WL-16):** pinning one surface relocates the fork to the next unpinned degree of freedom — and *a pin on an entity is incomplete until it binds the entity's decomposition.* **Second belief on trial:** *"the KR5 leak is a strip regression."* **Refuted:** HTML-comment markers are stripped everywhere (0 across 20 files), S5 is clean ×4, and what survives S1–S4 is free-*prose* scaffold — so the leak is raw-copy extraction, and a marker/comment strip cannot reach prose. **Alternatives considered for KR3:** (1) extend the denylist with the observed split-phrasing — *rejected* (relocates to novel phrasing, the J→L pattern); (2) same-ID-across->1-phase check — *partial* (misses ID-less splits); (3) **row-count invariant + ID-required placement** — *recommended, by construction.* **Terminal conclusion:** both Era-M failures (a decomposed sub-component and an unstripped free-prose staged copy) are *free-text emissions a template render forbids by construction* — Approach 3.

## §37 OKR Verdict — **4/6** (regression), nominal 5/6 after v35.1 (KR3 contested) *(`/product-strategist`)*
| KR | J | K | L | **M (T-10⁸)** | **M (v35.1 nominal)** |
|---|---|---|---|---|---|
| KR1 Structural | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| KR2 Selection | ✅ | ✅ | ✅ | ✅ ×4 | ✅ |
| KR3 Scores + phase | 🔴 | ✅ | ✅ | 🔴 **(T4 decomposition)** | 🔴 **contested** (T-30 `[C]`) |
| KR4 Grounding | ✅ | ✅ | ✅ | ⏳ carried | ⏳ carried |
| KR5 Leak/integrity | ✅ | 🔴 (stage) | 🔴 (form) | 🔴 (raw-copy) | 🟢 nominal (T-31 `[C]`, S1–S4 unverified) |
| KR6 Names | ✅ | 🟠 | 🟠 | 🟢 | 🟢 |

*KR6 note: the historical 🟠 across K–L was driven by the S-33 fixture-label artifact (Montin), now reclassified to the Test-Validity & Operator Backlog. On the product-output surface KR6 has been clean throughout — Popov ×4, zero firm-surname bleed — so Era M reads 🟢 on output. Tally unchanged (KR6 was already counted as passing).*

**KR3: passed (H) → regressed (J) → refixed T-27 (K) → held (L) → re-regressed via decomposition (M).** The clearest full regress→fix→hold→re-regress cycle in the engagement (WL-16). Only T-30, validated by a *seeded* catch on a conforming run, retires the contest.

## §38 Frame — structure & justification
Reading spine unchanged; Era M appended to every grid; §40-M extends the grounding arc; §VIII carries L→M. Justification: the frame's first reported regression is exactly where the two-grain read and the ratchet matter most — a bare "4/6" would read as failure, when in fact it is the n=4 rule working as designed (catching a T4 fork n=2 would pass), a clean client deliverable ×4, and a diagnosis precise enough to name the terminal fix.

*End Reading Spine.*

---
---

# §40 — GROUNDING / CITATION ARC (preserved through Era M)

## §40 (H) · §40-I · §40-J · §40-K · §40-L — preserved
Arc: flagged (H) → disguised (I) → cured via D-9, AA visible+pinned 7 ×4 (J) → held ×4 (K) → held ×4 (L).

## §40-M (Era M — not re-certified; LC=0 convention applied) `[X]`/`[C]`
The Stage-3 copies arrived raw/scaffold-laden and the Stage-2 "Confidence Tag" column is **empty** across runs; the LC-Tags exports carry **no `Element:` entries**. Per the standing **LC=0 convention**, treat missing/empty Stage-2 LC tags as zero — presentational, not a grounding failure. **KR4 is therefore carried, not re-certified**; the durable D-9 closure (AA pinned 7, held 3 eras J–L) stands and must be re-confirmed at T-10⁹ on clean delivery copies. This is the honest cost of extracting raw copies: the grounding surface cannot be positively read from them.

---
---

# DETAILED BACKING & REGISTERS

## Prior-Exchange Justification Feedback (Era M) — adjudication of Viktor's regression report
- **Core attribution ratified `[X]`→`[P]`-strengthened:** no client-facing degradation (S5 clean ×4, confirmed direct); KR3 a new decomposition fork, not a v34.x regression; KR5 raw-copy extraction, not a strip regression. Correct not to strip the R3 store.
- **Sharpenings (ratified with conditions):** (D-1) S5-clean is **not transitive** to S1–S4 delivery — those copies were never seen clean; (D-2/E-1) **T-30 clause (c) is a phrasing denylist** — the one pattern this engagement proves relocates — replace with row-count invariant + ID-required placement; (D-3) confirm the count invariant shipped; (D-5) the raw-endpoint relabel is soft — internal-gate it; (D-6) the v34.5→v35.1 label fix is cosmetic — emit a single-source stamp into the bundle, closing T-07.
- **Provenance discipline:** Viktor's code-origin claims carried as `[X]` working-hypothesis; only the Era-M extraction and S5-clean are `[P]`; T-30/T-31 are `[C]`. Nothing coded-not-validated touches the tally.

## §0–§12 SRF (Era M, condensed)
**§5 Pattern** — two surfaces believed pinned both relocated in one era: entity-phase pin did not bind sub-entities (decomposition); leak coverage proven on the S5 path was absent on the staged path. **§6 Findings** — reproducible ×4 (re-run): spine, selection, per-ID scores, maturity, portfolio, phase set, CEO, S5-clean; **not:** KR3 sub-entity phase (intermittent), S1–S4 free-prose scaffold, grounding (carried). **§7 Business impact** — the client deliverable (S5) is clean ×4; the defects are internal-copy scaffold and an intermittent phase-decomposition that would mis-sequence a Big Bet if it recurred. **§9 Decisions** — T-30 (+ structural refinement), T-31 (+ internal-gate), Approach 3 committed post-6/6. *Operator/test-validity preconditions (→ Backlog, not product KRs):* fixture rename, seeded split, reviewer-metadata bundle, single-source build stamp. **§12 Methodology** — n=4 extraction of the re-run; comment-strip runs (0 comments) but free-prose scaffold survives → bundle owed to disambiguate raw vs delivery.

## PART II — STAGE DEEP-DIVE (Era M, condensed)
**§14 Intake** 🟠 raw markers/`T-21`/INTAKE_FACTS narration in staged copy. **§15 Maturity** 🟢 anchors ×4; empty Confidence-Tag column. **§16 Opportunity** 🟢 scores per-ID ×4; "Step N" decision-tree narration (raw). **§17 Roadmap** 🔴 T4 decomposition (S-40) + field tokens (S-41) + provenance narration (T2/T3/T4). **§18 Assembly** 🟢 clean ×4. **§19–22** — decision spine locked; the open surfaces are sub-entity phase (T-30) and free-prose leak coverage (Approach 3).

---

# PART III — REGISTERS (carry-forward)

## §24.7 Integrity-layer
| Pillar | L | **M** |
|---|---|---|
| Stage-5 leak | 🟢 ×4 | 🟢 ×4 |
| Stage-1 operator/checkpoint leak | 🟢 ×4 (T-28) | 🟢 (at S5) |
| Scaffold-in-deliverable (forms) | 🔴 S-35/S-36 | 🟠 raw-copy prose scaffold (S1–S4); S5 clean ×4 |
| **Phase sub-entity (decomposition)** | (n/a) | 🔴 **S-40 (T4)** — T-30 `[C]` |
| **Staged-download copy** | (n/a) | 🟠 **S-42** raw served — observability/test-validity (§30-B); client S5 clean ×4 |
| Firm-surname petrov/gum/kara | 🟢 ×4 | 🟢 ×4 |

## §25 Success Criteria (v35)
MET ×4: SC-3,5,5b,6 (selection/scores/maturity/date), SC-7 (phase *set*, re-run), SC-2b (S5 delivery clean ×4), **SC-14 firm-surname clean ×4 (KR6 on output)**. FAILED (T-10⁸): SC-7-strict (T4 decomposition), SC-2 (S1–S4 whole-pipeline). CARRIED: SC-9 (grounding, LC=0). PENDING (test-validity, → Backlog): SC-11 build metadata; detector-catch (**seeded split** run — the intermittency makes a natural clean run insufficient evidence); fixture rename.

## §26 Traceability (v35 deltas)
T-27 🔴 defeated by decomposition (S-40) → **T-30 opened** `[C]` · **S-40 new** (phase via decomposition) · **S-41 new** (S4 field tokens) · **S-42 new** (staged-download raw) → **T-31 opened** `[C]` · **REG-16 opened** (KR3 phase regression via opportunity-split; REG-13 reopened) · **REG-17 opened** (staged-download unstripped) · S-39 confirmed forking ×4 · **S-43 candidate** (intra-Later ordering) · T-29 ✅ at S5 · T-07 🔴 label realigned, bundle owed (test-validity → Backlog) · **S-33 reclassified out of the product registers → Test-Validity & Operator Backlog** (fixture-label artifact, zero product impact).

---

# PART II-S — SYNTHESIS

## §29 All-Angle (Era M) — deltas (prior preserved)
| # | Angle | v35 |
|---|---|---|
| A15 Phase vector | 🔴 **sub-entity fork (T4)** — T-30 |
| A20 Scaffolding strip | 🟠 S5 clean ×4; S1–S4 free-prose scaffold (raw) |
| A34 Grounding honesty | ⏳ carried (LC=0) |
| A39 Whole-pipeline leak coverage | 🟠 S5 covered ×4; staged path not (S-42) |
| A41 Leak-guard architecture | 🟢 allowlist strips comments; 🔴 cannot strip prose → Approach 3 |
| A42 Internal-identifier bleed | 🟠 "T-21" / "from Stage 1 score comment" prose narration (raw copies) |
| **A43** *(new)* Pin-completeness vs decomposition | 🔴 entity pin must bind sub-entities (WL-16) |
| **A44** *(new)* Prose-scaffold vs marker-strip | 🔴 comment/token strip is prose-blind → render-from-contract |

## §30 Emission-Surface Map (Era M) — S-01…S-42 (S-43 candidate)
| # | Surface | Pinned by | Era M | Class |
|---|---|---|---|---|
| S-21/22 selection/date | T-21/22 | 🟢 ×4 | derived |
| S-23 AA basis | T-24/D-9 | 🟢 (score stable); grounding carried | derived |
| S-26 CEO/role-name | validator+stoplist | 🟢 Popov ×4 | derived |
| **S-30 phase (whole opp)** | T-27 | 🟢 set ×4 (re-run) | derived |
| **S-40 phase via decomposition** | T-30 | 🔴 T4 (T-10⁸); absent on re-run (**intermittent**) | violation |
| **S-41 S4 score-comment field tokens** | T-31 strip | 🔴 present ×4 (driver column) | violation |
| **S-42 staged-download serves raw** | T-31 export | 🟠 raw markers/prose ×4; comment-strip runs | **observability / test-validity** (extraction-surface, not the client deliverable — S5 clean ×4) → Backlog |
| S-39 H-RT-07 title drift | (A3 DERIVE) | 🟠 forking ×4 ("Data Protection"↔"GDPR", ±"Sprint 0 Enabler") | cosmetic |
| **S-43 intra-Later ordering** *(candidate)* | (A3 DERIVE) | 🟠 3 distinct orders across 4 runs | cosmetic |
| S-28 operator/checkpoint leak | T-28 | 🟢 at S5 | fixed |

**Reading the map:** first net-negative register era since v32 — on the **product-output surface**, S-40 (decomposition, intermittent) and S-41 (S4 field tokens) opened, none closed; S-42 is reclassified as an observability/test-validity item and S-33 is removed to the Backlog, so they no longer inflate the product count. The net-negative signature stands on the two genuine output surfaces — the mark of an exhausted incremental strategy.

## §30-note — Name-scan confirmation `[P]` (Era M, executed re-run documents)
Full scan of the v35 re-run deliverables (T1–T4 × S1–S5, minus T1 S1) for every person name:
- **CEO / leadership slot:** **Dimitar Popov** only, in every run. No other name occupies a leadership slot; the v32 "Petrov" bleed has not recurred (four eras clean).
- **Firm-leadership surnames (house facts — Steven Petrov, Slavi Gumushian, Ivan Montin, Axel Kara):** **Petrov = 0, Gumushian = 0, Kara = 0** in all bodies. **"Montin"** appears only in the title-label / "Client:" field ("Ivan Montin v35 Test N") — **zero body occurrences.** The S-33 collision, not a content bleed.
- **Body person-names (legitimate Meridian cast):** Mihailova, Nowak, Ivanov, Georgieva, Stoyanov, Draganova — the fictional client's own staff. Not bleeds.
**Conclusion:** no leadership name other than Popov; firm surnames absent; "Montin" is fixture-label metadata only. **No open name item on the product-output surface** — the fixture rename is a test-validity / operator item (see Backlog), not a product surface, and does not gate KR6.

## §31 Frame Amendment
Map/matrix grow, never shrink; the first regression era is recorded with all prior eras intact and both evidence streams (T-10⁸ `[X]`, re-run `[P]`) preserved. ADR-001 (Approach 3, render-from-contract) is entered as the committed post-6/6 architectural decision; the WS-A1 PERMIT/DERIVE/PROSE/STRIP inventory is its spec (Approach 2 ⊂ Approach 3, no throwaway). **New this era:** a formal separation of *test-validity / operator* items from *product-output* surfaces (§30-B), so the reproducibility milestone is not corrupted by harness noise (the orchestrator skill's harness-vs-dashboard distinction, and the standing separate-tally principle).

## §30-B — Test-Validity & Operator Backlog *(NOT product-output — separate tally; does not count toward the reproducibility KRs or the §30 emission-surface map)*

**Rationale (`/brainstorming` reclassification).** These items govern whether an acceptance can be *run and evidenced*; none of them changes what a client receives (the emitted S1–S5 documents). Holding them in the product emission-surface map or on the KR tally over-weights near-zero-severity nuisances and corrupts the reproducibility milestone (S-33 was explicitly flagged as over-weighted on the critical path). They are tracked here instead — still required to run T-10⁹, but not product KRs. Ratchet is preserved: no ID is deleted, only relocated with a reclassification note.

| Item | What it is | Product-output impact | Test-validity role | Status |
|---|---|---|---|---|
| **S-33** fixture/stoplist Montin collision | fixture *named* after the test owner; collides with the firm-surname stoplist | **none** — title-label only, 0 body occurrences | rename makes the Montin guard *testable* (else KR6 shows an artefactual 🟠) | 🔴 30-sec operator rename |
| **T-07** reviewer-metadata bundle | build SHA + spine + relay fields + `pipeline=` stamp, *outside* the deliverable | none | supplies the affirmative per-stage `ran — clean/stripped` status; unblocks WL-15 evidence + KR5 root-cause | 🔴 not supplied |
| **Seeded residual / seeded-split run** | a run deliberately seeded to fire the BLOCKERs | none | the *only* proof T-30/T-31 catch — a natural clean run proves nothing (Era-M intermittency) | 🔴 absent |
| **Build-provenance label** | v34.5 ≡ "v35" → realigned v35.1 | none | report↔build map; durable fix = single-source stamp emitted into the bundle (closes T-07) | 🟠 realigned; durable fix owed |
| **Extraction-source discipline** | pull from `/step/:step/delivery`, never raw `/step/:step` | none | prevents the Era-M failure mode (extracting raw copies and reporting phantom "leaks") | operator rule |
| **S-42** staged-download serves raw *(reclassified from §30)* | the raw endpoint is reachable and looks deliverable-ish | none — client deliverable (S5) clean ×4 | internal-gate the raw endpoint; hard guard is the bundle `ran —` status | 🟠 relabel soft |

**Pattern.** All six share one signature: they affect **test validity / operator setup / build observability**, not the emitted documents. They are the "harness" side of the orchestrator's harness-vs-dashboard split. **Quality:** near-zero as product defects; genuinely blocking as *acceptance preconditions* for T-10⁹. **Disposition:** kept off the product registers and the KR tally; completed as operator/engineering setup before the conforming run.

**Boundary (what stays a product surface, not backlog):** **S-40** (decomposition — a real content fork in the roadmap document), **S-41** (field tokens in the visible S4 driver column), **S-39** (H-RT-07 title drift *in the document*), **S-43** (intra-Later row order *in the document*). These are non-reproducibility *in the emitted output* and remain on the §30 map.

---

# PART V — REPORT-LEVEL SUCCESS CRITERIA
**§32.1 RSC** — 11 MET · 1 partial (RSC-13 sequential structure: Frame v4.0, IDs retained, Era M appended) · the 4/6 regression stated plainly, not smoothed. **§32.2 v34→v35 confirmation** — all prior requirements reflected; Era M accretions (Era M, §35.4, §40-M, A43/A44, S-40/S-41/S-42, S-43 candidate, T-30/T-31, REG-16/REG-17, WL-15/WL-16, §VIII, §30-note) additive; nothing dropped or renumbered.

---

# PART VI — REGRESSION REGISTER & CROSS-ERA (v35)

## §39.1 Regression Register (REG-1…REG-17 preserved; Era M)
| REG | Surface | Status (v35) |
|---|---|---|
| REG-7 | Stage-1 LC count | 🟠 Open (LC=0 convention) |
| REG-12 | Grounding badge integrity | ✅ Closed (AA pinned, 3 eras) |
| REG-13 | Phase-vector determinism | ✅ Closed (T-27) → 🔴 **REOPENED at M (decomposition)** → REG-16 |
| REG-14 | Whole-pipeline leak (Stage-1 operator) | ✅ Closed at S5 (T-28); staged path exposed → REG-17 |
| REG-15 | Scaffold-form leak (denylist gap) | 🔴 present in raw copies; resolved-as-raw-copy artifact |
| **REG-16** *(new)* | **KR3 phase regression via opportunity-split** | 🔴 Open (T-30 `[C]`, pending validation) |
| **REG-17** *(new)* | **Staged-download serves unstripped copies** | 🔴 Resolved-pending (T-31 `[C]`) |

**Open regressions: REG-7, REG-16, REG-17.**

## §39.3 Wide grain — introduced vs closed, per era
| Era | Introduced | Closed | Net open |
|---|---|---|---|
| K | REG-14 | REG-13 | 2 |
| L | REG-15 | REG-14 | 2 |
| **M** | **REG-16, REG-17** | **none** | **3 (REG-7, REG-16, REG-17)** |

**Era M breaks the close-one/open-one rhythm in the wrong direction: two opened, none closed — the first net-negative era since v32, and the ledger case for a by-construction fix.**

## §39.5 Latent-Regression Watchlist (WL-1…WL-16 preserved)
| WL | Surface | Status (v35) |
|---|---|---|
| WL-13 | Partial-coverage guards | 🔴 controlling diagnosis (denylist→allowlist→render) |
| WL-14 | Internal-identifier bleed | 🟠 "T-21"/"from Stage 1 score comment" prose (raw) |
| **WL-15** *(new)* | **Fail-open-silent** — a guard that no-ops must flag, never pass silently; verified via the affirmative per-stage `ran —` status (in the owed bundle) | 🔴 Active (bundle absent) |
| **WL-16** *(new, controlling)* | **Pin-completeness vs decomposition** — a pin on an entity must bind its sub-entities, and coverage on one delivery path is not coverage | 🔴 **Controlling lesson of Era M** |

## §39.4 Brainstormed Analysis — v35
No register closed this era; two opened. REG-16 opened because the phase pin bound the entity but not its decomposition (WL-16). REG-17 opened because leak coverage proven on the S5 render was absent on the staged-download path (WL-16, second clause). The constant across J→M is partial coverage; the only construction complete-by-design against *unseen* forks and *free-prose* emissions is render-from-contract (Approach 3).

---

# PART VII — KR TRAJECTORY & ERA LEDGER

## KR trajectory
| Era | C | D | E | F | G | H | I | J | K | L | **M** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Tally | 2/6 | 1/6 | 2/6 | 2/6 | 1/6 | 4/6 | 4/6 | 5/6 | 5/6 | 5/6 | **4/6** |
| KR3 state | — | — | — | — | — | ✅ | ✅ | 🔴 | ✅ | ✅ | 🔴 **decomp** |
| KR5 state | — | — | — | — | — | leak | leak | ✅ | 🔴 stage | 🔴 form | 🔴 **raw-copy** |

**M is the first regression since G.** Nominal 5/6 after v35.1 (KR3 contested); nothing credited until T-10⁹.

## Era ledger (A–M)
…K phase refixed, leak→Stage-1 (5/6) · L T-28 closes operator/checkpoint ×4, leak→forms (5/6) · **M v35 first n=4 acceptance: KR3 forks at T4 (decomposition, S-40), KR5 raw-copy (S-42), S5 clean ×4 → 4/6; v35.1 ships T-30/T-31 `[C]`; independent re-run confirms spine ×4 and decomposition-intermittent. First net-negative register era since v32; Approach 3 (ADR-001) is the terminal fix.**

---
---

# PART VIII — REPORT-TO-REPORT COMPARISON & ANALYSIS (v34 Era L → v35 Era M)

> **Purpose.** Compare the last two reports. Era L relocated the leak to *forms* and held 5/6; Era M relocated the *fork* to opportunity sub-components and the *leak* to the raw delivery path — and the tally fell to 4/6.

## §VIII.1 Comparison table
| Dimension | **L (v34)** | **M (v35)** | reading |
|---|---|---|---|
| One-line verdict | form leak fixed at stage; new forms | KR3 sub-entity fork + raw-copy leak | first regression |
| **KR tally** | 5/6 | **4/6** | −1 |
| KR3 phase | ✅ ×4 | 🔴 (T4 decomposition) | regressed |
| KR5 leak | 🔴 (forms) | 🔴 (raw-copy); S5 clean ×4 | relocated to copy/path |
| Fix shipped | T-29 allowlist | T-30 + T-31 `[C]` | both unvalidated |
| New surface | S-35/S-36 forms | S-40 decomposition + S-42 staged raw | sub-entity + path |
| Cause | denylist of forms (WL-13) | pin didn't bind sub-entities; path-coverage gap (WL-16) | partial coverage, deeper |
| Registers closed / opened | REG-14 / REG-15 | none / REG-16 + REG-17 | net-negative |

## §VIII.2 Analysis — three movements
1. **The number moved, and honestly.** After three flat 5/6 eras, Era M fell to 4/6 — the two-grain rule now works in reverse: it must stop "5→4" reading as collapse when S5 is clean ×4 and n=4 caught a T4 fork n=2 would have passed (the fifth demonstration of the rule).
2. **The cause went one level deeper.** Eras J–L were partial *coverage* (a concern, a stage, a set of forms). Era M is partial *completeness of the pin itself*: T-27 bound the entity's phase but not its decomposition, and the allowlist covered the S5 path but not the staged path. WL-16 is the controlling lesson.
3. **Incremental pinning is exhausted.** Every closure to date completed a pin; Era M shows two ways a "complete" pin is still incomplete (sub-entities; alternate paths) and one thing no strip can reach (free prose). The only construction that closes all three at once is render-from-contract (Approach 3) — no free-text document channel exists to fork.

## §VIII.3 One-paragraph synthesis
**Across the last two reports the defect moved from leak-forms to the completeness of the pins themselves, and the tally fell from 5/6 to 4/6.** Era L's allowlist was the right move for form-coverage; Era M shows the remaining forks are not about *which forms* but about *what a pin binds* (entities vs sub-entities) and *which path it covers* (render vs staged), plus a residual that is pure model prose no strip can remove. T-30 and T-31 are the correct `[C]` bridges — but the intermittency of the decomposition fork means a natural clean run proves nothing, so T-10⁹ must **seed a split and show T-30 blocking it**, and check S1–S4 delivery copies for *prose*, not just markers. The terminal fix is Approach 3, for which Era M is the strongest case in the engagement's history.

*End Part VIII.*

---
---

# PART IX — BUSINESS JUSTIFICATION (carried forward — Era-M status) *(`/product-strategist`, ADR-001)*
The leadership-facing report needs one Era-M update before re-circulation: the reproducibility milestone **regressed for the first time in four rounds**, but the client-facing document (Stage-5) was **clean in all four runs** — the regression is in *internal* pipeline surfaces (an intermittent phase-sequencing fork and internal-copy scaffold), not in what a client receives. The honest leadership line: *"the diagnostic's client deliverable is clean and verified four times; an internal reproducibility check surfaced two intermittent issues we have now instrumented (a phase-sequencing guard and a delivery-copy export); full sign-off is pending one conforming run that seeds and catches the phase issue and verifies the delivery copies — and we have committed to a render-from-a-fixed-template architecture (ADR-001) that removes this class of issue by construction."* The §8 risk posture holds: these are internal-surface defects, not false client content; the strategic decision is to stop patching per-run model prose and render deliverables from a pinned contract.

*End Part IX.*

---

## Justification feedback for the whole task
- **Structure & pattern fidelity:** consolidated Frame v4.0 pattern, Era M folded into every grid, **ratchet held** (A–L preserved; nothing dropped or renumbered); §30-note carries the name-scan as positive evidence; both T-10⁸ `[X]` and re-run `[P]` streams preserved.
- **Honest verdict:** the **first regression since G (4/6)**, stated plainly, with the two encouraging counter-facts given their due — S5 clean ×4, and n=4 catching a T4 fork n=2 would pass. The two failures are separated cleanly (KR3 real content/logic fork → T-30; KR5 raw-copy extraction → T-31), and no regression was asserted that the artifacts could not evidence.
- **The turn in the argument:** Era M is the first net-negative register era since v32 and the strongest case for Approach 3 — a decomposed sub-component and an unstripped free-prose staged copy are both emissions a template render forbids by construction.
- **Skills applied:** `/blueprint-orchestrator` (v2.1.0 — pipeline framing + the harness-vs-dashboard / test-validity-vs-output distinction that governs the Backlog segregation), `/debugging-strategies` (root-cause), `/brainstorming` (§36 + the non-output-item reclassification), `/product-strategist` (§37/§IX), `/project-planner` (§C-PLAN), `/sprint-planner` (T-10⁹ DoD), `/architecture-decision-records` (ADR-001), `methodology-and-contracts` (scoring/grounding reference).

*Prepared by AI Assist BG · Blueprint Practice · CONFIDENTIAL · Frame v4.0 · Era M / v35 (T-10⁸, n=4) → v35.1 · provenance-tagged · consolidated and comprehensive. Next: **operator/test-validity setup** (fixture rename, seeded split, metadata bundle, single-source stamp, extract from `/delivery`) + **v35.1 build** → T-10⁹ for the 6/6 Definition of Done; then Approach 3 (ADR-001). Credit nothing until ×4 in the emitted delivery documents.*
