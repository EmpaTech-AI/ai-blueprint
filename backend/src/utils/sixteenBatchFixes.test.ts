// v37.10 — the sixteen-batch report's six items, plus the correction to its attribution.
//
// The report priced S4-DUP at EH 1.35 (47% of Meridian's era harm), ended the eight-batch zero-undetected
// streak on it, and attributed it to v37.9's item-5 control-flow restructure — founding the Law 4
// candidate ("risk class = control-flow footprint") on the reading that four predicate fixes held and the
// one restructure regressed.
//
// The first describe block below is the evidence that the attribution is inverted: **item 5 is a
// byte-identical no-op on Meridian**, and the regression is item 2, a predicate widening. The second is
// why nothing caught the duplicate — a Class F property that has been unassertable since the P-rules were
// written, and is not a v37.9 regression at all.

import {
  derivePlacement,
  emittedPlacement,
  emittedOccurrences,
  duplicateEmissions,
  validatePlacement,
  PlacementInput,
} from './phasePlacement';
import { stripStageNarration, stripForDelivery, stripOperatorPreamble, CLIENT_PROSE, CLIENT_SECTIONS } from './confidenceScorer';
import {
  activePredicates,
  derivedActive,
  mechanismSelfContradiction,
  mechanismAnnotation,
  validateDataInventory,
  computeInventory,
  parseDataInventory,
  IntegrationRow,
} from './inventoryGuards';
import { resolveName, namesResolve } from './enumNormalise';
import { extractClaims, reconcileFinancials, labelsAComponent, labelsASegment, rowLabelText } from './financialReconciliation';
import { BLOCKER_PREFIX, FormAnswers, DocumentCorpus, ParsedDocument } from '../types/pipeline';
import { CLASS_F_REGISTRY, assuranceCoverage, unknownGuardIds, undeclaredGaps, byState } from './classFRegistry';
import fs from 'fs';
import path from 'path';

const el = (id: string, impact: number, feasibility: number, flags: Record<string, string> = {}): PlacementInput =>
  ({ id, impact, feasibility, flags });
const doc = (c: string, t: string): ParsedDocument =>
  ({ category: c, filename: `${c}.pdf`, text: t, status: 'ok', confidence: 'high' });
const pack = (lines: string[]): DocumentCorpus =>
  ({ parsedAt: '2026-08-06', documents: [doc('financial_summary', lines.join('\n'))], failedDocuments: [], missingRequiredCategories: [] });
const NO_FORM: FormAnswers = {};
const blockers = (flags: string[]) => flags.filter(f => f.startsWith(BLOCKER_PREFIX));

// ═══ The attribution: item 5 did not do this ══════════════════════════════════════

describe('ATTRIBUTION — item 5 is a no-op on the Meridian golden', () => {
  // Meridian's own score comments, read from the golden rather than restated, so this cannot drift.
  const golden = fs.readFileSync(
    path.join(__dirname, '../skills/blueprint-intake/golden/recruitment_meridian_v1.md'), 'utf8');
  const inputs: PlacementInput[] = [];
  for (const m of golden.matchAll(/<!--\s*score:\s*([^>]*?)-->/g)) {
    const kv: Record<string, string> = {};
    for (const pair of m[1].trim().split(/\s+/)) {
      const i = pair.indexOf('=');
      if (i > 0) kv[pair.slice(0, i)] = pair.slice(i + 1);
    }
    if (kv.id) inputs.push({ id: kv.id.toLowerCase(), impact: Number(kv.impact), feasibility: Number(kv.feasibility), flags: kv });
  }

  // v37.8's single pass, transcribed verbatim. The comparison is the point, so it is spelled out rather
  // than approximated: if this drifts from what v37.8 shipped, the test is worthless.
  function derivePlacementV378(elements: PlacementInput[]) {
    const out: Array<{ id: string; phase: string }> = [];
    const ranked = [...elements].sort((a, b) => (b.impact * b.feasibility) - (a.impact * a.feasibility));
    let nowCount = 0;
    for (const e of ranked) {
      if (/^strict$/i.test((e.flags.phase_dependency ?? '').trim())) { out.push({ id: e.id, phase: 'Later' }); continue; }
      if (['compliance_deadline', 'system_event_deadline'].some(k => /\d{4}-\d{2}-\d{2}|\b20\d{2}\b/.test(e.flags[k] ?? ''))) {
        out.push({ id: e.id, phase: 'Now' }); nowCount++; continue;
      }
      const cls = e.feasibility >= 4 ? 'QuickWin' : e.impact >= 4 && e.feasibility <= 3 ? 'BigBet' : 'FoundationBuilder';
      if (cls === 'QuickWin') {
        if (/^yes$/i.test((e.flags.d_gate4 ?? '').trim())) { out.push({ id: e.id, phase: 'Next' }); continue; }
        if (nowCount >= 3) { out.push({ id: e.id, phase: 'Next' }); continue; }
        out.push({ id: e.id, phase: 'Now' }); nowCount++; continue;
      }
      if (cls === 'BigBet') { out.push({ id: e.id, phase: 'Later' }); continue; }
      out.push({ id: e.id, phase: 'Next' });
    }
    return out;
  }

  it('reads eight scored elements, two of them carrying a dated deadline', () => {
    // The premise the attribution needs: item 5 was LIVE on this case. It was.
    expect(inputs).toHaveLength(8);
    const dated = inputs.filter(i => /\d{4}-\d{2}-\d{2}/.test(i.flags.system_event_deadline ?? i.flags.compliance_deadline ?? ''));
    expect(dated.map(i => i.id).sort()).toEqual(['h-rt-04', 'h-rt-07']);
  });

  it('produces a BYTE-IDENTICAL map before and after the restructure', () => {
    const fmt = (m: Array<{ id: string; phase: string }>) => m.map(d => `${d.id}:${d.phase}`).join(' ');
    expect(fmt(derivePlacement(inputs))).toBe(fmt(derivePlacementV378(inputs)));
  });

  it('still reproduces the pinned 3/2/3 split', () => {
    const m = derivePlacement(inputs);
    const n = (p: string) => m.filter(d => d.phase === p).length;
    expect([n('Now'), n('Next'), n('Later')]).toEqual([3, 2, 3]);
  });

  it('the deadline item that ranks below three Quick Wins is why the change LOOKED live', () => {
    // h-rt-07 (I3×F4 = 12) ranks below h-rt-02, h-rt-03 and h-rt-05. Under v37.8's single pass it entered
    // Now after two Quick Wins had taken slots — but only two, so the cap was never reached and the two
    // orderings coincide. The restructure is real; its effect on THIS case is nil.
    expect(derivePlacement(inputs).find(d => d.id === 'h-rt-07')!.phase).toBe('Now');
    expect(derivePlacement(inputs).find(d => d.id === 'h-rt-03')!.phase).toBe('Next');   // P2, not P1
  });
});

// ═══ Item 2 was the regression: the strip ate client roadmap prose ════════════════

describe('the v37.9 S4 regression: SHARED units are ordinary client English', () => {
  it('no longer destroys the *Why now:* line — the reported "malformed Now block"', () => {
    const line = '*Why now:* Complete Step 1 before the July compliance date.';
    expect(stripStageNarration(line)).toBe(line);
    expect(stripForDelivery(line)).toBe(line);
  });

  it('leaves every line of the client-prose corpus untouched through the FULL delivery pipe', () => {
    // The assertion that was missing in v37.9, not the pattern. Anecdotal negatives are what let a
    // vocabulary that overlaps client English ship.
    for (const line of CLIENT_PROSE) expect(stripForDelivery(line)).toBe(line);
    expect(CLIENT_PROSE.length).toBeGreaterThanOrEqual(14);
  });

  it('still removes the pipeline-only units at any position', () => {
    expect(stripStageNarration('Per the contract I will now produce Chunk 1.').trim()).toBe('');
    expect(stripStageNarration('Producing **Chunk 1 only**:').trim()).toBe('');
    expect(stripStageNarration('Revenue is €6.4M. Now producing Chunk 2.')).toBe('Revenue is €6.4M.');
  });

  it('still removes SHARED-unit narration in its anchored, whole-line form', () => {
    // The narrowing costs the tail form and keeps the head form. That is the trade, stated.
    expect(stripStageNarration('Producing Section 3 of the deliverable.').trim()).toBe('');
    expect(stripStageNarration('Step 2 complete.').trim()).toBe('');
    expect(stripStageNarration('- Margin held at 4.2%. Emitting Section 3 next.'))
      .toBe('- Margin held at 4.2%. Emitting Section 3 next.');
  });

  it('a whole roadmap section survives intact', () => {
    const section = [
      '## Phase 1 — Now',
      '',
      '**H-RT-07 — Compliance register automation**',
      '',
      '*Why now:* Complete Step 1 before the July compliance date.',
      '',
      'The team should complete Stage 2 of the migration before onboarding new clients, and Section 3 of',
      'their contract governs the data-retention window.',
    ].join('\n');
    expect(stripForDelivery(section)).toBe(section);
  });
});

// ═══ The OLDER cause of the same symptom: stripOperatorPreamble's /m flag ═════════

describe('stripOperatorPreamble — a preamble strip that was not anchored to the preamble', () => {
  // Found by the roadmap-section test above, not by the report. Independent of item 2, present since
  // before v37.4, and it deletes the exact line A18 then flags as absent. So the reported "malformed Now
  // block" has TWO causes and only one of them is v37.9's — which the release-attribution count needs.
  it('no longer deletes a bold heading followed by an anchor line', () => {
    const card = ['## Phase 1 — Now', '', '**H-RT-07 — Compliance register automation**',
      '*Why now:* the ISO audit lands in July.'].join('\n');
    expect(stripOperatorPreamble(card)).toBe(card);
    expect(stripForDelivery(card)).toBe(card);
  });

  it('no longer deletes an ordinary findings bullet list', () => {
    const findings = ['## Findings', '', '* Returns are reconciled by hand each Friday.',
      '* Stock counts drift by 4% between systems.'].join('\n');
    expect(stripOperatorPreamble(findings)).toBe(findings);
  });

  it('every multi-line client section survives the full pipe', () => {
    // A LINE corpus cannot catch this: each line survived alone, the PAIR did not. Positional defects
    // need positional fixtures, which is why CLIENT_SECTIONS exists alongside CLIENT_PROSE.
    for (const section of CLIENT_SECTIONS) expect(stripForDelivery(section)).toBe(section);
    expect(CLIENT_SECTIONS.length).toBeGreaterThanOrEqual(4);
  });

  it('STILL removes a genuine operator preamble at the top of the document', () => {
    // The narrowing must not cost the thing the function is for.
    const withPreamble = ['• Inputs received: 4 documents', '• No missing categories',
      'Proceeding to Chunk 1.', '', '# AI Value Blueprint', '', 'Revenue is €6.4M.'].join('\n');
    const out = stripOperatorPreamble(withPreamble);
    expect(out.startsWith('# AI Value Blueprint')).toBe(true);
    expect(out).toContain('Revenue is €6.4M.');
  });

  it('STILL removes an "I have" acknowledgement at the top', () => {
    const out = stripOperatorPreamble("I have reviewed all four documents.\n\n# AI Value Blueprint");
    expect(out).toBe('# AI Value Blueprint');
  });

  it('does NOT reach a preamble-shaped line that appears mid-document', () => {
    // Bounded by its anchor rather than by intention. A mid-body line matching these forms belongs to
    // the narration strip and the detector, both of which are line-scoped on purpose.
    const mid = ['# AI Value Blueprint', '', 'Their ops lead told us: "No missing categories were found."'].join('\n');
    expect(stripOperatorPreamble(mid)).toBe(mid);
  });
});

// ═══ S4-UNIQ: the property that was unassertable ══════════════════════════════════

describe('S4-UNIQ — one opportunity, one phase (Class F #5)', () => {
  const roadmapWith = (rows: Array<[string, string]>) => {
    const byPhase = new Map<string, string[]>();
    for (const [phase, id] of rows) {
      if (!byPhase.has(phase)) byPhase.set(phase, []);
      byPhase.get(phase)!.push(`| Element | ${id} | some opportunity |`);
    }
    const head: Record<string, string> = { Now: '## Phase 1 — Now', Next: '## Phase 2 — Next', Later: '## Phase 3 — Later' };
    return [...byPhase].flatMap(([p, rs]) => [head[p], ...rs]).join('\n');
  };

  it('emittedPlacement was the reason nothing fired: a Map keyed by id', () => {
    // Not a v37.9 regression — this has been the reader's shape since the P-rules were written, so the
    // question "is this id in two phases" could not be asked at all.
    const r = roadmapWith([['Now', 'H-RT-07'], ['Next', 'H-RT-07']]);
    expect(emittedPlacement(r).get('h-rt-07')).toBe('Now');
    expect(emittedPlacement(r).size).toBe(1);
    expect(emittedOccurrences(r)).toHaveLength(2);
  });

  it('BLOCKERs a cross-phase duplicate and names both phases', () => {
    const r = roadmapWith([['Now', 'H-RT-07'], ['Next', 'H-RT-07']]);
    const dup = duplicateEmissions(r);
    expect(dup).toHaveLength(1);
    expect(dup[0]).toMatchObject({ id: 'h-rt-07', phases: ['Now', 'Next'], occurrences: 2 });
    const flags = validatePlacement(r, [el('h-rt-07', 3, 4, { system_event_deadline: '2026-07-31' })]).reviewerFlags;
    expect(flags.some(f => f.startsWith(BLOCKER_PREFIX) && /S4-UNIQ \(duplicate placement\).*Now and Next/s.test(f))).toBe(true);
  });

  it('the divergence check STILL sees nothing — which is why S4-UNIQ had to be its own assertion', () => {
    const r = roadmapWith([['Now', 'H-RT-07'], ['Next', 'H-RT-07']]);
    // First occurrence is Now, the derived phase is Now, so the phase comparison agrees. A guard built by
    // extending the divergence check would never have caught this.
    expect(validatePlacement(r, [el('h-rt-07', 3, 4, { system_event_deadline: '2026-07-31' })]).divergences).toEqual([]);
  });

  it('reports a same-phase duplicate too, and distinguishes it', () => {
    const r = roadmapWith([['Later', 'H-RT-01'], ['Later', 'H-RT-01']]);
    const flags = validatePlacement(r, [el('h-rt-01', 5, 3, { phase_dependency: 'strict' })]).reviewerFlags;
    expect(flags.some(f => /S4-UNIQ \(duplicate row\).*2 times in Later/s.test(f))).toBe(true);
    expect(flags.some(f => /duplicate placement/.test(f))).toBe(false);
  });

  it('is silent on a well-formed roadmap', () => {
    const r = roadmapWith([['Now', 'H-RT-02'], ['Next', 'H-RT-03'], ['Later', 'H-RT-01']]);
    expect(duplicateEmissions(r)).toEqual([]);
  });

  it('does not count one id twice because a single row mentions it twice', () => {
    const r = '## Phase 1 — Now\n| H-RT-02 | see H-RT-02 above | an opportunity |';
    expect(duplicateEmissions(r)).toEqual([]);
  });
});

// ═══ Instance 23: P-a alias resolution ═══════════════════════════════════════════

describe('instance 23 — the qualified-product-name boundary', () => {
  const row = (o: Partial<IntegrationRow> = {}): IntegrationRow => ({
    a: o.a ?? 'shopify', b: o.b ?? 'netsuite',
    mechanism: o.mechanism ?? 'scheduled', status: o.status ?? 'functioning',
    active: o.active ?? true, confidence: o.confidence ?? '[Document-Backed]',
  });

  it('resolves a short form to the one declared system it can mean', () => {
    expect(resolveName('shopify', ['shopify plus', 'klaviyo']).resolved).toBe('shopify plus');
    expect(resolveName('netsuite', ['netsuite erp', 'postgres']).resolved).toBe('netsuite erp');
    expect(resolveName('shopify plus', ['shopify plus', 'klaviyo']).exact).toBe(true);
  });

  it('REFUSES to resolve an ambiguous short form, and names the candidates', () => {
    // The A15 objection to leading-token matching, answered without giving up resolution: a name that
    // could mean two systems resolves to neither, because guessing attributes data to the wrong system.
    const r = resolveName('shopify', ['shopify plus', 'shopify pos']);
    expect(r.resolved).toBeNull();
    expect(r.candidates.sort()).toEqual(['shopify plus', 'shopify pos']);
    expect(namesResolve('shopify', ['shopify plus', 'shopify pos']).ambiguous)
      .toEqual([{ name: 'shopify', candidates: ['shopify plus', 'shopify pos'] }]);
  });

  it('an exact match wins outright over a longer candidate', () => {
    expect(resolveName('shopify', ['shopify', 'shopify plus']).resolved).toBe('shopify');
  });

  it('P-a holds for a pair written with short forms — the coverage collapse is closed', () => {
    const declared = new Set(['shopify plus', 'netsuite erp', 'postgres']);
    expect(activePredicates(row(), declared).inventoried).toBe(true);
    expect(derivedActive(activePredicates(row(), declared))).toBe(true);
  });

  it('still refuses a genuinely absent endpoint', () => {
    const declared = new Set(['shopify plus', 'postgres']);
    expect(activePredicates(row({ b: 'hubspot' }), declared).inventoried).toBe(false);
  });

  it('coverage no longer varies with the product-tier suffix the author chose', () => {
    const build = (coreNames: string[]) => [
      '# D', '', '## [DATA_INVENTORY]', '', '### Core Systems',
      '| System | Record classes held | Core? | Core because | Confidence |', '|---|---|---|---|---|',
      ...coreNames.map(n => `| ${n} | orders | yes | Priority 1 | [Document-Backed] |`), '',
      '### Integrations',
      '| System A | System B | Mechanism | Status | Active? | Confidence |', '|---|---|---|---|---|---|',
      '| shopify | postgres | scheduled | functioning | yes | [Document-Backed] |', '',
      '### Record Classes',
      '| Record class | System of record | Load-bearing? | Load-bearing because | Rating | Rating because | Confidence |',
      '|---|---|---|---|---|---|---|',
      '| orders | shopify | yes | Priority 1 | Reliable | e | [Document-Backed] |', '',
      '<!-- inventory: n_core=2 active_integrations=1 integration_coverage=1.00 designated_ssot=postgres ' +
      'ssot_reconciles_all_load_bearing=yes load_bearing_degraded_or_absent=0 data_grade=Developing pp0_severity=none -->',
    ].join('\n');
    const plain = computeInventory(parseDataInventory(build(['shopify', 'postgres'])));
    const tiered = computeInventory(parseDataInventory(build(['shopify plus', 'postgres'])));
    expect(tiered.activeIntegrations).toBe(plain.activeIntegrations);
    expect(tiered.integrationCoverage).toBe(plain.integrationCoverage);
  });
});

// ═══ P-b: the mechanism cell vs its own annotation ═══════════════════════════════

describe('P-b — a cell that disagrees with itself is not evidence', () => {
  it('reads the annotation the leading-token rule was skipping', () => {
    expect(mechanismAnnotation('scheduled (daily)').trim()).toBe('(daily)');
    expect(mechanismAnnotation('manual').trim()).toBe('');
  });

  it('catches both directions of self-contradiction', () => {
    expect(mechanismSelfContradiction('scheduled (manual CSV drop)')).toMatch(/describes human action/);
    expect(mechanismSelfContradiction('manual (nightly scheduled feed)')).toMatch(/describes an automatic mechanism/);
    expect(mechanismSelfContradiction('scheduled — re-keyed by the ops team')).toMatch(/human action/);
  });

  it('does NOT fire on a format annotation — the false-fire that would matter most', () => {
    // A `scheduled (nightly CSV export)` feed is automatic. Admitting `csv`/`export` as evidence of human
    // action would false-fire on the most ordinary automatic integration there is, so the term lists
    // carry only words that can only mean a person or only mean a machine.
    expect(mechanismSelfContradiction('scheduled (nightly CSV export)')).toBeNull();
    expect(mechanismSelfContradiction('scheduled (celigo connector)')).toBeNull();
    expect(mechanismSelfContradiction('scheduled (daily)')).toBeNull();
    expect(mechanismSelfContradiction('event (webhook)')).toBeNull();
    expect(mechanismSelfContradiction('none (planned Q4)')).toBeNull();
  });

  it('fails P-b and says which half contradicted which', () => {
    const declared = new Set(['shopify', 'netsuite']);
    const r: IntegrationRow = { a: 'shopify', b: 'netsuite', mechanism: 'scheduled (manual CSV drop)', status: 'functioning', active: true, confidence: '[Document-Backed]' };
    expect(activePredicates(r, declared).automatic).toBe(false);
  });
});

// ═══ Instances 22 / 22b: level-ladder selection ══════════════════════════════════

describe('instances 22 / 22b — the ladder needed selection rules', () => {
  it('22: a component-qualified row is not the level total', () => {
    expect(labelsAComponent('| *Other* Operating Expenses | €0.4M |')).toBe(true);
    expect(labelsAComponent('| Operating Expenses | €1.7M |')).toBe(false);
    expect(extractClaims('| *Other* Operating Expenses | €0.4M |', 'd', false)).toEqual([]);
    expect(extractClaims('| Operating Expenses | €1.7M |', 'd', false).map(c => c.metric)).toEqual(['opex']);
  });

  it('22: a consistent pack carrying BOTH an opex total and an "Other" line is silent', () => {
    const r = reconcileFinancials(NO_FORM, pack([
      '| FY2025 Revenue | €6.4M |',
      '| Cost of goods sold | €3.9M |',
      '| Gross profit | €2.5M |',
      '| *Other* Operating Expenses | €0.4M |',
      '| Operating Expenses | €1.7M |',
      '| Operating profit | €0.8M |',
    ]), '');
    expect(r.reviewerFlags).toEqual([]);
  });

  it('22b: the entity-level line outranks a segment line that came first', () => {
    expect(labelsASegment('| Retail segment gross margin | 41.2% |')).toBe(true);
    expect(labelsASegment('| Gross margin | 39.1% |')).toBe(false);
    const r = reconcileFinancials(NO_FORM, pack([
      // Every line carries FY2025. A17b scopes by source AND period, so a fixture that omits the period
      // on some lines splits them into different scopes and the identity never runs — my first draft of
      // this test passed for exactly that reason, asserting nothing.
      '| Retail segment gross margin FY2025 | 41.2% |',
      '| FY2025 Revenue | €6.4M |',
      '| Gross profit FY2025 | €2.5M |',
      '| Gross margin FY2025 | 39.1% |',
    ]), '');
    expect(blockers(r.reviewerFlags)).toEqual([]);
  });

  it('22b: the segment figure is still REPORTED, just not selected', () => {
    // De-prioritised at selection, not refused at extraction — the two rules act at different times
    // because a segment figure is a legitimate claim and a component figure is not.
    const r = reconcileFinancials(NO_FORM, pack([
      // Every line carries FY2025. A17b scopes by source AND period, so a fixture that omits the period
      // on some lines splits them into different scopes and the identity never runs — my first draft of
      // this test passed for exactly that reason, asserting nothing.
      '| Retail segment gross margin FY2025 | 41.2% |',
      '| FY2025 Revenue | €6.4M |',
      '| Gross profit FY2025 | €2.5M |',
      '| Gross margin FY2025 | 39.1% |',
    ]), '');
    expect(r.divergences.some(d => d.check === 'A17c' && /41\.2/.test(d.documentStated))).toBe(true);
  });

  it('22b: with ONLY a segment line, that line is used — a subset beats nothing', () => {
    const r = reconcileFinancials(NO_FORM, pack([
      '| FY2025 Revenue | €6.4M |',
      '| Gross profit FY2025 | €2.5M |',
      '| Retail segment gross margin FY2025 | 12.0% |',
    ]), '');
    expect(r.divergences.some(d => d.metric === 'gross_margin')).toBe(true);
  });

  it('the qualifier rules read the LABEL region, not the whole line', () => {
    // A qualifier appearing in a later cell must not disqualify a correct row.
    expect(rowLabelText('| Operating Expenses | €1.7M | other adjustments excluded |')).toBe('Operating Expenses');
    expect(labelsAComponent('| Operating Expenses | €1.7M | other adjustments excluded |')).toBe(false);
  });
});

// ═══ A20: inventory completeness (Class F #6) ════════════════════════════════════

describe('A20 — inventory completeness', () => {
  const build = (opts: { core: Array<[string, string]>; classes: string[]; integrations: Array<[string, string]> }) => [
    '# D', '', '## [DATA_INVENTORY]', '', '### Core Systems',
    '| System | Record classes held | Core? | Core because | Confidence |', '|---|---|---|---|---|',
    ...opts.core.map(([s, rc]) => `| ${s} | ${rc} | yes | Priority 1 | [Document-Backed] |`), '',
    '### Integrations',
    '| System A | System B | Mechanism | Status | Active? | Confidence |', '|---|---|---|---|---|---|',
    ...opts.integrations.map(([a, b]) => `| ${a} | ${b} | scheduled | functioning | yes | [Document-Backed] |`), '',
    '### Record Classes',
    '| Record class | System of record | Load-bearing? | Load-bearing because | Rating | Rating because | Confidence |',
    '|---|---|---|---|---|---|---|',
    ...opts.classes.map(c => `| ${c} | ${opts.core[0][0]} | no | n/a | Reliable | e | [Document-Backed] |`), '',
    '<!-- inventory: n_core=2 active_integrations=1 integration_coverage=1.00 designated_ssot=none ' +
    'ssot_reconciles_all_load_bearing=no load_bearing_degraded_or_absent=0 data_grade=Developing pp0_severity=none -->',
  ].join('\n');

  it('A20a reports the Data grade\'s coverage as ONE fraction, not one flag per class', () => {
    const d = build({ core: [['shopify', 'orders, products, returns'], ['postgres', 'analytics']], classes: ['orders'], integrations: [['shopify', 'postgres']] });
    const a20a = validateDataInventory(d).reviewerFlags.filter(f => /A20a/.test(f));
    expect(a20a).toHaveLength(1);
    expect(a20a[0]).toMatch(/computed over 1 of the 4 record classes/);
    expect(a20a[0]).toMatch(/"products" \(shopify\).*"returns" \(shopify\).*"analytics" \(postgres\)/s);
  });

  it('A20a is a ⚠, NOT a BLOCKER — the contract permits the subset', () => {
    // A15 requires only ≥1 class per system. Blocking here would be legislating a rule the contract does
    // not carry, on the golden case — the F13 error. It escalates the ruling instead.
    const d = build({ core: [['shopify', 'orders, products'], ['postgres', 'analytics']], classes: ['orders'], integrations: [['shopify', 'postgres']] });
    const flags = validateDataInventory(d).reviewerFlags;
    expect(blockers(flags).filter(f => /A20a/.test(f))).toEqual([]);
    expect(flags.some(f => f.startsWith('⚠') && /Ruling needed/.test(f))).toBe(true);
  });

  it('A20a is silent when the table is exhaustive', () => {
    const d = build({ core: [['shopify', 'orders'], ['postgres', 'analytics']], classes: ['orders', 'analytics'], integrations: [['shopify', 'postgres']] });
    expect(validateDataInventory(d).reviewerFlags.filter(f => /A20a/.test(f))).toEqual([]);
  });

  it('A20b BLOCKERs an integration endpoint with no Core Systems row', () => {
    // The gap P-a alone leaves: where the author ALSO wrote Active?=no, the two agree and the missing
    // system is never named. Agreement is not completeness.
    const d = build({ core: [['shopify', 'orders'], ['postgres', 'analytics']], classes: ['orders', 'analytics'], integrations: [['shopify', 'legacy_access_db']] });
    expect(validateDataInventory(d).reviewerFlags.some(f =>
      f.startsWith(BLOCKER_PREFIX) && /A20b.*legacy_access_db/s.test(f))).toBe(true);
  });

  it('A20b tolerates a product-tier short form, like every other cross-table check', () => {
    const d = build({ core: [['shopify plus', 'orders'], ['postgres', 'analytics']], classes: ['orders', 'analytics'], integrations: [['shopify', 'postgres']] });
    expect(validateDataInventory(d).reviewerFlags.filter(f => /A20b/.test(f))).toEqual([]);
  });

  it('A20 runs on every inventory, so `checked` records it', () => {
    const d = build({ core: [['shopify', 'orders'], ['postgres', 'analytics']], classes: ['orders', 'analytics'], integrations: [['shopify', 'postgres']] });
    expect(validateDataInventory(d).checked).toContain('A20');
  });
});

// ═══ The Class-F enumeration (gates v1) ═══════════════════════════════════════════

describe('Class-F registry — the enumeration is executable, not descriptive', () => {
  it('claims no guard that does not run', () => {
    // Invariant 1. A markdown enumeration would be accurate the day it was written and drift after —
    // which is the Class F failure mode itself. This is what stops the registry describing assurance
    // we do not have.
    expect(unknownGuardIds()).toEqual([]);
  });

  it('has no silent gap — every non-guarded property states why and what closes it', () => {
    expect(undeclaredGaps()).toEqual([]);
  });

  it('every guarded property names at least one guard', () => {
    for (const p of byState('guarded')) expect(p.guardedBy.length).toBeGreaterThan(0);
  });

  it('reports an assurance coverage fraction to read beside the artifact score', () => {
    const c = assuranceCoverage();
    expect(c.total).toBe(c.guarded + c.reported + c.unguarded);
    expect(c.fraction).toBeGreaterThan(0.7);
    expect(c.unguarded).toBeGreaterThan(0);   // an honest registry is not all green
  });

  it('registers the two properties this era proved unassertable', () => {
    const ids = CLASS_F_REGISTRY.map(p => p.id);
    expect(ids).toContain('S4-one-phase-per-item');       // S4-DUP, EH 1.35
    expect(ids).toContain('S5-client-prose-preserved');   // the strip regressions
    expect(CLASS_F_REGISTRY.find(p => p.id === 'S4-one-phase-per-item')!.guardedBy).toContain('S4-UNIQ');
  });

  it('keeps the cross-run properties HONEST as unguarded rather than claiming them', () => {
    // The 🟢(U) the report priced: five builds of S4 phase invariance were verified by review, not by a
    // guard. A per-run assertion cannot see a cross-run property, and saying so is the point of the file.
    const crossRun = ['S2-band-reproducibility', 'S4-phase-count-stability'];
    for (const id of crossRun) {
      const p = CLASS_F_REGISTRY.find(x => x.id === id)!;
      expect(p.state).toBe('unguarded');
      expect(p.whyUnguarded).toMatch(/\S/);
    }
  });
});
