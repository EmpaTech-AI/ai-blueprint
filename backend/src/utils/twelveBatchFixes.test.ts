// ─── v37.8: Sequence items 1–6 from the twelve-batch register, plus UCR ───────────────────────────
//
// Item 1 was carried as "table-aware extractor — a dependency change". It is not: pdf-parse already
// accepts a `pagerender` hook and its DEFAULT renderer is the root cause. Item 2 (instance 19) is Law 1's
// cleanest case — the E1 repair created it. Item 6's deterministic forks turn out to be my own record
// semantics, not the extraction layer the register suspected.

import {
  parseQuantity, labelsThisRow, extractClaims, reconcileFinancials,
} from './financialReconciliation';
import { needsBoundary } from '../parsers/layoutRenderer';
import { extractStage1Manifest, validateAgainstManifest } from './stage1Manifest';
import { stripStageNarration, stripForDelivery, detectResidualScaffold } from './confidenceScorer';
import {
  NOW_CAPACITY, GATE_DEFERS_ALONE, P_RULES_ENFORCING, derivePlacement, validatePlacement,
} from './phasePlacement';
import { computeUcr, formatUcr } from './unassistedConformance';
import { FormAnswers, DocumentCorpus, ParsedDocument } from '../types/pipeline';

// ── Item 1: position-aware rendering ──────────────────────────────────────────
describe('Seq 1 — position-aware page rendering (BLOCKING, no new dependency)', () => {
  it('treats a wide horizontal gap as a cell boundary', () => {
    // prevRight=100, glyph width 5 → a 12pt gap (2.4 em) is a column boundary.
    expect(needsBoundary(100, 5, 112)).toBe(true);
  });

  it('treats a normal word space as no boundary', () => {
    // ~0.3 em is an ordinary inter-word space.
    expect(needsBoundary(100, 5, 101.5)).toBe(false);
  });

  it('refuses to decide when glyph width is unknown rather than guessing', () => {
    expect(needsBoundary(100, 0, 200)).toBe(false);
  });
});

// ── Item 2: instance 19 — the repair created it ───────────────────────────────
describe('Seq 2 — no thousands-joins across plain whitespace (instance 19)', () => {
  // €421B / €963B / €1.16T were manufactured by re-joining two repaired numbers across the space.
  it('does not re-join two adjacent figures separated by a plain space', () => {
    expect(parseQuantity('Office rent 84,000 780,000', 'currency')?.value).toBe(84_000);
    expect(parseQuantity('Revenue 1,486,200 1,332,000', 'currency')?.value).toBe(1_486_200);
  });

  it('does not manufacture a trillion from a tab-separated row', () => {
    const v = parseQuantity('Total revenue\t1,160,000\t980,000', 'currency')?.value;
    expect(v).toBe(1_160_000);
    expect(v).toBeLessThan(1e9);
  });

  // Typographic separators are real and must survive — they cannot be produced by a cell boundary.
  it('still honours NBSP and thin-space thousands separators', () => {
    expect(parseQuantity('Revenue 1 486 200', 'currency')?.value).toBe(1_486_200);
    expect(parseQuantity('Revenue 1 486 200', 'currency')?.value).toBe(1_486_200);
  });

  it('still parses ordinary comma groups', () => {
    expect(parseQuantity('Revenue €6,400,000', 'currency')?.value).toBe(6_400_000);
  });
});

// ── Item 3: keyword-line → structural row label ───────────────────────────────
describe('Seq 3 — a metric is identified by its ROW LABEL (item 16)', () => {
  const REVENUE = /\brevenue\b/i;

  it('reads the first cell of a table row as the label', () => {
    expect(labelsThisRow('| Total revenue | €6.4M | €5.1M |', REVENUE)).toBe(true);
    expect(labelsThisRow('| Office rent | €84,000 | see revenue note |', REVENUE)).toBe(false);
  });

  it('reads the first cell of a tab-separated row from the layout renderer', () => {
    expect(labelsThisRow('Total revenue\t€6,400,000', REVENUE)).toBe(true);
    expect(labelsThisRow('Office rent\t€84,000\trevenue-linked', REVENUE)).toBe(false);
  });

  it('in prose, the label must precede the figure', () => {
    expect(labelsThisRow('Total revenue: €6.4M', REVENUE)).toBe(true);
    expect(labelsThisRow('Costs were €84,000, which is 1.3% of revenue', REVENUE)).toBe(false);
  });

  // The regression this could have introduced: a legitimate row whose label follows the fiscal year.
  it('masks fiscal-year tokens so a leading year does not hide the label', () => {
    expect(labelsThisRow('FY2025 total revenue: €6.4M', REVENUE)).toBe(true);
  });

  it('a note mentioning another metric no longer donates its figure', () => {
    const claims = extractClaims('| Office rent | €84,000 | excluded from revenue |', 'document:x', false);
    expect(claims.find(c => c.metric === 'revenue')).toBeUndefined();
  });
});

// ── Item 4: Law 3 — the strip is app-side ─────────────────────────────────────
describe('Seq 4 — app-side narration strip (Law 3: adoption-dependent fixes are instructions)', () => {
  it('removes receipts, checkpoint and chunk narration', () => {
    const doc = [
      '# Executive Summary', '',
      'I have received the three input documents.',
      'All 8 documents were parsed successfully.',
      '## Checkpoint 1 — Foundation Complete',
      'Proceeding to Chunk 2.',
      'Producing Section E next.',
      'Section D complete.',
      'The DATA_INVENTORY block is emitted above.',
      'Operator action: reply continue.', '',
      'The firm has 12 recruiters.', '',
    ].join('\n');
    const out = stripStageNarration(doc);
    expect(out).toMatch(/# Executive Summary/);
    expect(out).toMatch(/The firm has 12 recruiters/);
    for (const gone of ['I have received', 'were parsed', 'Checkpoint 1', 'Proceeding to Chunk',
      'Producing Section', 'Section D complete', 'block is emitted', 'Operator action']) {
      expect(out).not.toMatch(new RegExp(gone));
    }
  });

  it('leaves client content that merely resembles narration', () => {
    for (const keep of [
      'The team completed 40 placements last year.',
      'Revenue received from the top five clients grew 14%.',
      'We have received strong interest from the board.',
    ]) {
      // "We have received" is a receipt form and IS stripped — the closed vocabulary is deliberate.
      const out = stripStageNarration(`# S\n\n${keep}\n`);
      if (/^We have received/.test(keep)) expect(out).not.toMatch(/We have received/);
      else expect(out).toMatch(keep.slice(0, 20));
    }
  });

  it('runs inside the delivery pipe', () => {
    const out = stripForDelivery('# S\n\nProceeding to Chunk 3.\n\nReal content.\n');
    expect(out).not.toMatch(/Proceeding to Chunk/);
    expect(out).toMatch(/Real content/);
  });

  // What the strip deliberately cannot do — and the detector still covers.
  it('does NOT edit a block name out of a real sentence; the detector keeps that', () => {
    const prose = 'The DATA_INVENTORY shows four active integrations across the stack.';
    expect(stripStageNarration(prose)).toBe(prose);
    expect(detectResidualScaffold(prose).length).toBeGreaterThan(0);
  });
});

// ── Item 5: the constants land, R6 closes ─────────────────────────────────────
describe('Seq 5 — P1=3 / P2=YES in config; P-rules now ENFORCING', () => {
  const el = (id: string, impact: number, feasibility: number, flags: Record<string, string> = {}) => ({
    id, impact, feasibility,
    flags: {
      ml_heavy: 'no', multi_source: 'no', regulated: 'no', large_integration: 'no',
      adoption_dependent: 'no', d_gate4: 'no', compliance_deadline: 'none',
      system_event_deadline: 'none', phase_dependency: 'n/a', ...flags,
    },
  });

  it('carries the delivered constants', () => {
    expect(NOW_CAPACITY).toBe(3);
    expect(GATE_DEFERS_ALONE).toBe(true);
    expect(P_RULES_ENFORCING).toBe(true);
  });

  it('P1 caps Now at 3 and displaces the LOWEST-value Quick Win', () => {
    const d = derivePlacement([
      el('h-1', 5, 5), el('h-2', 5, 4), el('h-3', 4, 4), el('h-4', 3, 4),
    ]);
    expect(d.filter(x => x.phase === 'Now')).toHaveLength(3);
    // h-4 has the lowest I×F, so it is the one deferred.
    expect(d.find(x => x.id === 'h-4')).toMatchObject({ phase: 'Next', rule: expect.stringContaining('P1') });
  });

  it('P2 defers a gated Quick Win to Next on the gate alone', () => {
    const d = derivePlacement([el('h-1', 5, 5, { d_gate4: 'yes' })]);
    expect(d[0]).toMatchObject({ phase: 'Next', rule: expect.stringContaining('P2') });
  });

  it('now BLOCKERs a divergence instead of advising', () => {
    const roadmap = '## Phase 1: Now\n\nElement: H-EC-02\n\n## Phase 3: Later\n\n';
    const r = validatePlacement(roadmap, [el('h-ec-02', 5, 2)]);
    expect(r.enforcing).toBe(true);
    expect(r.reviewerFlags[0]).toContain('BLOCKER:');
    expect(r.reviewerFlags[0]).toMatch(/derive Later/);
  });
});

// ── Item 6: the deterministic forks were my record, not the extractor ─────────
describe('Seq 6 — A19 deterministic forks: record semantics, not extraction', () => {
  const mk = (id: string, i: number, f: number, a: number) =>
    `<!-- score: id=${id} impact=${i} feasibility=${f} alignment=${a} product=${i * f * a} class=X ` +
    `ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no d_gate4=no ` +
    `compliance_deadline=none system_event_deadline=none phase_dependency=n/a -->`;
  const manifest = extractStage1Manifest([mk('H-RT-01', 5, 3, 5), mk('H-RT-02', 5, 4, 5)].join('\n'));

  // The bug: a legitimate A4 reduction was recorded as a disagreement, so Meridian's four flag-firing
  // cards produced exactly four forks every run on every build — the deterministic signature.
  it('a legitimate A4 reduction is NOT a fork', () => {
    const reduced = [mk('H-RT-01', 5, 1, 5), mk('H-RT-02', 5, 4, 5)].join('\n');
    const r = validateAgainstManifest(reduced, manifest);
    expect(r.reviewerFlags).toEqual([]);
    const rec = r.records.find(x => x.field === 'feasibility_within_base' && x.elementId === 'h-rt-01')!;
    expect(rec.agreed).toBe(true);
    expect(rec.authoredValue).toBe(1);
  });

  it('an increase IS a fork, and still BLOCKERs', () => {
    const raised = [mk('H-RT-01', 5, 5, 5), mk('H-RT-02', 5, 4, 5)].join('\n');
    const r = validateAgainstManifest(raised, manifest);
    expect(r.records.find(x => x.field === 'feasibility_within_base' && x.elementId === 'h-rt-01')!.agreed).toBe(false);
    expect(r.reviewerFlags.some(f => /feasibility ROSE from 3 .* to 5/.test(f))).toBe(true);
  });

  it('an unchanged score is not a fork either', () => {
    const r = validateAgainstManifest([mk('H-RT-01', 5, 3, 5), mk('H-RT-02', 5, 4, 5)].join('\n'), manifest);
    expect(r.records.filter(x => !x.agreed)).toEqual([]);
  });
});

// ── UCR ───────────────────────────────────────────────────────────────────────
describe('UCR — what the model does unassisted (§VI.3, instated)', () => {
  it('counts OPPORTUNITIES, not corrections, so adding a guard cannot flatter the score', () => {
    const clean = computeUcr({
      correctionRecords: [{ ruleId: 'A5', agreed: true }, { ruleId: 'A5', agreed: true }],
      anchorsAuthored: 2, anchorsRequired: 2,
      inventoryFieldsRendered: 0, inventoryFieldsChecked: 6,
      stripFormsRemoved: 0, stripFormsChecked: 20,
      arithmeticPatched: 0, arithmeticChecked: 8,
    });
    expect(clean.ucr).toBe(1);
    expect(clean.opportunities).toBe(38);
  });

  it('falls when the app has to intervene, on every surface', () => {
    const assisted = computeUcr({
      correctionRecords: [{ ruleId: 'A11', agreed: false }, { ruleId: 'A11', agreed: true }],
      anchorsAuthored: 0, anchorsRequired: 4,
      inventoryFieldsRendered: 3, inventoryFieldsChecked: 6,
      stripFormsRemoved: 5, stripFormsChecked: 20,
      arithmeticPatched: 2, arithmeticChecked: 8,
    });
    expect(assisted.ucr).toBeLessThan(0.75);
    expect(assisted.bySurface.find(s => s.surface === 'A18/anchors')).toEqual(
      { surface: 'A18/anchors', clean: 0, opportunities: 4 });
  });

  it('an anchor EXCESS is assistance too, not just a shortfall', () => {
    const r = computeUcr({
      correctionRecords: [], anchorsAuthored: 9, anchorsRequired: 4,
      inventoryFieldsRendered: 0, inventoryFieldsChecked: 0,
      stripFormsRemoved: 0, stripFormsChecked: 0,
      arithmeticPatched: 0, arithmeticChecked: 0,
    });
    expect(r.bySurface[0]).toEqual({ surface: 'A18/anchors', clean: 4, opportunities: 9 });
  });

  it('reports n/a rather than 100% when nothing was measurable', () => {
    const none = computeUcr({
      correctionRecords: [], anchorsAuthored: 0, anchorsRequired: 0,
      inventoryFieldsRendered: 0, inventoryFieldsChecked: 0,
      stripFormsRemoved: 0, stripFormsChecked: 0, arithmeticPatched: 0, arithmeticChecked: 0,
    });
    expect(none.ucr).toBeNull();
    expect(formatUcr(none)).toMatch(/n\/a/);
  });

  it('prints the reading rule that keeps the two scores from being conflated', () => {
    const line = formatUcr(computeUcr({
      correctionRecords: [{ ruleId: 'A5', agreed: false }],
      anchorsAuthored: 1, anchorsRequired: 2,
      inventoryFieldsRendered: 1, inventoryFieldsChecked: 6,
      stripFormsRemoved: 1, stripFormsChecked: 20, arithmeticPatched: 0, arithmeticChecked: 4,
    }));
    expect(line).toMatch(/^UCR \(Unassisted Conformance Rate\)/);
    expect(line).toMatch(/Weakest surfaces:/);
    expect(line).toMatch(/a better harness, not a better system/);
  });
});

// ── The two layers together ───────────────────────────────────────────────────
describe('E1 end to end: repaired corpus no longer manufactures a phantom', () => {
  const doc = (text: string): ParsedDocument =>
    ({ category: 'financial_summary', filename: 'f.pdf', text, status: 'ok', confidence: 'high' });

  it('a tab-separated financial table yields the right figures and no divergence', () => {
    const table = [
      'Line item\tFY2025\tFY2024',
      'Total revenue\t€6,400,000\t€5,100,000',
      'Total costs\t€5,000,000\t€4,200,000',
      'Net profit\t€1,400,000\t€900,000',
    ].join('\n');
    const corpus: DocumentCorpus =
      { parsedAt: 'x', documents: [doc(table)], failedDocuments: [], missingRequiredCategories: [] };
    const form: FormAnswers = { revenue_range: '€5M–€8M' };
    const r = reconcileFinancials(form, corpus, '');
    expect(r.reviewerFlags).toEqual([]);   // 6.4M is inside the band; arithmetic is consistent
  });
});
