Release Note — v37.7 · Engineering complete for the confirmation pair
====================================================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-08-05**
From: engineering (Viktor's seat). To: **Ivan Montin** · Founder/CEO (Steven).
Responds to: **Ten-Batch Cross-Era Report** (2026-08-05) and the fix-first sequencing message.

Build identity: pipeline label **v37.7**, parent **v37.6 `sha=83dd5cb5`** (the build the second controlled
pair ran on). **449 tests across 16 suites; typecheck and build clean.**

> **All five engineering items are done: E1, N1, N2, N3 and the P-rules engine.** The sequencing you
> proposed holds — parallel work now, then the confirmation pair, then TC3. One item ships in ADVISORY
> mode by design (§5) and one durable fix is deliberately deferred with its reason stated (§2).

---

§1 — Agreement on sequencing, and why your argument is the right one
--------------------------------------------------------------------

Endorsed without reservation, and the strongest part is the TC4 argument: **a build that invents a €2.0B
revenue on a well-formed pack cannot referee a deliberately degraded one.** E1 corrupts precisely the
axis TC3/TC4 vary, so running now would confound "the honesty gates caught bad client data" with "the
extraction manufactured bad data" — and on GoldenBite that distinction *is* the experiment.

Two things I would add, both reinforcing:

**E1 is worse than an instrument defect, and the register under-prices it at "0 harm."** `pdf-parse`
returns no cell separators, so the corrupted corpus is what the **model** reads too, not only the guards.
That makes E1 a plausible upstream cause of defects currently scored model-side — **R1** (the model
deriving a wrong integration count from a table whose columns had run together) and **R4** (the corrupted
structured field) are both consistent with it. If that is right, some of Luna's model harm has been
attributed one layer too low for three batches. The confirmation pair will show it: if R1's authored-marker
fork rate drops without any model-side change, the cause was extraction.

**Your C6 prediction is what N2 was built against.** You predicted the Stage-1 routing channel would drop
S1 Contract blockers to near zero in one release, "same class, same cure, same expected curve" as
`[SELF_AUDIT]` did for S3. That is exactly the fix, applied to all four stage contracts rather than one —
so C6 is now a falsifiable pre-registration rather than an expectation, and if S1 Contract does *not* move
the class analysis is wrong.

§2 — E1, and the fix I did not ship
-----------------------------------

**Shipped:** repair at the extraction boundary (`parsers/textRepair.ts`), applied in `pdfParser` before
anything reads the text. Only boundaries that are **structurally impossible** inside one well-formed value
are repaired, so every repair is provably a repair and never a guess:

| Boundary | Example | Repair |
|---|---|---|
| thousands group + another digit | `84,00078,000` | split |
| digit + currency symbol | `84,000€78,000` | split |
| percent + digit | `4.2%3.1%` | split |
| digit + capitalised word | `84,000HQ only`, `1,332,000Vienna` | split, unless a known unit suffix |

Plus the phantom's actual mechanism: **a single-letter scale suffix must now be ATTACHED.** `Revenue 2.0 B
1,486,200` — the extraction had concatenated the figure with a neighbouring column label, and `\s*(b)\b`
read the standalone "B" as BILLION. `12.4M` and `12.4 million` both still parse; `2.0 B` does not. And a
line whose figures are unrepairable (13+ digit runs, multiple decimal points) now yields **no claims**,
because a divergence computed from a corrupted token gets attributed to the client's arithmetic when it
belongs to the extraction.

Every run now reports its repair count with sample fragments, so corpus quality is visible rather than
assumed.

**Not shipped, deliberately: the durable fix.** The real answer is a **table-aware extractor** —
`pdfjs-dist` with position data, or a layout-preserving mode — which reconstructs cell boundaries instead
of inferring them. That is a dependency change with its own regression surface, and shipping it in the same
release as five other fixes would make the confirmation pair unreadable: we would not know which change
moved which number. **Recommend it as the release AFTER the confirmation pair**, when there is a clean
baseline to measure it against. The repair above is a floor, not a ceiling, and the repair count is the
metric that says how much the durable fix is still owed.

§3 — N1: the freeze extraction, and why it was worse than a miscount
--------------------------------------------------------------------

Two causes, both in my extraction: **duplicate markers were frozen separately**, so a T-26 duplicate became
two frozen elements whose values differed and every downstream comparison forked against whichever was
written last — which is exactly why the forks were deterministic rather than random. That is the 9-at-rung-A
and 15-at-rung-C count.

Now deduped by ID with **first occurrence winning** (Section D precedes any restatement, so authority does
not depend on document order beyond that), and the two cases separated:

- **identical duplicate** → deduped, reported as a `⚠` T-26 contract note.
- **value-differing duplicate** → **BLOCKER**, because the dossier states two different scores for one
  element and at rung C this manifest is the only integrity anchor that exists. Your register's phrasing is
  the right standard: a wrong manifest is worse than no manifest.

§4 — N2 and N3
--------------

**N2 — the last unrouted channel, now routed on all four stages.** `[SELF_AUDIT]` was Stage-3 only;
`blueprint-intake`, `blueprint-maturity` and `blueprint-roadmap` now carry the identical channel and
boundary rule. The rule was widened beyond rule identifiers to cover what the register actually observed:
**receipts, checkpoint confirmations, chunk narration, and machine-channel block names.** The strip and the
derived-vocabulary detector already operate on every stage, so no code change was needed — this was purely
the contract catching up with the mechanism, which is the whole point of routing over instruction.

**N3 — mention-matching.** GATE-4 asked `laterSection.includes(opp.id)`, so a contrastive prose reference
("unlike H-EC-01, which lands in Now") read as a misplacement. Placement is now structural: an
`Element:`/`ID:` line, a table row, or a heading. Prose that names an ID is discussing it, not placing it.
The same predicate is reused by the P-rules emitted-placement reader, so the two cannot diverge.

§5 — R6: the P-rules engine ships ADVISORY, and this is a decision not an omission
----------------------------------------------------------------------------------

`utils/phasePlacement.ts` derives the whole phase map from **pinned inputs** — the frozen relay flags and
the post-adjustment feasibility — with every decision naming the clause that fired, per your I.4 reading
rule. What is already deterministic from the ratified contract is implemented and enforced in the
derivation: `phase_dependency=strict` → Later unconditionally; a dated deadline → Now (the REG-24
precedence preamble); class-based placement otherwise.

**Two constants are UNSET, and they are yours:**

- **P1 `NOW_CAPACITY`** — how many items Phase 1 may carry.
- **P2 `GATE_DEFERS_ALONE`** — whether `d_gate4=yes` alone defers to Next, or only in combination.

The register lists the P-rules spec as delivered on the Practice side; it has not reached engineering. I
did not invent the two numbers, because **guessed thresholds would change client-facing sequencing on
guessed rules** — and a placement fix that silently re-sequences a deliverable is a worse defect than the
drift it replaces. So the module runs, computes the map, reports divergences as `⚠` advisory, and does not
gate. Setting the two constants flips it to enforcing with no other change: the engine, the ordering
(lowest-value Quick Win displaced first, per the roadmap contract's own words) and the tests are all in place.

**R6 does not close until those two values land.** That is the single dependency on your side that blocks a
closeable register item.

§6 — Limitations
----------------

1. **Nothing in v37.7 has faced a batch.** All `[C]`.
2. **The durable E1 fix is deferred** (§2). The repair handles the boundaries it can prove; a table-aware
   extractor handles the ones it cannot.
3. **E1's repair changes the corpus the model reads.** That is intended and I believe net-positive, but it
   means Stage-1 output on the confirmation pair is not byte-comparable to v37.6's. Any S1 movement has two
   candidate causes — the repair and the N2 routing — and the repair-count flag is what separates them.
4. **P-rules advisory** (§5).
5. **N2 is a contract change on three skills.** If the model does not adopt the channel, S1/S2 self-narration
   persists and the routing conclusion is falsified rather than the implementation.
6. **A19 is still new BLOCKER surface** on the exact surfaces LunaCart drifts on. The dedupe removes the
   spurious forks; genuine ones remain and should.

§7 — What would falsify this release
------------------------------------

- **F12 false fires persist after E1.** Then the corruption is not (only) the boundaries I can characterise,
  and the durable extractor moves from "next release" to "blocking".
- **S1 Contract does not move.** Your C6 predicts near-zero S1 Contract blockers in one release. If routing
  does not produce that curve, the class analysis behind Law 1 and C6 needs revisiting — this is the most
  informative single number on the next pair.
- **R1's authored-marker fork rate is unchanged.** Then E1 is not upstream of R1 and my §1 claim is wrong;
  the model is deriving badly from clean text.
- **A19 fires on Meridian.** Meridian copies from a library, so its Stage-3 output should match its
  Stage-1 freeze exactly.
- **The P-rules derived map disagrees with a roadmap you judge correct.** Then the precedence rules I
  implemented from the ratified contract are wrong, independently of P1/P2 — and that is worth knowing
  before they gate anything.

§8 — Sequence
-------------

| Owner | Item | Status |
|---|---|---|
| engineering | E1, N1, N2, N3, P-rules engine | **done — v37.7** |
| **Practice** | **P1 + P2 constants** | **blocks R6 closing** |
| Practice | N4 "active integration" definition + coverage-pin re-adjudication | in progress |
| Practice | VelocityFreight + GoldenBite pre-registrations | in progress |
| Practice | GoldenBite pack audit incl. the band-source check | in progress |
| Practice | FRICTION 4th fixture | in progress |
| joint | PP-CORE-00 delivery-consistency ruling | one-line, both cases |
| joint | **Confirmation pair on v37.7** | next — carries the engineering-v1 decision and becomes TC3's baseline |
| joint | TC3 VelocityFreight → TC4 GoldenBite | after the pair |
| engineering | Table-aware extractor (durable E1) | release AFTER the pair (§2) |

*End of note. v37.7 · E1 repaired at the extraction boundary with the durable fix deferred and reasoned ·
N1 deduped with conflicts BLOCKERed · N2 routed on all four stages, making your C6 a falsifiable
pre-registration · N3 structural placement · P-rules engine complete and advisory pending two Practice
constants. 449 tests. Ready for the confirmation pair.*
