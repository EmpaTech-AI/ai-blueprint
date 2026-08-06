// The v37.9 micro-release — five items from the fourteen-batch cross-era report, held ahead of TC3.
//
// The sequencing argument is the reason this file exists as its own suite: TC3 (VelocityFreight) is a
// first-ever batch with no baseline, and instance 20's false-fire class is loud on exactly that
// industry's vocabulary — EUR2 pallets, FTL/LTL, 24/7, ISO container codes, M365. Grading a
// no-baseline batch through a known false-fire class produces numbers nobody can attribute, so the
// five fixes land first and each one is pinned here.
//
//   1  instance 20/20b  — a digit inside an alphanumeric identifier is not a quantity
//   2  instance 21      — the narration strip's `^` anchor and its markup blindness
//   3  the net_profit accounting identity — COGS is a component, not a synonym for total costs
//   4  N4               — "active integration" DERIVED from four sub-predicates
//   5  T1               — deadline-pinned items exempt from P1 displacement

import {
  extractClaims,
  parseQuantity,
  reconcileFinancials,
} from './financialReconciliation';
import {
  stripStageNarration,
  stripForDelivery,
  detectResidualScaffold,
} from './confidenceScorer';
import {
  parseDataInventory,
  computeInventory,
  validateDataInventory,
  activePredicates,
  derivedActive,
} from './inventoryGuards';
import {
  derivePlacement,
  deadlineOverflow,
  validatePlacement,
  NOW_CAPACITY,
  PlacementInput,
} from './phasePlacement';
import { BLOCKER_PREFIX, FormAnswers, DocumentCorpus, ParsedDocument } from '../types/pipeline';

const doc = (category: string, text: string): ParsedDocument =>
  ({ category, filename: `${category}.pdf`, text, status: 'ok', confidence: 'high' });
const corpusOf = (...docs: ParsedDocument[]): DocumentCorpus =>
  ({ parsedAt: '2026-08-06', documents: docs, failedDocuments: [], missingRequiredCategories: [] });
const NO_FORM: FormAnswers = {};

// ═══ Item 1 — instances 20 / 20b: sub-token boundaries ═════════════════════════════

describe('item 1 — a digit inside an alphanumeric identifier is not a quantity', () => {
  it('does not read €2.0B out of "B2B" (instance 20, Luna 4/4)', () => {
    // The `2` took the leading `B` of `B2B`... no — it took the TRAILING `B` as a scale suffix, and the
    // preceding `B` is what should have disqualified it. Both halves matter, hence the lookbehind.
    const claims = extractClaims('Annual revenue from B2B wholesale: €6.4M', 'document:financials', false);
    const revenue = claims.filter(c => c.metric === 'revenue');
    expect(revenue).toHaveLength(1);
    expect(revenue[0].value).toBe(6_400_000);
    expect(claims.some(c => c.value === 2e9)).toBe(false);
  });

  it('does not read a headcount of 365 out of "M365" (instance 20b, Meridian 2/4)', () => {
    const claims = extractClaims('Employees collaborate in M365 across both offices', 'document:profile', false);
    expect(claims).toHaveLength(0);
  });

  it('rejects the identifier but keeps a real figure on the same line', () => {
    const claims = extractClaims('Headcount using M365: 240 staff', 'document:profile', false);
    const hc = claims.filter(c => c.metric === 'headcount');
    expect(hc).toHaveLength(1);
    expect(hc[0].value).toBe(240);
  });

  it('leaves the freight vocabulary TC3 is dense in alone', () => {
    // Each of these lines carries a metric label AND a digit-bearing identifier, which is the exact
    // shape that would have flooded a first-ever batch.
    expect(extractClaims('Total costs are tracked per FTL2 lane', 'document:ops', false)).toHaveLength(0);
    expect(extractClaims('Employees certified to ISO9001 standard', 'document:ops', false)).toHaveLength(0);
    expect(extractClaims('Q4 revenue held flat', 'document:ops', false)).toHaveLength(0);
    expect(parseQuantity('Headcount: EUR2 pallet handlers', 'count')).toBeNull();
  });

  it('rejects a number that is one side of a slash pair (24/7, 2/5)', () => {
    // Not in the register's filing. `24/7` survived the identifier boundary because it IS bare digits,
    // and it yielded a headcount of 24 — on the vocabulary TC3 is densest in. A slash pair is a
    // shorthand or a ratio, never a currency amount or a count. Both halves are rejected.
    expect(extractClaims('Employees on the 24/7 desk rotate weekly', 'document:ops', false)).toHaveLength(0);
    expect(parseQuantity('quality 2/5', 'count')).toBeNull();
    expect(parseQuantity('Headcount as of 01/2025', 'count')).toBeNull();
  });

  it('the whole-token rule is what makes the ratio guard hold', () => {
    // Without it the group backtracks: `24/7` fails the lookahead on `24`, retries as `2`, and passes.
    // A partial match would have produced a MORE plausible false figure, not a less plausible one.
    expect(parseQuantity('Employees: 24/7', 'count')).toBeNull();
    expect(parseQuantity('Employees: 24', 'count')!.value).toBe(24);
  });

  it('still parses every legitimate qualified form (no regression from the lookbehind)', () => {
    expect(parseQuantity('Revenue: €6.4M', 'currency')!.value).toBe(6_400_000);
    expect(parseQuantity('Revenue: €2.0B', 'currency')!.value).toBe(2e9);
    expect(parseQuantity('Revenue: 12.4 million', 'currency')!.value).toBe(12_400_000);
    expect(parseQuantity('Revenue: €12,400,000', 'currency')!.value).toBe(12_400_000);
    expect(parseQuantity('Headcount: 240 staff', 'count')!.value).toBe(240);
    expect(parseQuantity('Net margin: 4.2%', 'percent')!.value).toBe(4.2);
  });

  it('still skips the fiscal-year token it already skipped', () => {
    expect(parseQuantity('FY2025 total revenue: €6.4M', 'currency')!.value).toBe(6_400_000);
  });
});

// ═══ Item 2 — instance 21: the anchor and the markup ═══════════════════════════════

describe('item 2 — narration escapes the strip by position or by markup', () => {
  it('strips a TAIL-position narration phrase (the escaping variant)', () => {
    const out = stripStageNarration('Per the contract I will now produce Chunk 1.');
    expect(out.trim()).toBe('');
  });

  it('strips a narration line wearing markup', () => {
    expect(stripStageNarration('Producing **Chunk 1 only**:').trim()).toBe('');
    expect(stripStageNarration('## **Checkpoint 2** — foundation complete').trim()).toBe('');
    expect(stripStageNarration('- **I have received** all four documents').trim()).toBe('');
    expect(stripStageNarration('**Operator note**: verify before sending').trim()).toBe('');
  });

  it('removes only the narration SENTENCE from a mixed line', () => {
    // Whole-line removal would take the client's revenue figure with it. This is the shape a tail
    // variant actually produces, so sentence-level removal is not a nicety.
    const out = stripStageNarration('Revenue is €6.4M. Now producing Chunk 2.');
    expect(out).toBe('Revenue is €6.4M.');
  });

  it('preserves the bullet lead when a narration sentence is removed from a list item', () => {
    expect(stripStageNarration('- Margin held at 4.2%. Emitting Section 3 next.'))
      .toBe('- Margin held at 4.2%.');
  });

  it('does NOT strip a machine-channel name used as a real sentence subject', () => {
    const content = 'The DATA_INVENTORY shows four active integrations across the client stack.';
    expect(stripStageNarration(content)).toBe(content);
  });

  it('does NOT strip client content that happens to name a numbered section', () => {
    const content = 'Their SOP requires that Chunk 4 of the pallet load be weighed on arrival.';
    expect(stripStageNarration(content)).toBe(content);
  });

  it('the detector now knows the form the strip removes (instance 21 was a false CLEAN)', () => {
    // Before v37.9 `Chunk N` narration was in no registry form, so nothing reported what the strip
    // had missed. Every strip must have a detector that can prove it.
    expect(detectResidualScaffold('Per the contract I will now produce Chunk 1.').length).toBeGreaterThan(0);
    expect(detectResidualScaffold(stripForDelivery('Per the contract I will now produce Chunk 1.')))
      .toHaveLength(0);
  });

  it('survives the full delivery pipe, not just the one strip', () => {
    const drafted = [
      '# AI Value Blueprint',
      '',
      'Producing **Chunk 1 only**:',
      '',
      'Revenue is €6.4M and margin held at 4.2%.',
      'Per the contract I will now produce Chunk 2.',
    ].join('\n');
    const out = stripForDelivery(drafted);
    expect(out).toContain('Revenue is €6.4M');
    expect(out).not.toMatch(/Chunk\s+\d/i);
  });
});

// ═══ Item 3 — the net_profit accounting identity ═══════════════════════════════════

describe('item 3 — COGS is a component of total costs, not a synonym for it', () => {
  const pack = (lines: string[]) => corpusOf(doc('financial_summary', lines.join('\n')));

  it('no longer flags a perfectly consistent P&L (revenue − COGS = GROSS profit)', () => {
    // 6.4 − 3.9 = 2.5 gross; net 0.8 after 1.7 of operating expense. Arithmetically flawless, and
    // v37.8 called it a €1.7M self-contradiction because COGS was read as total costs.
    const r = reconcileFinancials(NO_FORM, pack([
      'FY2025 revenue: €6.4M',
      'FY2025 cost of goods sold: €3.9M',
      'FY2025 gross profit: €2.5M',
      'FY2025 operating expenses: €1.7M',
      'FY2025 net profit: €0.8M',
    ]), '');
    expect(r.reviewerFlags).toHaveLength(0);
  });

  it('still catches a real net-profit contradiction against TRUE total costs', () => {
    const r = reconcileFinancials(NO_FORM, pack([
      'FY2025 revenue: €6.4M',
      'FY2025 total costs: €5.0M',
      'FY2025 net profit: €0.8M',           // should be 1.4
    ]), '');
    expect(r.reviewerFlags.some(f => f.startsWith(BLOCKER_PREFIX) && /net_profit/.test(f))).toBe(true);
  });

  it('catches a GROSS-profit contradiction, which v37.8 could not express at all', () => {
    const r = reconcileFinancials(NO_FORM, pack([
      'FY2025 revenue: €6.4M',
      'FY2025 COGS: €3.9M',
      'FY2025 gross profit: €1.2M',         // should be 2.5
    ]), '');
    expect(r.divergences.some(d => d.metric === 'gross_profit' && d.severity === 'blocker')).toBe(true);
  });

  it('checks the gross-margin identity, which was in the vocabulary but unpaired', () => {
    const r = reconcileFinancials(NO_FORM, pack([
      'FY2025 revenue: €6.4M',
      'FY2025 gross profit: €2.5M',
      'FY2025 gross margin: 22.0%',         // should be 39.1
    ]), '');
    expect(r.divergences.some(d => d.metric === 'gross_margin' && d.severity === 'blocker')).toBe(true);
  });

  it('runs NO net-profit check when only a gross cost level is stated', () => {
    // Net profit is not derivable from COGS. The silence is correct rather than a gap — nothing here
    // guesses the missing operating-expense line.
    const r = reconcileFinancials(NO_FORM, pack([
      'FY2025 revenue: €6.4M',
      'FY2025 cost of sales: €3.9M',
      'FY2025 net profit: €0.8M',
    ]), '');
    expect(r.divergences.some(d => d.metric === 'net_profit')).toBe(false);
  });

  it('admits "total cost of goods sold" as COGS only — the narrower level wins', () => {
    const claims = extractClaims('FY2025 total cost of goods sold: €3.9M', 'document:fin', false);
    expect(claims.map(c => c.metric)).toEqual(['cogs']);
  });
});

// ═══ Item 4 — N4: active integration DERIVED from P-a..P-d ════════════════════════

const block = (integrations: Array<[string, string, string, string, string, string?]>, marker: string) => [
  '# Compressed Client Dossier',
  '',
  '## [DATA_INVENTORY]',
  '',
  '### Core Systems',
  '| System | Record classes held | Core? | Core because | Confidence |',
  '|---|---|---|---|---|',
  '| shopify | orders | yes | Priority 1 | [Document-Backed] |',
  '| netsuite | finance | yes | Priority 2 | [Document-Backed] |',
  '| returnly | returns | yes | Priority 3 | [Document-Backed] |',
  '',
  '### Integrations',
  '| System A | System B | Mechanism | Status | Active? | Confidence |',
  '|---|---|---|---|---|---|',
  ...integrations.map(r => `| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} | ${r[5] ?? '[Document-Backed]'} |`),
  '',
  '### Record Classes',
  '| Record class | System of record | Load-bearing? | Load-bearing because | Rating | Rating because | Confidence |',
  '|---|---|---|---|---|---|---|',
  '| orders | shopify | yes | Priority 1 | Reliable | evidence | [Document-Backed] |',
  '',
  `<!-- inventory: ${marker} -->`,
].join('\n');

describe('item 4 — N4 derives Active? rather than reading the authored cell', () => {
  const systems = new Set(['shopify', 'netsuite', 'returnly']);
  const row = (o: Partial<{ a: string; b: string; mechanism: string; status: string; active: boolean; confidence: string }> = {}) => ({
    a: o.a ?? 'shopify', b: o.b ?? 'netsuite',
    mechanism: o.mechanism ?? 'scheduled', status: o.status ?? 'functioning',
    active: o.active ?? true, confidence: o.confidence ?? '[Document-Backed]',
  });

  it('requires all four predicates', () => {
    expect(derivedActive(activePredicates(row(), systems))).toBe(true);
    expect(derivedActive(activePredicates(row({ a: 'unlisted_tool' }), systems))).toBe(false);   // P-a
    expect(derivedActive(activePredicates(row({ mechanism: 'manual' }), systems))).toBe(false);  // P-b
    expect(derivedActive(activePredicates(row({ status: 'broken' }), systems))).toBe(false);     // P-c
    expect(derivedActive(activePredicates(row({ confidence: '[Inferred]' }), systems))).toBe(false); // P-d
  });

  it('P-a is "inventoried", not "core" — an endpoint absent from the table cannot be active', () => {
    const p = activePredicates(row({ b: 'some_spreadsheet' }), systems);
    expect(p.inventoried).toBe(false);
    expect(p.automatic).toBe(true);      // the other three still hold, so the message can say which failed
  });

  it('an authored NO whose predicates all hold now COUNTS toward coverage', () => {
    // The direction v37.8 accepted in silence: coverage came out too low with nothing recorded.
    const dossier = block([
      ['shopify', 'netsuite', 'scheduled', 'functioning', 'no'],
      ['netsuite', 'returnly', 'event', 'functioning', 'yes'],
    ], 'n_core=3 active_integrations=2 integration_coverage=1.00 designated_ssot=none data_grade=Developing load_bearing_degraded_or_absent=0');
    expect(computeInventory(parseDataInventory(dossier)).activeIntegrations).toBe(2);
  });

  it('and BLOCKERs the under-statement, because the table then contradicts its own coverage figure', () => {
    const dossier = block([
      ['shopify', 'netsuite', 'scheduled', 'functioning', 'no'],
    ], 'n_core=3 active_integrations=1 integration_coverage=0.50 designated_ssot=none data_grade=Developing load_bearing_degraded_or_absent=0');
    const flags = validateDataInventory(dossier).reviewerFlags;
    expect(flags.some(f => /A14 \(N4 .*all four predicates hold/s.test(f))).toBe(true);
  });

  it('an authored YES that fails a predicate is EXCLUDED from coverage, not merely flagged', () => {
    // v37.8 blocked but still counted the row, so the coverage figure in the artifact stayed inflated.
    const dossier = block([
      ['shopify', 'netsuite', 'manual', 'functioning', 'yes'],
      ['netsuite', 'returnly', 'scheduled', 'functioning', 'yes'],
    ], 'n_core=3 active_integrations=2 integration_coverage=1.00 designated_ssot=none data_grade=Developing load_bearing_degraded_or_absent=0');
    expect(computeInventory(parseDataInventory(dossier)).activeIntegrations).toBe(1);
    expect(validateDataInventory(dossier).reviewerFlags
      .some(f => /A14 \(N4 .*derives INACTIVE/s.test(f))).toBe(true);
  });

  it('records authored-vs-derived as a C1 measurement on EVERY row, agreeing or not', () => {
    const dossier = block([
      ['shopify', 'netsuite', 'scheduled', 'functioning', 'yes'],
      ['netsuite', 'returnly', 'manual', 'functioning', 'yes'],
    ], 'n_core=3 active_integrations=1 integration_coverage=0.50 designated_ssot=none data_grade=Developing load_bearing_degraded_or_absent=0');
    const rows = validateDataInventory(dossier).records.filter(r => r.ruleId === 'A14');
    expect(rows).toHaveLength(2);
    expect(rows.filter(r => r.agreed)).toHaveLength(1);
    expect(rows.find(r => !r.agreed)!.rootInputs).toMatchObject({ predicates: { automatic: false } });
  });

  it('agrees silently when the author got it right (no new noise on a clean inventory)', () => {
    const dossier = block([
      ['shopify', 'netsuite', 'scheduled', 'functioning', 'yes'],
      ['netsuite', 'returnly', 'manual', 'broken', 'no'],
    ], 'n_core=3 active_integrations=1 integration_coverage=0.50 designated_ssot=none data_grade=Developing load_bearing_degraded_or_absent=0');
    expect(validateDataInventory(dossier).reviewerFlags.filter(f => /A14/.test(f))).toHaveLength(0);
  });
});

// ═══ Item 5 — T1: the placement clause ════════════════════════════════════════════

describe('item 5 — deadline-pinned items are exempt from P1 displacement', () => {
  const el = (id: string, impact: number, feasibility: number, flags: Record<string, string> = {}): PlacementInput =>
    ({ id, impact, feasibility, flags });
  const DEADLINE = { compliance_deadline: '2027-01-01' };

  it('reserves the deadline item its slot and displaces the LOWEST-value Quick Win instead', () => {
    // Three Quick Wins outrank the deadline item on I×F. v37.8 filled Now with all three, then let the
    // deadline item in anyway — Now silently carried 4, and the wrong item kept its slot.
    const map = derivePlacement([
      el('h-a-01', 5, 5),
      el('h-a-02', 5, 4),
      el('h-a-03', 4, 4),
      el('h-a-04', 2, 4, DEADLINE),
    ]);
    const phase = (id: string) => map.find(d => d.id === id)!.phase;
    expect(phase('h-a-04')).toBe('Now');
    expect(phase('h-a-03')).toBe('Next');                              // lowest-value QW displaced
    expect(map.filter(d => d.phase === 'Now')).toHaveLength(NOW_CAPACITY!);
  });

  it('returns the map in rank order regardless of the two-pass evaluation', () => {
    const map = derivePlacement([el('h-a-01', 2, 2), el('h-a-02', 5, 5, DEADLINE), el('h-a-03', 4, 4)]);
    expect(map.map(d => d.id)).toEqual(['h-a-02', 'h-a-03', 'h-a-01']);
  });

  it('a strict dependency still beats a dated deadline, and does not consume capacity', () => {
    const map = derivePlacement([
      el('h-a-01', 5, 5, { ...DEADLINE, phase_dependency: 'strict' }),
      el('h-a-02', 5, 4), el('h-a-03', 4, 4), el('h-a-04', 4, 4),
    ]);
    expect(map.find(d => d.id === 'h-a-01')!.phase).toBe('Later');
    expect(map.filter(d => d.phase === 'Now')).toHaveLength(3);
  });

  it('behaves exactly as before when nothing is deadline-pinned', () => {
    const map = derivePlacement([el('h-a-01', 5, 5), el('h-a-02', 5, 4), el('h-a-03', 4, 4), el('h-a-04', 3, 4)]);
    expect(map.filter(d => d.phase === 'Now').map(d => d.id)).toEqual(['h-a-01', 'h-a-02', 'h-a-03']);
    expect(map.find(d => d.id === 'h-a-04')!.phase).toBe('Next');
  });

  it('deadline items alone within the cap are not an overflow', () => {
    expect(deadlineOverflow([el('h-a-01', 3, 3, DEADLINE), el('h-a-02', 3, 3, DEADLINE)])).toEqual([]);
  });

  it('fails LOUD when deadline items alone exceed the cap — no reordering can fix it', () => {
    const inputs = [1, 2, 3, 4].map(n => el(`h-a-0${n}`, 3, 3, DEADLINE));
    expect(deadlineOverflow(inputs)).toHaveLength(4);
    const flags = validatePlacement('## Phase 1 — Now', inputs).reviewerFlags;
    expect(flags.some(f => f.startsWith(BLOCKER_PREFIX) && /T1 placement clause/.test(f))).toBe(true);
    expect(flags.some(f => /cannot be deferred past its own date/.test(f))).toBe(true);
  });

  it('an overflowed strict-dependency item is not counted as an overflow (it is in Later)', () => {
    const inputs = [1, 2, 3, 4].map(n => el(`h-a-0${n}`, 3, 3, { ...DEADLINE, phase_dependency: 'strict' }));
    expect(deadlineOverflow(inputs)).toEqual([]);
  });
});
