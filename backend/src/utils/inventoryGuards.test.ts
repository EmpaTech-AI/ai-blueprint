// A11–A15 relational guards over the Stage-1 [DATA_INVENTORY] block (v37.4, F13a/F13b).
//
// The gating constraint on the whole definition is that it must reproduce the PINNED Meridian answer
// (`_core.md` §4: "Data Early + zero integrations → FRAGMENTED → Band 1 on every run"). Both
// calibrations are pinned here, and the LunaCart case pins the combination NO RUN PRODUCED —
// Data Early + PP-0 High (T1 got severity right and the letter wrong; T2–T4 the reverse).

import {
  parseDataInventory,
  parseInventoryMarker,
  computeInventory,
  computeIntegrationCoverage,
  pp0SeverityFromCoverage,
  dataGradeFromRecordClasses,
  validateDataInventory,
  validatePoolExclusions,
  governanceGatePasses,
  RecordClassRow,
  GovernanceEvidence,
} from './inventoryGuards';
import { BLOCKER_PREFIX } from '../types/pipeline';
import fs from 'fs';
import path from 'path';

// ── Fixture builder ─────────────────────────────────────────────────────────────
const block = (opts: {
  core: Array<[string, string, string, string]>;              // system, classes, core?, because
  integrations: Array<[string, string, string, string, string]>; // a, b, mechanism, status, active?
  classes: Array<[string, string, string, string, string]>;   // class, sor, load-bearing?, because, rating
  marker: string;
  confidence?: string;
}) => {
  const c = opts.confidence ?? '[Document-Backed]';
  return [
    '# Compressed Client Dossier',
    '',
    '## [DATA_INVENTORY]',
    '',
    '### Core Systems',
    '| System | Record classes held | Core? | Core because (stated priority) | Confidence |',
    '|---|---|---|---|---|',
    ...opts.core.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${c} |`),
    '',
    '### Integrations',
    '| System A | System B | Mechanism | Status | Active? | Confidence |',
    '|---|---|---|---|---|---|',
    ...opts.integrations.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} | ${c} |`),
    '',
    '### Record Classes',
    '| Record class | System of record | Load-bearing? | Load-bearing because | Rating | Rating because | Confidence |',
    '|---|---|---|---|---|---|---|',
    ...opts.classes.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} | evidence | ${c} |`),
    '',
    `<!-- inventory: ${opts.marker} -->`,
    '',
    '## Section H — Reviewer Checklist',
    '',
    '- nothing outstanding',
  ].join('\n');
};

// Meridian: 5 core systems, ZERO active integrations, candidate records load-bearing + Degraded.
const MERIDIAN = block({
  core: [
    ['vincere', 'candidate_records, placements', 'yes', 'Priority 2 — time-to-fill'],
    ['zoho', 'client_records', 'yes', 'Priority 1 — client growth'],
    ['xero', 'finance', 'yes', 'Priority 3 — margin'],
    ['linkedin_recruiter', 'sourcing', 'yes', 'Priority 2 — sourcing'],
    ['m365', 'documents', 'yes', 'Priority 2 — candidate docs'],
  ],
  integrations: [
    ['vincere', 'zoho', 'manual', 'functioning', 'no'],
    ['vincere', 'xero', 'none', 'unbuilt', 'no'],
  ],
  classes: [
    ['candidate_records', 'vincere', 'yes', 'Priority 2 — time-to-fill', 'Degraded'],
    ['client_records', 'zoho', 'yes', 'Priority 1 — client growth', 'Reliable'],
    ['finance', 'xero', 'no', 'n/a', 'Reliable'],
  ],
  marker: 'n_core=5 active_integrations=0 integration_coverage=0.00 designated_ssot=none ' +
    'ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=1 data_grade=Early pp0_severity=Critical',
});

// LunaCart: 7 core systems, 2 active integrations into Postgres, returns + CS load-bearing/Degraded.
const LUNACART = block({
  core: [
    ['shopify', 'orders, products', 'yes', 'Priority 1 — revenue'],
    ['netsuite', 'finance', 'yes', 'Priority 3 — margin'],
    ['postgres', 'analytics', 'yes', 'Priority 1 — reporting'],
    ['skuvault', 'inventory', 'yes', 'Priority 3 — stock accuracy'],
    ['zendesk', 'cs_interactions', 'yes', 'Priority 4 — CS automation'],
    ['returnly', 'returns', 'yes', 'Priority 2 — return rate'],
    ['klaviyo', 'marketing_performance', 'yes', 'Priority 1 — marketing ROAS'],
  ],
  integrations: [
    ['shopify', 'postgres', 'scheduled', 'functioning', 'yes'],
    ['netsuite', 'postgres', 'scheduled', 'functioning', 'yes'],
    ['returnly', 'postgres', 'manual', 'functioning', 'no'],
    ['zendesk', 'postgres', 'none', 'unbuilt', 'no'],
    ['skuvault', 'postgres', 'none', 'unbuilt', 'no'],
  ],
  classes: [
    ['orders', 'shopify', 'yes', 'Priority 1 — revenue', 'Reliable'],
    ['returns', 'returnly', 'yes', 'Priority 2 — return rate 34.2% → <28%', 'Degraded'],
    ['cs_interactions', 'zendesk', 'yes', 'Priority 4 — CS automation', 'Degraded'],
    ['inventory', 'skuvault', 'no', 'n/a', 'Degraded'],
  ],
  marker: 'n_core=7 active_integrations=2 integration_coverage=0.33 designated_ssot=postgres ' +
    'ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=2 data_grade=Early pp0_severity=High',
});

// ── The ratified arithmetic ─────────────────────────────────────────────────────
describe('Integration Coverage = active ÷ (n_core − 1)', () => {
  it('reproduces the two pinned calibrations', () => {
    expect(computeIntegrationCoverage(5, 0)).toBe(0);              // Meridian
    expect(computeIntegrationCoverage(7, 2)).toBeCloseTo(0.333, 3); // LunaCart
  });

  it('treats n_core ≤ 1 as 0% rather than dividing by zero', () => {
    expect(computeIntegrationCoverage(1, 0)).toBe(0);
    expect(computeIntegrationCoverage(0, 0)).toBe(0);
  });

  // The ratified text read "≤ 25%" then "26–60%", leaving (25%, 26%) undefined. Implemented tiled.
  it('tiles the whole range — no coverage value falls between two bands', () => {
    for (const cov of [0, 0.1, 0.25, 0.2551, 0.26, 0.4, 0.6, 0.601, 0.9, 1]) {
      expect(['Critical', 'High', 'none']).toContain(pp0SeverityFromCoverage(cov, false));
      expect(['Critical', 'High', 'none']).toContain(pp0SeverityFromCoverage(cov, true));
    }
    expect(pp0SeverityFromCoverage(0.2551, false)).toBe('High'); // the old gap, now defined
  });

  it('applies the §2.1 threshold table', () => {
    expect(pp0SeverityFromCoverage(0, false)).toBe('Critical');      // Meridian
    expect(pp0SeverityFromCoverage(0.25, false)).toBe('Critical');   // boundary — near-zero
    expect(pp0SeverityFromCoverage(0.33, false)).toBe('High');       // LunaCart
    expect(pp0SeverityFromCoverage(0.60, false)).toBe('High');       // boundary — structural
    expect(pp0SeverityFromCoverage(0.75, false)).toBe('High');       // connected, no reconciling SSOT
    expect(pp0SeverityFromCoverage(0.75, true)).toBe('none');        // Band 3 path
  });

  it('sends a NOMINAL SSOT (designated but nothing feeds it) to Critical deliberately', () => {
    expect(pp0SeverityFromCoverage(0.2, true)).toBe('Critical');
  });
});

describe('Data grade — priority-weighted aggregation (D4 Step 4)', () => {
  const rc = (loadBearing: boolean, rating: string): RecordClassRow => ({
    recordClass: 'x', systemOfRecord: 's', loadBearing, loadBearingBecause: 'p', rating,
    ratingBecause: 'e', confidence: '[Document-Backed]',
  });

  it('is Early when ≥1 LOAD-BEARING class is Degraded or Absent', () => {
    expect(dataGradeFromRecordClasses([rc(true, 'degraded'), rc(false, 'reliable')])).toBe('Early');
    expect(dataGradeFromRecordClasses([rc(true, 'absent')])).toBe('Early');
  });

  it('is Developing when only NON-load-bearing classes are Degraded', () => {
    expect(dataGradeFromRecordClasses([rc(true, 'reliable'), rc(false, 'degraded')])).toBe('Developing');
  });

  // Established additionally needs G1+G2+G3 — exercised in full in the governance-gate block below.
  it('is Established only when every class is Reliable AND the governance gate passes', () => {
    const pass: GovernanceEvidence = { ownerNamed: true, ownerName: 'Head of Data', standardDocumented: true, standardOperative: true };
    expect(dataGradeFromRecordClasses([rc(true, 'reliable')], pass)).toBe('Established');
    expect(dataGradeFromRecordClasses([rc(true, 'reliable')], undefined)).toBe('Developing');
  });

  // These are the two rejected alternatives, pinned so nobody re-introduces them.
  it('is NOT worst-class dominance (which would make every real client Early)', () => {
    expect(dataGradeFromRecordClasses([rc(true, 'reliable'), rc(false, 'absent')])).not.toBe('Early');
  });

  it('is NOT majority (which would hide the gaps that matter)', () => {
    const rows = [rc(true, 'degraded'), rc(false, 'reliable'), rc(false, 'reliable'), rc(false, 'reliable')];
    expect(dataGradeFromRecordClasses(rows)).toBe('Early');
  });
});

// ── Parsing + end-to-end calibration ───────────────────────────────────────────
describe('parseDataInventory + computeInventory', () => {
  it('parses all three tables and the marker', () => {
    const inv = parseDataInventory(LUNACART);
    expect(inv.present).toBe(true);
    expect(inv.coreSystems).toHaveLength(7);
    expect(inv.integrations).toHaveLength(5);
    expect(inv.recordClasses).toHaveLength(4);
    expect(inv.marker).toMatchObject({
      nCore: 7, activeIntegrations: 2, integrationCoverage: 0.33,
      designatedSsot: 'postgres', ssotReconcilesAllLoadBearing: false,
      loadBearingDegradedOrAbsent: 2, dataGrade: 'Early', pp0Severity: 'High',
    });
  });

  it('does not absorb a table from a later section', () => {
    const inv = parseDataInventory(LUNACART);
    expect(inv.coreSystems.map(s => s.system)).not.toContain('nothing outstanding');
  });

  it('counts integrations as unordered PAIRS — a double-emitted A→B / B→A counts once', () => {
    const doubled = block({
      core: [['a', 'x', 'yes', 'P1'], ['b', 'y', 'yes', 'P2'], ['c', 'z', 'yes', 'P3']],
      integrations: [
        ['a', 'b', 'scheduled', 'functioning', 'yes'],
        ['b', 'a', 'scheduled', 'functioning', 'yes'],
      ],
      classes: [['x', 'a', 'yes', 'P1', 'Reliable'], ['y', 'b', 'no', 'n/a', 'Reliable'], ['z', 'c', 'no', 'n/a', 'Reliable']],
      marker: 'n_core=3 active_integrations=1 integration_coverage=0.50 data_grade=Developing pp0_severity=High ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=0',
    });
    expect(computeInventory(parseDataInventory(doubled)).activeIntegrations).toBe(1);
  });

  it('excludes integrations that touch a NON-core system from the coverage numerator', () => {
    const withNonCore = block({
      core: [['a', 'x', 'yes', 'P1'], ['b', 'y', 'yes', 'P2'], ['slack', '', 'no', 'n/a']],
      integrations: [
        ['a', 'b', 'scheduled', 'functioning', 'yes'],
        ['a', 'slack', 'scheduled', 'functioning', 'yes'],
      ],
      classes: [['x', 'a', 'yes', 'P1', 'Reliable'], ['y', 'b', 'no', 'n/a', 'Reliable']],
      marker: 'n_core=2 active_integrations=1 integration_coverage=1.00 data_grade=Developing pp0_severity=none ssot_reconciles_all_load_bearing=yes load_bearing_degraded_or_absent=0',
    });
    const computed = computeInventory(parseDataInventory(withNonCore));
    expect(computed.nCore).toBe(2);
    expect(computed.activeIntegrations).toBe(1); // the slack link does not count
  });
});

describe('PINNED — Meridian must not change', () => {
  it('recomputes to 0% coverage, Critical severity, Data Early — and passes clean', () => {
    const computed = computeInventory(parseDataInventory(MERIDIAN));
    expect(computed).toMatchObject({ nCore: 5, activeIntegrations: 0, integrationCoverage: 0, dataGrade: 'Early' });
    expect(pp0SeverityFromCoverage(computed.integrationCoverage, false)).toBe('Critical');
    const { reviewerFlags, checked } = validateDataInventory(MERIDIAN);
    expect(reviewerFlags).toEqual([]);
    expect(checked).toEqual(['A11', 'A12', 'A13', 'A14', 'A15']);
  });
});

describe('PINNED — LunaCart: the combination no run produced', () => {
  it('recomputes to 33% coverage → PP-0 High AND Data Early, and passes clean', () => {
    const computed = computeInventory(parseDataInventory(LUNACART));
    expect(computed.nCore).toBe(7);
    expect(computed.activeIntegrations).toBe(2);
    expect(computed.integrationCoverage).toBeCloseTo(0.333, 3);
    expect(computed.loadBearingDegradedOrAbsent).toBe(2);
    expect(computed.dataGrade).toBe('Early');
    expect(pp0SeverityFromCoverage(computed.integrationCoverage, false)).toBe('High');
    expect(validateDataInventory(LUNACART).reviewerFlags).toEqual([]);
  });

  it('A12 BLOCKERs the T2–T4 answer (Critical inherited from Meridian)', () => {
    const wrong = LUNACART.replace('pp0_severity=High', 'pp0_severity=Critical');
    const flags = validateDataInventory(wrong).reviewerFlags;
    expect(flags.some(f => f.startsWith(BLOCKER_PREFIX) && /A12 \(PP-0 severity, F13b\)/.test(f))).toBe(true);
    expect(flags.some(f => /archetype-template failure/.test(f))).toBe(true);
  });

  it('A13 BLOCKERs the T1 answer (Data Developing on the working warehouse)', () => {
    const wrong = LUNACART.replace('data_grade=Early', 'data_grade=Developing');
    const flags = validateDataInventory(wrong).reviewerFlags;
    expect(flags.some(f => f.startsWith(BLOCKER_PREFIX) && /A13 \(Data grade, F13a\)/.test(f))).toBe(true);
    expect(flags.some(f => /2 load-bearing record class\(es\) are Degraded\/Absent/.test(f))).toBe(true);
  });
});

// ── Band 3: the top of both new scales, previously never exercised ──────────────
//
// Read from the actual fixture file rather than a copy, so the pinned expectations and the code cannot
// drift apart. Before this the C1 ">60% + reconciling SSOT → PP-0 not instantiated" branch and the
// Data=Established grade had never fired anywhere in the kit — and they are the branches that protect
// a GOOD client from an inappropriate recommendation, so an untested pass path was the worst one left.
describe('PINNED — Nordwind Band 3 (fixtures/band3_calibration.md)', () => {
  const fixture = fs.readFileSync(
    path.join(__dirname, '../skills/blueprint-intake/fixtures/band3_calibration.md'), 'utf-8',
  );

  it('parses the fixture inventory straight from the fixture file', () => {
    const inv = parseDataInventory(fixture);
    expect(inv.present).toBe(true);
    expect(inv.coreSystems).toHaveLength(5);      // 4 core + SharePoint (Core?=no)
    expect(inv.integrations).toHaveLength(3);
    expect(inv.recordClasses).toHaveLength(6);
  });

  it('excludes the non-core system from n_core, giving coverage 3 ÷ (4−1) = 1.00', () => {
    const computed = computeInventory(parseDataInventory(fixture));
    expect(computed.nCore).toBe(4);               // SharePoint is Core?=no
    expect(computed.activeIntegrations).toBe(3);
    expect(computed.integrationCoverage).toBe(1);
  });

  it('fires the >60% + reconciling-SSOT branch: PP-0 is NOT instantiated', () => {
    const computed = computeInventory(parseDataInventory(fixture));
    expect(pp0SeverityFromCoverage(computed.integrationCoverage, true)).toBe('none');
  });

  it('reaches Data = Established — the gate is stringent, not dead code', () => {
    expect(computeInventory(parseDataInventory(fixture)).dataGrade).toBe('Established');
  });

  it('passes A11–A15 clean', () => {
    const r = validateDataInventory(fixture);
    expect(r.reviewerFlags).toEqual([]);
    expect(r.checked).toEqual(['A11', 'A12', 'A13', 'A14', 'A15']);
  });

  // The anti-fabrication test: forcing Meridian's answer onto a sound Layer 1 must BLOCKER.
  it('BLOCKERs a fabricated PP-0 on a sound Layer 1 (the anti-hallucination case)', () => {
    for (const forced of ['Critical', 'High']) {
      const wrong = fixture.replace('pp0_severity=none', `pp0_severity=${forced}`);
      const flags = validateDataInventory(wrong).reviewerFlags;
      expect(flags.some(f => f.startsWith(BLOCKER_PREFIX) && /A12 \(PP-0 severity, F13b\)/.test(f))).toBe(true);
    }
  });
});

describe('Established governance gate G1–G3', () => {
  const reliable = (n: number): RecordClassRow[] => Array.from({ length: n }, (_, i) => ({
    recordClass: `c${i}`, systemOfRecord: 's', loadBearing: true, loadBearingBecause: 'P1',
    rating: 'reliable', ratingBecause: 'governed', confidence: '[Document-Backed]',
  }));
  const gov = (o: Partial<GovernanceEvidence> = {}): GovernanceEvidence =>
    ({ ownerNamed: true, ownerName: 'Head of Data', standardDocumented: true, standardOperative: true, ...o });

  it('reaches Established when all three artifacts hold', () => {
    expect(dataGradeFromRecordClasses(reliable(3), gov())).toBe('Established');
    expect(governanceGatePasses(gov())).toBe(true);
  });

  it('holds at Developing when ANY of G1/G2/G3 is missing', () => {
    for (const missing of ['ownerNamed', 'standardDocumented', 'standardOperative'] as const) {
      expect(dataGradeFromRecordClasses(reliable(3), gov({ [missing]: false }))).toBe('Developing');
    }
  });

  // The original profile: owner + SLAs, nothing about the standard ever being applied.
  it('holds at Developing for "named owner + documented SLAs" with no evidence of application', () => {
    expect(dataGradeFromRecordClasses(reliable(3), gov({ standardOperative: false }))).toBe('Developing');
  });

  it('never reaches Established on data state alone, however clean', () => {
    expect(dataGradeFromRecordClasses(reliable(20), undefined)).toBe('Developing');
  });

  // Regression on the bug this replaced: the aggregation used to default governance to false with no
  // way to supply it, so Established was UNREACHABLE and A13 would have BLOCKERed the correct answer.
  it('regression: Established is reachable through A13, not just through the rule text', () => {
    const marker = parseInventoryMarker(
      '<!-- inventory: n_core=2 data_grade=Established governance_owner=M. Lindqvist ' +
      'governance_owner_named=yes governance_standard_documented=yes governance_standard_operative=yes -->',
    );
    expect(governanceGatePasses(marker!.governance)).toBe(true);
    expect(dataGradeFromRecordClasses(reliable(2), marker!.governance)).toBe('Established');
  });

  it('A15 BLOCKERs governance_owner_named=yes with nobody named (the cheap predicate)', () => {
    const bare = block({
      core: [['a', 'x', 'yes', 'P1'], ['b', 'y', 'yes', 'P2']],
      integrations: [['a', 'b', 'scheduled', 'functioning', 'yes']],
      classes: [['x', 'a', 'yes', 'P1', 'Reliable'], ['y', 'b', 'yes', 'P2', 'Reliable']],
      marker: 'n_core=2 active_integrations=1 integration_coverage=1.00 designated_ssot=b ' +
        'ssot_reconciles_all_load_bearing=yes load_bearing_degraded_or_absent=0 data_grade=Developing ' +
        'pp0_severity=none governance_owner=none governance_owner_named=yes ' +
        'governance_standard_documented=no governance_standard_operative=no',
    });
    expect(validateDataInventory(bare).reviewerFlags.some(
      f => /A15 \(governance integrity\).*names nobody/.test(f),
    )).toBe(true);
  });
});

describe('A11 — arithmetic recomputed from the tables', () => {
  it('BLOCKERs a marker whose coverage disagrees with its own tables', () => {
    const wrong = LUNACART.replace('integration_coverage=0.33', 'integration_coverage=0.80');
    const flags = validateDataInventory(wrong).reviewerFlags;
    expect(flags.some(f => /A11 \(inventory arithmetic\).*integration_coverage=0.8.*= 0.33/.test(f))).toBe(true);
  });

  it('BLOCKERs a miscounted n_core', () => {
    const wrong = LUNACART.replace('n_core=7', 'n_core=5');
    expect(validateDataInventory(wrong).reviewerFlags.some(f => /A11.*n_core=5.*= 7/.test(f))).toBe(true);
  });

  it('logs a C1 correction record per checked field, forked or not', () => {
    const { records } = validateDataInventory(LUNACART);
    expect(records.filter(r => r.ruleId === 'A11')).toHaveLength(4);
    expect(records.every(r => r.agreed)).toBe(true);
    const wrong = validateDataInventory(LUNACART.replace('n_core=7', 'n_core=5'));
    expect(wrong.records.filter(r => !r.agreed).map(r => r.field)).toContain('n_core');
  });
});

describe('A14 — an Active?=yes row must really be scheduled/event + functioning + grounded', () => {
  const activeButManual = block({
    core: [['a', 'x', 'yes', 'P1'], ['b', 'y', 'yes', 'P2']],
    integrations: [['a', 'b', 'manual', 'functioning', 'yes']],
    classes: [['x', 'a', 'yes', 'P1', 'Reliable'], ['y', 'b', 'no', 'n/a', 'Reliable']],
    marker: 'n_core=2 active_integrations=1 integration_coverage=1.00 designated_ssot=b ssot_reconciles_all_load_bearing=yes load_bearing_degraded_or_absent=0 data_grade=Developing pp0_severity=none',
  });

  it('BLOCKERs a manual export claimed as active — it inflates coverage and under-states PP-0', () => {
    const flags = validateDataInventory(activeButManual).reviewerFlags;
    expect(flags.some(f => /A14 \(active-integration integrity\).*mechanism=manual/.test(f))).toBe(true);
  });

  it('BLOCKERs a broken feed claimed as active', () => {
    const broken = block({
      core: [['a', 'x', 'yes', 'P1'], ['b', 'y', 'yes', 'P2']],
      integrations: [['a', 'b', 'scheduled', 'broken', 'yes']],
      classes: [['x', 'a', 'yes', 'P1', 'Reliable'], ['y', 'b', 'no', 'n/a', 'Reliable']],
      marker: 'n_core=2 active_integrations=1 integration_coverage=1.00 ssot_reconciles_all_load_bearing=yes load_bearing_degraded_or_absent=0 data_grade=Developing pp0_severity=none',
    });
    expect(validateDataInventory(broken).reviewerFlags.some(f => /A14.*status=broken/.test(f))).toBe(true);
  });

  it('BLOCKERs an active integration resting on [Inferred] — you cannot infer your way to coverage', () => {
    const inferred = block({
      core: [['a', 'x', 'yes', 'P1'], ['b', 'y', 'yes', 'P2']],
      integrations: [['a', 'b', 'scheduled', 'functioning', 'yes']],
      classes: [['x', 'a', 'yes', 'P1', 'Reliable'], ['y', 'b', 'no', 'n/a', 'Reliable']],
      marker: 'n_core=2 active_integrations=1 integration_coverage=1.00 ssot_reconciles_all_load_bearing=yes load_bearing_degraded_or_absent=0 data_grade=Developing pp0_severity=none',
      confidence: '[Inferred]',
    });
    expect(validateDataInventory(inferred).reviewerFlags.some(f => /A14.*confidence=\[Inferred\]/.test(f))).toBe(true);
  });
});

describe('A15 — referential integrity of the inventory itself', () => {
  it('BLOCKERs a Core?=yes system that names no record class (it inflates n_core)', () => {
    const bad = block({
      core: [['a', 'x', 'yes', 'P1'], ['ghost', '', 'yes', 'P2']],
      integrations: [],
      classes: [['x', 'a', 'yes', 'P1', 'Reliable']],
      marker: 'n_core=2 active_integrations=0 integration_coverage=0.00 ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=0 data_grade=Developing pp0_severity=Critical',
    });
    expect(validateDataInventory(bad).reviewerFlags.some(f => /A15 \(core-system integrity\).*ghost.*names no record class/.test(f))).toBe(true);
  });

  it('BLOCKERs a load-bearing class that names no priority (it changes the maturity band)', () => {
    const bad = block({
      core: [['a', 'x', 'yes', 'P1'], ['b', 'y', 'yes', 'P2']],
      integrations: [],
      classes: [['x', 'a', 'yes', 'n/a', 'Degraded'], ['y', 'b', 'no', 'n/a', 'Reliable']],
      marker: 'n_core=2 active_integrations=0 integration_coverage=0.00 ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=1 data_grade=Early pp0_severity=Critical',
    });
    expect(validateDataInventory(bad).reviewerFlags.some(f => /A15 \(load-bearing integrity\).*names no stated priority/.test(f))).toBe(true);
  });

  it('BLOCKERs a record class whose system of record is absent from the Core Systems table', () => {
    const bad = block({
      core: [['a', 'x', 'yes', 'P1']],
      integrations: [],
      classes: [['x', 'a', 'yes', 'P1', 'Reliable'], ['orphan', 'nowhere', 'no', 'n/a', 'Reliable']],
      marker: 'n_core=1 active_integrations=0 integration_coverage=0.00 ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=0 data_grade=Developing pp0_severity=Critical',
    });
    expect(validateDataInventory(bad).reviewerFlags.some(f => /A15 \(cross-table integrity\).*orphan.*"nowhere"/.test(f))).toBe(true);
  });
});

// ── A16: pool exclusions vs PP-0 severity, deliberately asymmetric ──────────────
describe('A16 — band1_pool exclusions vs PP-0 severity', () => {
  const withSectionH = (severity: string, sectionH: string) =>
    `# Dossier\n\n<!-- inventory: n_core=5 active_integrations=0 integration_coverage=0.00 ` +
    `ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=1 data_grade=Early ` +
    `pp0_severity=${severity} -->\n\n## Section H — Reviewer Checklist\n\n${sectionH}\n`;

  const MERIDIAN_H = '- Excluded (`band1_pool=no`, PP-0 Critical (systemic)): H-RT-08 RPO Product ' +
    'Infrastructure (score 50); H-RT-09 Executive Search Workflow Intelligence (score 32) — both ' +
    'standalone product-build bets; conditions to re-enter recorded above';

  // ── Direction 1: hard. This is the direction that catches LunaCart. ──
  it('is clean at Critical with exclusions recorded (Meridian)', () => {
    // v37.4a: A16c now requires the archetype row that carries the flag. Meridian's recruitment
    // archetype marks both as band1_pool=no, which is what authorises the exclusion.
    const r = validatePoolExclusions(withSectionH('Critical', MERIDIAN_H),
      new Map([['h-rt-08', { band1Pool: 'no' }], ['h-rt-09', { band1Pool: 'no' }]]));
    expect(r.reviewerFlags).toEqual([]);
    expect(r.excludedIds).toEqual(['h-rt-08', 'h-rt-09']);
  });

  it('BLOCKERs an exclusion applied at High — the LunaCart T2–T4 defect', () => {
    const r = validatePoolExclusions(withSectionH('High', MERIDIAN_H));
    expect(r.reviewerFlags[0]).toContain(BLOCKER_PREFIX);
    expect(r.reviewerFlags[0]).toMatch(/unauthorised pool exclusion.*PP-0 severity is High/);
    // The record self-reports the severity that triggered it — quoted back as evidence.
    expect(r.reviewerFlags[0]).toMatch(/exclusion record itself claims "PP-0 Critical"/);
    // And names the mechanism a count-based review cannot see.
    expect(r.reviewerFlags[0]).toMatch(/MEMBERSHIP while leaving its COUNT at 7\+H-0/);
  });

  it('BLOCKERs an exclusion applied when PP-0 is not instantiated at all', () => {
    const r = validatePoolExclusions(withSectionH('none', MERIDIAN_H));
    expect(r.reviewerFlags.some(f => /unauthorised pool exclusion.*PP-0 severity is none/.test(f))).toBe(true);
  });

  it('is clean at High with NO exclusions — the correct LunaCart answer', () => {
    const r = validatePoolExclusions(withSectionH('High', '- No pool exclusions this engagement.'));
    expect(r.reviewerFlags).toEqual([]);
    expect(r.excludedIds).toEqual([]);
  });

  it('catches a reworded exclusion record, not just the canonical summary line', () => {
    const reworded = '- H-RT-08 was removed from the candidate pool (`band1_pool=no`).';
    expect(validatePoolExclusions(withSectionH('High', reworded)).excludedIds).toEqual(['h-rt-08']);
  });

  // ── Direction 2: declaration, NOT a count. Asserting non-empty here would BLOCKER a correct run. ──
  it('does NOT require non-empty exclusions at Critical — it requires the empty set to be DECLARED', () => {
    const undeclared = validatePoolExclusions(withSectionH('Critical', '- Nothing outstanding.'));
    expect(undeclared.reviewerFlags[0]).toMatch(/undeclared empty exclusion set/);
    expect(undeclared.reviewerFlags[0]).toMatch(/Empty may be correct/);

    const declared = validatePoolExclusions(withSectionH('Critical',
      '- Excluded (`band1_pool=no`, PP-0 Critical (systemic)): none — no candidate carried band1_pool=no.'));
    expect(declared.reviewerFlags).toEqual([]);
    expect(declared.declarationPresent).toBe(true);
  });

  it('accepts the declaration phrased against the exclusion criteria', () => {
    const r = validatePoolExclusions(withSectionH('Critical',
      '- No candidate in the evaluated pool met the exclusion criteria for the Band-1 rule.'));
    expect(r.reviewerFlags).toEqual([]);
  });

  it('fails loud when PP-0 severity is unresolvable — membership is UNVERIFIED, not clean', () => {
    const r = validatePoolExclusions(`# Dossier\n\n## Section H\n\n${MERIDIAN_H}\n`);
    expect(r.unavailableReason).toBe('severity_unresolvable');
    expect(r.reviewerFlags[0]).toMatch(/PP-0 severity is not resolvable.*cannot be checked/s);
  });

  it('the pinned Nordwind fixture (PP-0 none) carries no exclusions', () => {
    const fixture = fs.readFileSync(
      path.join(__dirname, '../skills/blueprint-intake/fixtures/band3_calibration.md'), 'utf-8',
    );
    const r = validatePoolExclusions(fixture);
    expect(r.severity).toBe('none');
    expect(r.excludedIds).toEqual([]);
    expect(r.reviewerFlags).toEqual([]);
  });
});

describe('fail-loud when the inventory is missing', () => {
  it('BLOCKERs an absent block and says both gates are unverifiable', () => {
    const r = validateDataInventory('# Dossier\n\n## Section A\n\nNo inventory here.');
    expect(r.unavailableReason).toBe('inventory_absent');
    expect(r.checked).toEqual([]);
    expect(r.reviewerFlags[0]).toContain(BLOCKER_PREFIX);
    expect(r.reviewerFlags[0]).toMatch(/\[DATA_INVENTORY\] block is ABSENT/);
  });

  it('BLOCKERs tables present but marker missing, and reports what it recomputed', () => {
    const noMarker = LUNACART.replace(/<!-- inventory:[\s\S]*?-->/, '');
    const r = validateDataInventory(noMarker);
    expect(r.unavailableReason).toBe('marker_absent');
    expect(r.reviewerFlags[0]).toMatch(/computed marker is MISSING/);
    expect(r.reviewerFlags[0]).toMatch(/n_core=7, active=2, coverage=0.33, data_grade=Early/);
  });

  it('parseInventoryMarker returns null rather than throwing on absent input', () => {
    expect(parseInventoryMarker('no marker here')).toBeNull();
  });
});

// ── v37.4a: the dominant failure class — exact match against an unguaranteed form ──
describe('normaliseEnumCell — seventh instance of the exact-match class (LunaCart v1.1 §3)', () => {
  const { normaliseEnumCell, enumMatches, isYes } = require('./inventoryGuards');

  it('takes the leading token past a parenthetical — the A14 false fire', () => {
    expect(normaliseEnumCell('scheduled (celigo connector)')).toBe('scheduled');
    expect(normaliseEnumCell('Degraded (siloed, 2/5)')).toBe('degraded');
    expect(normaliseEnumCell('Critical (systemic)')).toBe('critical');
    expect(normaliseEnumCell('Critical systemic')).toBe('critical');   // no parentheses
    expect(normaliseEnumCell('yes — daily since 2024')).toBe('yes');
    expect(normaliseEnumCell('**Early**')).toBe('early');
    expect(normaliseEnumCell('functioning [Document-Backed]')).toBe('functioning');
  });

  it('matches on set membership after normalising', () => {
    expect(enumMatches('scheduled (celigo connector)', ['scheduled', 'event'])).toEqual({ ok: true, normalised: 'scheduled' });
    expect(enumMatches('manual export', ['scheduled', 'event'])).toEqual({ ok: false, normalised: 'manual' });
  });

  it('defaults an unreadable flag to NOT set — every flag here raises severity when set', () => {
    expect(isYes('yes (documented p.4)')).toBe(true);
    expect(isYes('no')).toBe(false);
    expect(isYes('')).toBe(false);
    expect(isYes(undefined)).toBe(false);
    expect(isYes('unknown')).toBe(false);
  });
});

describe('A14 — annotated mechanism/status no longer false-fires', () => {
  const annotated = block({
    core: [['shopify plus', 'orders', 'yes', 'P1'], ['netsuite erp', 'finance', 'yes', 'P3']],
    integrations: [['shopify plus', 'netsuite erp', 'scheduled (celigo connector)', 'functioning (daily)', 'yes']],
    classes: [['orders', 'shopify plus', 'yes', 'P1', 'Reliable'], ['finance', 'netsuite erp', 'no', 'n/a', 'Reliable']],
    marker: 'n_core=2 active_integrations=1 integration_coverage=1.00 designated_ssot=netsuite erp ' +
      'ssot_reconciles_all_load_bearing=yes load_bearing_degraded_or_absent=0 data_grade=Developing pp0_severity=none',
  });

  it('accepts "scheduled (celigo connector)" — the exact firing from the v1.1 panels', () => {
    expect(validateDataInventory(annotated).reviewerFlags).toEqual([]);
  });

  it('still rejects a genuinely manual mechanism, and names what it normalised to', () => {
    const manual = annotated.replace('scheduled (celigo connector)', 'manual CSV export (weekly)');
    const flags = validateDataInventory(manual).reviewerFlags;
    expect(flags.some(f => /A14.*normalised "manual".*must be scheduled or event/.test(f))).toBe(true);
  });

  it('accepts an annotated Degraded rating for A13', () => {
    const degraded = block({
      core: [['a', 'x', 'yes', 'P1'], ['b', 'y', 'yes', 'P2']],
      integrations: [],
      classes: [['x', 'a', 'yes', 'P1', 'Degraded (siloed, quality 2/5)'], ['y', 'b', 'no', 'n/a', 'Reliable']],
      marker: 'n_core=2 active_integrations=0 integration_coverage=0.00 ssot_reconciles_all_load_bearing=no ' +
        'load_bearing_degraded_or_absent=1 data_grade=Early pp0_severity=Critical',
    });
    expect(validateDataInventory(degraded).reviewerFlags).toEqual([]);
  });

  it('marker values may be multi-word — governance_owner is no longer truncated', () => {
    const m = parseInventoryMarker('<!-- inventory: n_core=4 governance_owner=Head of Data (M. Lindqvist) governance_owner_named=yes -->');
    expect(m!.governance.ownerName).toBe('Head of Data (M. Lindqvist)');
    expect(m!.nCore).toBe(4);
  });
});

// ── A16c: exclusion provenance ──────────────────────────────────────────────────
describe('A16c — an exclusion must have a root in the archetype row', () => {
  const withSectionH2 = (severity: string, sectionH: string) =>
    `# Dossier\n\n<!-- inventory: n_core=5 integration_coverage=0.00 pp0_severity=${severity} -->\n\n## Section H\n\n${sectionH}\n`;
  const EXCLUDED = '- Excluded (`band1_pool=no`, PP-0 Critical (systemic)): H-RT-08 (score 50); H-RT-09 (score 32)';
  const roots = (flags: Record<string, string>) =>
    new Map(Object.entries(flags).map(([id, band1Pool]) => [id, { band1Pool }]));

  it('is clean when every excluded ID carries band1_pool=no', () => {
    const r = validatePoolExclusions(withSectionH2('Critical', EXCLUDED), roots({ 'h-rt-08': 'no', 'h-rt-09': 'no' }));
    expect(r.reviewerFlags).toEqual([]);
    expect(r.provenanceChecked).toBe(true);
  });

  it('BLOCKERs an exclusion that CONTRADICTS its archetype row', () => {
    const r = validatePoolExclusions(withSectionH2('Critical', EXCLUDED), roots({ 'h-rt-08': 'yes', 'h-rt-09': 'no' }));
    expect(r.reviewerFlags.some(f => /A16c.*h-rt-08.*archetype row carries band1_pool=yes/.test(f))).toBe(true);
  });

  it('BLOCKERs an exclusion whose ID is absent from the archetype table', () => {
    const r = validatePoolExclusions(withSectionH2('Critical', EXCLUDED), roots({ 'h-rt-08': 'no' }));
    expect(r.reviewerFlags.some(f => /A16c.*h-rt-09.*ABSENT from the archetype/.test(f))).toBe(true);
  });

  // The LunaCart v1 T4 behaviour: an exclusion applied with no archetype to authorise it.
  it('BLOCKERs any exclusion when no archetype resolved — it changed the output with no source', () => {
    const r = validatePoolExclusions(withSectionH2('Critical', EXCLUDED), new Map());
    expect(r.provenanceChecked).toBe(false);
    const flag = r.reviewerFlags.find(f => /A16c/.test(f))!;
    expect(flag).toMatch(/NO archetype resolved.*model assertion/s);
    expect(flag).toMatch(/CHANGED\s+THE OUTPUT/);
  });

  it('does not run A16c at all when there are no exclusions to root', () => {
    const r = validatePoolExclusions(
      withSectionH2('High', '- No pool exclusions this engagement.'), new Map());
    expect(r.reviewerFlags).toEqual([]);
    expect(r.provenanceChecked).toBe(false);
  });
});
