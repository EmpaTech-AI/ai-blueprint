Justification Report — v37.4 (F13a/F13b spec closure · fail-loud guard layer · F12 reconciliation)
==================================================================================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-08-03**
Author: engineering (Viktor's seat). Audience: the consultant review team (Ivan) ahead of TC3.
Responds to: the **LunaCart Amended Verdict** (2026-07-31), the **Five-Pillar / Three-Way Comparison**
(2026-07-31), and the **C1 and D2 Definitions for Implementation** (2026-07-31).

> **Reconstruction note.** This report was authored before the v37.4 deploy but was not included in
> commit `84b3029` and was subsequently lost from the working tree. Rebuilt 2026-08-03 from the change
> set, the memory record and the source. Two things are stated with hindsight the original could not
> have: the build SHA is now known, and §10 records the batch outcome. Everything else is as authored.

Provenance: `[P]` proven from source/artifact · `[C]` implemented, committed & deployed · `[X]` awaiting
a batch · `[A]` authorial, ratified by the Practice.

Build identity: pipeline label **v37.4**, deployed as **`sha=84b30295e1b73fa09c92d68c9bd65d8b0abfb085`**
(commit `84b3029`). The SHA is the anchor; the label is a human tag. `dist/skills` is rebuilt from
source by the deploy, so all skill changes below are live. **321 tests across 11 suites at time of
authoring; typecheck and build clean.**

---

§0 — One-paragraph summary
--------------------------

LunaCart returned **not creditable**, and the reason was more interesting than a failed assertion: on a
case with no ACTIVE archetype, roughly half the Class-G guard layer did not run and **said so only as a
skip**. Grounding the verdict against source confirmed the headline and corrected three of its
supporting details — one of which changed which fix was needed. The most consequential correction:
**F13 is two independent specification gaps, not one**, and the gap carrying 51% of the batch's expected
harm was not the one the report costed. v37.4 closes both as *counted* rules over a new Stage-1
inventory artefact, converts every silent guard skip into a declared unavailable state, and ships the
F12 reconciliation pass. Three defects were found in the course of the work that no report had
identified: A9 emitted **nothing at all** on a non-archetype run, `Data = Established` was
**unreachable** (the correct answer would have been BLOCKERed as a fork), and the GATE-4 false fire was
testing for a presentation form the contract never specifies. One limitation, stated plainly: **every
new assertion is detect-and-declare; none has been exercised against a real batch.**

§1 — What triggered this, and what we corrected before fixing
-------------------------------------------------------------

The LunaCart batch (TC1, e-commerce, no ACTIVE archetype) scored 77% against Meridian v38's 88%. The
verdict's headline — *"the correcting guards silently disable themselves on non-archetype cases"* — is
**confirmed from source** `[P]`. `resolveArchetypeRoots` scans the archetype library for the file with
best ID coverage; only `recruitment.md` is ACTIVE, and no archetype file carries `H-LC-01..08`, so the
resolution returned an empty map and both root guards no-opped on all four runs.

Three supporting details did not survive contact with source.

**1.1 — F13's propagation chain is inverted. This changed the fix.** `[P]`

The report asserted: *D4 "primary data source" undefined → Data grades Developing or Early → PP-0 fires
High or Critical.* **PP-CORE-00's severity does not read the Data grade.** Per `_core.md` §2 its gate is
C1 (integration evidence) and C2 (manual consolidation / no-SSOT), both sourced from the verbatim
`INTEGRATION_STATUS` field. The dependency runs the other way — the Layer-1 grade is
`FRAGMENTED | Data = Early, OR the gate returned Critical`.

So the Data letter and PP-0 severity are **two independent judgements over the same paragraph**, joined
only downstream. They forked together because both read "three disconnected systems", not because one
caused the other. Consequence: **defining "primary data source" would have settled the Data letter and
left PP-0 free to fork Critical vs High anyway.** The undefined terms actually driving PP-0 were
`_core.md` C1's *"zero or **near-zero** active integrations between **core systems**"* — neither
defined. LunaCart has exactly one functioning integration in a four-system stack; T1 read the rule's
letter ("some active integrations documented" → High) and T2–T4 read one-of-four as near-zero. Both
defensible.

The report costed one hour for "define primary data source". That fixes **F13a** and leaves **F13b** —
the 6.75 expected-harm item — open. Both are closed in this release (§2).

**1.2 — PP-0 Critical is not only a label; it changes candidate-pool membership.** `[P]`

`references/algorithms/hypothesis_selection.md` applies `band1_pool=no` exclusions when PP-0 is
instantiated at Critical (systemic). On Meridian that removed two hypotheses. So on LunaCart T2–T4
**excluded candidates T1 correctly kept**, while Section C stayed at 8 and Section D at 7+H-0 in all
four runs. The count was stable; the membership diverged. This is why a count-based review reported
"selection stable" and could not see it, and it is now machine-asserted (A16, §2.4).

**1.3 — C1's "15 → 8" was arithmetic, not coverage halving.** `[P]`

C1's total is the sum of per-family record counts. Meridian's 15 was 8 A5-class + 7 A4-feasibility
(H-CORE-00 has no root, because the resolver excludes `_core.md`). LunaCart's 8 was 8 A5-class + 0
A4-feasibility. **Every card received its A5 check in both runs; one FAMILY was unavailable.** The
consequence for the requested fix: a single "checked N of M expected" line cannot work, because M is not
a constant — it is per-family, and a fixed denominator would be a fabricated number. Coverage is
therefore declared per family (§2.3).

Relatedly, the verdict's *"the batch reports 0 forks from a log checking half as many values"* is not
supported. On the run where REG-25 fired three times, `classificationCorrectionRecords` would have
recorded 3 forks. The "0 forks" panel and the REG-25 panel are **from different runs** — independent
confirmation of the admissibility gap the verdict raised, and the reason the run-index stamp (§2.7) is
load-bearing rather than cosmetic.

§2 — What shipped
-----------------

**2.1 — F13b: C1 is now Integration Coverage** `[A]` `[C]`

`_core.md` §2.1, ratified by the Practice 2026-07-31, implemented as specified with one correction.

> **Integration Coverage = active integrations among core systems ÷ (n_core − 1)**

Ratios only — a threshold on integration *count* is architecture-dependent. The denominator is the
minimum number of links a single source of truth requires (hub-and-spoke needs n−1), so the ratio is
comparable across stacks of any size. *Core system*, *active integration* and *near-zero* are all
defined; an integration counts only at Document-Backed or Form-Stated confidence, is counted as an
unordered pair, and must be schedule- or event-driven and currently functioning.

**Correction fed back and adopted: the ratified thresholds did not tile.** The spec wrote `≤ 25%` then
`26–60%`, leaving (25%, 26%) undefined — adjacent bands written as if the ratio were discrete when
`k/(n−1)` is continuous. Implemented as `≤0.25 / >0.25–0.60 / >0.60`, with a test asserting every value
in [0,1] falls in exactly one band. With realistic `n_core` the gap was latent rather than live, but an
undefined band is not shippable.

Calibrations pinned in the rule text: Meridian `0 ÷ 4 = 0% → Critical` (unchanged), LunaCart
`2 ÷ 6 = 33% → High (structural)`.

**2.2 — F13a: D2 no longer contains the word "primary"** `[A]` `[C]`

Removed, not defined — per the Practice's reasoning that any definition invites the same fork on the
next stack with two plausible candidates. Replaced by per-record-class rating (Reliable / Degraded /
Absent) plus a stated aggregation rule: **Early if ≥1 load-bearing record class is Degraded or Absent.**
Explicitly not worst-class (which makes every real client Early) and not majority (which hides the gaps
that matter); both rejected alternatives are recorded in the rule text and pinned by test so they cannot
be reintroduced.

**Correction fed back: "primary data source" appeared twice, and the spec addressed one.** The second
occurrence was the Data row of the **Evidenced-Absence table** (`blueprint-maturity/SKILL.md`) — the rule
read *before* the D4 gate in the reasoning order. Fixing only the gate would have left the ambiguity
sitting upstream of the fix. Both now read the load-bearing-class rule.

**The settled LunaCart answer is `Data = Early` + `PP-0 High (structural)` — a combination no run
produced.** T1 got severity right and the letter wrong; T2–T4 the reverse. Both are pinned as regression
tests, in both directions.

**2.3 — The guard layer fails loudly, per cause** `[C]`

The A4 skip message covered **four causes, three of which were bugs** `[P]`:

| Cause | Was | Now |
|---|---|---|
| No archetype covers the emitted IDs | one shared skip line | `⚠ UNAVAILABLE (no_archetype_match)` + "not checked, never clean" — non-blocking |
| Archetype directory unreadable | swallowed by a bare `catch` | `BLOCKER:` |
| Maturity dimension table did not parse | indistinguishable from the next row | `BLOCKER:` |
| **Zero dimensions graded Early** | **skipped** | **A4 runs** — `adjustedF = base_F − 0` is a real assertion |

The last row matters most. An empty Early set is a valid input, not an unavailability: the recompute
asserts that feasibility equals the archetype Typical value. Skipping it meant **the cleanest clients
received the least checking**, and it is why LunaCart T1 (`DDDDDD`) would still have skipped A4 after
the retail archetype was built.

Two further silent failures, neither previously reported `[P]`:

- **A9 emitted nothing at all.** `if (roots.size > 0)` had no `else`. A4 at least printed a skip line;
  A9's absence was completely invisible — no flag, no override register, nothing. The verdict inferred
  A9 had not run; the log never said so.
- **A thrown Class-G guard produced no reviewer flag**, only a warning log. A guard that crashed
  verified nothing. It is now a BLOCKER.
- Per-card `!root` was a bare `continue`, so a run whose archetype covered 1 of 8 cards reported exactly
  like a run that covered all 8. Now counted and declared. **This survives building every archetype in
  the library**, so it is fixed in code rather than by content.

**Severity policy, flagged for the record.** A genuinely missing reference is `⚠` and non-blocking, so
the six SKELETON industries can still deliver; every internal fault is a `BLOCKER:` and stops release
via the approve endpoint. This follows the T-29 permit-UNVERIFIED idiom the Practice credited.
**Operational consequence: a Stage-2 scorecard table whose shape drifts now blocks release.** That is
intended — it means A4 did not run — but it is a new way for a batch to stop.

**2.4 — C1 declares coverage per family; A16 asserts pool membership** `[C]`

Coverage is emitted per family with an explicit unavailable cause, plus a `gradeable` boolean in
`gate_a_coverage.json` so the harness keys off a field rather than parsing prose. LunaCart's shape:

```
⚠ GATE A COVERAGE: PARTIAL — 1 of 3 Class-A families checked, 8 of 24 value-check(s),
  3 fork(s) in the checked scope only. UNAVAILABLE: A4 (no_archetype_match), A9
  (no_archetype_match). Reading rule: treat every unchecked value as NOT CHECKED, not as
  clean. Do not certify Class-G clean for this run.
```

**Declared vs unexpected gaps.** H-CORE-00 is structurally rootless on every run, so a naive
implementation made *every Meridian run* read PARTIAL / "do not certify clean" — an always-firing
warning, which is the GATE-4 failure mode this same release fixes elsewhere. Declared gaps are reported
without tripping the verdict; an unexpected gap (a partially-covering archetype dropping a card) does.

**A16** asserts `band1_pool=no` exclusions against PP-0 severity, **deliberately asymmetric** because
the biconditional is unsafe in one direction:

- `PP-0 ≠ Critical → exclusions MUST be empty`. Hard, zero-false-fire — the rule fires at no other
  severity. This is the direction that catches LunaCart T2–T4.
- `PP-0 = Critical → non-empty` is **not** asserted. Critical *enables* the rule, but non-empty output
  also requires a qualifying candidate to exist; a Critical case whose pool contains none would emit
  empty legitimately, and the assertion would BLOCKER a correct run. Instead: `Critical + empty ⇒ the run
  must DECLARE that no candidate qualified`. The unstated case is the bug, not the value.

With PP-0 = High settled for LunaCart, the pinned expectation for the pack audit is **zero pool
exclusions**.

**2.5 — A11–A15: relational guards over a counted inventory** `[C]`

Both new rules compute over one new Stage-1 artefact, `[DATA_INVENTORY]`: three tables (Core Systems,
Integrations, Record Classes) plus a `<!-- inventory: -->` computed marker. A11 recomputes coverage from
the tables and compares it to the marker; A12 recomputes severity from coverage; A13 recomputes the Data
grade from the record classes; A14 asserts every `Active?=yes` row is genuinely schedule/event-driven,
functioning and grounded; A15 asserts referential integrity across the tables.

**These are the first guards over a *relationship* rather than a value**, which is the category the
Five-Pillar report identified as missing. And they are **archetype-independent by construction** — the
inventory comes from the client's own documents, not an archetype file — so unlike A4/A9 they run on
VelocityFreight and GoldenBite.

**Deviation from the issued spec, and the reason.** The spec presented the inventory as YAML with a
self-reported `computed:` block. Shipped as **markdown tables plus one marker**. The decisive reason is
structural, not stylistic: a self-reported `computed:` field has nothing to recompute it *against*,
whereas tables-as-root plus marker-as-derived gives A11–A13 the same root→derived shape as A4 — so **a
model that miscounts its own table is caught.** Secondary: markdown tables have 100% measured structural
conformance across 20 runs in this pipeline; YAML has none, and one indentation slip would make the whole
block unparseable and, under fail-loud, a BLOCKER. Fields and computed values are identical to the spec.
The Practice reviewed and endorsed the deviation.

**2.6 — F12 / A17: form-vs-document reconciliation** `[C]`

The defect's shape is sharper than "nothing compares the two sources". The form supplies **ranges**
(`revenue_range: "€5M–€8M"`); documents supply **point figures**; and the intake contract *instructs*
the silence — *"REVENUE_RANGE is the form's stated range — never substitute a point figure from
documents, even a more precise one."* That rule is not wrong. **Choosing an authoritative source is
correct; choosing it silently is the defect.** A17 does not change which source wins; it makes a
disagreement impossible to leave unrecorded. A divergence declared in Section H is suppressed; an
undeclared one is a BLOCKER.

| Check | Assertion | Severity |
|---|---|---|
| **A17a** | document point figure vs form band | **above** band → BLOCKER; **below** → advisory |
| **A17b** | `revenue − costs ≠ profit`; `margin ≠ profit ÷ revenue`, within one source and period | BLOCKER |
| **A17c** | same metric, multiple values | advisory only, never a flag |

A17a is asymmetric on the same reasoning as A16. A figure **above** the band cannot be a sub-component —
a part cannot exceed the whole — so it is a genuine contradiction. A figure **below** it almost always
is one: "Sales team: 12 employees" against a company band of 50–100 would BLOCKER on nearly every real
pack. Below-band still appears in the divergence table: downgraded, not hidden. A17b is the *"packs
mis-state their own profitability"* finding, with 1% / 0.5pp tolerance for rounding. A17c is advisory
because period and segment scoping make multiple values legitimately common. Two closed-vocabulary
exclusions were both required to avoid false BLOCKERs: **projections** ("Revenue target FY2027: €15M" is
not a claim about the present) and **unit rates** ("revenue per employee" is not revenue).

The divergence table is written every run, empty or not, so "no divergence" is an affirmative result.

**2.7 — Delivery-hygiene and instrument fixes** `[C]`

- **The S5 JUSTIFICATION leak: root cause found.** `stripJustification` was the last all-or-nothing
  strip in the file — it required the heading at *exactly* level 2, *with* brackets, *and* the
  `[END JUSTIFICATION]` terminator. Any one drifting and the entire block passed through untouched,
  which is precisely a 2-of-4 leak at ~25 occurrences. This is the same failure mode, and now the same
  fix, as `stripCheckpointScaffold` (T-15, v32) — that one was hardened three eras ago; this one never
  was. Termination is now the JUSTIFICATION heading's own level or higher, so it cannot eat the block's
  `###`/`####` sub-entries, a following section, the Final marker, or the `[CONFIDENCE_PROPAGATION]`
  handoff channel.
- **One scaffold-form registry.** The detector list and the delivery strips were two independently
  hand-maintained lists — the same asymmetry the Practice found in its own token list, from the other
  side. Auditing them against each other found that **`stripConfidencePropagation` and
  `stripOperatorPreamble` both ran on every delivery path and neither had a detector entry** `[P]`, so
  those two forms could leak and the scan would report clean. Three tests now enforce the relationship
  mechanically in both directions. The third caught a further bug: every `stripOperatorPreamble`
  alternative required a trailing newline, so it could not remove a preamble at end-of-input.
- **GATE-4 "Phase 1: Now appears empty" false fire fixed.** Root cause: the check tested for a **bold
  run**, a presentation form the roadmap contract never specifies. The contract emits opportunities as
  **H3 headings** under the H2 phase heading, and the mandatory Phase Summary uses **table rows** —
  neither is bold, so it fired on every clean run. The Five-Pillar report's own structural column
  recorded the evidence: *"S4 Roadmap | 100 (3 phases, rows ×4)."* Replaced with a test resting on the
  contract's own guarantee (every Now/Next item must cite its locked canonical ID). It now also
  distinguishes a **delimitation failure** — Phase 1 heading with no following Phase 2/Bridge, so the
  check could not run — from an actually empty phase.
- **Run index stamped on the panel.** The index already existed in the operator's job label ("LunaCart
  v37.3 Test 2"); `stripTestLabel` removed it for the client-facing title and discarded it. It is now
  recovered and emitted as the first line of every panel:
  `RUN: index=T2 job=<id> client="…" date=… pipeline=v37.4 sha=…`. An unlabelled run says so and names
  the jobId as the only key.

§3 — The Band-3 fixture, and the defect it exposed
--------------------------------------------------

The Practice asked for a Band-3 fixture on the grounds that C1's `>60% + reconciling SSOT` branch and
the new `Data = Established` grade had never fired, and that an uncalibratable gate cannot be
distinguished from dead code.

**The fixture already existed** `[P]` — `fixtures/band3_calibration.md`, Nordwind Logistics A/S,
authored in the v1.1 era, already pinning no PP-0, Data Established, SOUND, ALIGNED and Band 3. What it
lacked was an input pack (the only pack in the repository is Meridian's) and the new inventory fields, so
it had never been *run* and its stack was prose the counted gate cannot read. It now carries a full
inventory: coverage `3 ÷ (4−1) = 1.00`, a reconciling SSOT, six Reliable record classes, G1–G3 evidence.
Tests read the fixture **file**, so the pins and the code cannot drift.

**Exercising it found a defect in this release's own code** `[P]`. `dataGradeFromRecordClasses` defaulted
governance to false with nothing able to supply it, so **`Data = Established` was unreachable** and A13
would have BLOCKERed the correct answer as a fork. The Practice's concern was directionally right and
specifically wrong: the problem was not that the gate could not be tested, it was that the gate could not
pass. Governance is now a parsed marker input, with a named reachability regression test.

**This is the third instance of one pattern in a single week** — A4's skip, A9's missing `else`, and now
an unreachable grade. In all three, *"we cannot measure X"* was really *"X is broken and the silence was
the symptom."* An untestable branch and a broken branch are indistinguishable from outside, because both
produce silence. Adopted as standing practice: **"never fires" escalates to "prove it can."**

**The Established gate was strengthened, and the Practice's own proposal was corrected.** `[A]` The
proposal — *a named owner AND ≥1 record class with a documented quality standard measured at least
once* — is **half redundant**: the *measured* half is already implied by `Reliable`, which requires
`<30% stale/incomplete`, a figure that cannot be asserted without measuring. The non-redundant half is
the committed standard. What was missing is different: whether the governance **loop closes**. Shipped as
three artifacts in the shape of the D3 Strategy gate — **G1** a named accountable owner, **G2** a
documented quality standard with an explicit threshold, **G3** evidence the standard is *operative* (a
recorded review, audit or remediation, or a documented automated control). `Reliable` describes the state
of the data; G3 describes the capacity to keep it that way, which is the maturity model's own definition
of Established. G3 admits an automated control deliberately, so the gate stays reachable from a normal
intake pack.

**G3 would have flipped the fixture to Band 2.** The original profile named an owner and DQ SLAs but said
nothing about the standard ever being applied → Developing → USABLE → Band 2, silently breaking its own
pinned Band 3. The fixture now states review minutes and automated checks. **That flip was the
calibration**: had a realistically-governed synthetic client been unable to satisfy G3, the gate would
have been too strict and G3 would have been relaxed instead. Falsification discipline applied to a
specification rather than a defect.

§4 — Findings returned to the Practice
--------------------------------------

| # | Finding | Status |
|---|---|---|
| 1 | F13 is **two** gaps; the 6.75-harm item (F13b, `_core.md` C1) was not the one costed | accepted; both closed |
| 2 | "primary data source" appeared **twice**; the spec addressed the downstream reader and left the upstream producer ambiguous | accepted; both fixed |
| 3 | The ratified C1 thresholds **did not tile** — (25%, 26%) undefined | accepted; implemented tiled with an exhaustiveness test |
| 4 | D4 Step 4 creates the **first Data-specific Established gate** (only Strategy had one, D3) | accepted; labelled as such |
| 5 | The "Layer-1 third gap" **does not block TC3** — `_core.md` §4 already resolves it | flag withdrawn (§5) |
| 6 | PP-0 Critical changes **pool membership**, not only a label | accepted; A16 built, pack audit re-pinned |
| 7 | C1's 15→8 was **arithmetic**; the "0 forks" and REG-25 panels are from **different runs** | accepted |
| 8 | The Band-3 fixture **exists**; `Data = Established` was **unreachable** | accepted; fixed |
| 9 | FRICTION is a live F13 **and has never mattered** (§5) | open, Practice-owned |
| 10 | The G3 / FRICTION axes should **not** collapse (§5) | accepted |

§5 — Three results that reframe how the kit is read
---------------------------------------------------

**5.1 — Integration Coverage feeds PP-0 severity only. This is now an invariant, written down.** `[A]`

After §2.2, coverage has no path to the Layer-1 grade. That is coherent — PP-0 drives the pain register
and pool exclusions, the band drives roadmap shape and tier ceiling — but it *looks* like a gap, and a
future revision "fixing" it would silently re-grade every pinned calibration. The invariant is recorded
in `_core.md` at the place someone would go to make that change: any revision wanting coverage in the
Layer-1 grade must re-derive and re-pin Meridian, LunaCart **and** Nordwind, not add a row.

The Practice's "third definition gap" is withdrawn on the same reasoning: `Data = Early → FRAGMENTED`
regardless of coverage, and FRAGMENTED is Band 1 in **both** the FRICTION and ALIGNED columns, so
LunaCart is Band 1 deterministically. The sharper half: the old USABLE reading was reachable only via
`Data = Developing`, and `USABLE + ALIGNED` yields **Band 2** — so settling D2 did not confirm the Band 1
all four runs emitted, **it removed a Band-2 risk the pre-registration was carrying.**

One naming artefact accepted, not fixed: because §4's FRAGMENTED row fires on `Data = Early`, a client at
80% coverage with one broken load-bearing class grades FRAGMENTED — integration language applied on
data-quality grounds. Bounded but real: the grade never reaches the Stage-5 client document, but it
**does** survive into the Stage-2 `[BAND_ASSIGNMENT]` block (a permitted section, retained for the
aria-spec contract), so it can mislead a **consultant**. Mitigation until renamed: the grade line must
state the rule row that fired.

**5.2 — FRICTION never varies, and it has never mattered. Those are one fact.** `[P]` `[X]`

The alignment predicate fires on all four cases. The sharper finding is that FRICTION/ALIGNED only
changes the band in the USABLE row (1 vs 2) and the SOUND row (2 vs 3) — and every case run to date is
FRAGMENTED, which is Band 1 in both columns. **It never varies and it has never mattered, and both
follow from having run only FRAGMENTED clients.** It becomes decisive the moment Nordwind runs, since
ALIGNED is exactly what separates its Band 3 from Band 2.

Not fixed in v37.4. The bound (R1 locus / R2 persistence / R3 unaddressed) is authorial and is being
written by the Practice **with the Nordwind organisational profile closed**, to prevent the fixture
becoming a mirror of the rule. A redacted expectation sheet was issued for that purpose
(`rework_docs/2026-07-31_Nordwind_Expectation_Sheet_REDACTED_for_FRICTION_bound.md`), which also flags
that the ALIGNED pin *predates* any FRICTION definition — so redaction reduces but does not eliminate
the fitting problem.

**5.3 — The G3 / FRICTION axes should not collapse, and the argument is a callback.** `[Inferred]`

The Practice observed that G3 and R2/R3 ask the same question — does the loop close? — and asked whether
that collapses two grades into one input. It does not:

1. **They are mirror images, not the same predicate.** G3 is positive (loop closed ⇒ raise Data to
   Established); R2/R3 are negative (loop open ⇒ fire FRICTION). Different subject matter too: a
   data-quality standard versus a person holding veto or delivery control.
2. **The evidence for collapsing is two points on the diagonal.** The kit is Meridian (fails G3, fires
   FRICTION) and Nordwind (passes G3, ALIGNED) — `(bad, bad)` and `(good, good)`. Corner cases are
   equally consistent with dependence and independence. Inferring structure from them is the same
   inference that made A6's 24/24 look like a pipeline property.
3. **Collapsing would kill `SOUND + FRICTION → Band 2`** — the technically-strong, politically-stuck
   firm. An unreachable cell is indistinguishable from an unencountered one, which is the defect §3 just
   fixed in Established.

Adopted: **share the evidence vocabulary, keep the axes independent.** One definition of *documented
response*, *reversion instance* and *evidence of application*, used by both gates with opposite polarity.
The falsification test is named: a client satisfying G1–G3 that also fires R1–R3. That is a **fifth
fixture and it does not exist** — the cell the kit still cannot reach.

One real coupling, running opposite to the hypothesis: coverage → PP-0 → pool exclusions → Section D
membership → whether a resistant role controls a *selected* opportunity → R1's locus test. R1 must
therefore name which selection it reads. Verified from the chunking contract that Section D selection
occurs in Stage 1, before Stage 2 computes the alignment grade, so R1 has no forward reference.

§6 — Evidence
-------------

| Suite | Covers |
|---|---|
| `inventoryGuards.test.ts` | Coverage arithmetic incl. the tiling exhaustiveness test · Meridian and LunaCart pinned both directions · the Nordwind fixture read from file · G1–G3 incl. the reachability regression · A11–A16 |
| `financialReconciliation.test.ts` | A17a/b/c · range and scale normalisation · **12 false-positive tests**: departmental headcount, projections, unit rates, period mixing, cross-document, growth percentages |
| `classGGuards.coverage.test.ts` | Four skip causes distinguished · empty-Early-set recompute · per-family coverage · declared vs unexpected gaps · production scorecard format (guards against a false BLOCKER) |
| `confidenceScorer.scaffold.test.ts` | JUSTIFICATION drift tolerance and bounded over-consumption · registry consistency in both directions |
| `opportunityValidator.test.ts` | GATE-4 emptiness across four presentation forms · delimitation failure distinguished |
| `clientName.test.ts` | Run-index recovery from operator label forms |

**321 tests, 11 suites, all passing at time of authoring. `tsc --noEmit` clean. `npm run build` clean.**

Note for the record: `tsconfig` excludes test files, so `tsc --noEmit` alone does not typecheck them —
ts-jest caught two signature errors this release that the typecheck reported clean. Both commands are
required.

§7 — Limitations, stated plainly
--------------------------------

1. **Nothing here has faced a batch.** Every assertion is `[C]`, not `[P]`-on-artifact. A17's extractor
   in particular has been exercised only against synthetic packs.
2. **New BLOCKER surface is large.** A11–A17 plus the internal-fault escalations add many ways for a run
   to stop. **VelocityFreight's first run may stop on a legitimately-caught defect that reads like a
   pipeline failure.** Expect it rather than discover it.
3. **A drifting Stage-2 scorecard table now blocks release.** Intended — it means A4 did not run — but it
   is a new stop condition. The production table format is pinned by test against a false fire.
4. **A17 is detect-and-declare, not correct-and-emit.** It does not reconcile figures; it refuses to let a
   divergence go unrecorded.
5. **`_core.md`'s H-CORE-00 root is still not wired** (`TODO(v37.5)`). Deliberate: A4 would recompute H-0
   as `max(1, 2 − ml_heavy − multi_source on Data=Early) = 1`, so a Meridian run emitting 2 becomes a
   REG-27 BLOCKER on the pinned golden. That needs adjudication — is H-0's emitted feasibility wrong, or
   is `base_F 2` already post-adjustment? — not a refactor. Reported as a *declared* coverage gap meanwhile.
6. **The FRICTION bound is not written** (§5.2), and the `SOUND + FRICTION` fifth fixture does not exist
   (§5.3).
7. **Nordwind still has no input pack**, so the fixture is exercised at guard level only, not end-to-end.
   Sequenced after the FRICTION bound by agreement.

§8 — Sequence to TC3
--------------------

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | F13a/F13b definitions, A11–A17, fail-loud guards, GATE-4, run index | engineering | **shipped, v37.4** |
| 2 | FRICTION bound R1–R3, authored with the Nordwind profile closed | Practice | open — redacted sheet issued |
| 3 | Amend the sealed pre-registration: LunaCart `Data = Early` + `PP-0 High` | Practice | open |
| 4 | Pack audit against the pinned expectation of **zero** pool exclusions | Practice | open |
| 5 | Pin LunaCart as a **permanently archetype-free** golden **before** building the retail archetype | engineering | open |
| 6 | Nordwind input pack, authored against the pinned bound | engineering | blocked on (2) |
| 7 | Retail archetype | engineering | deferred past TC3 — not on the measurement path |
| 8 | `SOUND + FRICTION` fifth fixture | joint | open, unscheduled |

On (5), a disagreement worth recording: the verdict's action list builds the retail archetype and re-runs
LunaCart, which returns the kit to four archetype-active goldens and rebuilds the blind spot this batch
exposed. **At least one case must stay permanently archetype-free.** The cost is the pinning, not the
archetype. The Practice has accepted this ordering.

§9 — What would falsify this work
---------------------------------

- **A17 false-fires on a real pack.** The exclusions are closed vocabularies tuned against synthetic
  documents. If TC3's financial summary trips A17a below-band-as-blocker or a projection form the list
  does not carry, the vocabulary is wrong and must be widened from the artifact, not from memory.
- **A11–A15 report `inventory_absent` on TC3.** The `[DATA_INVENTORY]` contract has never been emitted by
  a live run. If Stage 1 does not produce it, the two new gates are unpinned and the batch is ungradeable
  for the same reason LunaCart was — the failure mode this release exists to remove.
- **Nordwind fails G1–G3 once its pack is authored.** Then the gate is too strict and G3 relaxes.
- **A `SOUND + FRICTION` case proves unconstructible from realistic evidence.** Then §5.3 is wrong and the
  two axes should collapse after all.

§10 — Postscript: what the batch returned
-----------------------------------------

*Added at reconstruction, 2026-08-03. The original report ended at §9.*

The LunaCart v1.1 batch ran on this build (`v37.4 sha=84b3029`) and returned **88% — equal to Meridian
v38, on a case with no ACTIVE archetype — with impact-weighted harm 1.86 against v38's 2.99**, the lowest
in the programme and the first with a distributed rather than concentrated risk profile.

Against §9's falsification list:

| §9 condition | Outcome |
|---|---|
| `[DATA_INVENTORY]` absent on a live run | **Did not occur.** Emitted 4/4. The Practice initially reported 1/4 and withdrew it — they had grepped for a literal heading token rather than checking whether its consumers fired |
| A17 false-fires on a real pack | **Occurred**, and this was the correct prediction to have made. Not in the direction guessed (below-band, or an uncarried projection form) but via **entity mismatch** — any prose-mined range became an authoritative band. Fixed in v37.5 |
| Nordwind fails G1–G3 | untested — still no input pack |
| `SOUND + FRICTION` unconstructible | untested — fixture still does not exist |

Two things the batch confirmed that this report could only assert:

- **A11 caught three of four runs miscounting their own inventory table** — the direct vindication of the
  §2.5 deviation from the issued YAML spec. A self-reported `computed:` block has nothing to recompute
  against; tables-as-root plus marker-as-derived turns a silent miscount into a BLOCKER. The Practice
  recorded this as *"the single cleanest vindication of a design decision in this programme."*
- **F13a/F13b closed on evidence.** The combination no v1 run produced — `Data = Early` +
  `PP-0 High (structural)` — reproduced 4/4. S2 Reproducibility moved 60 → 100 and has stayed there.

One item from §7 came true as written: A14 and A17a both false-fired, both from the exact-match class,
and both were shipped four days earlier in this release. See
`2026-08-03_v37_5_Remediation_Justification.md`.

*End of report. v37.4 · F13a and F13b closed as counted rules · guard layer fails loudly per cause ·
A11–A17 archetype-independent · 321 tests · three silent defects found in the course of the work that no
report had identified. Batch outcome recorded in §10: 88%, harm 1.86.*
