// ─── III.3 pin 1 (v37.6): the Stage-1 freeze manifest — a run-local archetype ─────────────────────
//
// The eight-batch report's Law 2: every LunaCart-only defect sits on a surface where Meridian's archetype
// supplies a canonical list the model COPIES and LunaCart leaves the model to DERIVE. Copying is
// reproducible; deriving is sampled, and n=4 makes the variance visible.
//
// The report's answer is not forty archetype files. It is: "Wherever hypotheses come from — library or
// emergence — the ID set, scores and phase-relevant flags freeze at Stage-1 exit into a run-local
// manifest. Stages 3–5 copy; a deviation is a fork." A run-local archetype, generated then pinned.
//
// THE STRUCTURAL POINT, which is why this is worth more than the defects it closes: A9 asserts every
// emitted score against the archetype row, so it cannot run at rung C — there is no row. The frozen
// manifest IS that row, derived from the run's own Stage 1. **It gives rung C a root.** That converts
// A9-equivalent checking from archetype-dependent to case-independent, which is the same move F13 made
// when it turned "primary data source" into a counted rule.
//
// What is frozen and what is not:
//   • ID set        — frozen. A Stage-3 addition or omission is a fork (REG-21 already asserts this;
//                     the manifest makes the reference an artifact rather than a re-parse).
//   • impact        — frozen. Nothing downstream may adjust it.
//   • alignment     — frozen. Same.
//   • the 9 relay flags — frozen. T-19/T-26 assert drift; the manifest is the reference.
//   • feasibility   — NOT frozen. A4 legitimately adjusts it downward from base_F. So the manifest
//                     records the Stage-1 value as the BASE and the assertion is directional: emitted
//                     feasibility may be ≤ base, never above it. An increase is a fork in every case,
//                     archetype or not, because no rule in the pipeline raises feasibility.

import { BLOCKER_PREFIX } from '../types/pipeline';
import { CorrectionRecord, makeRecord } from './correctionLog';
import { enumEquals } from './enumNormalise';

export const RELAY_FLAGS = [
  'ml_heavy', 'multi_source', 'regulated', 'large_integration', 'adoption_dependent',
  'd_gate4', 'compliance_deadline', 'system_event_deadline', 'phase_dependency',
] as const;

export interface FrozenElement {
  id: string;
  impact: number;
  baseFeasibility: number;
  alignment: number;
  flags: Record<string, string>;
}

export interface Stage1Manifest {
  frozenAt: 'stage1-exit';
  elements: FrozenElement[];
  ids: string[];
}

const SCORE_MARKER = /<!--\s*score:\s*([^>]*?)-->/g;

function markerFields(inner: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of inner.match(/(\w+)=([^\s]+)/g) ?? []) {
    const eq = pair.indexOf('=');
    out[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return out;
}

// v37.7 (register N1). The first exercise of A19 froze 9 elements at rung A (where 8 are expected) and
// 15 at rung C (where 8 are), producing deterministic forks on every run. Two causes, both here:
//
//   • DUPLICATE markers. Register T-26 records duplicate score markers as a real model defect, and the
//     extraction froze each occurrence separately — so a duplicate became two frozen elements whose
//     values differed, and every downstream comparison forked against whichever was written last.
//   • Markers OUTSIDE the authoritative list. A dossier carries score markers in Section D (the
//     hypothesis list) and can carry illustrative or restated markers elsewhere; freezing all of them
//     mixes the authority with its copies.
//
// A wrong manifest is worse than no manifest, because at rung C it is the ONLY integrity anchor that
// exists — so this dedupes by ID, and reports a value-differing duplicate as the defect it is rather
// than silently keeping one.
export interface Stage1ExtractionResult {
  manifest: Stage1Manifest;
  duplicateIds: string[];          // appeared more than once with IDENTICAL values — deduped silently
  conflictingIds: string[];        // appeared more than once with DIFFERENT values — a T-26 defect
}

const sameElement = (a: FrozenElement, b: FrozenElement): boolean =>
  a.impact === b.impact && a.baseFeasibility === b.baseFeasibility && a.alignment === b.alignment &&
  RELAY_FLAGS.every(f => a.flags[f] === b.flags[f]);

export function extractStage1ManifestDetailed(dossier: string): Stage1ExtractionResult {
  const byId = new Map<string, FrozenElement>();
  const duplicateIds: string[] = [];
  const conflictingIds: string[] = [];
  const re = new RegExp(SCORE_MARKER.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(dossier)) !== null) {
    const f = markerFields(m[1]);
    const id = (f.id ?? '').toLowerCase();
    const impact = parseInt(f.impact ?? '', 10);
    const baseFeasibility = parseInt(f.feasibility ?? '', 10);
    const alignment = parseInt(f.alignment ?? '', 10);
    if (!id || [impact, baseFeasibility, alignment].some(n => Number.isNaN(n))) continue;
    const flags: Record<string, string> = {};
    for (const flag of RELAY_FLAGS) flags[flag] = f[flag] ?? 'absent';
    const element: FrozenElement = { id, impact, baseFeasibility, alignment, flags };

    const existing = byId.get(id);
    if (!existing) { byId.set(id, element); continue; }
    // FIRST occurrence wins: Section D precedes any restatement, and the authority should not depend on
    // document order beyond that. A conflict is reported, never silently resolved.
    if (sameElement(existing, element)) {
      if (!duplicateIds.includes(id)) duplicateIds.push(id);
    } else if (!conflictingIds.includes(id)) {
      conflictingIds.push(id);
    }
  }
  const elements = [...byId.values()];
  return {
    manifest: { frozenAt: 'stage1-exit', elements, ids: elements.map(e => e.id) },
    duplicateIds, conflictingIds,
  };
}

export function extractStage1Manifest(dossier: string): Stage1Manifest {
  return extractStage1ManifestDetailed(dossier).manifest;
}

export interface ManifestCheckResult {
  reviewerFlags: string[];
  records: CorrectionRecord[];
  checked: number;
  unavailableReason: string | null;
}

// Assert a downstream stage against the freeze. `stageLabel` names the stage in every flag so a fork is
// attributable without cross-referencing — the locus discipline the eight-batch report priced.
export function validateAgainstManifest(
  stageOutput: string,
  manifest: Stage1Manifest,
  stageLabel = 'Stage 3',
): ManifestCheckResult {
  const reviewerFlags: string[] = [];
  const records: CorrectionRecord[] = [];

  if (manifest.elements.length === 0) {
    return {
      reviewerFlags: [
        `${BLOCKER_PREFIX} GATE 1 A19 (Stage-1 freeze): no score markers parsed from the Stage-1 dossier, ` +
        `so nothing could be frozen. Every downstream element is UNROOTED for this run — at rung C this ` +
        `manifest is the only root that exists, so its absence is not a coverage gap, it is total.`,
      ],
      records, checked: 0, unavailableReason: 'no_stage1_markers',
    };
  }

  const frozen = new Map(manifest.elements.map(e => [e.id, e]));
  const emitted = extractStage1Manifest(stageOutput);   // same marker shape downstream
  const emittedIds = new Set(emitted.ids);
  let checked = 0;

  // ── ID set equality: the freeze is the authority on membership ──
  for (const id of manifest.ids) {
    if (!emittedIds.has(id)) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 3 A19 (Stage-1 freeze): ${stageLabel} DROPPED ${id}, which was frozen at ` +
        `Stage-1 exit. The frozen ID set is the authority on membership — restore the element or the ` +
        `portfolio no longer matches the one the client's evidence selected.`,
      );
    }
  }
  for (const id of emitted.ids) {
    if (!frozen.has(id)) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 3 A19 (Stage-1 freeze): ${stageLabel} INVENTED ${id}, absent from the ` +
        `Stage-1 freeze. At rung C the model derives its own IDs, so an ID appearing first at ${stageLabel} ` +
        `has no evidentiary basis in the intake.`,
      );
    }
  }

  // ── Per-element: impact/alignment/flags frozen; feasibility directional ──
  for (const e of emitted.elements) {
    const root = frozen.get(e.id);
    if (!root) continue;
    checked++;

    for (const [field, authored, rootValue] of [
      ['impact', e.impact, root.impact],
      ['alignment', e.alignment, root.alignment],
    ] as const) {
      records.push(makeRecord('stage3', e.id, `frozen_${field}`, authored, rootValue,
        { rule: 'A19 Stage-1 freeze', frozenAt: 'stage1-exit' }, 'A19'));
      if (authored !== rootValue) {
        reviewerFlags.push(
          `${BLOCKER_PREFIX} GATE 3 A19 (Stage-1 freeze): ${e.id} ${field}=${authored} at ${stageLabel} ` +
          `but ${rootValue} at the Stage-1 freeze. ${field} is frozen — no rule in the pipeline adjusts ` +
          `it, so a change is a re-derivation, not an adjustment.`,
        );
      }
    }

    // Feasibility is directional, not equal: A4 may reduce it, nothing may raise it.
    records.push(makeRecord('stage3', e.id, 'feasibility_vs_base', e.baseFeasibility, root.baseFeasibility,
      { rule: 'A19 feasibility ≤ base', base: root.baseFeasibility }, 'A19'));
    if (e.baseFeasibility > root.baseFeasibility) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 3 A19 (Stage-1 freeze): ${e.id} feasibility ROSE from ${root.baseFeasibility} ` +
        `(Stage-1 base) to ${e.baseFeasibility} at ${stageLabel}. No rule in the pipeline raises ` +
        `feasibility — the D6 adjustment only reduces it — so an increase is a re-derivation of a locked score.`,
      );
    }

    for (const flag of RELAY_FLAGS) {
      const authored = e.flags[flag];
      const rootValue = root.flags[flag];
      if (authored === 'absent' && rootValue === 'absent') continue;
      if (!enumEquals(authored, rootValue)) {
        reviewerFlags.push(
          `${BLOCKER_PREFIX} GATE 3 A19 (Stage-1 freeze): ${e.id} ${flag}=${authored} at ${stageLabel} but ` +
          `${rootValue} at the Stage-1 freeze. The nine relay fields are frozen — Stage 4 reads them for ` +
          `phase placement, so drift here moves an opportunity between phases.`,
        );
      }
    }
  }

  return { reviewerFlags, records, checked, unavailableReason: null };
}
