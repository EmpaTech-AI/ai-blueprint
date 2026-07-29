import {
  FLAG_DIMENSION,
  recomputeAdjustedFeasibility,
  parseArchetypeHypothesisTable,
  parseEarlyDimensions,
  validateFeasibilityFromRoot,
  validateRootIntegrity,
  HypothesisRoot,
} from './classGGuards';
import { makeRecord, emittedValue, residualRate } from './correctionLog';

// ── A4 recompute (contract v1.3 §4.1, verified against 12 runs) ──────────────────
describe('recomputeAdjustedFeasibility — stacking + dimension gating', () => {
  const early = new Set(['Data', 'Governance']); // Meridian

  it('stacks two flags on the same Early dimension to −2 (the REG-27 root cause)', () => {
    // H-RT-01: base 3, ml_heavy + multi_source (both Data=Early), large_integration/adoption on
    // Developing dims → contribute nothing. 3 − 2 = 1.
    const flags = { ml_heavy: 'yes', multi_source: 'yes', large_integration: 'yes', adoption_dependent: 'yes' };
    expect(recomputeAdjustedFeasibility(3, flags, early)).toEqual({ adjustedF: 1, firing: ['ml_heavy', 'multi_source'] });
  });

  it('gates each flag by its dimension being Early (yes-flag on a non-Early dim = no reduction)', () => {
    const flags = { large_integration: 'yes', adoption_dependent: 'yes' }; // Technology/People not Early
    expect(recomputeAdjustedFeasibility(3, flags, early).adjustedF).toBe(3);
  });

  it('applies one reduction for a single firing flag (H-RT-07: regulated on Governance-Early)', () => {
    expect(recomputeAdjustedFeasibility(4, { regulated: 'yes' }, early)).toEqual({ adjustedF: 3, firing: ['regulated'] });
  });

  it('floors at 1', () => {
    const flags = { ml_heavy: 'yes', multi_source: 'yes' };
    expect(recomputeAdjustedFeasibility(2, flags, early).adjustedF).toBe(1); // 2−2=0 → floor 1
  });

  it('maps every flag to the intended dimension', () => {
    expect(FLAG_DIMENSION).toEqual({
      ml_heavy: 'Data', multi_source: 'Data', regulated: 'Governance',
      large_integration: 'Technology', adoption_dependent: 'People',
    });
  });
});

describe('parseArchetypeHypothesisTable + parseEarlyDimensions', () => {
  const table = [
    '| ID | Hypothesis | Typical Impact | Typical Feasibility | Typical Alignment | Default Class | `ml_heavy` | `multi_source` | `regulated` | `large_integration` | `adoption_dependent` | `d_gate4` | `compliance_deadline` | `system_event_deadline` | `phase_dependency` |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    '| H-RT-01 | AI-Assisted Specialist Sourcing | 5 | 3 | 5 | Foundation Builder | yes | yes | no | yes | yes | no | none | none | strict |',
    '| H-RT-07 | Data Protection Compliance Foundation | 3 | 4 | 5 | Foundation Builder | no | no | yes | no | yes | no | none | none | n/a |',
  ].join('\n');

  it('parses base scores and flags per hypothesis', () => {
    const roots = parseArchetypeHypothesisTable(table);
    expect(roots.get('h-rt-01')?.baseFeasibility).toBe(3);
    expect(roots.get('h-rt-01')?.flags.ml_heavy).toBe('yes');
    expect(roots.get('h-rt-01')?.flags.large_integration).toBe('yes');
    expect(roots.get('h-rt-07')?.baseFeasibility).toBe(4);
    expect(roots.get('h-rt-07')?.flags.regulated).toBe('yes');
    expect(roots.get('h-rt-07')?.flags.ml_heavy).toBe('no');
  });

  it('extracts the Early dimensions from a maturity snapshot', () => {
    const maturity = [
      '| Strategy | Developing | ... |', '| Data | Early | ... |', '| Technology | Developing | ... |',
      '| People | Developing | ... |', '| Processes | Developing | ... |', '| Governance | Early | ... |',
    ].join('\n');
    expect(parseEarlyDimensions(maturity)).toEqual(new Set(['Data', 'Governance']));
  });
});

describe('validateFeasibilityFromRoot — REG-27 catch + correction log', () => {
  const roots = new Map<string, HypothesisRoot>([
    ['h-rt-01', { baseImpact: 5, baseFeasibility: 3, baseAlignment: 5, flags: { ml_heavy: 'yes', multi_source: 'yes' } }],
    ['h-rt-04', { baseImpact: 4, baseFeasibility: 3, baseAlignment: 4, flags: { ml_heavy: 'yes', multi_source: 'yes' } }],
  ]);
  const early = new Set(['Data']);
  const mk = (id: string, f: number) => `<!-- score: id=${id} impact=5 feasibility=${f} alignment=5 product=1 class=BigBet -->`;

  it('flags the −1-instead-of−2 stacking fork and logs it as a disagreement', () => {
    const out = [mk('H-RT-01', 1), mk('H-RT-04', 2)].join('\n'); // 04 forked: should be 1
    const { records, reviewerFlags } = validateFeasibilityFromRoot(out, roots, early);
    expect(reviewerFlags.some(f => /REG-27.*h-rt-04.*= 1 \(floor 1\)/.test(f))).toBe(true);
    const r04 = records.find(r => r.elementId === 'h-rt-04')!;
    expect(r04.agreed).toBe(false);
    expect(r04.authoredValue).toBe(2);
    expect(r04.rootComputedValue).toBe(1);
    const r01 = records.find(r => r.elementId === 'h-rt-01')!;
    expect(r01.agreed).toBe(true); // correct card logged as agreed, no flag
  });

  it('emits a record for every card regardless of mode (recording is unconditional)', () => {
    const out = [mk('H-RT-01', 1), mk('H-RT-04', 1)].join('\n');
    const { records, reviewerFlags } = validateFeasibilityFromRoot(out, roots, early);
    expect(records).toHaveLength(2);
    expect(reviewerFlags).toHaveLength(0);
    expect(residualRate(records)).toEqual({ total: 2, forks: 0, rate: 0 });
  });
});

describe('validateRootIntegrity (A9) — impact/alignment/flags vs archetype row', () => {
  const roots = new Map<string, HypothesisRoot>([
    ['h-rt-01', { baseImpact: 5, baseFeasibility: 3, baseAlignment: 5, flags: { ml_heavy: 'yes', multi_source: 'yes', regulated: 'no', large_integration: 'yes', adoption_dependent: 'yes', d_gate4: 'no', phase_dependency: 'strict' } }],
  ]);
  const marker = (impact: number, ml: string, cited = false) =>
    `${cited ? 'Feasibility reduced [Document-Backed — client tech inventory p.2].\n' : ''}` +
    `<!-- score: id=H-RT-01 impact=${impact} feasibility=1 alignment=5 product=1 class=BigBet ` +
    `ml_heavy=${ml} multi_source=yes regulated=no large_integration=yes adoption_dependent=yes ` +
    `d_gate4=no compliance_deadline=none system_event_deadline=2026-07-31 phase_dependency=strict -->`;

  it('is clean when base scores and flags match the archetype (date fields excluded)', () => {
    const { reviewerFlags, overrideRegister } = validateRootIntegrity(marker(5, 'yes'), roots);
    expect(reviewerFlags).toHaveLength(0);          // system_event_deadline deviation is NOT checked
    expect(overrideRegister).toHaveLength(0);
  });

  it('BLOCKERs an uncited deviation from the archetype row', () => {
    const { reviewerFlags, overrideRegister } = validateRootIntegrity(marker(4, 'yes'), roots); // impact 4≠5, no citation
    expect(reviewerFlags.some(f => /A9.*impact=4 deviates.*\(5\).*NO \[Document-Backed\]/.test(f))).toBe(true);
    expect(overrideRegister[0]).toMatchObject({ elementId: 'h-rt-01', field: 'impact', archetypeValue: 5, emittedValue: 4, cited: false });
  });

  it('routes a CITED deviation to the Override Register without a BLOCKER', () => {
    const { reviewerFlags, overrideRegister } = validateRootIntegrity(marker(4, 'yes', true), roots);
    expect(reviewerFlags).toHaveLength(0);
    expect(overrideRegister[0]).toMatchObject({ field: 'impact', cited: true });
  });
});

describe('correction log — mode-gated emission, unconditional recording (C1)', () => {
  const forked = makeRecord('stage3', 'h-rt-04', 'feasibility', 2, 1, {}, 'A4');

  it('records the disagreement regardless of mode', () => {
    expect(forked.agreed).toBe(false);
  });

  it('emits the authored value in acceptance (rate stays observable), root-computed in production', () => {
    expect(emittedValue(forked, 'acceptance')).toBe(2);
    expect(emittedValue(forked, 'production')).toBe(1);
  });

  it('R1 residual rate is read from the log', () => {
    const ok = makeRecord('stage3', 'h-rt-01', 'feasibility', 1, 1, {}, 'A4');
    expect(residualRate([ok, forked])).toEqual({ total: 2, forks: 1, rate: 0.5 });
  });
});
