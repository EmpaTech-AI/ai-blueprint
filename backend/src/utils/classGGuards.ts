// ─── Class-G correcting guards from root (contract v1.3 §4 / step 2) ─────────────────────────
//
// Class-G values are pure functions of upstream values, so they are recompute-and-correct with a
// zero-false-fire guarantee. The safety rule (REG-27a) is absolute: correct from the ROOT source,
// never from a sibling component. Post-adjustment feasibility is recomputed from base_F (the
// archetype Typical value) + the Stage-1 marker flags + the maturity dimensions — never from the
// stated product. Direction of trust flows root → derived, one way only.
//
// This module holds the pure logic (recompute + archetype parse + the guard that emits correction
// records). The orchestrator supplies the roots (archetype table + maturity) and the enforcement
// mode; the guard itself is pure and unit-testable.

import { BLOCKER_PREFIX } from '../types/pipeline';
import { CorrectionRecord, makeRecord } from './correctionLog';

// A4 flag → maturity-dimension map (contract v1.3 §4.1, verified against all 12 runs).
export const FLAG_DIMENSION: Record<string, string> = {
  ml_heavy: 'Data',
  multi_source: 'Data',
  regulated: 'Governance',
  large_integration: 'Technology',
  adoption_dependent: 'People',
};

// adjusted_F = max(1, base_F − Σ_f [ flag[f] == "yes" AND maturity[dim(f)] == "Early" ]).
// Each firing flag is a SEPARATE term — two flags on one Early dimension stack to −2 (the REG-27
// root cause; "one reduction per dimension" is the wrong reading) — and each is gated by its paired
// dimension being Early (a yes-flag whose dimension is not Early contributes nothing).
export function recomputeAdjustedFeasibility(
  baseF: number,
  flags: Record<string, string>,
  earlyDims: Set<string>,
): { adjustedF: number; firing: string[] } {
  const firing: string[] = [];
  for (const [flag, dim] of Object.entries(FLAG_DIMENSION)) {
    if ((flags[flag] ?? 'no').toLowerCase() === 'yes' && earlyDims.has(dim)) firing.push(flag);
  }
  return { adjustedF: Math.max(1, baseF - firing.length), firing };
}

export interface HypothesisRoot {
  baseImpact: number;
  baseFeasibility: number;
  baseAlignment: number;
  flags: Record<string, string>;
}

const FLAG_COLUMNS = [
  'ml_heavy', 'multi_source', 'regulated', 'large_integration', 'adoption_dependent',
  'd_gate4', 'compliance_deadline', 'system_event_deadline', 'phase_dependency',
];

// Parse an archetype "Hypothesis Library" markdown table into id → root scores + flags. Columns:
// | ID | Hypothesis | Typ Impact | Typ Feasibility | Typ Alignment | Default Class | <9 flags> |
export function parseArchetypeHypothesisTable(md: string): Map<string, HypothesisRoot> {
  const out = new Map<string, HypothesisRoot>();
  for (const line of md.split('\n')) {
    if (!/^\|\s*H-[A-Z]+-\d+\s*\|/.test(line)) continue;
    const cells = line.split('|').map(c => c.trim());
    // cells[0] is '' (leading pipe); id at [1], scores at [3..5], flags start at [7].
    const id = cells[1].toLowerCase();
    const baseImpact = parseInt(cells[3], 10);
    const baseFeasibility = parseInt(cells[4], 10);
    const baseAlignment = parseInt(cells[5], 10);
    if ([baseImpact, baseFeasibility, baseAlignment].some(n => Number.isNaN(n))) continue;
    const flags: Record<string, string> = {};
    FLAG_COLUMNS.forEach((f, i) => { flags[f] = (cells[7 + i] ?? '').toLowerCase(); });
    out.set(id, { baseImpact, baseFeasibility, baseAlignment, flags });
  }
  return out;
}

// Parse the maturity dimensions that are "Early" from a Stage-2 snapshot (rows like "| Data | Early").
const DIM_RE = /^\|\s*(Strategy|Data|Technology|People|Processes|Governance)\s*\|\s*(Early|Developing|Established)/gim;
export function parseEarlyDimensions(maturityOutput: string): Set<string> {
  const early = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(DIM_RE.source, 'gim');
  while ((m = re.exec(maturityOutput)) !== null) {
    if (m[2].toLowerCase() === 'early') early.add(m[1]);
  }
  return early;
}

const SCORE_MARKER_RE = /<!--\s*score:\s*([^>]*?)-->/g;
function parseMarkerFields(inner: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const pair of inner.match(/(\w+)=([^\s]+)/g) ?? []) {
    const eq = pair.indexOf('=');
    fields[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return fields;
}

export interface OverrideEntry {
  elementId: string;
  field: string;
  archetypeValue: string | number;
  emittedValue: string | number;
  cited: boolean;
}

// A9 (contract v1.3 §4): root integrity. Every base score and every archetype-pinned flag must
// equal the archetype row unless a [Document-Backed] override is cited in the card. Feasibility is
// EXCLUDED (it is adjusted — that is A4's job); so are the two client-specific date fields
// (compliance_deadline / system_event_deadline), which are legitimately client-supplied. The
// remaining fields are archetype-fixed. A deviation without a citation is a BLOCKER; a cited
// deviation goes to the Override Register (the bounded human-review worklist — on Meridian it
// should be empty). Citation-presence is machine-checked; citation VALIDITY stays human.
const A9_PINNED_FLAGS = ['ml_heavy', 'multi_source', 'regulated', 'large_integration', 'adoption_dependent', 'd_gate4', 'phase_dependency'];

export function validateRootIntegrity(
  stage3Output: string,
  roots: Map<string, HypothesisRoot>,
): { reviewerFlags: string[]; overrideRegister: OverrideEntry[] } {
  const reviewerFlags: string[] = [];
  const overrideRegister: OverrideEntry[] = [];
  const re = new RegExp(SCORE_MARKER_RE.source, 'g');
  let m: RegExpExecArray | null;
  let prevEnd = 0;
  while ((m = re.exec(stage3Output)) !== null) {
    const fields = parseMarkerFields(m[1]);
    const id = (fields.id ?? '').toLowerCase();
    const root = roots.get(id);
    const cardProse = stage3Output.slice(prevEnd, m.index); // the prose leading up to this marker
    prevEnd = m.index + m[0].length;
    if (!root) continue;
    const cited = /\[Document[- ]?Backed/i.test(cardProse);
    const checks: Array<[string, string | number, string | number]> = [
      ['impact', root.baseImpact, Number(fields.impact)],
      ['alignment', root.baseAlignment, Number(fields.alignment)],
    ];
    for (const flag of A9_PINNED_FLAGS) {
      checks.push([flag, root.flags[flag] ?? 'no', (fields[flag] ?? 'no').toLowerCase()]);
    }
    for (const [field, archVal, emitVal] of checks) {
      if (Number.isNaN(emitVal as number)) continue; // unparseable emitted number — skip
      if (String(archVal) !== String(emitVal)) {
        overrideRegister.push({ elementId: id, field, archetypeValue: archVal, emittedValue: emitVal, cited });
        if (!cited) {
          reviewerFlags.push(
            `${BLOCKER_PREFIX} GATE 3 A9 (root integrity) for ${id}: ${field}=${emitVal} deviates from the ` +
            `archetype row (${archVal}) with NO [Document-Backed] override cited in the card. Restore the ` +
            `archetype value or cite the client source passage.`,
          );
        }
      }
    }
  }
  return { reviewerFlags, overrideRegister };
}

// A4 correcting guard: recompute each card's post-adjustment feasibility from root and emit a
// correction record. Uses the ROOT (archetype) base_F and ROOT flags — manifest-independent.
// Cards whose id is absent from `roots` (e.g. H-CORE-00 until its _core.md root is supplied) are
// skipped, not failed. `reviewerFlags` fires on a fork (advisory in acceptance; the emitted value
// is corrected only in production, controlled by the caller via correctionLog.emittedValue).
export function validateFeasibilityFromRoot(
  stage3Output: string,
  roots: Map<string, HypothesisRoot>,
  earlyDims: Set<string>,
): { records: CorrectionRecord[]; reviewerFlags: string[] } {
  const records: CorrectionRecord[] = [];
  const reviewerFlags: string[] = [];
  const re = new RegExp(SCORE_MARKER_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(stage3Output)) !== null) {
    const fields = parseMarkerFields(m[1]);
    const id = (fields.id ?? '').toLowerCase();
    const root = roots.get(id);
    const emittedF = parseInt(fields.feasibility ?? '', 10);
    if (!root || Number.isNaN(emittedF)) continue;
    const { adjustedF, firing } = recomputeAdjustedFeasibility(root.baseFeasibility, root.flags, earlyDims);
    const rec = makeRecord(
      'stage3', id, 'feasibility', emittedF, adjustedF,
      { baseF: root.baseFeasibility, firingFlags: firing, earlyDims: [...earlyDims].sort() }, 'A4',
    );
    records.push(rec);
    if (!rec.agreed) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 3 REG-27 (A4 feasibility) for ${id}: emitted Feasibility=${emittedF}, but ` +
        `root recompute = base ${root.baseFeasibility} − ${firing.length} firing flag(s) ` +
        `[${firing.join(', ') || 'none'}] on Early dimension(s) = ${adjustedF} (floor 1). Two flags on one ` +
        `Early dimension stack (−2). Corrected from root, logged per C1.`,
      );
    }
  }
  return { records, reviewerFlags };
}
