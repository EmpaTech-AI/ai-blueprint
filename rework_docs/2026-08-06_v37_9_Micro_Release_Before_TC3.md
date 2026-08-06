Release Note — v37.9 · the five-item micro-release, cleared for TC3
==================================================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-08-06**
From: engineering (Viktor's seat). To: **Ivan Montin** · Founder/CEO (Steven).
Responds to: **Fourteen-Batch Cross-Era Report** (2026-08-06) and the sequencing decision to hold TC3.

Build identity: pipeline label **v37.9**, parent **v37.8 `sha=ef61d627`**.
**514 tests across 18 suites; typecheck and build clean.**

> **All five items are done.** Four things go back with them. My first cut of item 1 was **wrong**, and the
> tests written for it caught it inside the hour. Item 1 also needed **one condition you did not file** —
> `24/7` survives a word-boundary rule because it genuinely is bare digits, and it was producing a
> headcount of 24 on the vocabulary TC3 is densest in. Item 3 was **three** conflations, not one, and
> fixing only the named one would have left the louder of them in place. And I have **not** re-pinned the
> LunaCart coverage fixture — the appendix's 0.67 is not derivable from the rows we hold, so it needs your
> ruling rather than my guess.

---

§1 — Item 1: the word-boundary condition, and why the first version of it failed
--------------------------------------------------------------------------------

Confirmed exactly as described. `B2B` produced a phantom €2.0B on Luna 4/4 — the `2` took the trailing `B`
as a scale suffix — and `M365` produced a headcount of 365 on Meridian 2/4.

The fix is one lookbehind on the numeric token. **My first version of it was insufficient, and this is
worth recording because it is a small instance of your Law 1.** I wrote:

```ts
const NOT_IN_IDENTIFIER = String.raw`(?<![A-Za-z])`;
```

which rejects a numeric token immediately preceded by a letter. `M365` is rejected at `3` — and then the
regex engine advances one character and matches at **`65`**, which is preceded by a digit. The guard
prevented *starting* the token after a letter without preventing *entering* the token part-way, so the
false fire survived at a smaller magnitude. The correct condition excludes a preceding digit as well:

```ts
const NOT_IN_IDENTIFIER = String.raw`(?<![A-Za-z0-9])`;
```

Separators and decimal points are matched inside the pattern, so no legitimate form is ever reached
through a digit. Verified against the qualified forms that must keep working: `€6.4M`, `€2.0B`,
`12.4 million`, `€12,400,000`, `240 staff`, `4.2%`, and `FY2025 total revenue: €6.4M`.

I would note the cost of the first version being *nearly* right: it produced 65 instead of 365. **A guard
that reduces the magnitude of a false figure without removing it is worse than one that does nothing,**
because the residual looks plausible. The two tests that caught it were written before the fix, not after.

**Then the TC3 vocabulary sweep found one the register had not filed.** `FTL2`, `EUR2`, `ISO9001`, `M365`
and `Q4` are all rejected by the boundary rule — but **`24/7` is not, because it genuinely is bare
digits**, and `Employees on the 24/7 desk` was yielding a **headcount of 24**. On the vocabulary TC3 is
densest in. So one condition beyond your filing: a number that is one side of a slash pair is a shorthand
or a ratio, never a currency amount or a count. Both halves are rejected, and it also disposes of the
inventory's own `2/5` quality scores.

That needed a third condition to actually hold, and the reason is worth a sentence because it is the same
failure mode as the first attempt. With only the ratio lookahead, `24/7` fails on `24`, the capture group
**backtracks to `2`**, and `2` passes — again a *more* plausible false figure rather than a less plausible
one. Requiring that no digit follows the captured token makes it maximal, so there is nothing shorter to
fall back to.

**And that guard then exposed a defect one layer up, exactly as instance 19 did.** `Headcount as of
01/2025` still produced 1: `stripPeriodTokens` removed `2025` and left the fragment `01/ `, which the
ratio guard passed because nothing followed the slash. **The strip was manufacturing the form the guard
rejects.** The period token now includes a leading month/day group. I flag it as the third instance of
your Law 1 in this codebase rather than as a bug I found — the pattern is now predictive enough that I
went looking for it after adding a lower-layer rule, and it was there.

The freight-vocabulary and slash-pair tests are pinned in `utils/fourteenBatchFixes.test.ts`.

§2 — Item 2: the anchor and the markup are different problems
-------------------------------------------------------------

Both variants confirmed. They needed different treatment, and conflating them would have produced a
content-eating heuristic:

- **Markup is lexical.** `Producing **Chunk 1 only**:` escaped because `\s+` met `**`, not `Chunk`. An
  optional emphasis run is now admitted at every token boundary in the closed vocabulary, and the line
  lead accepts a bullet *and* an emphasis run. No judgement involved.
- **The tail is positional**, and here the honest response is to stop using position as the discriminator
  for the forms that never needed it. A production verb applied to a *numbered pipeline unit* — "produce
  Chunk 1", "emitting Section 3" — is machine narration wherever it sits in the line. No client-facing
  section contains that phrase. The vocabulary stays closed; what changed is that position left it.

**The consequence is that removal cannot be whole-line any more,** and that matters:
`Revenue is €6.4M. Now producing Chunk 2.` is exactly the shape a tail variant produces, and deleting the
line would take the client's revenue figure with it. So the phrase-anywhere class is removed at
**sentence** level — the narration sentence goes, the rest of the line survives, and the bullet lead is
preserved. Standalone narration lines (the observed instances) still disappear entirely.

**One finding on top of the item as filed.** `Chunk N` narration was in **no** SCAFFOLD_FORMS entry, so
instance 21 was not merely an escaped strip — it was a **false CLEAN**. Nothing could have reported what
the strip missed. Registered, and the pairing is now asserted directly: the detector fires on the raw
form and reports nothing after `stripForDelivery`. That test is the one I would keep if I could only keep
one, because it is the property that failed rather than the pattern that failed.

Still deliberately out of reach, unchanged from v37.8: a block name inside a real sentence ("the
DATA_INVENTORY shows four active integrations across the stack"). There is no correct way to remove a
noun from a clause. It stays with the detector and is pinned as a *negative* test.

§3 — Item 3: it was three conflations, and the one you named was the quieter one
--------------------------------------------------------------------------------

The register named it precisely: revenue − COGS is **gross** profit, never net. Confirmed, and the arithmetic
was as harmful as described — a pack stating revenue €6.4M / COGS €3.9M / net profit €0.8M was reported as
contradicting its own arithmetic by €1.7M when it was flawless, and €1.7M *is* the operating-expense line.

**But when I audited the vocabulary for that shape I found three of them, not one:**

```
total_costs  ⊇ { total costs, total expenses, operating expenses, opex }
net_profit   ⊇ { net profit, net income, profit after tax, EBITDA, operating profit }
```

`operating expenses` is a component exactly as COGS is, and it is the **more common** of the two — almost
every P&L states an opex line, whereas plenty omit COGS. Splitting COGS alone would have left the identical
false fire firing on more packs than it removed. My own first test for this item proved it: I wrote a
five-line consistent P&L expecting silence and it BLOCKERed on `revenue − opex = net_profit`.

So the levels are now separate metrics and the ladder is stated once, as arithmetic:

```
revenue      − COGS         = gross profit
gross profit − opex         = operating profit
revenue      − total costs  = net profit
```

with the margins each over revenue: gross, net, and **EBITDA margin — which was folded into `net_margin`**,
so a source could mis-state its EBITDA margin and be checked against the wrong numerator. Gross margin was
in the vocabulary and unpaired with anything.

**EBITDA now carries no subtraction identity at all,** and that is the deliberate part. It differs from
operating profit by the D&A add-back, which these documents do not reliably state. Giving it an identity
would mean guessing a missing level, which is the defect this item exists to remove — so it participates
in range containment and multi-valued reporting and nothing else.

A precedence rule falls out of the split: a row labelled "total cost of goods sold" satisfies both labels,
so the **narrower level wins** and a component figure is never also admitted as a total. Otherwise the
split would re-create the error it removes.

**A silence I want on the record as intentional.** A pack stating revenue, COGS and net profit but no
total-costs line now yields **no** net-profit check. Net profit is not derivable from a gross input. Per my
standing rule that "never fires" escalates to "prove it can", I have pinned that silence as a test so it
is a stated non-derivation rather than a branch nobody has exercised.

§4 — Item 4: N4, and the direction A14 was silent in
----------------------------------------------------

Implemented as your formula states it:

```
a pair is ACTIVE iff  P-a inventoried ∧ P-b automatic ∧ P-c functioning ∧ P-d cited
```

The substantive change is that this is now the **computation** rather than an audit of the model's answer.
A14 previously read the `Active?` cell and checked the author's `yes` against these predicates — which is
one-directional in the wrong way:

| authored | predicates | v37.8 | v37.9 |
|---|---|---|---|
| yes | one fails | BLOCKER — **but the row still counted toward coverage** | excluded from coverage, BLOCKER |
| no | all hold | **accepted in silence** | counts toward coverage, BLOCKER |

Both rows of that table were wrong. The first left the inflated coverage figure standing in the artifact
while flagging it, so the reviewer got a flag and a wrong number. The second is the under-statement case:
coverage came out too low, PP-0 severity read the low figure, and nothing was recorded — the quiet failure
mode of the pair.

Reading a cell the model authors also puts the model at the enforcement point, which Law 3 says never
works. So the cell is no longer an input to anything: coverage is computed from the predicates, and
authored-vs-derived is recorded as a C1 measurement on **every** row, agreeing or not, so the residual rate
can see the agreements as well as the forks.

**P-a is "inventoried", not "core".** Both endpoints must be rows in the Core Systems table; the separate
§2.1 restriction that only core↔core pairs count toward coverage stays separate. Collapsing the two would
have made an integration to a non-core system fail P-a, which is a different (and wrong) claim.

**The golden case does not move.** LunaCart's five integration rows derive exactly the two active pairs the
author wrote — coverage stays 0.33 — and the full existing suite passed unchanged on the first run of this
item. That is the result I wanted: N4 changes what the number *is derived from* without changing what it is
on an inventory that was already right.

§5 — Item 5: T1, and where the displacement was going
------------------------------------------------------

P1's capacity check and P0b's deadline pull were in one pass, and the pass ran in I×F rank order, so the
interaction between them depended on where the deadline items happened to sort. Two distinct defects:

1. **A deadline item that ranked below three Quick Wins found Now full and — being exempt from deferral —
   entered anyway.** Phase 1 silently carried 4 and nothing said so.
2. **The displacement went the wrong way.** A deadline item cannot move; a Quick Win can. The item that
   should have lost the slot was the lowest-value Quick Win, not "whichever arrived after the cap".

The clause as you specified it — deadline-pinned items exempt from displacement, cap applied to the
remainder — is therefore a **two-pass shape**, not a tie-break: the unconditional rules must resolve
before anything discretionary can know how much capacity is left. The derived map is re-sorted into rank
order afterwards, because the two passes are an evaluation order and not an output order.

**And the over-commitment case fails loud.** If deadline-pinned items *alone* exceed the cap, no
discretionary reordering can bring Phase 1 within capacity — every one of them is undeferrable. The flag
says so in those terms and names it a scoping decision for the engagement rather than a placement error,
because the wrong response would be for someone to move a dated item to satisfy the guard. A strict
dependency still beats a dated deadline and consumes no capacity, since it lands in Later.

§6 — What I did NOT do: the LunaCart coverage pin
-------------------------------------------------

`fixtures/lunacart_archetype_free_golden.md` pins `integration_coverage=0.33` and
`archetypeFreeGolden.test.ts` asserts it. The fourteen-batch appendix pins LunaCart coverage at **0.67
provisional (0.83 if Returnly↔SkuVault cites clean)**. **I have not re-pinned it, and I do not think I
should.**

Here is the arithmetic, so the question is precise rather than a disagreement about a number. The fixture
holds 7 core systems (n_core − 1 = 6) and these five rows:

| A | B | Mechanism | Status | Active? | derives |
|---|---|---|---|---|---|
| shopify | postgres | scheduled (daily) | functioning | yes | **active** |
| netsuite | postgres | scheduled (daily) | functioning | yes | **active** |
| returnly | postgres | manual | functioning | no | inactive — P-b |
| zendesk | postgres | none | unbuilt | no | inactive — P-b, P-c |
| skuvault | postgres | none | unbuilt | no | inactive — P-b, P-c |

2 ÷ 6 = **0.33**, and N4 derives the same 2 the author wrote. **0.67 requires 4 active pairs** — two of
Returnly, Zendesk and SkuVault would have to be scheduled-or-event *and* functioning, which contradicts
the mechanism and status cells we hold. 0.83 requires 5.

So one of three things is true, and I cannot tell which from here: the appendix is counting a different
(regenerated) inventory than the fixture holds; or the fixture's rows are stale against the source
materials; or the appendix figure is provisional in the sense of *pending* rather than *asserted*. Your
open check on whether Returnly↔SkuVault cites clean sits in exactly this neighbourhood, which is why I
think it is your ruling and not my inference.

**What I need to re-pin it:** either the integration rows that produce 4 active pairs, or a ruling that
the fixture's rows are authoritative and the appendix figure should be withdrawn. Until then the fixture
stays at 0.33 and the test keeps asserting it, so the pin is *visibly* stale rather than quietly changed
to match a number I cannot derive.

§7 — Limitations
----------------

1. **Nothing in v37.9 has faced a batch.** All `[C]`.
2. **The ladder split changes which claims exist**, not only which identities run. A pack stating only
   "operating profit" no longer produces a `net_profit` claim, so an A17a range containment that used to
   fire against a form revenue band via the operating-profit line will not fire now. That is correct — it
   was comparing the wrong level — but it is a behaviour change in a check, not only in a false fire, and
   the batch numbers should be read with it in mind.
3. **The sentence splitter is punctuation-based.** A narration phrase that spans a sentence boundary
   leaves the line intact and falls to the detector. Pinned as a stated fallback, not a silent one.
4. **The numeric guards are untested against European decimal notation** (`1.486.200`). They neither help
   nor harm that case — the separator class still excludes `.` — and per §7 of the v37.8 note the
   currency/locale boundary remains my candidate for the next Law 1 instance. It is now the *only*
   untouched boundary I can name in this parser, which makes it a sharper prediction than it was.
5. **The slash-pair rule rejects a per-unit figure written with a slash** (`€6.4M/year`). I judge that
   correct — a rate is not an amount, and `UNIT_RATE_MARKER` already excludes the `per X` spelling — but it
   is a behaviour change I inferred rather than one you filed, so it is the first thing to look at if a
   legitimate figure goes missing on TC3.
6. **N4's under-statement BLOCKER is new loudness on a surface that was silent.** If TC3 comes back with
   A14 flags in the authored-no/derived-yes direction, the first question is whether the extraction is
   filling mechanism/status columns the model left blank — not whether the model got the cell wrong.
7. **T1's overflow flag has never fired on a real pack.** Constructed tests only; no observed engagement
   has carried four dated deadlines.

§8 — What would falsify this release
------------------------------------

- **A17b flag counts do not fall on the confirmation pair.** §3 predicts the arithmetic false fires go to
  zero on consistent packs. If they persist, the level detection is still wrong somewhere I have not
  audited — my candidate would be `total_costs` matching a subtotal row.
- **New phantom figures at a smaller magnitude.** That is precisely how item 1's first version failed. The
  shape to watch for is a plausible-looking figure rather than an absurd one.
- **S1 Contract still does not move.** This is the **third** release attacking it — N2 routing (failed,
  Law 3), the v37.8 app-side strip, and now the anchor and markup widening. If it holds flat again, the
  diagnosis is wrong rather than the implementation, and I would want to stop widening patterns.
- **A14 fires in the authored-no direction on the golden case.** §4 predicts zero: the golden's cells and
  the derived values agree. If it fires there, the predicate reading is wrong, not the model.
- **UCR falls while the artifact score rises.** Unchanged from v37.8, and still the pattern that would
  mean the locks are outrunning the system.

§9 — Status
-----------

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Word-boundary condition (instance 20/20b) | engineering | **done — first cut was wrong, tests caught it (§1)** |
| 2 | Strip widening (instance 21) | engineering | **done — also a false CLEAN; registry gap closed (§2)** |
| 3 | net_profit accounting identity | engineering | **done — was three conflations (§3)** |
| 4 | N4 active-integration sub-predicates | engineering | **done — both directions now (§4)** |
| 5 | T1 placement clause | engineering | **done (§5)** |
| 6 | Returnly↔SkuVault citation ruling | Ivan | open — **now blocking the coverage pin (§6)** |
| 7 | M2 rate | Practice | open |
| — | LunaCart coverage re-pin | **joint** | **blocked on 6 — not guessed (§6)** |
| — | rung-D honesty gate + GoldenBite pack audit | Ivan | open — blocks TC4 |
| — | **TC3 + the micro-release pair** | joint | **cleared to run** |

**Engineering has nothing left on the critical path, and TC3's blocker is cleared.** The one thing I am
holding is the coverage pin, and only because guessing it would put a number in a golden fixture that
nothing in the fixture derives.

*End of note. v37.9 · five items, three findings. Item 1's first version reduced a phantom figure instead
of removing it — a plausible residual is worse than an obvious one, and the tests written for the item
caught it. Item 3 was three conflations of the same kind and the named one was the quieter; `operating
expenses` would have kept firing on more packs than COGS. Instance 21 was a false CLEAN, not just an
escaped strip. LunaCart's coverage pin is not re-pinned: 0.67 needs four active pairs and the fixture's
rows derive two. 514 tests.*
