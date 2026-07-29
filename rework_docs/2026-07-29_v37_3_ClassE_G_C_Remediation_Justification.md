Justification Report — v37.3 (Class-E instruments · Class-G correcting guards · Class-C contract fixes)
======================================================================================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-07-29**
Author: engineering (Viktor's seat). Audience: the consultant review team (Ivan, Steven).
Scope: everything committed on top of `v37.2` (`4e3518c`) — steps 1–3 of the contract v1.3 close
plan. **Committed, pushed, and deployed as of this report; build stamp `pipeline=v37.3`.**

Provenance: `[P]` proven from source/artifact · `[C]` implemented, committed & deployed, awaiting
the v37.3 acceptance batch · `[X]` awaiting the batch · `[Inferred]` analyst judgment, flagged.

---

§0 — One-paragraph summary
--------------------------

v37.3 makes the instrument layer trustworthy (Step 1), installs the Class-G recompute-from-root
guards and the C1 correction log the contract turns on (Step 2), and closes the two 100%-rate
contract gaps (Step 3). Every change lives in `backend/src/utils`, `backend/src/pipeline`, the
shared harness, or `package.json` — **zero edits to any GREEN stage (S1/S2/S3/S5), and the signed
manifest seal is untouched** (`content_sha256` unchanged; the S3 anchor count is graded at the
Ruling-3 interim of 7 under Waiver W-1, with the re-seal deferred to the v1.1 event). The guards
run in **acceptance mode** — flag + log, emit authored — which is exactly what the v37.3
measurement batch needs. jest 192/192, VERIFY_ALL green, seeded battery 12/12 (Seeds A–G).

§1 — Step 1: Class E — nothing is graded through a broken instrument
--------------------------------------------------------------------

The rate-first rule cannot run on a corrupt apparatus, so the four instrument defects (two ours,
both confirmed at source) were fixed first. `[P]`

1. **GATE-4 phase detector — level-agnostic + suffix-tolerant** (`opportunityValidator.ts`). The
   detector matched only `### Phase N` (H3) while the roadmap skill's structure spec emits `## Phase
   N` (H2), so it missed every phase heading and fired 12 false "missing phase" flags per batch —
   the noise that buried the real S4 AA flag. Now `#{2,3}` with a `\b` boundary; it matches
   `## Phase 1: Now (Months 1–3)` and stops before the colon, so the parenthetical suffix is
   ignored (Ivan's §1.3 requirement — confirmed by a regression test on that exact format).

2. **Stage-3 allowlist NO-OP hole closed** (`confidenceScorer.ts`, `applyAllowlist`). When heading
   paraphrase made the permit list match nothing, the old fail-safe suppressed the **entire** strip,
   leaving known scaffold (and its field tokens) in place — the reason the S3 strip "never ran" for
   three batches. Now **known scaffold is removed even under the permit fail-safe**; the fail-safe
   only protects *unrecognised* content from being nuked; the state reports `permit-UNVERIFIED` so
   it can never read as clean.

3. **Composite auto-patch demoted to flag-only** (`opportunityValidator.ts`, REG-27a). The patcher
   rewrote a correct product to match a defective component (16 → 32), laundering the contradiction.
   It now flags and never overwrites, pointing correction at the **root** (Stage-1 flags), never a
   sibling component. Direction of trust is root → derived, one way.

4. **Residual detector extended to internal field tokens** (`confidenceScorer.ts`,
   `detectResidualScaffold`). Added an `ml_heavy=…`/`d_gate4=…`/etc. pattern (the S-41/S-48 leak);
   zero-false-fire because a field NAME never appears in legitimate client prose. (The grading
   token-list extension is Ivan's instrument, published alongside.)

§2 — Step 2: Class G — recompute-from-root guards + the C1 correction log
------------------------------------------------------------------------

The reframe the contract adopted — DETECT vs CORRECT, not GUARD vs RENDER — is realised here: the
Class-G values are recomputed from their root and logged, without touching a frozen stage.

**2.1 The C1 correction log** (`correctionLog.ts`) `[C]`. A structured `authored → root_computed`
record per Class-A value, written **unconditionally in every mode**. The enforcement mode controls
only which value the artifact carries (authored in acceptance so the raw model rate stays observable;
root-computed in production so a client is served the right value) — never whether the fork is
recorded. `residualRate` implements reading-rule R1. Persisted per run to `correction_log.json`. As
the contract notes, this is the first manifest-independent, continuous, value-level instrument in
the engagement — it compares authored vs root-computed, both internal to the run, so it works on
real client engagements where no signed manifest exists.

**2.2 A4 — post-adjustment feasibility from root** (`classGGuards.ts`, wired at Gate-3). The pinned
formula `max(1, base_F − Σ_f[flag=yes AND maturity[dim(f)]==Early])`, flags stacking as separate
terms, each gated by its dimension being Early. Roots come from the **archetype hypothesis table**
(parsed) + the maturity snapshot — read-only, manifest-independent. This closes **REG-27**, the
primary v37.2 blocker (H-RT-01/H-RT-04 mis-stacked −1 where −2 was required). `[P]` on the formula
(verified against all 12 prior runs in the contract), `[C]` on the deployed guard.

**2.3 A5 — classification correction records** (`opportunityValidator.ts`). D6b(I,F) recompute
emitted as C1 records so the class field joins the log (detection was already REG-25).

**2.4 A9 — root integrity + Override Register** (`classGGuards.ts`). Impact/alignment/pinned-flags
compared to the archetype row (feasibility excluded — that is A4's; the two client-specific date
fields excluded — legitimately client-supplied). An **uncited** deviation is a BLOCKER; a **cited**
deviation (a `[Document-Backed]` citation present in the card) goes to the per-run **Override
Register** (`override_register.json`) — the bounded human worklist. On Meridian the register is
empty, so a non-empty one is itself an anomaly signal. Machine-checks equality-or-citation-present;
citation *validity* stays human, as agreed.

**2.5 Seed G** (harness). The dual-flag stacking fork (−1 where −2 is required) is caught by the
Python recompute in the seeded battery, with a conforming control. **B2 closed-vocabulary S-37**
(`confidenceScorer.ts`): the Step-N detector now matches only the pipeline's **own** step titles (a
finite, versioned set) — so it can be a hard production gate without false-blocking a legitimate
client "Step 1: Migrate the CRM." Verified both ways in tests.

§3 — Step 3: Class C — the two 100%-rate contract gaps
------------------------------------------------------

Both were uniform 12/12 failures, so per the rate-first rule they are contract fixes, not fork
hunts. `[P]`

1. **BAND_ASSIGNMENT permitted** (`confidenceScorer.ts`, `SECTION_ALLOWLISTS.stepC`). The mandatory
   `## [BAND_ASSIGNMENT]` block was generated by S2 and then stripped as non-permitted every run —
   an allowlist omission, not a generation gap. Added to the stepC permit list so it survives into
   the Snapshot (the blueprint-aria-spec input contract).

2. **Field-token delivery scrub** (`confidenceScorer.ts`, `stripFieldTokens`, added to
   `stripForDelivery`). Removes internal score-field tokens from client-facing prose (backticked or
   bare), scoped to the finite set of field NAMES so legitimate client "X = Y" text is untouched.
   Runs after `stripHtmlComments`, so it touches only visible prose, never the machine markers — and
   only on the **delivery** path, so the raw graded output keeps the tokens and the emission rate
   stays observable. With Step 1 (the section strip now runs) this closes the S3/S4 field-token
   leak on the client surface (B3) without any blind-deletion of prose.

§4 — No-regression proof (freeze + seal)
----------------------------------------

- **Zero GREEN-stage edits.** The change set touches only `backend/src/utils`, `backend/src/pipeline`,
  the shared `harness/`, and `package.json`. `git status` confirms no file under `blueprint-intake`
  (excluding harness), `blueprint-maturity`, `blueprint-opportunities`, or `blueprint-assembly`
  changed. The archetype table is read **read-only** by the A4/A9 guards. `[P]`
- **Signed manifest seal INTACT** — `content_sha256` unchanged. The A4 recompute is
  manifest-independent (archetype root); the S3 anchor count is graded at the Ruling-3 interim of 7
  under **Waiver W-1**, with the 7 + 1 `[Core-Anchored]` re-seal deferred to the v1.1 event. No
  fix-time amendment of a sealed expectation. `[P]`

§5 — Verification `[P]`
-----------------------

- Typecheck clean; **jest 192/192** (three new/extended suites: `classGGuards`, plus the
  `opportunityValidator` and `confidenceScorer` additions — GATE-4, auto-patch, REG-25/27, A5, A9,
  B2, field-token scrub, BAND_ASSIGNMENT, fires-on-path probes).
- **VERIFY_ALL: PASS** — gate, validators, stability, expectation-vs-signed-manifest.
- **Seeded battery 12/12** — Seeds A–G all caught, all controls pass.
- `dist/` regenerated from source by the deploy build (skills mirror current).

§6 — What the v37.3 batch should now find `[X]`
-----------------------------------------------

1. n=4 on the deployed **v37.3** build; the bundle stamps `pipeline=v37.3` + SHA.
2. **REG-24 holds** (H-RT-07 Now ×4, H-RT-04 Later ×4); **REG-25/REG-27 detected** by the guards
   with the fork rate readable from `correction_log.json` (R1), not the documents; **A9 Override
   Register** empty on Meridian.
3. Instruments trustworthy: GATE-4 fires 0 false phase-flags; the S3 strip runs (no NO-OP); the
   auto-patch launders nothing; field tokens absent from the client-facing surfaces.
4. Class-C closed: BAND_ASSIGNMENT present in the Snapshot; field tokens scrubbed from delivery.
5. Seeded battery incl. Seeds F/G fires.

§7 — Honesty boundary
---------------------

- The guards run in **acceptance mode** (flag + log, emit authored). The production-mode
  hard-correct/withhold-and-regenerate path (B2 §3.2, C1 root-computed emission) is defined in the
  correction-log module but **not yet threaded** through the orchestrator — a small follow-on for
  when client/production delivery is switched on. This is deliberate: the v37.3 batch must observe
  the raw model rate, which acceptance mode preserves.
- The A4/A5 recompute rules re-encode the rubric's logic in code (the two-places debt, contract
  §5.3). The canonical statement lives in the contract; the rubric back-port and the hash-guard test
  land at the v1.1 event when the freeze lifts. Until then, the encoding matches the contract's
  §4.1 formula, verified against 12 runs.
- Effectiveness against a live model is `[C]` until the batch. Nothing here claims v1; it claims the
  instrument layer is trustworthy for the first time and the two named product forks (REG-25 label,
  REG-27 feasibility) now have deployed detectors with a logged, manifest-independent fork rate.

*End of report. Frame-compatible: appends to the lineage as the v37.3 Class-E/G/C build executing
steps 1–3 of contract v1.3. Introduces no new register IDs.*
