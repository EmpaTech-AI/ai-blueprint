Justification Report — v37.5 (A17a entity identity · string-comparison sweep · A16c · B3 routing · A18 anchor render · golden pin)
=================================================================================================================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-08-03**
Author: engineering (Viktor's seat). Audience: the consultant review team (Ivan) · Founder/CEO (Steven).
Responds to: **LunaCart v1.1 — Amended Verdict with Reviewer Panels** (2026-08-03) and the
**Six-Batch Comparison Report & Next Steps** (2026-08-03).

Provenance: `[P]` proven from source/artifact · `[C]` implemented, committed & deployed, awaiting the
confirmation batch · `[X]` awaiting a batch · `[A]` authorial, ratified by the Practice.

Build identity: pipeline label **v37.5** (bumped from v37.4 in `backend/package.json`). Parent build
is **v37.4 `sha=84b30295e1b73fa09c92d68c9bd65d8b0abfb085`** — the build the v1.1 batch ran on. The SHA
is the anchor; the label is a human tag. `dist/skills` is rebuilt from source by the deploy, so all
skill changes below are live. **379 tests across 13 suites, typecheck and build clean.**

**Companion document:** `2026-08-03_v37_5_Grading_Impact_Notice.md` — three pillar metrics change
MEANING in this release. Read it before scoring the next batch or the six-batch table will silently
stop being comparable.

---

§0 — One-paragraph summary
--------------------------

The v1.1 batch is the first unambiguously good result in the programme: **88%, equal to Meridian v38,
on a case with no ACTIVE archetype, with impact-weighted harm 1.86 against v38's 2.99** — and, more
importantly than the score, a *distributed and observed* risk profile (largest item 24%) where v38's
was *concentrated and invisible* (75% in one undetected defect). v37.5 closes the two instrument-side
items that blocked crediting it, and then goes past them: rather than demote A17a to advisory
(Practice item 1, ~15 min) we fixed the entity typing outright (item 7), so A17a stays a BLOCKER. The
string-comparison audit the Practice asked for (item 4) found the same exact-match defect in **four
more places than the two known**, one of which fails in the direction that reports clean. B3 is fixed
by **routing** after six batches of failed instruction, and the S4 anchor count by **rendering** after
six batches of failed self-check — both because the artifacts in question are internal grading
surfaces, not client content, which nobody had stated. **Every change in this release was diagnosed on
LunaCart. Meridian has not run since v38, two releases ago, and that is now the single highest-value
run available (§7).**

§1 — What we corrected in the verdict before fixing
---------------------------------------------------

**1.1 — The §2.1 row-1 firing was correct; the band quoted was not.** `[P]`

The amended verdict's first A17a row reads *"`revenue: 2,000,000–10,000,000 (form:revenue_range) vs
8,247,600` — 8,247,600 is inside 2M–10M. The comparator is wrong, not the pack."*

Reproducing it against source: the band actually in play was LunaCart's `revenue_range` of **€5M–€8M**,
which 8,247,600 genuinely exceeds. The flag was right. The `2,000,000–10,000,000` band belongs to a
different firing in the same compressed table. We hit the identical mistake while writing the
regression test for this row — the fixture inherited the €5M–€8M band and the test failed for the same
reason the report did — which is how it was found.

This is now pinned: a test asserts that a document figure **inside** the declared band never fires,
across four values including 8,247,600. So the claim cannot become true later either.

**Everything else in §2.1 is confirmed and was the real defect** (§2.1 below). We report this because
one wrong row in an otherwise correct diagnosis is worth separating out — the entity-mismatch cluster
was real, and the fix would have been built regardless.

**1.2 — On the two withdrawn findings.** `[P]`

The verdict withdraws its earlier claims that `[DATA_INVENTORY]` emitted in 1 of 4 runs and that A17
was unobservable. Confirmed withdrawn correctly: the panels show A11/A14/A15 firing with per-row table
content in all four runs, which is impossible without the block, and A17 extracted 45 numeric claims
per run. Nothing in this release treats either as an open item.

One engineering note on the mechanism, because it has a code counterpart: the verdict's rule —
*"verify an artifact's presence through its consumers, not through its label"* — is exactly why A11–A15
were built to recompute from the tables rather than to check that a block exists. The failure mode it
names is the one the design already avoids, and it is worth stating that the same discipline now has a
third instance in this codebase (§2.5).

§2 — What shipped
-----------------

**2.1 — A17a entity identity (Practice item 7, done instead of item 1)** `[C]`

The Practice's action list has two options: demote A17a to advisory (~15 min, item 1, the gate on TC3)
or fix the entity typing (~2 h, item 7, restores it to BLOCKER). **We did item 7.** A demotion is a
correct stopgap but it leaves a real assertion switched off, and the fix was well specified.

Root cause was broader than "typing too loose": **any numeric range mined from any form answer became
an authoritative band** the moment its line happened to carry a metric label. That admitted every
firing the verdict listed —

| Admitted as a revenue/headcount band | Actually |
|---|---|
| `2,840–5,000` from `top_priorities` | a LunaBox subscriber count |
| `15–20` from `pain_point_4` | an industry benchmark percentage |
| `18,000,000–22,000,000` from `growth_targets` | a growth target, not current revenue |
| `156,000` from `sales_pipeline` vs `company_size` | a currency figure, not a headcount |
| `58.2` vs a revenue band | a percentage |

Two fixes, both the shape the Practice recommended (match on set membership, not a numeric type guess):

- **`isDeclaredBand`** — only the declared form metric fields (`revenue_range`, `company_size`,
  `departments`, `budget_range`) establish a band. Prose-mined ranges still feed A17c advisory; they
  never gate. This also closes the projection leak on the **form** side, which the verdict noted the
  existing exclusion had missed: `growth_targets` is a projection by field semantics, and it is no
  longer a band source at all.
- **Quantity-kind checking** — `parseQuantity` now returns *how the number was written*
  (`currency` / `percent` / `plain`), and a metric rejects a quantity of the wrong kind. A percentage
  never satisfies `revenue`; a currency figure never satisfies `headcount`.

**A17b is untouched and remains a BLOCKER**, per the verdict's assessment that it is clean. It caught
the profitability arithmetic in all four runs, which is the F12 prediction confirmed.

**2.2 — The string-comparison sweep (Practice item 4)** `[C]` `[P]`

The Practice identifies this as the dominant failure class at its seventh instance and asks for a
one-pass audit rather than four more patches. Agreed and done — one shared normaliser,
`backend/src/utils/enumNormalise.ts`. **The audit found the same defect in four more places than the
two known:**

| Guard | Would break on | Direction of failure |
|---|---|---|
| A14 mechanism/status | `scheduled (celigo connector)` | false BLOCKER — the Practice's finding |
| A13 rating | `Degraded (siloed, 2/5)` | false BLOCKER |
| A12 severity | `Critical systemic` — no parentheses | false BLOCKER |
| **A4 flag firing** | `yes (documented p.4)` | **under-counts firing flags → logs a FALSE AGREEMENT** |
| **A9 flag equality** | archetype `yes` vs emitted `yes (client confirmed)` | routes a non-deviation to the Override Register as a BLOCKER |

**The A4 row is the one that matters most and it should be added to the Practice's §6 table.** Every
other instance of this class produces a false *fire* — noisy, but visible. A4's produced a false
*pass*: an annotated flag value would not fire, the recompute would under-count by one, and the guard
would log `agreed: true` on a card whose feasibility was wrong. **This class does not only cry wolf; it
can also report clean.** That reframes the sweep from noise reduction to a correctness fix.

Also fixed in the same pass, found while testing: the marker parser's `[^\s]+` truncated every
multi-word value, so `governance_owner=Head of Data (M. Lindqvist)` parsed as `"Head"` — G1's presence
check still passed while losing the name the check exists to capture.

One consequence worth recording: normalising lowercases, which made A12's C1 record compare `high`
against `High` and log `agreed: false` on a correct run. Both sides of the record are now normalised
with the raw marker value preserved in `rootInputs`. **A record whose agreement disagrees with its own
flag would corrupt the R1 residual rate read from that log** — caught by the existing test suite, not
by inspection.

**2.3 — A16c exclusion provenance (Practice item 5)** `[C]`

A16 asserts an exclusion is *authorised* by PP-0's severity; A16c asserts it has a *root*.
`band1_pool` is an archetype column, so an exclusion is only verifiable against the archetype's
**CORE-columns** table — not the Hypothesis Library, which the two closely resemble.

| Case | Verdict |
|---|---|
| archetype row says `band1_pool=no` | authorised and rooted — clean |
| row says `yes`, or the ID is absent | the exclusion contradicts or lacks its root — **BLOCKER** |
| no archetype resolved, exclusions present | **BLOCKER** |

The third row deserves its reasoning stated, because it differs from how A4/A9 treat the same
unavailability. A4/A9 are `⚠` when no archetype resolves, because they are *inert* — they check
something and report that they could not. An exclusion **changed the output**: it silently removed a
real opportunity from the client's deliverable. Unverifiable-and-inert is a warning;
unverifiable-and-acted-upon is not. LunaCart v1 T4 did exactly this.

**Verified against the real `recruitment.md`, not a fixture:** `h-rt-08` and `h-rt-09` both carry
`band1_pool=no`, so Meridian's two legitimate exclusions pass clean. This mattered — a parser failure
here would make the Meridian regression batch (§7) read as a catastrophe. Building it also caught our
own defect: an all-cells enum check silently dropped **H-CORE-00**, whose row is `n/a | n/a | yes` and
where `n/a` normalises to `"n"`. The discriminator was narrowed to the `band1_pool` cell alone.

**2.4 — B3 fixed by routing, after six batches (Practice item 6)** `[C]` `[P]`

**The cause is not carelessness, and that is why instruction never fixed it.** The opportunities SKILL
instructs the model *using* the identifiers — *"Membership-equality check (REG-21 — mandatory, run
before emitting output)"* — so when the model confirms it ran a check it cites the identifier it was
given. That confirmation is legitimate, useful run-record content. It simply had **no channel of its
own**, so it landed in the deliverable.

The fix is routing, not scrubbing: a `## [SELF_AUDIT]` block in the Stage-3 contract, stripped on every
delivery path exactly as `[JUSTIFICATION]` and `[CONFIDENCE_PROPAGATION]` are. Rule identifiers are
permitted **only** there; card prose states the business reason instead — *"placed in Later because it
depends on the data foundation completing first"* rather than *"per T-27."*

Plus a narrow strip for **parenthetical** citations in prose (`(T-27)`, `(per REG-22 / WL-14)`) — a
closed form. A **bare** token in running prose is deliberately left to the detector: that is a real
leak, and a blanket identifier strip could eat client content. Verified untouched: `ISO-27001`,
`GPT-4`, `Q-3`.

**And the finding that probably explains six batches of survival:** the detector had never named what
it found. For six batches the flag read only *"internal engineering identifier (S-36 / WL-14)"* — no
token, no line. **B3 was a defect report with no locus.** It now quotes the match and its line:

```
BLOCKER: Stage 3 residual scaffold (internal engineering identifier (S-36 / WL-14)) survived
delivery strip — found "REG-21" in: "The roadmap sequences returns first per REG-21 ordering."
```

A one-line edit for whoever picks it up, versus a hunt through 4,000 words. We would generalise this:
**a detector that reports a class without a locus is barely better than no detector**, and it is worth
auditing the other never-ship flags for the same gap.

**2.5 — A18: S4 anchors rendered, not instructed (Practice item 12)** `[C]` `[P]`

Six batches unstable — 4/5/5/5, then 5/6/9/8, then 5/3/8/9 — against a pin of exactly (Now + Next).

**The fact that settles it, which no report has stated: `stripConfidenceTags` removes every
`[Archetype-Anchored …]` tag on the delivery path. The anchor never reaches a client document.** Six
batches were spent instructing the model to precisely count occurrences of a token that is deleted
before anyone outside the Practice sees it. It is a *grading assertion*, not client prose — so the app
is the right place to assert it, and rendering it writes to an internal-only surface. That also
disposes of the obvious objection to an app authoring deliverable text: it isn't deliverable text.

`renderPhaseAnchors`, per Now/Next block: insert if zero, keep-first if duplicated, correct a mis-cited
`Feasibility n/5` to the locked Stage-1 score, remove from Later/Bridge. It attaches the tag to an
existing score citation rather than restating it. Runs **before** the Stage-4 validators so they grade
the rendered document. All four historic count shapes (0, 1, 3, 4 authored) converge on the correct
total, by test.

**Two places it fails loud rather than guessing:** a block with no *Why now* line, and a block citing
no ID resolvable to a locked score. Both are reported malformed with the anchor un-rendered. Writing
into arbitrary prose to make a count come out right is a worse failure than an honest structural flag —
the same reasoning as the GATE-4 delimitation split in v37.4.

**The raw rate stays measurable.** A18 records merge into the single `correction_log.json`, because R1
is read from that one file. The artifact is corrected *and* a grader can still see that the model
authored 0 anchors where 2 were required. This is the acceptance/production split that already governs
the arithmetic auto-patch, applied to a count.

The roadmap SKILL now says the opposite of what it said: the model is **explicitly no longer asked to
count**, and is told the three things the app cannot do for it — write the *Why now* line, cite the
canonical ID, and state the Stage-1 score if it states one at all.

**2.6 — LunaCart pinned as the permanent archetype-free golden (Practice item 9)** `[C]` `[A]`

`fixtures/lunacart_archetype_free_golden.md` pins n_core 7, coverage 0.33, PP-0 High, Data Early,
Band 1, zero exclusions, and the expected per-family `UNAVAILABLE` states for A4/A9 — **this is the
only case in the kit that exercises the honest-unavailability path, and the only proof that A11–A17
are archetype-independent.**

**The deliverable is the guard, not the document.** A fixture cannot stop anyone building `retail.md`.
`archetypeFreeGolden.test.ts` fails if any ACTIVE archetype claims retail/e-commerce/DTC, if every
industry in `INDEX.md` becomes ACTIVE, or if any archetype file starts carrying `H-LC-*` IDs — and the
failure message names the fixture and the reason. Building `retail.md` as PENDING VALIDATION is
explicitly permitted and tested; making it **ACTIVE** is the hazard.

Two deliberate details. The fixture keeps the **annotated** cell forms the v1.1 runs actually emitted
(`scheduled (daily)`, `Degraded (siloed)`), so it regression-tests the §2.2 normalisation sweep and not
only the arithmetic. And three tests assert the guard *bites* against synthetic INDEX rows — per the
standing rule adopted in v37.4, a guard whose firing path is untested is indistinguishable from a
broken one, and this project has hit that three times.

§3 — Findings returned to the Practice
--------------------------------------

| # | Finding | Status |
|---|---|---|
| 1 | §2.1 row 1 was a misread — the band in play was €5M–€8M, which 8,247,600 does exceed | correction; pinned by test |
| 2 | The exact-match class can produce a false **PASS**, not only a false fire — A4's flag firing would under-count and log `agreed: true` | **new; belongs in the §6 table** |
| 3 | Two further instances beyond A14/A17a: A13 rating, A12 severity | fixed in the sweep |
| 4 | The engineering-ID detector never named its match or line — B3 was unadjudicable for six batches | fixed; recommend auditing other flags for the same gap |
| 5 | The S4 anchor is **stripped before delivery** — six batches of counting a tag no client sees | fixed by rendering |
| 6 | The marker parser truncated every multi-word value (`governance_owner`) | fixed |
| 7 | An all-cells enum check silently dropped H-CORE-00 (`n/a` → `"n"`) | fixed while building A16c |
| 8 | A16c's third case must be a BLOCKER, not a `⚠`, because the exclusion changed the output | implemented; reasoning in §2.3 |

§4 — Evidence
-------------

| Suite | Covers |
|---|---|
| `financialReconciliation.test.ts` (35) | A17a entity identity — every verdict firing, now silent · quantity-kind checks · inside-band never fires (§1.1) · **12 false-positive tests** |
| `inventoryGuards.test.ts` (63) | `normaliseEnumCell` against every annotated form · A14 accepts `scheduled (celigo connector)` and still rejects `manual` · A16c all three provenance outcomes · multi-word marker values |
| `anchorRender.test.ts` (12) | A18 insert / dedup / value-correct / Later-removal · all four historic count shapes converge · fail-loud on malformed blocks · **the rendered anchor is stripped before delivery** |
| `archetypeFreeGolden.test.ts` (12) | The golden guard, plus three tests proving it BITES against synthetic INDEX rows · the pinned LunaCart values recompute from the fixture file |
| `confidenceScorer.scaffold.test.ts` (31) | `[SELF_AUDIT]` routing · parenthetical citations removed, bare tokens left to the detector · client content untouched · detector quotes match + line |
| `classGGuards.coverage.test.ts` (24) | `parseArchetypePoolFlags` against the **real** `recruitment.md` — Meridian's two exclusions root correctly |

**379 tests, 13 suites, all passing. `tsc --noEmit` clean. `npm run build` clean.**

§5 — Limitations, stated plainly
--------------------------------

1. **Everything here is `[C]`, not `[P]`-on-batch.** Nothing in v37.5 has faced a run.
2. **A18 changes what a metric means.** The S4 anchor count is now deterministic by construction, so it
   stops being a signal about the model. See the companion Grading Impact Notice — this is the item most
   likely to silently corrupt the six-batch table.
3. **A16c is new BLOCKER surface on the path Meridian uniquely exercises.** Meridian is the only case in
   the kit that records pool exclusions. The parser is tested against the real archetype file, but
   untested on a run.
4. **The B3 parenthetical strip touches prose.** It is a closed form and three client-shaped strings are
   tested untouched, but it is the first strip in this codebase that edits inside a sentence.
5. **A18 edits the Stage-4 artifact.** It writes to a delivery-stripped surface only, and is
   byte-identical on a conforming roadmap — but it is a correcting transform, not a validator.
6. **`manufacturing.md` has no CORE-columns table**, so an exclusion on a manufacturing run would
   A16c-BLOCKER as "ID absent". Correct behaviour (no root exists), and manufacturing is PENDING
   VALIDATION rather than ACTIVE, so it should not carry a client run — but it is a latent stop.
7. Unchanged from v37.4: the `_core.md` H-CORE-00 root is still unwired (`TODO(v37.5)` — the
   adjudication in §7.5 of the prior report stands), the FRICTION bound is unwritten, and the
   `SOUND + FRICTION` fifth fixture does not exist.

§6 — What v37.5 does NOT address
--------------------------------

Stated so the next verdict does not have to discover it:

- **S4 anchor count instability is fixed by construction, not by understanding.** We did not diagnose
  *why* the model's count drifted; we removed the model from the loop. If the underlying cause also
  affects something we have not rendered, it is still live.
- **`Quick Win in Phase 3: Later`** flags remain unadjudicated (Practice item 8). Real or false is
  currently unknown, and v37.5 does not touch that logic.
- **B3's bare-token case** is deliberately left to the detector rather than stripped. If a run leaks a
  bare identifier into card prose, delivery still stops. That is intended, and it means B3 can still
  fail — the routing removes the *systematic* cause, not every possible instance.
- **S4 anchor rendering does not fix S4 Contract broadly.** The Practice's S4 Contract pillar sat at
  40–45 across six batches; anchors are one input to it.

§7 — The gap that outranks everything above
-------------------------------------------

**Meridian has not run since v38, two releases ago.** `[X]`

The Practice's §7.1 names this and we want to endorse it in stronger terms, because it is our error more
than theirs: **every v37.4 and v37.5 change was diagnosed and validated on LunaCart.** We spent two
weeks establishing that the entire guard layer had been validated on one case, and then shipped two
releases validated on one case. The mirror image, built deliberately, by us.

Specific risks on the golden, ordered by our estimate of likelihood:

| Risk | Why |
|---|---|
| **A16c** fires on Meridian | Meridian is the ONLY case that records pool exclusions. Parser verified against the real file; untested on a run |
| **A18** changes Meridian's anchor count from its historic 5 | The count is now rendered. A different number is A18 working, not a regression — see the Grading Impact Notice |
| **A11** fires on Meridian's inventory marker | Meridian's `[DATA_INVENTORY]` is newly authored and has never been emitted by a live run |
| **B3 parenthetical strip** edits Meridian prose | First strip that edits inside a sentence; Meridian's rationales are the most citation-dense in the kit |
| **Declared-vs-unexpected coverage logic** | Tuned so Meridian's structurally-rootless H-CORE-00 does not trip the verdict. Untested since |

The pack, pins and expectations all exist, so it is also the cheapest run available. **We recommend it
before TC3, not after** — if v37.4/v37.5 traded golden-case quality for generalisation, the 88% parity
is bought rather than earned, and TC3 would be measuring against a broken instrument.

§8 — Sequence
-------------

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | A17a entity identity (restores it to BLOCKER) | engineering | **shipped v37.5** |
| 2 | A14 normalisation + the full string-comparison sweep | engineering | **shipped v37.5** |
| 3 | A16c exclusion provenance | engineering | **shipped v37.5** |
| 4 | B3 by routing + detector locus | engineering | **shipped v37.5** |
| 5 | A18 anchor render | engineering | **shipped v37.5** |
| 6 | LunaCart pinned archetype-free golden | engineering | **shipped v37.5** |
| 7 | **Meridian regression batch on v37.5** | joint | **open — highest value, run before TC3** |
| 8 | Re-pin coverage at 0.33 (A11 confirms it) | Ivan | open |
| 9 | Adjudicate `Quick Win in Phase 3: Later` against S4 | Ivan | open |
| 10 | FRICTION bound R1–R3, Nordwind profile closed | Ivan | open — redacted sheet issued 07-31 |
| 11 | 4th fixture: "disclosed and answered" (falsifies the bound) | Ivan authors | open |
| 12 | TC3 — VelocityFreight | joint | after 7 |
| 13 | S4 anchors: the remaining S4 Contract inputs | engineering | open |
| 14 | Nordwind input pack | engineering | after 10 |
| 15 | TC4 — GoldenBite (the refusal test) | joint | after 12 |

**The gate on TC3 is no longer A17a** — it is fixed rather than demoted, so the Practice's 75-minute
critical path is closed. The remaining gate is item 7.

§9 — What would falsify this work
---------------------------------

- **The Meridian regression batch returns worse than v38.** Then v37.4/v37.5 bought generalisation with
  golden-case quality and the 88% parity is not earned. One batch away; §7.
- **A16c fires on Meridian's legitimate exclusions.** Then the CORE-columns parser is wrong in a way the
  real-file test did not catch, and a correct run is blocked.
- **A18's rendered count differs from Now+Next on a real roadmap.** Then the phase-section or block
  parsing does not match the shapes a live run emits, and the metric is deterministic but wrong.
- **B3 still fires ×4 with bare tokens in card prose.** Then routing addressed the wrong half, and the
  identifiers are entering by a path the `[SELF_AUDIT]` channel does not drain.
- **A17a fires on VelocityFreight or GoldenBite.** The declared-band restriction was derived from
  LunaCart's form. If another pack's `revenue_range` or `company_size` is shaped differently, the
  narrowing may be too tight (missing real divergences) rather than too loose.

*End of report. v37.5 · A17a fixed rather than demoted, stays a BLOCKER · the exact-match class found in
four more places, one failing in the report-clean direction · B3 routed after six batches · S4 anchors
rendered after six batches · LunaCart pinned archetype-free with a guard that bites · 379 tests. The
Meridian regression batch outranks everything in this report.*
