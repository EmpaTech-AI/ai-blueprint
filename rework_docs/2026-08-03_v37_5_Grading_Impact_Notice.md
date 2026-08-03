Grading Impact Notice — v37.5
=============================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-08-03**
From: engineering (Viktor's seat). To: **Ivan Montin** — before the next batch is scored.
Companion to `2026-08-03_v37_5_Remediation_Justification.md`.

---

## Why this document exists separately

**Three metrics in the six-batch comparison change MEANING in v37.5, not just value.** Scored without
knowing that, the table stops being comparable and the change looks like product movement.

There is precedent for the confusion in both directions. The Six-Batch report already handled one
correctly — *"S1 Contract 85 → 65, because A11 caught three of four runs miscounting their own inventory
table. A pillar dropping because a new guard fired is the measurement improving, not the product
degrading."* That is exactly the right reading, and it is the reading that needs applying three more
times below.

The risk is the reverse case too: a metric that **improves** because the app now guarantees it, read as
the model having improved. A18 is that case, and it is the one we would most expect to be misread.

---

## 1. S4 anchor count — now deterministic. It has stopped being a signal about the model.

| | |
|---|---|
| **Was** | The model counted its own `[Archetype-Anchored` tags and self-checked (REG-26) |
| **Now** | The app renders the anchor set (A18). The document-level count is a function of the phase map |
| **History** | 4/5/5/5 · 5/6/9/8 · 5/3/8/9 — six batches, never stable, against a pin of exactly Now+Next |
| **Expect** | **Exactly (Now + Next) on every run, every case.** A stable count is now the null result |

**Do not score this as reproducibility improving.** It will read as a perfect 4/4 on a metric that was
the worst offender in the kit, and that improvement is entirely ours, not the model's. Scoring it as
model behaviour would inflate the S4 Contract pillar on false grounds.

**Where the model's real anchor discipline now lives:** the **A18 records in `correction_log.json`**.
Each Now/Next block emits one `anchor_count` record with `authoredValue` = what the model wrote and
`rootComputedValue` = 1. The residual rate over those records is the direct replacement for the old
count metric, and it is strictly more informative — it is per-block rather than per-document, so an
under- and an over-emission no longer cancel out in the total.

**If you want the old figure for comparability**, it is in the flag verbatim:

```
GATE 4 A18 (anchor render): anchors RENDERED, not instructed — 3 authored → 5 rendered across
5 Now/Next block(s). 2 inserted, 0 duplicate(s) dropped, 1 value(s) corrected to the locked
Stage-1 score, 1 removed from Later/Bridge.
```

`3 authored` is the number the previous six batches measured. `5 rendered` is the new invariant.

**Meridian warning.** The prior REG-22 code comment records that a conforming Meridian run carries
*"~5 anchors across 8 rows"*. A18 now makes the per-row count exact rather than approximate, so
**Meridian's rendered count may differ from its historic 5.** A different number is A18 working, not a
regression. The A18 flag will say precisely what changed.

---

## 2. Engineering-identifier flags (B3) — the population being measured has changed

| | |
|---|---|
| **Was** | Any `(T\|S\|WL\|REG)-\d+` token anywhere in a staged deliverable, including the model's own audit narration |
| **Now** | Rule identifiers have a legitimate home (`[SELF_AUDIT]`, stripped for delivery). Parenthetical citations in prose are stripped. A **bare** token in prose still BLOCKERs |
| **Expect** | The count should fall sharply. It may not reach zero, and a residual is now a *sharper* finding than before |

**A residual after v37.5 means something different and worse.** Before, a flag could mean the model
narrated a check it legitimately ran. Now the narration has a channel and the parenthetical form is
removed, so a surviving flag means an identifier is embedded in client-facing prose as running text —
a genuine leak with nowhere legitimate to have come from.

**The flag now carries a locus**, which it never did across six batches:

```
BLOCKER: Stage 3 residual scaffold (internal engineering identifier (S-36 / WL-14)) survived
delivery strip — found "REG-21" in: "The roadmap sequences returns first per REG-21 ordering."
```

So B3 is adjudicable for the first time. If it fires, the report can name the token and the sentence
rather than the class — please do, because that tells us which of the two halves (routing vs prose) is
incomplete.

---

## 3. C1 correction-log volume and the R1 residual rate — the denominator grew

| | |
|---|---|
| **Was** | A5 class + A4 feasibility + A9 integrity, all Stage-3 |
| **Now** | Plus A11–A13 (Stage-1 inventory, v37.4) and **A18 anchor records (Stage 4, v37.5)** |
| **Expect** | Total records up by roughly (Now + Next) per run, and a **higher raw fork count** — because A18 records every under-emitted anchor as a fork |

**R1 across releases is no longer like-for-like.** The rate may rise in v37.5 while the artifacts get
*better*, because A18 exposes anchor forks that previously were invisible and simply produced an
unstable document count.

**Recommendation: read R1 per rule family, not as one aggregate.** The per-family coverage declaration
shipped in v37.4 already supports this — every record carries its `ruleId` (`A4`, `A5`, `A9`, `A11`,
`A12`, `A13`, `A18`). A single blended rate across a changing family set will mislead in both
directions, and the same reasoning applies here as applied to the "15 → 8" arithmetic in the LunaCart
v1 verdict: the total is a sum over families, so it moves when the family set moves.

---

## Metrics that are unchanged and remain directly comparable

Stated explicitly, because "some metrics changed" invites over-caution about the rest:

| Metric | Status |
|---|---|
| Grounding % per stage | **unchanged** — no confidence-scoring logic was touched in v37.4 or v37.5 |
| Structural conformance (section/card counts) | **unchanged** |
| Band assignment | **unchanged** |
| Integration Coverage, PP-0 severity, Data grade | **unchanged since v37.4** — same definitions, same thresholds |
| S5 Integrity (scaffold cleanliness) | **unchanged** — `stripJustification` was hardened in v37.4, not v37.5 |
| Word counts / length band | **unchanged** |
| REG-25 / T-27 / T-30 guard behaviour | **unchanged** |
| A16 severity-vs-exclusion assertion | **unchanged**; A16c is *additive* provenance on top |
| Firm-surname bleed, role-name checks | **unchanged** |

---

## Two things we would ask for in the next verdict

1. **Score A18 as an instrument change, not a product change.** Concretely: report the anchor count as
   `authored → rendered` rather than a single figure, and if the S4 Contract pillar moves, attribute the
   part caused by rendering. Same treatment the Six-Batch report correctly gave S1 Contract 85 → 65.

2. **If B3 fires, quote the token and its line.** The detector now supplies both. That distinguishes a
   routing failure (identifiers still entering by an un-drained path) from an authorial one (a bare
   token written into prose), and those need different fixes.

---

*End of notice. Three metrics change meaning: S4 anchor count (now deterministic — the model signal
moved to the A18 records), engineering-identifier flags (population narrowed, residuals now sharper and
located), C1 volume / R1 (denominator grew — read per family). Everything else is directly comparable.*
