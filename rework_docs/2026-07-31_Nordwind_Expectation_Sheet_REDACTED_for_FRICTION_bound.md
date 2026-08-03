# Nordwind Band-3 Fixture — Expectation Sheet, ORGANISATIONAL PROFILE REDACTED

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-07-31**
Issued to: **Ivan Montin** · for authoring the FRICTION bound (R1–R3) with the fixture closed
Source: `backend/src/skills/blueprint-intake/fixtures/band3_calibration.md`

---

## Why this document exists

You asked for the expectation sheet minus the organisational profile so R1–R3 can be written against
the rule's *purpose* rather than fitted to the fixture. Everything below is either (a) a
non-organisational fact you need in order to write a coherent bound, or (b) an expectation that does
not describe the client's people or change history.

**Withheld — do not ask for it and I will not volunteer it until R1–R3 are pinned:**

- the People-dimension evidence and its grade rationale
- any adoption, resistance, reversion, or change-management history
- the `ORG_FRICTION_SIGNAL` source text
- headcount, roles, named individuals, governance owner identity
- anything in the profile that bears on whether the client can execute

**Deliberately disclosed, because withholding it would make the bound unwritable:**

- `ORG_FRICTION_SIGNAL: none-documented` — the *field value*, not its evidence. You already knew this
  from the pre-existing sheet, and a bound that cannot be evaluated against a `none-documented` input
  is not implementable. What is withheld is *why* the field is empty.
- The Alignment grade expectation is **ALIGNED**. This is already pinned in the fixture you wrote in
  the v1.1 era, so it is not new information — but note the asymmetry it creates and read the warning
  in the next section.

---

## ⚠ The pin you are writing against is one you already made

`Alignment grade = ALIGNED` and `Band = 3` were pinned in this fixture before either of us had a
definition of FRICTION beyond "documented adoption resistance". So R1–R3 are not being written into a
vacuum: they are being written against a **pre-existing expectation that the fixture must satisfy.**

That is a weaker form of the fitting problem you are trying to avoid, and it is worth naming rather
than pretending the redaction removes it. Two honest options:

1. **Treat ALIGNED as pinned** and write R1–R3 to the rule's purpose anyway. If the withheld profile
   then fails them, that is the same informative flip G3 produced — and the correct response is to
   decide *on the merits* whether the bound or the pin is wrong, exactly as we did for G3.
2. **Unpin ALIGNED** for the duration, write R1–R3 blind, then evaluate the profile against them with
   no expectation in force. Stronger discipline, but it means Band 3 is not pinned until the profile
   is read, and the fixture's whole purpose is that Band 3 *is* pinned.

**I recommend (1)**, on the same reasoning that made the G3 flip useful: a pin that predates the rule
is evidence, and a rule that breaks it is a finding either way. But state which you chose, because it
changes what a subsequent flip means.

---

## Non-organisational facts (needed to write an implementable bound)

| Fact | Value |
|---|---|
| Industry | Logistics (3PL) — Nordic |
| Layer-1 systems | ERP, TMS, WMS, BI warehouse (+1 non-core document store) |
| Integration Coverage (C1) | **1.00** — 3 active ÷ (4 core − 1) |
| Designated SSOT | BI warehouse; reconciles every load-bearing record class |
| PP-0 severity | **none** — coverage >0.60 with a reconciling SSOT |
| Data grade | **Established** — all 6 record classes Reliable, G1+G2+G3 hold |
| Layer-1 grade | **SOUND** |
| Maturity dimensions | Strategy Established · Data Established · Technology Established · **People Developing** · Processes Established · Governance Established |
| `ORG_FRICTION_SIGNAL` | `none-documented` |
| Section D | 7 hypotheses, **no H-0** (promotion gate requires PP-0) |
| `band1_pool=no` exclusions | none — the rule does not fire below Critical (A16) |

**People = Developing is disclosed deliberately.** It is the one dimension grade that R1's locus test
cannot be written without: your draft R1 turns on "a role with veto or delivery control", and whether
the People dimension is Early is the *other* limb of the existing FRICTION predicate. You need to know
this fixture is **not** Early on People, or you would be writing a bound whose first limb decides the
case before R1–R3 are reached. No underlying People evidence is disclosed.

---

## Expectations that do not describe the organisation

| Check | Expected |
|---|---|
| PP-CORE-00 gate | Not instantiated — Layer 1 is sound; the Layer-2 gap is an opportunity framing, never a fabricated pain |
| Section C shape | 5 stated + 3 emergent (no PP-0) |
| Layer-1 grade | SOUND |
| Band | **3** |
| H-CORE-00 | Not emitted; agent-shaped opportunities compete normally |
| aria-spec | `recommendation: withhold — pattern not present` + opportunity-reframe note |
| Client deliverable | No product recommendation sentence anywhere |
| A11–A15 | Clean |
| A16 | PP-0 `none`, zero exclusions, no declaration required |

---

## On your symmetry hypothesis — I think it does NOT collapse, and the reason is a callback

You asked me to check whether G3 and R2/R3 being "the same question in two dimensions" collapses two
grades into one input, before writing the formal text. Three findings.

**1. They are mirror images, not the same predicate.** G3 is a *positive* requirement — evidence the
loop closed, required to RAISE Data to Established. R2/R3 are *negative* — evidence the loop did not
close, required to FIRE FRICTION and lower the band. Same question, opposite required answers, and on
different subject matter: G3's subject is a data-quality standard, R1–R3's subject is a person with
veto or delivery control. Those are different organisational facts. A firm can run exemplary automated
DQ controls in its ingestion layer and still have a practice lead who has reverted three adoption
attempts in two years. Data-engineering maturity and change-adoption maturity are empirically
decoupled, and arguably anti-correlated in partner-led firms.

**2. The evidence for collapsing is two points on the diagonal — which is the Meridian over-fitting
error in a new place.** Our entire kit is Meridian (fails G3, fires FRICTION) and Nordwind (satisfies
G3, ALIGNED). That is (bad, bad) and (good, good). Two corner cases are consistent with dependence and
equally consistent with independence; they cannot distinguish the two. Inferring a structural
relationship from them is precisely the inference that made A6's 24/24 look like a pipeline property.
**The off-diagonal cells are not evidence against the hypothesis — they are the cells we have never
run.**

**3. Collapsing would kill a real client type and a reachable band.** The band table's `SOUND +
FRICTION → Band 2` cell *is* the technically-strong, politically-stuck firm. If G3 implied ALIGNED,
that cell becomes unreachable and Band 2 could only be entered via `USABLE + ALIGNED`. That is a
modelling loss, and it is the same class of error as an unreachable Established: a cell that cannot be
reached is indistinguishable from a cell that is never encountered.

**So: share the vocabulary, keep the axes independent.** The half of your instinct that is right is the
vocabulary. Both gates need one definition of *documented response*, *reversion instance*, and
*evidence of application*, used with opposite polarity — G3 requires the loop closed, R3 requires it
open. One definition, two gates, no shared verdict. That gets the consistency without the false
structural claim.

**The falsification test for my position**, so it is not just an assertion: a client that satisfies
G1–G3 *and* fires R1–R3 — the `SOUND + FRICTION` cell. If such a case cannot be constructed from
realistic evidence, you are right and the axes should collapse. I think it can be constructed trivially
(a governed data platform plus one unresolved veto-holding role), which is why I do not think it does.
**That case is a fifth fixture and it does not exist.** Not on the TC3 path — flagging it as the cell
the kit still cannot reach.

---

## One coupling that IS real, running the other way

The axes are not fully independent, but the dependency is not the one you hypothesised. It runs:

```
Integration Coverage → PP-0 severity → band1_pool=no exclusions → Section D membership
    → whether a resistant role has control over A SELECTED opportunity → R1's locus test
```

R1 as drafted turns on control over "a selected opportunity", and the selected set is affected by the
pool exclusions, which are gated on PP-0 severity. So a case whose severity forks can shift R1's answer
without any change in the client's people. Not a reason to change R1's shape — the locus test is right —
but the bound should say *which* selection R1 reads (Section D as emitted at Stage 1) so it cannot drift
to "the final roadmap set" and become order-dependent.

Ordering check, since this worried me: Section D selection happens in **Stage 1** (intake chunk 2),
before Stage 2 computes the alignment grade. So R1 has no forward reference and is implementable as
drafted. Verified against the chunking contract, not assumed.

---

*Redacted for bound-authoring. Withheld: People evidence, adoption/reversion history,
ORG_FRICTION_SIGNAL source text, named roles. Disclosed: field values and non-organisational
expectations only. Recommend pinning ALIGNED per option (1) and stating the choice.*
