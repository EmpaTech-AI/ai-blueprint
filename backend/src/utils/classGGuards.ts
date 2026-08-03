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
import { isYes, enumEquals, normaliseEnumCell } from './enumNormalise';

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
    // v37.4a: normalised, so an annotated flag value ("yes (documented p.4)") still fires. An exact
// match here would silently UNDER-count firing flags and log a false agreement — the worst
    // direction for this class of bug to fail in.
    if (isYes(flags[flag]) && earlyDims.has(dim)) firing.push(flag);
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

// A16c (v37.4a): the archetype's CORE-columns table, which is where `band1_pool` actually lives —
// NOT the Hypothesis Library table above. Shape (`_core.md` §5):
//   | ID | `agent_shaped` | `h0_consumer` | `band1_pool` | Notes |
// A16 asserts that an exclusion is authorised by PP-0's severity; A16c asserts it has a ROOT — that the
// excluded candidate's archetype row really carries `band1_pool=no`. Without this, an exclusion is a
// model assertion with no source, and a fabricated one silently removes a real opportunity from the
// client's deliverable (LunaCart v1 T4 did exactly that).
export interface PoolFlags { agentShaped: string; h0Consumer: string; band1Pool: string; }

export function parseArchetypePoolFlags(md: string): Map<string, PoolFlags> {
  const out = new Map<string, PoolFlags>();
  for (const line of md.split('\n')) {
    if (!/^\|\s*\**\s*H-[A-Z]+-\d+\s*\**\s*\|/.test(line)) continue;
    const cells = line.split('|').map(c => c.replace(/[`*]/g, '').trim());
    if (cells.length < 5) continue;
    const id = cells[1].toLowerCase();
    // Discriminate this table from the Hypothesis Library by the ONE cell we actually need: in the
    // CORE-columns table cells[4] is `band1_pool` (yes/no); in the Hypothesis Library cells[4] is
    // Typical Feasibility (a digit), which can never normalise to yes/no. Deliberately not a check on
    // cells[2..4] all being enum-ish — H-CORE-00's row is `| H-CORE-00 | n/a | n/a | yes |` and `n/a`
    // normalises to "n", so an all-cells check silently dropped the one ID whose exclusion matters most.
    const tokens = [cells[2], cells[3], cells[4]].map(c => normaliseEnumCell(c));
    if (!['yes', 'no'].includes(tokens[2])) continue;
    out.set(id, { agentShaped: tokens[0], h0Consumer: tokens[1], band1Pool: tokens[2] });
  }
  return out;
}

// Parse the maturity dimensions and their grades from a Stage-2 snapshot (rows like "| Data | Early").
const DIM_RE = /^\|\s*(Strategy|Data|Technology|People|Processes|Governance)\s*\|\s*(Early|Developing|Established)/gim;

export function parseMaturityDimensions(maturityOutput: string): Map<string, string> {
  const dims = new Map<string, string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(DIM_RE.source, 'gim');
  while ((m = re.exec(maturityOutput)) !== null) dims.set(m[1], m[2].toLowerCase());
  return dims;
}

export function parseEarlyDimensions(maturityOutput: string): Set<string> {
  const early = new Set<string>();
  for (const [dim, grade] of parseMaturityDimensions(maturityOutput)) {
    if (grade === 'early') early.add(dim);
  }
  return early;
}

// ─── Guard availability (v37.4 / LunaCart TC1 finding) ───────────────────────────────────────
//
// The LunaCart batch exposed the most dangerous behaviour in the programme: A4 emitted
// `SKIPPED — archetype roots or Early maturity dimensions not resolvable this run.` on all four
// runs, and A9 emitted NOTHING AT ALL, so the batch reported "0 forks" from a half-disabled
// checker. One message covered four causes, three of which are bugs:
//
//   1. no archetype file covers the emitted IDs  → LEGITIMATE unavailability (no ACTIVE archetype)
//   2. the archetype directory could not be read → BUG (was swallowed by a bare catch)
//   3. the maturity dimension table did not parse → BUG (indistinguishable from cause 4)
//   4. zero dimensions graded Early              → NOT unavailable at all. The recompute is
//      well-defined (adjustedF = base_F − 0) and is a real assertion: "the model reduced
//      feasibility for no reason". Skipping it meant the CLEANEST clients got the LEAST checking,
//      and it is why LunaCart T1 (DDDDDD) would still skip A4 even with a retail archetype built.
//
// The rule adopted: a guard whose reference is external to the run is only as available as that
// reference, so it needs an explicit unavailable STATE that is reported per cause — never a silent
// skip, and never a skip that a reviewer can mistake for a clean check. Cause 1 is loud-but-not-
// blocking (the T-29 permit-UNVERIFIED fail-safe idiom: "do not certify clean"); causes 2 and 3 are
// BLOCKERs, because the guard should have run and did not.
export type GuardUnavailableCause =
  | 'no_archetype_match'
  | 'archetype_read_error'
  | 'maturity_parse_failure'
  | 'maturity_parse_incomplete'
  | 'guard_threw';

// Which causes mean "our code is broken" (BLOCKER) vs "the reference genuinely does not exist"
// (loud partial scope). Never collapse these two: the first is a defect, the second is a fact.
export const IS_INTERNAL_FAULT: Record<GuardUnavailableCause, boolean> = {
  no_archetype_match: false,
  archetype_read_error: true,
  maturity_parse_failure: true,
  maturity_parse_incomplete: true,
  guard_threw: true,
};

// A4's recompute needs the grade of every dimension that a flag maps to — a dimension row missing
// from the table would silently under-count firing flags and could log a FALSE agreement, which is
// worse than not running. Strategy/Processes are unmapped, so their absence does not affect A4.
export const A4_REQUIRED_DIMENSIONS = Array.from(new Set(Object.values(FLAG_DIMENSION))).sort();

export interface MaturityAvailability {
  earlyDims: Set<string>;
  unavailable: { cause: GuardUnavailableCause; detail: string } | null;
}

// Distinguish "parsed, and nothing is Early" (available — the recompute still asserts base_F) from
// "the table did not parse" (unavailable, a bug). These were indistinguishable before v37.4.
export function assessMaturityAvailability(maturityOutput: string): MaturityAvailability {
  const dims = parseMaturityDimensions(maturityOutput);
  const earlyDims = new Set([...dims].filter(([, g]) => g === 'early').map(([d]) => d));
  if (dims.size === 0) {
    return {
      earlyDims,
      unavailable: {
        cause: 'maturity_parse_failure',
        detail: 'no "| <Dimension> | <Grade>" row parsed from the Stage-2 snapshot — the scorecard ' +
          'table is missing or its shape drifted. A4 cannot recompute without the dimension grades.',
      },
    };
  }
  const missing = A4_REQUIRED_DIMENSIONS.filter(d => !dims.has(d));
  if (missing.length > 0) {
    return {
      earlyDims,
      unavailable: {
        cause: 'maturity_parse_incomplete',
        detail: `parsed ${dims.size} dimension row(s) but ${missing.join(', ')} missing — every ` +
          'flag-mapped dimension must be present or A4 under-counts firing flags and can log a ' +
          'false agreement.',
      },
    };
  }
  return { earlyDims, unavailable: null };
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

// Per-card unchecked accounting. Before v37.4 both root guards did a bare `continue` on a card whose
// ID was absent from the archetype table, so a run whose archetype covered 1 of 8 cards reported
// exactly like a run that covered all 8 — and emitted no skip line at all. That silent per-card drop
// survives building every archetype in the library, so it is fixed here rather than by content.
export type UncheckedReason = 'no_root_for_id' | 'unparseable_emitted_value';
export interface UncheckedCard { id: string; reason: UncheckedReason; }

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
): { reviewerFlags: string[]; overrideRegister: OverrideEntry[]; checked: string[]; unchecked: UncheckedCard[] } {
  const reviewerFlags: string[] = [];
  const overrideRegister: OverrideEntry[] = [];
  const checked: string[] = [];
  const unchecked: UncheckedCard[] = [];
  const re = new RegExp(SCORE_MARKER_RE.source, 'g');
  let m: RegExpExecArray | null;
  let prevEnd = 0;
  while ((m = re.exec(stage3Output)) !== null) {
    const fields = parseMarkerFields(m[1]);
    const id = (fields.id ?? '').toLowerCase();
    const root = roots.get(id);
    const cardProse = stage3Output.slice(prevEnd, m.index); // the prose leading up to this marker
    prevEnd = m.index + m[0].length;
    if (!root) { unchecked.push({ id, reason: 'no_root_for_id' }); continue; }
    checked.push(id);
    const cited = /\[Document[- ]?Backed/i.test(cardProse);
    const checks: Array<[string, string | number, string | number]> = [
      ['impact', root.baseImpact, Number(fields.impact)],
      ['alignment', root.baseAlignment, Number(fields.alignment)],
    ];
    for (const flag of A9_PINNED_FLAGS) {
      checks.push([flag, root.flags[flag] ?? 'no', fields[flag] ?? 'no']);
    }
    for (const [field, archVal, emitVal] of checks) {
      if (Number.isNaN(emitVal as number)) continue; // unparseable emitted number — skip
      // Normalised on both sides: an archetype `yes` must match an emitted `yes (client confirmed)`.
      // An exact compare here would route a non-deviation into the Override Register as a BLOCKER.
      if (!enumEquals(archVal, emitVal)) {
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
  return { reviewerFlags, overrideRegister, checked, unchecked };
}

// A4 correcting guard: recompute each card's post-adjustment feasibility from root and emit a
// correction record. Uses the ROOT (archetype) base_F and ROOT flags — manifest-independent.
// Cards whose id is absent from `roots` (e.g. H-CORE-00, whose root lives in the `_core.md` the
// resolver excludes) are recorded as UNCHECKED with a reason, never silently dropped — the caller
// declares that count per C1 so "0 forks" can never be read as "8 of 8 clean" (v37.4).
// `reviewerFlags` fires on a fork (advisory in acceptance; the emitted value is corrected only in
// production, controlled by the caller via correctionLog.emittedValue).
//
// NOTE: an EMPTY `earlyDims` is a valid input, not a reason to skip. adjustedF = base_F − 0 is a
// real assertion ("no flag fires, so feasibility must equal the archetype Typical value"), and it is
// exactly the check LunaCart T1 (all-Developing) never got.
export function validateFeasibilityFromRoot(
  stage3Output: string,
  roots: Map<string, HypothesisRoot>,
  earlyDims: Set<string>,
): { records: CorrectionRecord[]; reviewerFlags: string[]; checked: string[]; unchecked: UncheckedCard[] } {
  const records: CorrectionRecord[] = [];
  const reviewerFlags: string[] = [];
  const checked: string[] = [];
  const unchecked: UncheckedCard[] = [];
  const re = new RegExp(SCORE_MARKER_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(stage3Output)) !== null) {
    const fields = parseMarkerFields(m[1]);
    const id = (fields.id ?? '').toLowerCase();
    const root = roots.get(id);
    const emittedF = parseInt(fields.feasibility ?? '', 10);
    if (!root) { unchecked.push({ id, reason: 'no_root_for_id' }); continue; }
    if (Number.isNaN(emittedF)) { unchecked.push({ id, reason: 'unparseable_emitted_value' }); continue; }
    checked.push(id);
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
  return { records, reviewerFlags, checked, unchecked };
}

// ─── C1 per-family coverage declaration (v37.4, item 2) ──────────────────────────────────────
//
// The v38→LunaCart drop "C1 Class-A values checked: 15 → 8" was read as coverage halving. It is
// not: it is arithmetic. C1's total is the SUM of per-family record counts, so Meridian's 15 was
// 8 A5-class + 7 A4-feasibility (H-CORE-00 has no root), and LunaCart's 8 was 8 A5-class + 0
// A4-feasibility. Every card got its A5 check in both runs; one FAMILY was unavailable.
//
// That is why a single "checked N of M expected" line cannot work — M is not a constant, it is
// per-family (cards × families available), and a fixed denominator would be a fabricated number.
// Coverage is declared per family, with an explicit unavailable state and its cause, plus a verdict
// the acceptance harness can key off mechanically (`gradeable`) instead of parsing prose.
export interface FamilyCoverage {
  family: string;
  ruleId: string;
  expected: number;
  checked: number;
  forks: number;
  unchecked: UncheckedCard[];
  unavailable: { cause: GuardUnavailableCause; detail: string } | null;
}

export interface GateACoverage {
  cardsEmitted: number;
  families: FamilyCoverage[];
  gradeable: boolean;   // every family available AND every emitted card checked in every family
  internalFaults: FamilyCoverage[];
}

// Structurally rootless BY CONSTRUCTION: the CORE pattern's root row lives in `_core.md`, which the
// resolver excludes (leading underscore) and whose table carries no ID column, so H-CORE-00 has no
// root on ANY run — Meridian included. Declaring it keeps the coverage number honest without firing
// the partial-coverage warning on every clean run: a warning that always fires is precisely the
// GATE-4 "Phase 1: Now appears empty" false-fire the Practice has flagged unchanged since v38, and
// it trains the reviewer to skip the line that matters.
//
// TODO(v37.5): wire the `_core.md` row so A4/A9 cover H-0 as well. Deliberately NOT done here — A4
// would then recompute H-0 as max(1, base_F 2 − ml_heavy − multi_source on Data=Early) = 1, so a
// Meridian run emitting 2 becomes a REG-27 BLOCKER on the pinned golden. That is an adjudication
// (is H-0's emitted feasibility wrong, or is base_F 2 already post-adjustment?), not a refactor.
export const STRUCTURALLY_ROOTLESS_ID = /^h-core-\d+$/;

export function isExpectedGap(u: UncheckedCard): boolean {
  return u.reason === 'no_root_for_id' && STRUCTURALLY_ROOTLESS_ID.test(u.id);
}

export function buildGateACoverage(cardsEmitted: number, families: FamilyCoverage[]): GateACoverage {
  // Gradeable means: nothing unavailable, cards were emitted, and every gap is a DECLARED gap.
  // An unexpected gap (a partially-covering archetype dropping h-lc-07, say) is not gradeable.
  const gradeable = families.every(f => !f.unavailable && f.expected > 0 && f.unchecked.every(isExpectedGap));
  const internalFaults = families.filter(f => f.unavailable && IS_INTERNAL_FAULT[f.unavailable.cause]);
  return { cardsEmitted, families, gradeable, internalFaults };
}

// Reviewer-facing coverage lines. Deliberately verbose about the unchecked scope: the LunaCart
// lesson is that "0 forks" from a partial checker reads as reassurance, so every line that reports
// a fork count also reports the scope that count was measured over.
export function formatGateACoverage(cov: GateACoverage): string[] {
  const lines: string[] = [];
  for (const f of cov.families) {
    const scope = `${f.checked} of ${f.expected} emitted card(s) checked`;
    if (f.unavailable) {
      const fault = IS_INTERNAL_FAULT[f.unavailable.cause];
      lines.push(
        `${fault ? `${BLOCKER_PREFIX} ` : '⚠ '}C1 coverage — ${f.family} [${f.ruleId}]: ${scope} — ` +
        `UNAVAILABLE (${f.unavailable.cause}): ${f.unavailable.detail}` +
        (fault
          ? ' This is an internal fault, not a missing reference: the guard should have run. Fix before grading.'
          : ' Not a defect in the run — but the unchecked scope is NOT CHECKED, never clean.'),
      );
      continue;
    }
    // Declared gaps are reported but do not make the run ungradeable; unexpected ones do, and are
    // called out as UNEXPECTED so the two never read alike.
    const declared = f.unchecked.filter(isExpectedGap);
    const unexpected = f.unchecked.filter(u => !isExpectedGap(u));
    const gaps =
      (declared.length > 0 ? ` ${declared.length} declared gap(s): ${declared.map(u => `${u.id} (${u.reason}, root not wired)`).join(', ')}.` : '') +
      (unexpected.length > 0 ? ` ${unexpected.length} UNEXPECTED unchecked card(s): ${unexpected.map(u => `${u.id} (${u.reason})`).join(', ')}.` : '');
    lines.push(`C1 coverage — ${f.family} [${f.ruleId}]: ${scope}, ${f.forks} fork(s) in the checked scope.${gaps}`);
  }

  const available = cov.families.filter(f => !f.unavailable);
  const totalChecked = available.reduce((n, f) => n + f.checked, 0);
  const totalExpected = cov.families.reduce((n, f) => n + f.expected, 0);
  const totalForks = available.reduce((n, f) => n + f.forks, 0);
  const unavailable = cov.families.filter(f => f.unavailable);

  if (cov.gradeable) {
    const declared = cov.families.reduce((n, f) => n + f.unchecked.filter(isExpectedGap).length, 0);
    lines.push(
      `GATE A COVERAGE: FULL — ${available.length} of ${cov.families.length} Class-A families checked, ` +
      `${totalChecked} of ${totalExpected} value-check(s), ${totalForks} fork(s)` +
      (declared > 0 ? `, plus ${declared} declared structural gap(s) (CORE-pattern root not wired).` : '.'),
    );
  } else {
    lines.push(
      `⚠ GATE A COVERAGE: PARTIAL — ${available.length} of ${cov.families.length} Class-A families ` +
      `checked, ${totalChecked} of ${totalExpected} value-check(s), ${totalForks} fork(s) in the ` +
      `checked scope only.` +
      (unavailable.length > 0
        ? ` UNAVAILABLE: ${unavailable.map(f => `${f.ruleId} (${f.unavailable!.cause})`).join(', ')}.`
        : '') +
      ` Reading rule: treat every unchecked value as NOT CHECKED, not as clean. Do not certify ` +
      `Class-G clean for this run.`,
    );
  }
  return lines;
}
