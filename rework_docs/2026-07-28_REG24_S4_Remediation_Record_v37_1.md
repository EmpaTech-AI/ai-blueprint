REG-24 (Stage-4) Remediation Record — v37.1
===========================================

**AI Assist BG · Blueprint Practice · CONFIDENTIAL · 2026-07-28**
Prepared by: engineering (Viktor's seat). Responds to the independent Cross-Era
Comparison & v1 Approval Completeness Report (Ivan, 2026-07-28), which named
**S4 / REG-24 the sole product blocker** to v1 approval at 89% completeness.
Provenance: `[P]` proven from artifact · `[C]` claimed-implemented, committed &
deployed, awaiting the confirmation batch · `[X]` awaiting the batch re-run.

Build identity: pipeline label **v37.1** (bumped from v36.4 so the confirmation
batch's bundle self-identifies as the post-REG-24 build); the run bundle cites its
own commit SHA. `dist/skills` is regenerated from source by the deploy build, so the
roadmap skill changes below are live in the deployed pipeline.

---

§0 — One-line summary
---------------------

The single approval blocker (REG-24: the H-RT-07 phase fork and its correlated S4
Archetype-Anchored tag drop) is fixed **S4-only**, the four GREEN stages are frozen
under a hard edit guard so nothing could regress them, and the fix ships with a
seeded two-assertion catch that (per the house rule) is the only thing that can retire
an intermittent fork. Full local verification is green and the seal is intact. The
next step is the consultants' confirmation batch.

§1 — What was diagnosed (grounded against source)
-------------------------------------------------

The Cross-Era report's REG-24 diagnosis was confirmed against the actual roadmap
skill, and sharpened `[P]`:

- The Foundation-Builder deadline path is **already airtight in isolation** — a dated
  `system_event_deadline` within the Now window places the FB in Now and stops, and
  the imminence pin + T-20 field-authority rule already forbid prose from deferring it.
- Therefore the fork is **not** a hole in the FB rules. It is a **cross-block bleed**:
  the Vincere cutover is simultaneously H-RT-07's *deadline* (FB rule → Now) and a
  *"named external gate/cutover"* — and the "named gate → Next" reading lives in the
  **Quick-Win** D-GATE4 block, whose text-pattern trigger scans for exactly
  "Vincere migration"/"cutover". One run in four reached across the class boundary and
  applied the Quick-Win gate-reading to a Foundation Builder. Nothing globally declared
  the matched deadline **terminal**.
- The correlated signal (S4 AA = 4 vs 5×3) is the same run dropping H-RT-07's
  `[Archetype-Anchored]` score anchor when it mis-placed the entity.

§2 — The fix package (v37.1 — all S4-scoped, committed & deployed) `[C]`
-----------------------------------------------------------------------

1. **Precedence preamble (REG-24)** — `blueprint-roadmap/SKILL.md`. A first-match-wins
   ladder evaluated *before* any class table, resolving the deadline-vs-gate conflict
   once and globally:
   - **P1 `phase_dependency=strict` → Later**, unconditional, any class.
   - **P2 Foundation Builder + dated `system_event_deadline`/`compliance_deadline`
     within the Now window → Now, terminal** — not reconsidered by any gate rule,
     dependency reading, or prose.
   - else → the existing class-specific table.

2. **Cross-block scope guard (REG-24)** — `blueprint-roadmap/SKILL.md`. D-GATE4 is now
   explicitly Quick-Win-scoped and **never** fires on a Foundation Builder or on any
   hypothesis carrying a dated deadline field; the migration/cutover text-pattern must
   not fire when that cutover is the entity's own `system_event_deadline`. This closes
   the specific bleed path.

3. **S4 Archetype-Anchored sibling enforcer (REG-22 extension)** —
   `backend/src/utils/opportunityValidator.ts`, `validateRoadmapArchetypeAnchoring`,
   wired into GATE-4. A zero-floor BLOCKER: a populated Stage-4 roadmap with zero
   `[Archetype-Anchored]` score anchors fails pre-flight. (Design note in §4.)

4. **Seeded two-assertion catch + negative test** — `harness/check_expectation.py`
   (`stage4_aa_min`, optional field) and `harness/tests/test_seeded_battery.py`
   (Seed D: H-RT-07 in Now but anchor dropped 5→4; Seed E: ladder-swap → Next; plus a
   conforming REG-24 control). Assertion 1 = placement is Now; assertion 2 = the AA
   anchor is retained. Per the house rule, this seeded catch — not a clean re-run — is
   what retires REG-24.

§3 — No-regression guard (freeze) `[P]`
---------------------------------------

A PreToolUse edit guard now hard-blocks writes to the four GREEN stages
(`blueprint-intake`, `blueprint-maturity`, `blueprint-opportunities`,
`blueprint-assembly`), exempting only the shared `harness/` and leaving S4
(`blueprint-roadmap`) and `backend/src/utils` editable. Registered in
`.claude/settings.json`; script at `.claude/hooks/freeze-green-stages.sh`. The final
change set touched **zero** files under any GREEN stage directory — verified from
`git status`. The four GREEN stages are byte-unchanged.

§4 — Two deliberate divergences from the Cross-Era report (both to PREVENT regressions)
---------------------------------------------------------------------------------------

1. **The report's literal precedence ladder would have regressed H-RT-04.** H-RT-04
   also carries `system_event_deadline=2026-07-31`, but it must remain **Later** (it is
   a strict-dependency Big Bet). A naïve "dated deadline → Now, stop" ordering pushes it
   to Now. The implemented ladder puts `phase_dependency=strict → Later` **first**, so
   all eight hypotheses resolve exactly to the signed manifest's phase map. `[P]`
   (verified by the expectation check).

2. **S4 AA enforcer is a zero-floor, not "one tag per row."** The report's own numbers
   show the stable count is **5 anchors across 8 rows** (only the detailed Now/Next
   blocks cite the locked feasibility). A per-row (=8) enforcer would false-fire on a
   *conforming* run and could block a GREEN acceptance batch. The app enforcer therefore
   asserts only the always-safe floor (zero = fail); the precise count assertion
   (`stage4_aa_min=5`) lives in the harness seeded catch, graded against the pinned
   expectation.

§5 — Verification (local, pre-deploy) `[P]`
-------------------------------------------

- Typecheck clean; **jest 160/160** (+4 new S4 AA sibling tests).
- **VERIFY_ALL: PASS** — gate, validators, stability, expectation-vs-signed-manifest.
- **Seeded battery 8/8** — 3 controls pass; Seeds A, B, C, **D, E** all caught.
- **Signed manifest seal INTACT**: `content_sha256` unchanged. The `stage4_aa_min`
  assertion runs against a local expectation copy; the manifest is NOT re-sealed by this
  work. (It folds into the manifest's S4 slice at the v1.1 re-seal — an S4-field-only
  amendment.)

§6 — Deferred, by design (NOT in v37.1)
---------------------------------------

- **S3 AA count ruling (7 vs pinned 8).** v37 emitted 7 `[Archetype-Anchored]` tags in
  Stage 3 where the skill and manifest pin 8; the likely cause is a contradiction between
  the tag's *count* pin (8, incl. H-CORE-00) and its *semantic* ("locked to the
  recruitment archetype Typical columns" — false for H-CORE-00, whose values come from
  the CORE Foundation Pattern). Resolving it requires a **deliberate ruling** — broaden
  the tag semantic (keep 8) or give H-CORE-00 a distinct `[Core-Anchored]` tag (drop to
  7) — because forcing 8 blindly would stamp a semantically-false tag on the Brain. It
  lives in the frozen S3 stage and is **untouched**; owner Ivan, at the v1.1 event.
- ADR-001 render-from-contract, the Type-B calibration deltas, and operator items
  (fixture rename, single-source stamp) remain scheduled at the v1.1 event / operator
  backlog per the Cross-Era report §5.

§7 — What the consultants should run (confirmation batch)
---------------------------------------------------------

Purpose: confirm REG-24 is closed and no GREEN stage regressed. `[X]`

1. **n=4 on the deployed v37.1 build**, intake_v1.1, Meridian fixture. Confirm in the
   bundle: pipeline label reads **v37.1** and the commit SHA matches the deployed head.
2. **REG-24 (the blocker):** H-RT-07 lands in **Now** in all four runs, **and** its
   `[Archetype-Anchored]` score anchor is present in the "Why now" detail (the two
   assertions). H-RT-04 must remain **Later** (regression check on the precedence
   ordering).
3. **No-regression on the GREEN stages:** S1 selection/scores spine, S2 6/6 dims, S3
   scores/class + AA, S5 token-clean — all must reproduce their v37 results 4-for-4.
4. **Seeded battery** alongside the natural n=4, including Seeds D and E — the seeded
   H-RT-07 catch must fire on both assertions (the only thing that retires an
   intermittent fork).
5. **Declare the export route** of each graded artifact (WL-20 "deployed ≠ effective"):
   state whether S4 was graded from the in-app DOCX, PDF, TXT, or a converted copy, so
   any formatting observation is attributed to the right layer.

Pass criteria: 6/6 with the seeded catch firing on both assertions, H-RT-04 held at
Later, and the four GREEN stages unchanged → **REG-24 retired**, clearing the sole
product blocker on the path to v1.

---

*End of record. Frame-compatible: appends to the lineage as the v37.1 S4 remediation
answering the v37 verification's REG-24 finding. Introduces no new register IDs beyond
REG-24 (already flagged in the v37 verification).*
