Release Note — v37.8 · Sequence 1–6 complete, R6 closed, UCR instrumented
========================================================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-08-05**
From: engineering (Viktor's seat). To: **Ivan Montin** · Founder/CEO (Steven).
Responds to: **Twelve-Batch Cross-Era Report** (2026-08-05), including Part VI.

Build identity: pipeline label **v37.8**, parent **v37.7 `sha=d9437671`**.
**478 tests across 17 suites; typecheck and build clean.**

> **All six engineering items are done, and R6 closes.** Three findings go back with them: item 1 was not
> a dependency change, item 6 was not the layer you suspected, and one of my own fixes over-tightened in a
> way the existing tests caught. UCR is now computed per run rather than hand-estimated.

---

§1 — Item 1: not a dependency change. The root cause is four lines of pdf-parse.
-------------------------------------------------------------------------------

The register carried "table-aware extractor" as **BLOCKING** and framed it as a dependency change to be
scheduled. It is neither blocking on a dependency nor large. `pdf-parse` already accepts a `pagerender`
hook, and its **default renderer is the defect**:

```js
for (let item of textContent.items) {
  if (lastY == item.transform[5] || !lastY) { text += item.str; }      // ← no separator
  else                                      { text += '\n' + item.str; }
  lastY = item.transform[5];
}
```

It uses the Y coordinate to break lines and then concatenates every item on the same line with **nothing
between them**. That single omission is the whole of E1: the phantom €2.0B / €421B / €1.16T, every
remaining F12 false fire on both cases, and the corrupted corpus the model reads.

`parsers/layoutRenderer.ts` supplies a renderer that uses the **X coordinate and each item's width** —
both already provided by pdf.js — and inserts a boundary when the horizontal gap exceeds 1.2 em. That is
genuine position-aware extraction, with no new dependency and no new regression surface beyond the
renderer itself. `textRepair` stays as a second net for whatever the gap heuristic misses.

**Separator choice, stated because it affects the model as well as the parsers:** a tab, not ` | `. Both
are unambiguous to the guards, but the corpus is also read by the model, and injecting pipes would make
every extracted page look like a malformed markdown table. A tab reads as whitespace to the model and as
a hard boundary to the numeric parser.

**Consequence for the register:** E1 should move from "BLOCKING, dependency change, scheduled" to
"closed, pending batch confirmation". The 156/175 repair counts should fall sharply — and if they do not,
the gap threshold is wrong rather than the approach.

§2 — Item 6: the deterministic forks were my record semantics, not extraction
-----------------------------------------------------------------------------

A19d is listed as a suspected "flag-comparison/extraction defect", weighted as if model-side for its
false-silence potential, and bundled with item 1. It is neither. It is one line I wrote:

```ts
records.push(makeRecord('stage3', e.id, 'feasibility_vs_base', e.baseFeasibility, root.baseFeasibility, …))
```

`makeRecord` derives `agreed` from string equality, so recording *(emitted vs base)* marked **every
legitimately A4-adjusted card as a fork**. Meridian has exactly four cards with firing flags — so exactly
four forks appeared, every run, on every build. That is the deterministic signature, fully explained,
with no extraction involved.

The flag was always correct (it fired only on an increase); the **record** was lying, which is worse,
because the residual-rate metric is read from the log rather than the flags. The record now expresses the
assertion it actually makes — `feasibility_within_base`, where a reduction agrees and only an increase
forks.

**Two consequences for the register.** The V.0 uncertainty note ("if the investigation lands
instrument-side, Meridian drops to ~2.0 and Luna to ~1.7") resolves: the A19 rows were **neither model
nor instrument defect — they were a measurement artefact**, so both figures should come down and the
correction is an input change exactly as you pre-recorded. And item 6 detaches from item 1 entirely; it
did not need the extractor.

I'd also note this validates I.4 rule 3 while narrowing it: deterministic fork counts were correctly
diagnosed as *not model-side*, but "instrument-suspect" was one category too coarse — the third
possibility is that the metric itself is miscounting.

§3 — Instance 19: my repair created it, and that is Law 1 working
------------------------------------------------------------------

Confirmed exactly as the register describes. The thousands separator was `[,\s]`, which accepts a **plain
space**; once the E1 repair split `84,00078,000` into `84,000 78,000`, the parser re-joined them across
that space into 84,000,780,000. Fixing the layer below exposed the greedy assumption of the layer above —
your purest instance of Law 1, and I'd accept the framing without qualification.

Fixed as specified — no joins across plain whitespace — while **keeping** NBSP, narrow NBSP and thin space
as separators. Those are genuine European typographic thousands separators and, importantly, **a cell
boundary cannot produce them**, so honouring them costs nothing and preserves locale support.

§4 — Items 3, 4, 5
------------------

**Item 3 (keyword-line → structural row labels).** A metric is now identified by its row label: the first
cell of a table or tab-separated row, or a position adjacent to the figure in prose.

**This over-tightened on the first pass and the existing suite caught it.** My prose rule required the
label to *precede* the figure, which correctly rejects *"costs were €84,000, which is 1.3% of revenue"*
but also dropped **"12 employees"** and **"240 staff"** — where the metric word follows the number as its
**unit**, which is a perfectly ordinary label position. A metric word adjacent to the figure labels it; one
far from the figure is commentary. Both positions are now accepted, with the adjacency window bounded to
24 characters so the item-16 case still fails.

**Item 4 (app-side narration strip).** Law 3 accepted without reservation — `[SELF_AUDIT]` shipped as
"routing" and achieved **zero adoption in 8/8**, which is the definition of an instruction. The strip is
now app-side over a closed vocabulary of whole-line forms: receipts, input acknowledgements, checkpoint
and chunk narration, section-completion lines, short block-emission references, operator self-notes.

**One thing it deliberately does not do.** A block name embedded in a real sentence — *"the
DATA_INVENTORY shows four active integrations across the stack"* — is not stripped, because there is no
correct way to remove a noun from a clause and a bounded-word heuristic would eventually eat client
content. That case stays with the detector, which is honest about being author-discipline rather than
claiming a fix it cannot deliver. The bound is five trailing words: enough for every narration form
observed, short enough that the sentence above survives.

**Item 5 (P1=3 / P2=YES).** Landed; **P-rules now ENFORCING and R6 closes.** Worth recording that it
flipped on evidence rather than trust — the engine ran advisory for one era and matched the emitted
roadmap with zero divergence in 8/8 runs across both cases before gaining the power to block.

And per your I.4 rule 1: enforcing placement does **not** by itself close Luna's phase variance. The 8/8
match while phases still drifted locates the drift in the frozen Stage-1 inputs, so N4 is what closes it.
The module says so in its own header, so nobody reads R6-closed as phase-stable.

§5 — UCR: computed, not estimated
---------------------------------

§VI.3's ruling is the most consequential thing in the report, and its sharpest line —
*"a rising artifact score with flat UCR is a better harness, not a better system"* — is the one sentence
that should govern the rest of the programme. The first reading was hand-estimated (≈62% / ≈54%). It
should not be estimated twice: every input already exists in the run's correction log and render counts.

`utils/unassistedConformance.ts` computes it per run and prints it on the run record with the reading
rule attached. **One design decision that determines whether the metric is honest:** the denominator is
**intervention OPPORTUNITIES, not interventions**. Counting corrections that fired would make UCR
unfalsifiable — a build with fewer guards would score better. With opportunities as the denominator,
adding a guard lowers UCR only if the model was already wrong on that surface, which is the property the
metric needs to be a system measure rather than a harness measure.

Surfaces counted: every C1 record grouped by rule (so one noisy family cannot dominate), A18
authored-vs-required anchors (an **excess** counts as assistance, not only a shortfall), A11 marker fields
rendered, scaffold/narration forms stripped, arithmetic patches. It reports `n/a` rather than 100% when a
run had no measurable opportunities.

§6 — Limitations
----------------

1. **Nothing in v37.8 has faced a batch.** All `[C]`.
2. **The 1.2 em gap threshold is a judgement.** Under-separating leaves work for `textRepair`;
   over-separating would split words, which is unrecoverable — so it is deliberately conservative and may
   under-fire on tight table layouts. The repair count is the diagnostic: if it stays high, lower the
   threshold rather than adding repair patterns.
3. **The renderer changes every extracted document.** S1 output will not be byte-comparable to v37.7's,
   and the corpus the model reads is materially different (tabs where there were none). This is the
   largest single input change in the programme and it lands with five other fixes — I would read the
   confirmation pair's S1 numbers with that in mind, and the repair-count trend is what separates
   "extraction improved" from "everything moved".
4. **UCR's first computed reading may not match the hand estimate.** Different denominators. Treat the
   computed figure as the baseline from v37.8 onward and do not compare it to ≈62%/≈54%.
5. **The narration strip cannot reach names in sentences** (§4).
6. **R6 closed ≠ phases stable** (§4, item 5).

§7 — What would falsify this release
------------------------------------

- **Repair counts stay near 156/175.** Then the gap threshold is wrong, or the corruption is not
  gap-shaped, and the renderer approach needs revisiting rather than tuning.
- **New phantom figures appear.** Instance 19 was created by fixing the layer below it; the same thing can
  happen again one layer up. Per Law 1's predictive form, the next instance will be at a *type or layer
  boundary* — my candidate is the currency-symbol/locale boundary (`1.486.200` European decimals), which I
  have not touched.
- **S1 Contract still does not move.** Two releases have now attacked it — N2 routing (failed, Law 3) and
  this app-side strip. If it holds flat a third time the diagnosis is wrong, not the implementation.
- **A19 fork counts do not fall on Meridian.** §2 predicts they drop to zero on the golden case, since
  every one was a legitimate A4 reduction. If they persist, there is a second cause underneath.
- **UCR falls while the artifact score rises.** That is the pattern §VI.3 was instated to expose, and it
  would mean the locks are outrunning the system.

§8 — Sequence status
--------------------

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Table-aware extractor | engineering | **done — no dependency change needed (§1)** |
| 2 | Instance-19 parser rule | engineering | **done** |
| 3 | Keyword-line → structural row labels | engineering | **done** (over-tightening caught and fixed, §4) |
| 4 | App-side narration strip (Law 3) | engineering | **done** |
| 5 | P1=3 / P2=YES → R6 | engineering | **done — R6 CLOSES** |
| 6 | A19 deterministic-fork investigation | engineering | **done — measurement artefact, not extraction (§2)** |
| — | UCR computed per run | engineering | **done (§5)** |
| 7 | **N4 "active integration" sub-predicates** | **Ivan** | open — top model-side item, 45% of Luna's harm |
| 8 | Decision-pair pre-registration | Ivan | open |
| 9 | PP-CORE-00 ruling countersign | joint | open |
| 10 | **Regenerated pair → engineering-v1 decision** | joint | **next** |
| 11 | TC3 → TC4 | joint | after 10 |

**Engineering has nothing left on the critical path.** The gate is N4 plus the regenerated pair.

*End of note. v37.8 · Sequence 1–6 complete; R6 closed. Item 1 needed no dependency — pdf-parse's own
`pagerender` hook, four lines of default renderer. Item 6 was a measurement artefact in my own record, so
both cases' harm figures should fall as you pre-recorded. Item 3 over-tightened and the suite caught it.
UCR computed per run with opportunities as the denominator, so a guard cannot flatter it. 478 tests.*
