Release Note — v37.10 · the sixteen-batch six, and a corrected attribution
=========================================================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-08-06**
From: engineering (Viktor's seat). To: **Ivan Montin** · Founder/CEO (Steven).
Responds to: **Sixteen-Batch Cross-Era Report** and **Decision Scorecard v1** (both 2026-08-06).

Build identity: pipeline label **v37.10**, parent **v37.9 `sha=2300edd4`**.
**564 tests across 19 suites; typecheck and build clean.**

> **All six items are done, plus a seventh you did not file.** And the report's central attribution is
> **wrong in a way that inverts Law 4**: item 5 produces a **byte-identical** phase map on the Meridian
> golden — same order, same phases, the pinned 3/2/3 — despite Meridian carrying two dated deadlines. The
> restructure is a no-op on the case that regressed. The regression is **item 2**, a predicate widening.
> Separately, the "malformed Now block" has **two** causes and only one is v37.9's: the other has been in
> `stripOperatorPreamble` since before v37.4. Both findings move numbers on the scorecard, so §1 and §2
> lead with the evidence rather than the conclusion.

---

§1 — Item 5 did not do this, and I can show it
----------------------------------------------

The report makes item 5 the era's defining event: EH 1.35, 47% of Meridian's harm, the streak's end, and
the founding evidence for **Law 4** ("risk class = control-flow footprint") on the reading that *four
predicates held and the one restructure regressed*. I checked before fixing, because the fix follows the
attribution.

**Meridian carries two dated deadlines** — `H-RT-07` and `H-RT-04`, both `system_event_deadline=2026-07-31`
— so the premise holds: item 5 was live on this case. Then:

```
v37.8 order:  h-rt-02:Now h-rt-03:Next h-rt-05:Now h-rt-01:Later h-rt-07:Now h-rt-04:Later h-core-00:Later h-rt-10:Next
v37.9 order:  h-rt-02:Now h-rt-03:Next h-rt-05:Now h-rt-01:Later h-rt-07:Now h-rt-04:Later h-core-00:Later h-rt-10:Next
                                                  ORDER IDENTICAL · PHASES IDENTICAL · 3/2/3
```

This is asserted in `sixteenBatchFixes.test.ts` against a **verbatim transcription of the v37.8 single
pass**, over inputs read from the golden's own score comments so neither side can drift.

**Why it looked live.** `H-RT-07` (I3×F4 = 12) does rank below three Quick Wins, which is exactly the
ordering hazard item 5 was written for. But only **two** of those three reach Now — `H-RT-03` goes to Next
on **P2** (`d_gate4=yes`), not on P1 — so the cap is never reached and the two evaluation orders coincide.
Item 5 fixes a real defect that Meridian does not exhibit.

**Three consequences, all on the scorecard rather than in the narrative.**

1. **Law 4's founding evidence is inverted.** The era's regression came from a *predicate/vocabulary*
   change (item 2) and the *restructure* was inert. I would not withdraw Law 4 — "control-flow changes get
   a golden regression run" is good practice on its own terms — but it now has **zero** supports, not two,
   and I'd argue the true lesson of this era is the opposite and sharper: **a vocabulary fix is riskier
   than a restructure when its vocabulary overlaps client content**, because a restructure's blast radius
   is visible in the diff and a widened word list's is not.
2. **`I.4 rule 3` should be restated.** "Predicate fixes ship on tests; control-flow fixes ship on a
   regression pair" reads the era backwards. What actually distinguished the safe four from the unsafe one
   is whether the change could touch **client-facing text**. Items 1, 3, 4 and 5 alter guards and figures;
   item 2 alters the deliverable itself. That is the line I would draw.
3. **The `S4 Con 50 → 40 ↓↓` attribution class changes** from `INSTR-REGRESSION (control-flow)` to
   `INSTR-REGRESSION (deliverable-text vocabulary)` — same direction, same magnitude, different cause, and
   the difference determines what the next release is careful about.

§2 — The "malformed Now block" has TWO causes, and the older one is not ours
----------------------------------------------------------------------------

Item 2's over-reach is real and I own it (§3). But while pinning a whole roadmap section as a regression
test, the section came back with a line missing that item 2 does not touch — and the cause is worse.

`stripOperatorPreamble` carried `/m` on both of its patterns, which makes `^` match the start of **any
line**. Its bullet alternative is `\*[^\n]*\n` — *any line beginning with `*`*. In a markdown deliverable
that means:

```
**H-RT-07 — Compliance register automation**      a bold opportunity heading
*Why now:* the ISO audit lands in July.           the A18 anchor line
* Returns are reconciled by hand each Friday.     an ordinary findings bullet
```

Any run of two or more such lines was deleted **from wherever it appeared in the document**. Verified on
three shapes: a roadmap card (heading + anchor, both deleted), a Phase-2 card (heading + two anchors,
heading and first anchor deleted), and a findings bullet list (both bullets deleted).

**This is present since before v37.4 and it deletes the exact line A18 then flags as absent.** The
function's own comment claimed the bullet block is stripped "if it appears before any `# ` heading" — it
never checked that. Anchoring to the start of text makes the claim true by construction instead of by
intention, which is the shape this codebase keeps relearning: a bounded strip is bounded by its anchor, not
by its author's belief.

**The consequence for the scorecard is specific.** §2's gate counts **release-attributable new register
entries**, and a dirty v37.10 drops the programme to single-fix releases. The malformed-Now-block entry is
**partly pre-existing** — one of its two causes predates v37.9 by six releases — so I would price it as one
attributable entry (item 2) plus one **standing** instrument entry (the preamble strip), not two
attributable ones. I am not asking for a favourable reading; I am asking that the pre-existing half not be
counted against v37.9's release, because doing so would make the wheel-exit metric measure the wrong thing.

§3 — Item 2: closed vocabulary was necessary and never sufficient
-----------------------------------------------------------------

The v37.9 justification is in the code and it is where the error is visible:

> *"No client-facing section ever contains 'produce Chunk 1' or 'emit Checkpoint 2' — a production VERB
> applied to a numbered PIPELINE UNIT is machine narration wherever it appears."*

True for `Chunk` and `Checkpoint`. I then applied it to `Section|Stage|Step`, for which it is false — **a
roadmap is precisely the document where a client's own work is described in stages and steps**. Six of
eight representative roadmap sentences were destroyed:

| sentence | v37.9 |
|---|---|
| `*Why now:* Complete Step 1 before the July compliance date.` | **line destroyed** |
| `The team should complete Stage 2 of the migration…` | **line destroyed** |
| `Deliver Step 1 by March so the pilot can begin.` | **line destroyed** |
| `Work begins Step 3 in Q2 once the warehouse feed is live.` | **line destroyed** |
| `This starts Stage 1 of a three-stage consolidation.` | **line destroyed** |
| `Their SOP requires Step 2 now that the ISO audit is scheduled.` | **line destroyed** |

The rule a phrase-anywhere vocabulary has to satisfy is not *closed* but **DISJOINT FROM CLIENT CONTENT**.
Closed was always necessary and never sufficient — a finite list of ordinary English words is still
ordinary English. Position-free matching is now restricted to units that exist only inside this pipeline,
and `Section|Stage|Step` keep the `^`-anchored whole-line patterns they had for the eight batches before
v37.9 widened them. **Admission test for adding a word: show that no client-facing sentence can contain
it.** That is why the list is two words long.

**The trade is stated rather than hidden.** `- Margin held at 4.2%. Emitting Section 3 next.` is genuine
narration and is now **out of reach**; it is pinned as an inverted assertion with the reason attached, so
nobody reads the narrowing as an oversight later.

**And the real lesson is the assertion, not the pattern.** v37.9's negative tests were the cases I thought
of — which is Class F one layer down: the pattern was tested, the *property* was not. The property is
"`stripForDelivery` is the identity on ordinary client prose", and it now has a corpus:

- **`CLIENT_PROSE`** — 14 sentences, every strip asserted against all of them.
- **`CLIENT_SECTIONS`** — 4 multi-line blocks, because a **line** corpus cannot catch a **positional**
  defect. Every line of the preamble bug survived alone; the *pair* did not.

§4 — S4-UNIQ: the question was unaskable, and that is not a v37.9 regression
----------------------------------------------------------------------------

The report says "NO guard fired" and treats that as part of the v37.9 event. The reason nothing fired is
older and structural:

```ts
export function emittedPlacement(roadmap: string): Map<string, Phase> { … }   // keyed by id
if (!out.has(id)) out.set(id, current);                                       // first occurrence wins
```

An opportunity emitted in two phases **collapsed to its first occurrence**, so the phase comparison
*agreed* and reported nothing. This has been the reader's shape since the P-rules were written. Class F in
its purest form: the data structure made the question unaskable, so no amount of reviewing the guard would
have found it.

Two design points worth your countersign:

- **Occurrences are now primary and the Map is derived from them,** so the two readings can never drift
  apart again. A guard built by extending the divergence check would still have missed this — pinned as a
  test: with a duplicate present, `divergences` is `[]` and S4-UNIQ is what fires.
- **S4-UNIQ runs BEFORE the advisory early-return.** A duplicate render is a defect whatever P1 and P2 are
  set to. Placing it after would have made the guard's reach depend on a pin the Practice owns.

Same-phase duplicates are reported separately and also block — not self-contradicting, but Phase 1's item
count is what P1 is read against, so a repeated row makes a compliant roadmap look over-committed.

§5 — Items 2, 3 and the seventh
--------------------------------

**Instance 23 (P-a aliases).** `resolveName` does **unique-prefix** resolution in the shared name layer:
`shopify` → `shopify plus` when that is the only candidate, and **refuses, naming both**, when it is not.
That answers A15's original objection to leading-token matching — which was right, and which is why the
v37.5a comment rejected it — without giving up resolution: ambiguity is reported, never guessed.

**My first cut of this was incomplete and the new suite caught it.** I routed P-a through the resolver and
left the core-membership filter one line below on `Set.has`, so the pair derived ACTIVE and was then
dropped — coverage still 0. Fixing one of two comparisons over the same pair of cells is not fixing the
boundary. Both now resolve, and dedupe runs on resolved names so `shopify↔postgres` and
`shopify plus↔postgres` are one pair.

**Instances 22 / 22b.** The v37.9 ladder split the *levels* and left the *selection* unasked — one boundary
each, exactly as Law 1 predicts for a comparator shipped without enumerating its boundary classes.

- **22 (component prefix)** — `*Other* Operating Expenses` is refused at **extraction**. It is a line item
  inside opex, so no arithmetic can correctly use it; same reason EBITDA carries no subtraction identity.
- **22b (segment qualifier)** — a segment row is de-prioritised at **selection** and still appears in the
  A17c table. Different times because they are different things: a segment figure is a legitimate claim, a
  component figure is not.

Both rules read the **label region**, not the whole line, so a qualifier in a later cell cannot disqualify
a correct row.

**P-b's annotation.** `enumMatches` takes the leading token — right for an annotated enum, but it means the
annotation is never read, so `scheduled (manual CSV drop)` declared P-b satisfied on the strength of a word
the author had already qualified away. Both directions now fail P-b. **The term lists deliberately exclude
format words**: `scheduled (nightly CSV export)` is automatic, and admitting `csv`/`export` as evidence of
human action would false-fire on the most ordinary automatic integration there is.

**The seventh, which you did not file: A18's missing-opener flag is now a BLOCKER.** A18 already detected a
block with no phase-opener line — the flag simply had no `BLOCKER:` prefix, so it fired and stopped
nothing. That *is* "shipping unflagged", and it is a one-token fix. The opener is not decoration: it is the
client's only statement of why an item sits in a phase, and it is where the locked-feasibility anchor
renders, so a block without one is missing the reasoning **and** the anchor.

§6 — The Class-F enumeration, as code
--------------------------------------

`utils/classFRegistry.ts`. **34 client-visible properties: 28 guarded, 4 reported, 2 honestly unguarded —
assurance coverage 0.82.**

**It is code and not a document on purpose.** A markdown enumeration is accurate the day it is written and
drifts silently after, which is the Class F failure mode itself. The v37.4 precedent is `SCAFFOLD_FORMS`:
a registry that also declares which chokepoint removes each form, so the audit can never be narrower than
the strips it audits — and two of the forms in it were found *by* the audit it enabled. So the enumeration
carries two invariants asserted in the suite:

1. **the registry may not claim a guard that does not run** (no described-but-absent assurance);
2. **nothing is unguarded silently** — every non-guarded entry states why and what would close it.

**The two `unguarded` entries are the interesting ones, and they are both cross-run:**

| property | why unguarded |
|---|---|
| `S2-band-reproducibility` | 52/52 observed, asserted nowhere. A 🟢(U) by your own I.4 rule 1. |
| `S4-phase-count-stability` | **This is what S4-DUP cost.** Five builds of 20/20 phase invariance were verified by Practice review, not by a guard. |

A per-run assertion **cannot** see a cross-run property — there is no single artifact to assert over — so
closing these is **harness** work (diff the derived maps across a pair), not pipeline work. I have listed
them as unguarded rather than quietly counting the observation as assurance, which is the distinction I
read §VI.3's 🟢(U) classification to be asking for.

`X-build-provenance` is `reported`: the label prints and a LABEL-ONLY run says so, but `sha=unset` is the
normal local state, so the stamp is a human tag rather than a verifiable anchor. That is the labelling/jobId
entry's fourth occurrence and it is **CI work** — I flag it as the one open item that engineering cannot
close from inside the pipeline.

§7 — Against the Decision Scorecard
------------------------------------

| Gate condition | Status after v37.10 |
|---|---|
| S4-DUP repaired **with S4-UNIQ firing on a synthetic duplicate** | **done** — cross-phase and same-phase, both BLOCKER, both pinned (§4) |
| P-a via shared normaliser · 22/22b · P-b annotation | **done** (§5) |
| Inventory completeness assertion (Class F #6) | **done** — A20b blocks; A20a reports + escalates (§8) |
| **Class-F enumeration delivered** | **done — 34 properties, 0.82 guarded, executable (§6)** |
| 0 release-attributable new register entries on one full pair | **not testable from here.** Needs the pair. |
| Meridian artifact ≥ 90 `[30/32]` · Luna ≥ 85 `[16/32]` | needs the pair |
| M2 rate metric live | **Ivan** |

**Engineering has nothing left on the v37.10 critical path.** The gate is now the pair plus TC3.

One note on the scorecard's own logic. §2 makes `v37.10 = clean release` turn on **0 release-attributable
new register entries**, and §1 makes `escape=none count` an overriding veto. Those two are in tension in a
specific way this era demonstrates: the **discovery** of a pre-existing Class F gap looks identical, in the
register, to the **introduction** of a new one. S4-UNIQ and A20b will both find things that were always
broken. I would ask that the wheel-exit metric count entries by **when the defect was introduced**, not by
when it was found — otherwise closing Class F is penalised exactly in proportion to how much it closes,
and the incentive points the wrong way.

§8 — The two spec questions I am NOT deciding
----------------------------------------------

**1. A20a — must the Record Classes table be exhaustive over declared classes?**

The Data grade (D4 Step 4) aggregates over the rows that **exist**. When the Core Systems table declares
`orders, products` and only `orders` has a row, `products` is **unrated, not Reliable** — the grade is
correct for what it covers and silent about what it does not, and nothing on the face of the artifact
distinguishes the two.

I wrote this as a BLOCKER first and then took it back down, because **the contract does not carry the rule**:
A15 requires only that every `Core?=yes` system name ≥1 class. Blocking would be legislating a rule the
spec lacks, on the golden case — the F13 error exactly. And the evidence says it is the norm, not an
anomaly: **every fixture in the repo has a subset**, which is also why it reports **one fraction** rather
than one flag per class. Per-class flags at that volume train the reviewer to skip the check, which is the
GATE-4 failure mode this whole guard layer exists to avoid.

**Ruling needed.** If exhaustive: A20a becomes a BLOCKER (a one-line change) and the goldens gain rows.

**2. LunaCart coverage — still not re-pinned, and the pin moved again.**

The appendix now reads **"coverage 0.83 by N4 over the full five-pair inventory (fixture +3 rows; P-a alias
fix pending makes the derived value trustworthy)"**. Two things follow:

- **The P-a fix is now landed**, so the derived value is trustworthy as of v37.10. That precondition is met.
- **I still do not hold the three rows.** The fixture has 5 integration rows deriving 2 active pairs of 6
  (0.33). 0.83 needs **5** active pairs, so the +3 rows must be three *new* pairs — with mechanism, status
  and confidence — and adding them means writing client facts I do not have.

I would also note the pin has now moved **0.33 → 0.67 → 0.83 across three reports**, which is itself a
reason not to write it into a golden fixture yet: a golden that tracks a moving figure is not a pin. Send me
the three rows (or a ruling that the fixture's rows are authoritative and the appendix figure is withdrawn)
and it is a five-minute change. Until then the fixture stays at 0.33 and the test keeps asserting it, so the
staleness is **visible** rather than papered over.

§9 — Limitations
----------------

1. **Nothing in v37.10 has faced a batch.** All `[C]`.
2. **A18's new BLOCKER will fire on any historically-malformed block.** It is a severity change on an
   existing detector, so if the pair comes back with new A18 BLOCKERs, those are the blocks that were
   shipping malformed all along — not a new defect. Read them as backlog surfacing, and check §2's cause
   first: the preamble strip was *deleting* the line A18 asks for.
3. **The segment rule's residual is a segment named without a qualifier word.** "Retail gross margin" with
   no `segment`/`division`/`region` token cannot be caught by closed vocabulary. The fallback is
   least-qualified-label-wins, which is a heuristic and is labelled as one in the code.
4. **`CLIENT_PROSE` and `CLIENT_SECTIONS` are 18 fixtures, not a proof.** They are the shapes two real
   regressions took. Every future strip must pass them, which is a floor rather than a guarantee — the
   honest statement is that the corpus grows by one entry per incident.
5. **A20b tolerates product-tier short forms** because every other cross-table check now does. If a client
   genuinely runs both `shopify` and `shopify plus` as distinct systems, A20b will accept a reference to
   `shopify` — and the ambiguity path in `resolveName` is what catches that, so the two rules have to be
   read together.
6. **Assurance coverage 0.82 is a count of properties, not a weighting.** All 34 are counted equally;
   `S4-one-phase-per-item` and `X-build-provenance` are not equally consequential. If you want it weighted,
   ADR-002's severity tiers are the natural weights and I can apply them — I did not want to invent a
   weighting scheme inside a metric the Practice will read.

§10 — What would falsify this release
--------------------------------------

- **S4-UNIQ never fires on the pair.** §4 says the duplicate was invisible, not rare (1/4 runs). If four
  runs produce no duplicate at all, either the emission changed for another reason or `emittedOccurrences`
  is not reading the roadmap's structural rows the way the model writes them.
- **New A18 BLOCKERs on Meridian's golden.** §9.2 predicts these are backlog, not regression — but if they
  appear on a block whose opener is visibly present in the raw Stage-4 output, then something in the pipe is
  still deleting it and §2 found only two of three causes.
- **S1 Contract falls.** Three releases have now widened this strip and the fourth **narrowed** it. If S1
  Contract drops back to 60, the narrowing cost more than the over-reach did, and the noun-set split is the
  thing to revisit.
- **Coverage still varies across Luna's runs.** §5 says instance 23 was the cause. If it persists, the
  variance is in the emitted inventory rather than in the comparison, which is a model finding.
- **Assurance coverage rises while artifact score falls.** The Class-F analogue of §VI.3's rule: adding
  registry entries that are all already guarded would flatter the number without adding assurance. The
  check is that `unguarded` never reaches zero by deletion.

§11 — Sequence status
----------------------

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Item-5 duplicate path + **S4-UNIQ** | engineering | **done — and item 5 was NOT the cause (§1, §4)** |
| 2 | P-a alias · 22/22b · P-b annotation | engineering | **done — P-a's first cut was incomplete (§5)** |
| 3 | Inventory completeness assertion | engineering | **done — A20b blocks, A20a escalates (§8.1)** |
| 4 | **Class-F enumeration** | joint | **done from our side — 34 properties, 0.82 (§6)** |
| — | v37.9 item-2 regression | engineering | **done — the actual S4 cause (§3)** |
| — | `stripOperatorPreamble` `/m` | engineering | **done — older second cause, pre-v37.4 (§2)** |
| — | A18 missing-opener → BLOCKER | engineering | **done — not filed, one token (§5)** |
| 5 | M2 counted-rule spec | **Ivan** | open |
| 6 | Re-run pair on v37.10 + **TC3** | joint | **cleared to run** |
| 7 | TC4 (rung-D gate + pack audit) | Ivan | after 6 |
| — | A20a exhaustiveness ruling | **Practice** | **open — blocks nothing, changes one line** |
| — | LunaCart coverage re-pin | **Ivan** | **blocked on the three rows (§8.2)** |
| — | `sha=unset` / build provenance | **CI** | open — engineering cannot close from inside the pipeline |

*End of note. v37.10 · six items, four findings. Item 5 is a byte-identical no-op on the case it was blamed
for, so Law 4's founding evidence is inverted — the era's real lesson is that a vocabulary fix is riskier
than a restructure when its vocabulary overlaps client content. The "malformed Now block" has two causes and
the older one predates v37.9 by six releases. S4-DUP went undetected because the reader was a Map keyed by
id — Class F in its purest form, unassertable rather than unasserted. Class-F enumeration shipped as code
with two executable invariants: 34 properties, 28 guarded, 2 honestly unguarded, both cross-run and both
harness work. 564 tests.*
