Justification Report — v37.2 Remediation (REG-25 label fork, REG-26 detectors)
=============================================================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-07-28**
Author: engineering (Viktor's seat). Audience: the consultant review team (Ivan, Steven)
ahead of the v37.2 confirmation batch. Responds to the Cross-Era Comparison report's
post-batch addendum (§4c, 2026-07-28), which returned the v37.1 batch **NOT CREDITED (4/6,
86%)** and opened REG-25 (S3 classification-label fork) and REG-26 (S4 anchor destabilization +
a deployed guard that did not stop delivery).

Provenance: `[P]` proven from artifact/source · `[C]` implemented, committed & deployed,
awaiting the confirmation batch · `[X]` awaiting the batch · `[Inferred]` analyst judgment,
flagged. Build identity: pipeline label **v37.2** (bumped from v37.1); `dist/skills` is rebuilt
from source by the deploy, so all skill changes below are live.

---

§0 — One-paragraph summary
--------------------------

The v37.1 batch confirmed the REG-24 fix worked where aimed and surfaced two adjacent defects.
Before fixing, we grounded both engineering-owned findings against the pipeline source and had
to correct two attributions in the report — one that clears v37.1 of a regression it was
suspected of, one that makes the enforcement finding more serious than the report framed it.
v37.2 ships the detectors for both defects (a D6b class-recompute guard for REG-25, an anchor
self-check plus stable-count assertion for REG-26) together with the "fires-on-the-batch-path"
proof obligation the report asked for. **One deliberate limitation, decided by the owner: these
guards detect and surface — they do not yet hard-stop delivery. Turning advisory flags into
hard gates (REG-26a / "point 2") is intentionally deferred until the review team decides it is
wanted.** The four GREEN stages remain byte-frozen; the signed manifest seal is intact.

§1 — What triggered this and the standing constraint
----------------------------------------------------

The v37.1 confirmation batch (genuine new execution — all 20 documents hash-differ from v37)
returned 4/6. REG-24, the prior sole blocker, passed its target four-for-four (H-RT-07 Now ×4,
H-RT-04 Later ×4). Two new loci opened: REG-25 (a Stage-3 D6b classification-label fork, 1-in-4)
and REG-26 (Stage-4 anchor emission scattered to 3/6/7/0, and T4 shipped with AA=0 despite the
deployed zero-floor guard). The constraint is unchanged and was honoured: **no fix may touch a
GREEN stage** (S1 Intake, S2 Maturity, S3 Opportunities, S5 Assembly). Every change below lives
in Stage 4 (roadmap), `backend/src/utils`, or the shared harness.

§2 — Two attribution corrections, grounded from source before fixing
--------------------------------------------------------------------

We did not act on the report's inferences. We read the pipeline code and corrected two claims.

**2.1 REG-25 is a PRE-EXISTING latent fork, NOT a v37.1 regression. `[P]`**
The report's working hypothesis was "vocabulary bleed from v37.1's `phase_dependency=strict`
narration into Stage-3 classification" (flagged `[Inferred]`). The architecture falsifies it:
each stage is an **isolated single-turn model call** (`invokeSkill`) whose system prompt is that
stage's own skill only, with **no conversation history across stages**. Stage 3 loads only the
`blueprint-opportunities` skill (plus its subdirs and methodology) and receives the Stage-1
dossier and Stage-2 snapshot as input. **It never sees the roadmap skill** — the only file
v37.1 edited. The bleed is therefore architecturally impossible; REG-25 is a latent Stage-3
classification intermittency that this n=4 surfaced and the v37 n=4 did not (a ~1-in-4 fork can
clear four runs by chance). Consequence for the no-regression contract: **v37.1 did not regress
Stage 3.** And it strengthens the report's own deeper conclusion — the cause is context and the
inherent nondeterminism of asking prose to restate a derived value (the D6b class is a pure
function of Impact/Feasibility), which is the ADR-001 argument, independent of our change.

**2.2 REG-26 is bigger than "a blocker did not fire" — NO validator is a hard gate. `[P]`**
We traced the enforcement path. The pipeline's **only** hard stop is the confidence-score gate
(`runStepWithGate` throws on a Red band after one retry). Every validator "BLOCKER" in the code
— REG-21, REG-22, T-26, the S-26 guards, and the v37.1 S4 AA floor — appends a string to
`reviewerFlags`, which is saved to the bundle and surfaced for a human. **Nothing withholds
delivery or regenerates on a `BLOCKER_` flag.** So T4 shipping with AA=0 is fully consistent:
the flag very likely fired and rode along in the bundle as advisory text; it simply never had
the power to stop delivery. "BLOCKER" in this codebase has always meant "highest-severity
reviewer flag," not "pipeline abort." This is not a v37.1 breakage — it is the discovery that
the whole lineage's "code enforcers" are advisory-until-wired, exactly the fourth column the
report's "deployed ≠ effective" taxonomy needs.

§3 — The fixes, each justified (v37.2)
--------------------------------------

**3.1 REG-25 — D6b classification-label guard (`opportunityValidator.ts`, Gate-3).**
`validateClassificationLabels` recomputes the class from each card's emitted Impact/Feasibility
using the exact pinned tree (`scoring_rubric.md` STEP 1–3: `F≥4 → QuickWin`; else
`I≥4 & F≤3 → BigBet`; else `FoundationBuilder`) and flags any card whose **score-marker class OR
prose "Classification:" label** disagrees. *Why both surfaces:* the batch showed the label
forked while the marker stayed correct (which is why Stage 4 still placed both cards in Later —
the machine spine was intact); a marker-only check would have missed it. *Why zero-false-fire:*
it compares emitted labels against a deterministic tree applied to the emitted numbers, so it
fires only on a genuine internal contradiction. We verified the tree reproduces all eight
manifest Stage-3 classes before writing the guard. Wired into the Gate-3 call site in the
orchestrator.

**3.2 REG-26b — Stage-4 anchor-emission self-check (`blueprint-roadmap/SKILL.md`).**
A tight, count-based rule: every Now/Next detailed block cites its locked Feasibility exactly
once as `[Archetype-Anchored — locked at Stage 1]`; before emitting, the anchor count must equal
the Now+Next opportunity total. *Why a count self-check and not more prose:* the failure was a
count scatter (3/6/7/0 vs a stable 5), and a deterministic count instruction is the class of
rule that stabilises rather than relocates. *Honest scope:* this is a mitigation on a prose
surface; the terminal fix is ADR-001 (compute the anchors from a template rather than ask prose
to restate them). The harness keeps the exact-count assertion (`stage4_aa_min = 5`) from v37.1.

**3.3 Fires-on-the-batch-path probes (the report's proof obligation, §4c).**
The report's most important methodological demand: a passing unit test proves a guard's function
works, not that it runs on the batch path. We added jest probes that feed a real violating
artifact to the **exact functions the orchestrator calls** — `validateRoadmapPhases` (Gate-4)
on an AA=0 roadmap, and `validateOpportunityScores` + `validateClassificationLabels` (Gate-3) on
a forked-label output — and assert the flag is produced. These prove the guards **fire** on the
batch path. (Whether the flag also **withholds** the artifact is REG-26a — §4.)

**3.4 Seed F + control (harness).** The label check was extracted into a standalone
`check_classification_labels`; the seeded battery gained a conforming REG-25 control and Seed F
(the 5/1/5 Big Bet mislabelled "Foundation Builder"), caught on both marker and prose. Per the
house rule, an intermittent fork is retired by a seeded catch, not a clean re-run.

§4 — The deliberate limitation: detectors, not gates (REG-26a / "point 2", deferred)
------------------------------------------------------------------------------------

This is stated plainly because it changes how the v37.2 batch must be read. **By the owner's
decision, v37.2 does NOT convert advisory flags into hard delivery gates.** Every guard in §3 —
REG-25, the S4 AA floor, all of them — reliably **surfaces** its defect in the run bundle, but
will **not** prevent a flawed artifact from shipping. That is the same property that let T4 ship
with AA=0. The consequences the review team should hold:

- The v37.2 guards make REG-25 and REG-26 **visible and mechanically detectable** in the bundle;
  they do not make the pipeline refuse to deliver a forked artifact.
- Retiring REG-25/REG-26 on this build therefore depends on the grader reading the surfaced
  flags and on the seeded catches firing — not on delivery being blocked.
- Closing that last gap (feed `BLOCKER_` flags into the same corrective-retry-then-withhold path
  the confidence gate uses) is REG-26a. It is a delivery-behaviour change for every stage, so it
  is held for an explicit decision. **If the review team wants hard gating, we implement it in a
  follow-up; the detectors shipped here are the precondition either way.**

§5 — No-regression proof (freeze + seal)
----------------------------------------

- **Zero GREEN-stage edits.** The change set touches only `blueprint-roadmap` (S4), the shared
  `harness/`, `backend/src/utils`, `orchestrator.ts`, and `package.json`. `git status` confirms
  no file under `blueprint-intake` (excluding harness), `blueprint-maturity`,
  `blueprint-opportunities`, or `blueprint-assembly` changed. `[P]`
- **Signed manifest seal INTACT** — `content_sha256` unchanged. The REG-25 label check is
  manifest-independent (self-consistency), so no expectation field or re-seal was required. `[P]`
- The freeze edit-guard remains registered; the four GREEN stages are byte-unchanged. As the
  report itself noted, this discipline is *why* REG-25 localises cleanly to context rather than
  being confounded by an S3 edit.

§6 — Verification evidence `[P]`
--------------------------------

- Typecheck clean; **jest 167/167** (+7: REG-25 guard cases incl. the 5/1/5 and 4/1/4 forks and
  the zero-false-fire control, plus the two fires-on-path probes).
- **VERIFY_ALL: PASS** — gate, validators, stability, expectation-vs-signed-manifest.
- **Seeded battery 10/10** — controls plus Seeds A–F all caught (Seed F caught on both marker and
  prose surfaces).
- `dist/` not hand-built; rebuilt from source on deploy.

§7 — Deferred, by design
------------------------

- **REG-26a (hard gating) — "point 2".** Deferred by owner decision (§4). Revisited if the review
  team wants it.
- **ADR-001 render-from-contract** remains the terminal fix for both REG-25 (class labels) and
  REG-26b (anchor tags): both are pure derived values that a template should compute and prose
  should never be asked to restate. The v37.1/v37.2 batches are the strongest empirical case yet
  for it — three attempts to pin prose-emitted derived values have each surfaced a fork on a
  prose surface.
- Type-B calibration deltas and the operator items (stamp/label visibility on artifacts, fixture
  rename, export-route declarations) remain owed; they block *countability*, not the product.

§8 — Honesty boundary
---------------------

The two attribution corrections (§2), the D6b tree grounding (§3.1), the seal integrity and
zero GREEN edits (§5), and the local verification (§6) are `[P]`. The **effectiveness** of the
guards against a live model is `[C]` until the batch — and bounded further by §4: these are
detectors, so even a perfect fire does not block a bad artifact on this build. The REG-25
pre-existing-vs-introduced reading in §2.1 is `[P]` on the architecture (isolation) and
`[Inferred]` on the exact latent trigger. Nothing here claims v1; it claims the two batch
findings are **detected and surfaced**, with hard enforcement explicitly held for a decision.

§9 — What the v37.2 batch should confirm `[X]`
----------------------------------------------

1. n=4 on the deployed **v37.2** build; confirm the bundle's `pipeline=` build stamp reads
   v37.2 (distinct from the operator-typed job label).
2. **REG-24 holds:** H-RT-07 Now ×4, H-RT-04 Later ×4, phase map identical ×4.
3. **REG-25 detected:** every card's class label (marker and prose) matches the D6b tree; if any
   run forks, the guard's flag is present in that run's bundle. Seed F fires in the battery.
4. **REG-26 detected:** S4 anchors ≥ 5 ×4; the fires-on-path probe passes; if a run drops
   anchors, the flag is present in the bundle.
5. **Read the flags.** Because enforcement is advisory on this build (§4), grading must inspect
   the bundle's reviewer flags — a shipped artifact is not evidence of a clean run by itself.
6. Operator items closed so the n=4 is countable (stamp/label visibility, export routes).

If the team concludes that advisory detection is insufficient for credit, that is the signal to
authorise REG-26a (hard gating) as the v37.3 follow-up — the detectors shipped here are its
precondition.

---

*End of justification report. Frame-compatible: appends to the lineage as the v37.2 remediation
answering the v37.1 batch's REG-25/REG-26 findings; introduces no new register IDs.*
