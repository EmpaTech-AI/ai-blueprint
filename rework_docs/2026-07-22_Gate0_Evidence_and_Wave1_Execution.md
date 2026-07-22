# Gate-0 Evidence (from source) + Wave-1 Execution Record

**AI Assist BG · Blueprint Practice · 2026-07-22 · for the validation analyst's independent re-verification (§8.1)**
**Provenance:** everything below is `[P]`-class — read from the application source in this repository, with file/line cites. Artifact diffs (T1–T4 copies) remain valuable as confirmation but are no longer the only evidence path.

## Discovery that changes the adjudication's premises: the app layer is IN this repo

All three memos assumed the app-layer instrumentation "lives in a different repo." It does not: `backend/src/` contains the full application (pipeline orchestrator, routes incl. the delivery endpoint, the DOCX renderer, the permit lists). Consequences: (a) Wave 1 was executable immediately — and is now done; (b) the four-layer version checklist collapses into this repo's single commit discipline; (c) `npm run build` copies `src/skills → dist/skills`, so any deployment built from commit `569827b` served the v1.1 skills — corroborating the version-split reading of Era N.

## S-44 mechanism — established from source (three concurrent causes)

1. **Contract-side (fixed in Wave 2):** the v1.0 S2/S4 skill contracts never mandated heading levels — Stage 2's format literally specified **bold** dimension labels. Models followed the contract; the checkers looked for headings the contract never promised.
2. **Allowlist keying (fixed today):** `src/utils/confidenceScorer.ts` `SECTION_ALLOWLISTS` keyed `stepC` and `stepD2` to **level 3**, while the v1.1 Mandatory Heading Contracts pin those sections at **level 2**. Result: "no headings at level 3" → NO-OP → stage unverified → the loudest Era-N flags. (`stepB`=2, `stepD`=3, `stepE`=1 matched their contracts and ran — exactly the v36 pattern: BLOCKERs on S1/S3, NO-OPs on S2/S4.)
3. **Renderer flattening (fixed today):** `src/docx/assembler.ts` rendered `##`/`###` as **bold text runs without Word heading styles** (only section titles got HEADING_1) — the literal Era-L ledger note ("only the doc title is Heading1") and the v36 "H1 + bold" observation. Any DOCX-derived copy therefore flattens.

**Bearing on the parked REG-18 classification (Ivan's call, untouched):** cause 3 is product-side (the client deliverable lacked real heading hierarchy); causes 1–2 are contract/instrument alignment. The evidence supports Ivan's both-at-once boundary.

## Wave-1 changes made (all `[C]` until Gate 4)

| Fix | Where | What |
|---|---|---|
| T-32 renderer | `src/docx/assembler.ts` | `##`/`###` now emit real `HeadingLevel.HEADING_2/HEADING_3` styles (visual styling preserved) |
| Checker re-key | `src/utils/confidenceScorer.ts` | `stepC`/`stepD2` → level 2 per the v1.1 contracts, with a comment binding the lists to `permit_manifest_intake_v1_1.json` (WL-18: regenerate at every version event, never hand-tune) |
| T-07 durable stamp | `src/utils/buildInfo.ts` (new) + `orchestrator.ts` | the `pipeline=` label now comes from ONE source (env override → `package.json` `pipelineLabel`, currently `v36.1`); the hardcoded `v35.1` literals are gone; SHA remains the anchor; `unknown` beats a wrong label |
| Manifest correction | `permit_manifest_intake_v1_1.json` | stage-3 sections corrected to level 3 (matches `stepD`, which ran correctly in v36 — no churn where nothing was broken) |
| Test alignment | `confidenceScorer.test.ts` | stale level-3 Stage-4 fixture updated to the v1.1 H2 contract + a new fail-safe NO-OP test for legacy documents |

## Verification

`npm run typecheck` clean · **jest 142/142** (was 140/141 before; one stale fixture updated, one fail-safe test added) · `npm run build` succeeds and regenerates `dist/skills` with the v1.1 content · skills-side harness unchanged and green (gate PASS, 8/8, stability PASS, expectation 0-warn, seeded battery 5/5).

## Still owed

Artifact confirmation of the S-44 mechanism from the actual T1–T4 copies (analyst re-verification; the source evidence above predicts exactly what the diffs will show) · Gate-0(c) deploy log for the v36 batch (the build script + SHA make this mechanical going forward) · signatures on the expectation manifest · Gate-4 acceptance re-run — the only crediting event · Ivan's two reserved rulings.
