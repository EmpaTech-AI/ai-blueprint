Release Note — v37.6 · Engineering side COMPLETE, ready for the confirmation pair
================================================================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-08-04**
From: engineering (Viktor's seat). To: **Ivan Montin** · Founder/CEO (Steven).
Responds to: **Eight-Batch Cross-Era Report · Defect Logic · Archetype-Activation Doctrine** (2026-08-04)
and the **Programme Status** memo of the same date.

Build identity: pipeline label **v37.6**, parent **v37.5 `sha=4ca96a2`** (the build the controlled pair
ran on). **425 tests across 15 suites; typecheck and build clean.**

> **Every engineering-owned item in your consolidated sequence is done.** Items 1, 2, 3, 5 and 7 in full,
> plus III.3 pin 1 and the R5 emission fix. Items 4 and 6 are the two that need your spec — pin 1's
> mechanism is built and running, so item 4 now needs only your ruling on scope, and item 6 (phase-
> placement counted rules) is the single remaining blocker on my side that I cannot write for you.

---

§1 — What shipped, mapped to your sequence
------------------------------------------

| Your # | Item | Status |
|---|---|---|
| 1 | Shared comparison layer (A15, A17a/b, A18 openers, B3 shape + derived vocabulary) | **done** — v37.6 |
| 2 | A16 register-format fix | **done** — plus an over-capture fail-safe |
| 3 | GATE-4 Quick-Win → post-adjustment feasibility | **done** |
| 4 | Stage-1 ID freeze → universal REG-21 | **mechanism built and live (A19)**; scope needs your ruling (§4) |
| 5 | Inventory as rendered artifact | **done** — R1, R2, R9 closed by construction |
| 6 | Phase-placement counted rules | **blocked on your spec** — the only engineering item I cannot start |
| 7 | Rung declaration + coverage fraction on every score | **done** |
| — | Reliable `[DATA_INVENTORY]` emission (memo §5.4 / register R5) | **done** — root cause was not what it looked like |

§2 — Three corrections to the report
------------------------------------

**2.1 — I4: the (Now+Next) anchor pin was probably UNREACHABLE, not wrong. Please do not withdraw it yet.**

Your I4 records the pin as "a wrong metric spec" that both teams signed and that the panel arithmetic
disproved. Grounding it against source: **the roadmap contract emits three phase openers** —
`*Why now:*` (Phase 1), `*Why next, not now:*` (Phase 2), `*Why later:*` (Phase 3) — and A18 knew only
the first. So every Phase-2 block was reported malformed **and received no anchor**, which means the
rendered count could never reach (Now + Next) regardless of what the model did.

One bug, two symptoms: the ~9 malformed-block flags *and* the count shortfall that disproved the pin.
With both openers known, a two-block roadmap now renders exactly 2, by test. **Recommend re-testing the
pin on this build before withdrawing it** — withdrawing it would discard a correct invariant on the
evidence of a defect in the thing enforcing it.

I would also record this as the eighth instance of Law 1 in your table, and the most embarrassing one:
it is my own code failing the law four days after I wrote the law into a shared module.

**2.2 — I1's obvious fix would have been a second bug in the same class.**

Routing A15 through the existing `normaliseEnumCell` is the natural move and it is wrong.
`normaliseEnumCell` takes the **leading token**, which is correct for an enum cell (one value from a
closed set) and destructive for a **name** cell (one or more open-vocabulary proper nouns, any of which
may be multi-word). It turns `shopify plus` into `shopify`, which would then have matched a *different*
declared system and reported clean. Names now have their own normaliser and are compared as sets.

Worth adding to Law 1's predictive form: the cure is not "normalise everything through one function" but
"normalise through the layer appropriate to the cell's TYPE". A single normaliser applied to two cell
types is itself an exact-match failure one level up.

**2.3 — The exact-match class can fail toward SILENCE, not only toward noise.**

Your V.2 rule — *"an instrument defect that fails toward silence is weighted as if model-side"* — is
right, and I6 is not the only member. The v37.5 sweep found **A4's flag firing** in the same class: an
annotated flag value (`yes (documented p.4)`) would not fire, the recompute would under-count by one,
and the guard would log `agreed: true` on a card whose feasibility was wrong. A false PASS on the
feasibility chain.

So Law 1's statement in Part II — "will generate a false-fire **or false-pass**" — is already borne out
in the register, and the false-pass members deserve to be listed separately. I would put A4 (fixed
v37.5) and I6 (fixed v37.6) in that column.

§3 — The three pins, and one design decision inside pin 2 that matters
---------------------------------------------------------------------

**Pin 2 — inventory rendered from its tables (R1, R2, R9).** The tables are transcription; the marker is
arithmetic over them. Your Law 2 says copying is reproducible and deriving is sampled, so the app derives
it. `active_integrations`, `integration_coverage`, `load_bearing_degraded_or_absent`, `data_grade` and
`pp0_severity` are all now rendered from the Core Systems / Integrations / Record Classes tables before
anything downstream reads the dossier.

**The decision worth your attention: rendering removes the defect, and it would have removed the evidence
with it.** A11's entire value in the paired batch was catching the marker-vs-table fork; if the marker is
correct by construction, A11 becomes vacuous and R1's rate becomes unmeasurable — the fix would be
unfalsifiable. So the authored values are still recorded as A11 C1 forks against the rendered ones. The
artifact is correct **and** the model's derivation rate stays measurable. Same acceptance/production split
as A18.

This also closes R2 properly rather than incidentally: `pp0_severity` is re-derived from the *rendered*
coverage, so the clause that fires is the coverage band at 0.33 rather than the SSOT clause at a phantom
0.67. Your I.4 reading rule — every C1-derived severity reports numerator, denominator and the clause
that fired — is now satisfiable because the numerator and denominator are the app's, not the model's.

**Pin 1 — the Stage-1 freeze (A19), and it is worth more than the defects it closes.** A9 asserts every
emitted score against the archetype row, so it cannot run at rung C: there is no row. The frozen Stage-1
manifest **is** that row, derived from the run's own intake. **It gives rung C a root** — which converts
A9-equivalent integrity checking from archetype-dependent to case-independent, the same move F13 made
when it turned "primary data source" into a counted rule.

What is frozen, and one thing deliberately not:

- **ID set** — frozen. A Stage-3 addition or omission is a fork (this is R3's recurrence path).
- **impact, alignment** — frozen. No rule in the pipeline adjusts either.
- **the nine relay flags** — frozen. Stage 4 reads them for placement, so drift here moves phases.
- **feasibility** — **directional, not frozen.** A4 legitimately reduces it, so the assertion is
  `emitted ≤ base`. An *increase* is a fork on every case, archetype or not, because nothing in the
  pipeline raises feasibility. That asymmetry is the same shape as A16's and A17a's.

A19 joins the Gate A coverage families, so the rung-C coverage fraction now includes it rather than
sitting in a separate line a reader has to reconcile.

**Item 7 — the rung is a first-class output.** Every run record now opens with:

```
RUN: index=T2 job=… client="…" date=… pipeline=v37.6 sha=…
RUNG: C (NONE — no library for this industry) · archetype=generic · INDEX status="none" ·
verification=PARTIAL · Class-A coverage 8/32. … READING RULE: the rung sets verification DEPTH,
never verdict logic. Scores from different rungs are NOT comparable — quote this fraction beside
any score taken from this run.
```

The fraction is the **measured** one, taken from the Gate A coverage model rather than a nominal claim.
Your rule 2 is enforced structurally: the rung is read from the library's own INDEX status for the
archetype the run *declared*, never inferred from the industry string — and an archetype file that exists
but is unlisted resolves to **C**, not A, because inferring ACTIVE from the presence of a file is exactly
what rule 1 forbids. Rung D is not auto-detected; it needs the intake honesty gate, which is yours.

§4 — What I need from you
-------------------------

**4.1 — Item 6, phase-placement counted rules.** The only engineering item I cannot start. `T-27`
(strict foundation dependency → Later) exists. Your III.3 pin 3 says the remaining discretion is "how
many items Now can carry, gate-dependency → Next", and that it is small enough to be a counted rule set.
I need those two rules stated as counted predicates and I will render placement deterministically, the
same way A18 renders anchors. **R6 does not close without it** — and R6 is the regression that un-fixed
itself, so its "pass" in v1.1 was a draw.

**4.2 — Item 4's scope ruling.** A19 freezes what I judged safe (§3). Two questions are yours:
(a) should `product` be frozen, or left derived from I×F×A so the arithmetic auto-patch stays the single
authority? (b) should a *cited* deviation be permitted at rung C the way A9 permits one against an
archetype row, routing to an Override Register — or is a run-local freeze absolute?

**4.3 — Do not withdraw the (Now+Next) pin** until it is re-tested (§2.1).

§5 — Limitations
----------------

1. **Nothing in v37.6 has faced a batch.** All `[C]`, none `[P]`-on-artifact.
2. **`€1,486,200` → `1486` is unreproduced.** I fixed the tokenisation failure I *could* characterise —
   the enumerator case (`1. Revenue Summary` → `revenue=1`), which is the one your A17b quote shows
   producing `revenue 1 − costs 84,000`. I could not reproduce the comma-group truncation from the
   description alone; the parser handles `€1,486,200` correctly in isolation. **If it recurs, I need the
   artifact line verbatim** — it is likely a separator or invisible character the extraction introduced.
3. **A19 is new BLOCKER surface on both cases**, and it fires on the exact surfaces LunaCart drifts on.
   Expect it to be noisy on the first pair and read the count as coverage arriving, not quality falling —
   your C1 correlation, now with a name.
4. **Pin 2 edits the Stage-1 artifact.** It is byte-identical when the marker already agrees, and the
   authored values survive in `correction_log.json`, but the dossier a grader reads is now the rendered one.
5. **The A16c over-capture fail-safe suspends the check** when the scrape returns more than half the
   library. That is deliberate — one diagnostic beats thirteen BLOCKERs — but it means a genuine mass
   exclusion would go unverified. It says so when it fires.
6. **Rung D is not implemented** (§3).

§6 — What would falsify this release
------------------------------------

- **A15/A17/A18/B3 still fire on the confirmation pair.** Then the shared layer addressed the forms we
  observed rather than the class, and your Law 1 predicts the next surface variant rather than the fix.
- **A19 fires on Meridian.** Meridian copies from a library, so its Stage-3 output should match its
  Stage-1 freeze exactly. A19 firing there means the freeze extraction is wrong, not the model.
- **Pin 2's rendered coverage disagrees with your hand enumeration.** You pinned LunaCart at 0.33 and A11
  confirmed it from the runs' own tables. If the rendered value differs on the confirmation batch, the
  table parse is wrong and the marker is now confidently wrong instead of visibly wrong — strictly worse
  than before, and the one outcome that would justify reverting pin 2.
- **The (Now+Next) pin still fails with all three openers known.** Then it was wrong after all and your
  I4 stands as written.

*End of note. v37.6 · engineering side complete: items 1, 2, 3, 5, 7 + pin 1 + R5. 425 tests. Three
corrections returned: the anchor pin is probably unreachable rather than wrong; I1's obvious fix would
have been a second bug of the same class; the exact-match class fails toward silence as well as noise.
Blocked on your spec for item 6 only. Ready for the confirmation pair.*
