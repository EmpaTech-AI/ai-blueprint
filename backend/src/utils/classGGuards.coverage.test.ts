// v37.4 (LunaCart TC1, items 1 + 2).
//
// The LunaCart batch found that A4 emitted one SKIPPED line covering four different causes, A9
// emitted nothing at all, and C1's total silently dropped 15 → 8 with no way to tell which families
// had run. These tests pin the three behaviours that fix it:
//   • an empty Early-dimension set is NOT a skip — the recompute still asserts base_F
//   • a maturity parse failure is distinguishable from "nothing is Early"
//   • coverage is declared per family, with expected counts and an explicit unavailable cause

import {
  assessMaturityAvailability,
  buildGateACoverage,
  formatGateACoverage,
  validateFeasibilityFromRoot,
  validateRootIntegrity,
  A4_REQUIRED_DIMENSIONS,
  IS_INTERNAL_FAULT,
  FamilyCoverage,
  HypothesisRoot,
} from './classGGuards';
import { BLOCKER_PREFIX } from '../types/pipeline';
import fs from 'fs';
import path from 'path';

const SIX_DIMS = (grades: Record<string, string>) =>
  ['Strategy', 'Data', 'Technology', 'People', 'Processes', 'Governance']
    .map(d => `| ${d} | ${grades[d] ?? 'Developing'} | rationale |`).join('\n');

// ── assessMaturityAvailability: the third and fourth skip causes ─────────────────
describe('assessMaturityAvailability — parse failure is not the same as "nothing is Early"', () => {
  it('is AVAILABLE with an empty Early set when every dimension is Developing (LunaCart T1: DDDDDD)', () => {
    const a = assessMaturityAvailability(SIX_DIMS({}));
    expect(a.unavailable).toBeNull();
    expect(a.earlyDims.size).toBe(0);
  });

  it('is AVAILABLE and reports the Early dimensions (Meridian: Data + Governance)', () => {
    const a = assessMaturityAvailability(SIX_DIMS({ Data: 'Early', Governance: 'Early' }));
    expect(a.unavailable).toBeNull();
    expect([...a.earlyDims].sort()).toEqual(['Data', 'Governance']);
  });

  it('reports maturity_parse_failure when no dimension row parses at all', () => {
    const a = assessMaturityAvailability('The client is broadly Developing across the board.');
    expect(a.unavailable?.cause).toBe('maturity_parse_failure');
  });

  it('reports maturity_parse_incomplete when a FLAG-MAPPED dimension row is missing', () => {
    // Data is mapped by ml_heavy/multi_source; without its grade A4 would under-count firing flags
    // and could log a FALSE agreement, which is worse than not running.
    const partial = '| Strategy | Developing | x |\n| Technology | Early | x |\n| People | Early | x |\n| Governance | Early | x |';
    const a = assessMaturityAvailability(partial);
    expect(a.unavailable?.cause).toBe('maturity_parse_incomplete');
    expect(a.unavailable?.detail).toMatch(/Data/);
  });

  // maturity_parse_incomplete is a BLOCKER, so the REAL scorecard format must parse cleanly or every
// run would be blocked. This is the padded-column shape the Stage-2 golden actually emits.
  it('parses the production scorecard format (padded columns, score column) — no false BLOCKER', () => {
    const real = [
      '| Dimension   | Level       | Score |',
      '|-------------|-------------|-------|',
      '| Strategy    | Developing  | 2/3   |',
      '| Data        | Early       | 1/3   |',
      '| Technology  | Developing  | 2/3   |',
      '| People      | Developing  | 2/3   |',
      '| Processes   | Early       | 1/3   |',
      '| Governance  | Early       | 1/3   |',
    ].join('\n');
    const a = assessMaturityAvailability(real);
    expect(a.unavailable).toBeNull();
    expect([...a.earlyDims].sort()).toEqual(['Data', 'Governance', 'Processes']);
  });

  it('tolerates Strategy/Processes being absent — neither is flag-mapped', () => {
    const noUnmapped = '| Data | Early | x |\n| Technology | Developing | x |\n| People | Developing | x |\n| Governance | Developing | x |';
    expect(assessMaturityAvailability(noUnmapped).unavailable).toBeNull();
    expect(A4_REQUIRED_DIMENSIONS).toEqual(['Data', 'Governance', 'People', 'Technology']);
  });
});

// ── A4 with zero Early dimensions: the check LunaCart T1 never got ───────────────
describe('validateFeasibilityFromRoot — an empty Early set is a valid input, not a skip', () => {
  const roots = new Map<string, HypothesisRoot>([
    ['h-lc-01', { baseImpact: 5, baseFeasibility: 4, baseAlignment: 5, flags: { ml_heavy: 'yes', multi_source: 'yes' } }],
  ]);
  const mk = (id: string, f: number) => `<!-- score: id=${id} impact=5 feasibility=${f} alignment=5 product=1 class=QuickWin -->`;

  it('asserts feasibility == base_F when nothing is Early, and CATCHES an unwarranted reduction', () => {
    const { records, reviewerFlags, checked } = validateFeasibilityFromRoot(mk('H-LC-01', 2), roots, new Set());
    expect(checked).toEqual(['h-lc-01']);
    expect(records[0]).toMatchObject({ authoredValue: 2, rootComputedValue: 4, agreed: false });
    expect(reviewerFlags.some(f => /REG-27.*base 4 − 0 firing flag\(s\) \[none\]/.test(f))).toBe(true);
  });

  it('agrees when the emitted value already equals base_F', () => {
    const { records, reviewerFlags } = validateFeasibilityFromRoot(mk('H-LC-01', 4), roots, new Set());
    expect(records[0].agreed).toBe(true);
    expect(reviewerFlags).toHaveLength(0);
  });

  it('counts a card with no archetype root as UNCHECKED rather than dropping it silently', () => {
    const out = [mk('H-LC-01', 4), mk('H-CORE-00', 3)].join('\n');
    const { checked, unchecked } = validateFeasibilityFromRoot(out, roots, new Set());
    expect(checked).toEqual(['h-lc-01']);
    expect(unchecked).toEqual([{ id: 'h-core-00', reason: 'no_root_for_id' }]);
  });

  it('counts an unparseable emitted value distinctly from a missing root', () => {
    const bad = '<!-- score: id=H-LC-01 impact=5 feasibility=n/a alignment=5 -->';
    const { unchecked } = validateFeasibilityFromRoot(bad, roots, new Set());
    expect(unchecked).toEqual([{ id: 'h-lc-01', reason: 'unparseable_emitted_value' }]);
  });
});

describe('validateRootIntegrity — per-card coverage accounting', () => {
  const roots = new Map<string, HypothesisRoot>([
    ['h-lc-01', { baseImpact: 5, baseFeasibility: 4, baseAlignment: 5, flags: { ml_heavy: 'yes' } }],
  ]);

  it('reports which cards it checked and which it could not', () => {
    const out = [
      '<!-- score: id=H-LC-01 impact=5 feasibility=4 alignment=5 ml_heavy=yes -->',
      '<!-- score: id=H-LC-07 impact=4 feasibility=3 alignment=4 ml_heavy=no -->',
    ].join('\n');
    const { checked, unchecked } = validateRootIntegrity(out, roots);
    expect(checked).toEqual(['h-lc-01']);
    expect(unchecked).toEqual([{ id: 'h-lc-07', reason: 'no_root_for_id' }]);
  });
});

// ── Item 2: per-family coverage declaration ─────────────────────────────────────
describe('Gate A coverage — per-family declaration, not one fake denominator', () => {
  const family = (o: Partial<FamilyCoverage> & Pick<FamilyCoverage, 'family' | 'ruleId'>): FamilyCoverage =>
    ({ expected: 8, checked: 8, forks: 0, unchecked: [], unavailable: null, ...o });

  const A5 = family({ family: 'A5 class', ruleId: 'A5' });
  const A4_UNAVAIL = family({
    family: 'A4 feasibility', ruleId: 'A4', checked: 0,
    unavailable: { cause: 'no_archetype_match', detail: 'no archetype file covers the emitted IDs.' },
  });
  const A9_UNAVAIL = family({
    family: 'A9 root integrity', ruleId: 'A9', checked: 0,
    unavailable: { cause: 'no_archetype_match', detail: 'no archetype file covers the emitted IDs.' },
  });

  it('is NOT gradeable when a family is unavailable, and says so with the cause', () => {
    const cov = buildGateACoverage(8, [A5, A4_UNAVAIL, A9_UNAVAIL]);
    expect(cov.gradeable).toBe(false);
    const lines = formatGateACoverage(cov);
    // The LunaCart shape: 1 of 3 families, 8 of 24 value-checks.
    expect(lines.some(l => /GATE A COVERAGE: PARTIAL — 1 of 3 Class-A families checked, 8 of 24 value-check/.test(l))).toBe(true);
    expect(lines.some(l => /UNAVAILABLE: A4 \(no_archetype_match\), A9 \(no_archetype_match\)/.test(l))).toBe(true);
    // The reading rule is stated in the artifact, not left to the reviewer to remember.
    expect(lines.some(l => /treat every unchecked value as NOT CHECKED, not as clean/.test(l))).toBe(true);
  });

  it('declares the checked-of-expected count per family so "0 forks" has a scope', () => {
    const lines = formatGateACoverage(buildGateACoverage(8, [A5, A4_UNAVAIL, A9_UNAVAIL]));
    expect(lines[0]).toMatch(/A5 class \[A5\]: 8 of 8 emitted card\(s\) checked, 0 fork\(s\) in the checked scope/);
    expect(lines[1]).toMatch(/A4 feasibility \[A4\]: 0 of 8 emitted card\(s\) checked — UNAVAILABLE \(no_archetype_match\)/);
  });

  it('marks a genuinely missing archetype as ⚠ (not a defect) but never as clean', () => {
    const lines = formatGateACoverage(buildGateACoverage(8, [A5, A4_UNAVAIL, A9_UNAVAIL]));
    const a4 = lines.find(l => /A4 feasibility/.test(l))!;
    expect(a4.startsWith('⚠')).toBe(true);
    expect(a4).toMatch(/the unchecked scope is NOT CHECKED, never clean/);
  });

  it('BLOCKERs an internal fault — the guard should have run and did not', () => {
    for (const cause of ['archetype_read_error', 'maturity_parse_failure', 'maturity_parse_incomplete', 'guard_threw'] as const) {
      expect(IS_INTERNAL_FAULT[cause]).toBe(true);
      const broken = family({ family: 'A4 feasibility', ruleId: 'A4', checked: 0, unavailable: { cause, detail: 'x' } });
      const cov = buildGateACoverage(8, [A5, broken]);
      const line = formatGateACoverage(cov).find(l => /A4 feasibility/.test(l))!;
      expect(line.startsWith(BLOCKER_PREFIX)).toBe(true);
      expect(line).toMatch(/internal fault, not a missing reference/);
      expect(cov.internalFaults.map(f => f.ruleId)).toEqual(['A4']);
    }
  });

  it('no_archetype_match is the ONLY cause that is not an internal fault', () => {
    expect(IS_INTERNAL_FAULT.no_archetype_match).toBe(false);
  });

  it('is FULL when every family is available and every card is checked', () => {
    const cov = buildGateACoverage(8, [A5, family({ family: 'A4', ruleId: 'A4' }), family({ family: 'A9', ruleId: 'A9' })]);
    expect(cov.gradeable).toBe(true);
    expect(formatGateACoverage(cov).some(l => /GATE A COVERAGE: FULL — 3 of 3 Class-A families checked, 24 of 24/.test(l))).toBe(true);
  });

  // Meridian's real shape: A4/A9 cover 7 of 8 because H-CORE-00's root lives in the excluded
  // _core.md. That gap is structural and present on EVERY run, so it must be reported without
  // firing the partial-coverage warning — an always-on warning is the GATE-4 false-fire failure mode.
  it('treats the structural H-CORE-00 gap as DECLARED, so a clean Meridian run still reads FULL', () => {
    const gap = [{ id: 'h-core-00', reason: 'no_root_for_id' as const }];
    const cov = buildGateACoverage(8, [
      A5,
      family({ family: 'A4 feasibility', ruleId: 'A4', checked: 7, unchecked: gap }),
      family({ family: 'A9 root integrity', ruleId: 'A9', checked: 7, unchecked: gap }),
    ]);
    expect(cov.gradeable).toBe(true);
    expect(cov.internalFaults).toHaveLength(0);
    const lines = formatGateACoverage(cov);
    expect(lines.some(l => /1 declared gap\(s\): h-core-00 \(no_root_for_id, root not wired\)/.test(l))).toBe(true);
    // 8 + 7 + 7 = 22 of 24 — the honest version of Meridian's old bare "15 values checked".
    expect(lines.some(l => /FULL — 3 of 3 Class-A families checked, 22 of 24 value-check\(s\), 0 fork\(s\), plus 2 declared structural gap\(s\)/.test(l))).toBe(true);
    expect(lines.every(l => !l.startsWith('⚠'))).toBe(true);
  });

  it('an UNEXPECTED gap is not gradeable — a 1-of-8 archetype cover cannot look like a full run', () => {
    const a9 = family({
      family: 'A9 root integrity', ruleId: 'A9', checked: 1,
      unchecked: Array.from({ length: 7 }, (_, i) => ({ id: `h-lc-0${i + 2}`, reason: 'no_root_for_id' as const })),
    });
    const cov = buildGateACoverage(8, [A5, a9]);
    expect(cov.gradeable).toBe(false);
    const lines = formatGateACoverage(cov);
    expect(lines.some(l => /A9 root integrity \[A9\]: 1 of 8 emitted card\(s\) checked/.test(l))).toBe(true);
    expect(lines.some(l => /7 UNEXPECTED unchecked card\(s\)/.test(l))).toBe(true);
  });

  it('mixes a declared gap and an unexpected one without conflating them', () => {
    const a4 = family({
      family: 'A4 feasibility', ruleId: 'A4', checked: 6,
      unchecked: [
        { id: 'h-core-00', reason: 'no_root_for_id' },
        { id: 'h-lc-07', reason: 'unparseable_emitted_value' },
      ],
    });
    const cov = buildGateACoverage(8, [A5, a4]);
    expect(cov.gradeable).toBe(false);
    const line = formatGateACoverage(cov).find(l => /A4 feasibility/.test(l))!;
    expect(line).toMatch(/1 declared gap\(s\): h-core-00/);
    expect(line).toMatch(/1 UNEXPECTED unchecked card\(s\): h-lc-07 \(unparseable_emitted_value\)/);
  });
});

// ── A16c support: the pool-flags parser, read against the REAL archetype file ──────
//
// If this parser fails on recruitment.md, A16c BLOCKERs Meridian's two legitimate exclusions and the
// v37.4 regression batch reads as a catastrophe. Tested against the file, not a fixture, for that reason.
describe('parseArchetypePoolFlags — real recruitment archetype', () => {
  const { parseArchetypePoolFlags } = require('./classGGuards');
  const md = fs.readFileSync(
    path.join(__dirname, '../skills/blueprint-intake/archetypes/recruitment.md'), 'utf-8');
  const flags = parseArchetypePoolFlags(md);

  it('roots Meridian\'s two excluded candidates at band1_pool=no', () => {
    expect(flags.get('h-rt-08')?.band1Pool).toBe('no');
    expect(flags.get('h-rt-09')?.band1Pool).toBe('no');
  });

  it('includes H-CORE-00, whose row uses "n/a" in the other two columns', () => {
    expect(flags.get('h-core-00')).toMatchObject({ band1Pool: 'yes' });
  });

  it('marks every other hypothesis as poolable, so no exclusion is silently authorised', () => {
    const poolable = [...flags.entries()].filter(([, f]) => f.band1Pool === 'yes').map(([id]) => id);
    expect(poolable).toContain('h-rt-01');
    expect(poolable.length).toBeGreaterThan(10);
  });

  it('does not mistake the Hypothesis Library table for the CORE-columns table', () => {
    // The library's cells[4] is Typical Feasibility (a digit) and must never be read as band1_pool.
    const libraryOnly = [
      '| ID | Hypothesis | Typ Impact | Typ Feasibility | Typ Alignment | Default Class |',
      '|---|---|---|---|---|---|',
      '| H-XX-01 | Some hypothesis | 5 | 3 | 5 | Foundation Builder |',
    ].join('\n');
    expect(parseArchetypePoolFlags(libraryOnly).size).toBe(0);
  });
});
