# Conformance Check — Repo State vs the Era-N Adjudication (Steven, 22 Jul 2026)

**Prepared by Claude (Fable 5) on Viktor's instruction · append-only · verification results reproducible from the working tree**

## Gate-by-gate verdict

| Adjudication item | Repo state | Verdict |
|---|---|---|
| **Gate 0 triage** (3 artifact checks; analyst re-verifies) | Artifacts not in this repo; needed-list specified (T1–T4 raw+delivery, T2 raw S5 first, CI/deploy evidence for 0(c)) | **Blocked on artifact delivery — correctly not attempted from summaries** |
| **Gate 1 app layer** | Input delivered: `harness/permit_manifest_intake_v1_1.json` (schema-generated permit/detector keying, renderer heading-census contract, token-based any-form S5 strip per §2.3); skills-side stamp de-hardcoded (supplied-by-bundle, `unknown` over wrong label); OPERATIONS four-layer checklist (= WL-18 substance) | **Conformant (repo share); app work owed by Viktor** |
| **Gate 2 pins** | KR2 absorption whitelist at the decision point + Checkpoint-2 assertion; KR3 imminence pin + GATE-4 deadline audit — both started immediately per condition (i) | **Conformant** |
| Gate 2 — "harness recompute of score-implied top-N" | Implemented as **signed-manifest diff** (`check_expectation.py`) rather than literal recompute — deliberate (a checker sharing pipeline logic shares its bugs); seeded battery proves the drop class is caught; n=2 cross-run diff covers live clients | **Conformant in function; literal recompute variant available on analyst request** |
| Gate 2 — S2/S4 heading anchors | **Executed ahead of Gate 0 — declared sequencing deviation.** Rationale: Stage 2's contract specified no heading levels at all (contract-completion, correct under either triage outcome); mirrors the permit manifest. Self-contained skeleton blocks, trivially revertible if Gate-0 evidence argues otherwise | **Deviation, declared, revert path stated** |
| Gate 2 — condition (ii) WL-7 full-spine pass | Run after all contract edits: gate PASS · validator 8/8 · stability PASS · expectation PASS (0 warns) · seeded battery 5/5. Mandatory again at Gate 4 | **Conformant** |
| Gate 2 — structural refinements (T-30-refine) timing | Not folded in (Viktor's veto respected; T-32 wins) | **Conformant** |
| **Gate 3 pre-registration** | `expected/BP-TEST-001_v1_1_expected.json`: selection 8 incl. H-CORE-00/H-RT-10 ✓ full score vector (Stage 1 + post-D6) ✓ maturity anchors ✓ portfolio classes ✓ phase vector with H-CORE-00 undivided strict-Later ✓ CEO name (+full name) ✓ **cutover date field added today** ✓ | **Conformant; SIGNATURES OWED (signoff block empty by design)** |
| **Gate 4 acceptance** | Meridian-only, n=4 + 3-seed battery, /delivery + bundle, graded vs signed spine — tooling ready. **Band 2/3 runs: separate, non-gating per §2.5** (an earlier report line bundling them into the gate has been corrected in this record) | **Ready; execution owed** |
| **Parked for Ivan** | REG-18 reclassification untouched; Approach-3 full build untouched (permit manifest = authorized prep only); "MK3" not addressed here | **Conformant** |
| §2.1 T-07 → 🟠 | Ledger correction is the next consolidated report's append; repo side done (stamp de-hardcoded); Gate-0(c) evidence owed | **Conformant (repo share)** |
| §2.3 release bar | No repo document softens the T2 S5 breach; form-insensitive strip encoded in the manifest | **Conformant** |
| §4 fixture date hygiene / Test-4 label | Manifest note pre-empts the passed-date false-alarm; fixture-naming rule in the run-book | **Conformant** |

## Summary

All Gate-1/2/3 repo-side obligations are met and verified; one declared sequencing deviation
(S2/S4 heading anchors ahead of Gate 0 — flagged, revertible); one wording variance (manifest
diff vs literal recompute — justified, upgradable). Owed by others: Gate-0 artifacts + 0(c)
build evidence, Wave-1 app fixes, manifest signatures, Gate-4 execution, and Ivan's two
reserved rulings. Nothing in this repo claims credit before Gate 4 — every fix is `[C]` until
it survives ×4 on delivery copies.
