// A17 (F12) — form-vs-document numeric reconciliation. v37.4.
//
// The defect class: all four LunaCart financial defects escaped because nothing compared a form figure
// to a document figure. The intake contract itself instructs the silence ("REVENUE_RANGE is the form's
// stated range — never substitute a point figure from documents, even a more precise one"), so the fix
// is not to change which source wins but to make a disagreement impossible to leave unrecorded.
//
// Half of these tests are false-positive tests. A reconciliation pass that fires on every real pack is
// worse than none, because it trains the reviewer to skip it — the GATE-4 failure mode.

import {
  reconcileFinancials,
  extractClaims,
  collectClaims,
  parseRange,
  parsePoint,
  isExcludedLine,
  divergenceDeclared,
} from './financialReconciliation';
import { FormAnswers, DocumentCorpus, ParsedDocument } from '../types/pipeline';
import { BLOCKER_PREFIX } from '../types/pipeline';

const doc = (category: string, text: string): ParsedDocument =>
  ({ category, filename: `${category}.pdf`, text, status: 'ok', confidence: 'high' });

const corpusOf = (...docs: ParsedDocument[]): DocumentCorpus =>
  ({ parsedAt: '2026-07-31', documents: docs, failedDocuments: [], missingRequiredCategories: [] });

const FORM: FormAnswers = {
  revenue_range: '€5M–€8M',
  company_size: '50-100',
  departments: '6',
};

// ── Number normalisation ────────────────────────────────────────────────────────
describe('range and point parsing', () => {
  it('parses the form range forms the schema actually emits', () => {
    expect(parseRange('€5M–€8M')).toEqual({ low: 5e6, high: 8e6 });      // en-dash + symbol + scale
    expect(parseRange('€2M - €10M')).toEqual({ low: 2e6, high: 10e6 });  // hyphen with spaces
    expect(parseRange('€2M to €10M')).toEqual({ low: 2e6, high: 10e6 }); // "to"
    expect(parseRange('50-100')).toEqual({ low: 50, high: 100 });        // bare counts
  });

  it('applies an upper-bound scale suffix to a bare lower bound ("5–8M")', () => {
    expect(parseRange('5–8M')).toEqual({ low: 5e6, high: 8e6 });
  });

  it('normalises thousands separators and scale words', () => {
    expect(parsePoint('Revenue: €12,400,000', 'currency')).toBe(12_400_000);
    expect(parsePoint('Revenue: €12.4M', 'currency')).toBe(12_400_000);
    expect(parsePoint('Revenue: 12.4 million', 'currency')).toBe(12_400_000);
    expect(parsePoint('Net margin: 4.2%', 'percent')).toBe(4.2);
  });

  it('orders an inverted range rather than producing a negative band', () => {
    expect(parseRange('€8M–€5M')).toEqual({ low: 5e6, high: 8e6 });
  });
});

// ── A17a: range containment, asymmetric ─────────────────────────────────────────
describe('A17a — document point vs form band', () => {
  it('is clean when the document figure sits inside the form band', () => {
    const r = reconcileFinancials(FORM, corpusOf(doc('financial_summary', 'Total revenue FY2025: €6.4M')), '');
    expect(r.divergences).toEqual([]);
    expect(r.reviewerFlags).toEqual([]);
  });

  it('BLOCKERs a document figure ABOVE the band — a part cannot exceed the whole', () => {
    const r = reconcileFinancials(FORM, corpusOf(doc('financial_summary', 'Total revenue FY2025: €12.4M')), '');
    expect(r.reviewerFlags[0]).toContain(BLOCKER_PREFIX);
    expect(r.reviewerFlags[0]).toMatch(/A17a \(F12 form-vs-document reconciliation\) for revenue/);
    expect(r.reviewerFlags[0]).toMatch(/EXCEEDS the form's stated band/);
    // The remedy is named, and it is not "pick the other number".
    expect(r.reviewerFlags[0]).toMatch(/choosing it silently is the defect/);
  });

  // The single most likely false positive in the whole pass.
  it('does NOT blocker a departmental headcount below a company-wide band', () => {
    const r = reconcileFinancials(FORM, corpusOf(doc('org_chart', 'Sales team: 12 employees\nOps: 9 employees')), '');
    expect(r.reviewerFlags).toEqual([]);
    // Downgraded, not hidden — the reviewer still sees it in the table.
    expect(r.divergences.every(d => d.severity === 'advisory')).toBe(true);
    expect(r.divergenceTable).toMatch(/headcount/);
  });

  it('BLOCKERs a headcount above the band (that cannot be a sub-component)', () => {
    const r = reconcileFinancials(FORM, corpusOf(doc('org_chart', 'Total headcount: 240')), '');
    expect(r.reviewerFlags.some(f => /A17a.*headcount/.test(f))).toBe(true);
  });

  it('suppresses a divergence once it is declared in the dossier', () => {
    const dossier = '## Section H\n\n- Revenue discrepancy: form states €5M–€8M, financial summary states €12.4M; form range adopted per T-14.';
    const r = reconcileFinancials(FORM, corpusOf(doc('financial_summary', 'Total revenue FY2025: €12.4M')), dossier);
    expect(r.reviewerFlags).toEqual([]);
    expect(r.divergences).toHaveLength(1);                 // still detected and tabled
    expect(r.divergenceTable).toMatch(/declared/);
  });
});

// ── A17b: the packs mis-stating their own profitability ─────────────────────────
describe('A17b — derived arithmetic inside one source and period', () => {
  it('BLOCKERs a stated margin that contradicts its own revenue and profit', () => {
    const p = doc('financial_summary', [
      'FY2025 total revenue: €6.4M',
      'FY2025 net profit: €256,000',
      'FY2025 net margin: 12.5%',        // actual: 256000/6.4M = 4.0%
    ].join('\n'));
    const r = reconcileFinancials(FORM, corpusOf(p), '');
    const flag = r.reviewerFlags.find(f => /A17b.*net_margin/.test(f))!;
    expect(flag).toContain(BLOCKER_PREFIX);
    expect(flag).toMatch(/mis-states its own profitability by 8\.5 percentage points/);
  });

  it('BLOCKERs revenue − costs ≠ stated profit', () => {
    const p = doc('financial_summary', [
      'FY2025 total revenue: €6,400,000',
      'FY2025 total costs: €5,000,000',
      'FY2025 net profit: €900,000',     // actual: 1,400,000
    ].join('\n'));
    const r = reconcileFinancials(FORM, corpusOf(p), '');
    expect(r.reviewerFlags.some(f => /A17b.*net_profit.*contradicts its own arithmetic/.test(f))).toBe(true);
  });

  it('tolerates rounding — client documents round', () => {
    const p = doc('financial_summary', [
      'FY2025 total revenue: €6.4M',
      'FY2025 net profit: €256,000',
      'FY2025 net margin: 4.0%',
    ].join('\n'));
    expect(reconcileFinancials(FORM, corpusOf(p), '').reviewerFlags).toEqual([]);
  });

  it('does NOT mix periods — FY2024 profit against FY2025 revenue is not a contradiction', () => {
    const p = doc('financial_summary', [
      'FY2025 total revenue: €6.4M',
      'FY2025 net profit: €256,000',
      'FY2025 net margin: 4.0%',
      'FY2024 total revenue: €5.1M',
      'FY2024 net profit: €153,000',
      'FY2024 net margin: 3.0%',
    ].join('\n'));
    expect(reconcileFinancials(FORM, corpusOf(p), '').reviewerFlags).toEqual([]);
  });

  it('does not cross-compare two different documents', () => {
    const r = reconcileFinancials(FORM, corpusOf(
      doc('financial_summary', 'FY2025 total revenue: €6.4M\nFY2025 net profit: €256,000'),
      doc('strategic_docs', 'FY2025 net margin: 30%'),
    ), '');
    expect(r.reviewerFlags.some(f => /A17b/.test(f))).toBe(false);
  });
});

// ── False-positive suppression ──────────────────────────────────────────────────
describe('closed-vocabulary exclusions', () => {
  it('ignores forward-looking figures — a target is not a claim about the present', () => {
    for (const line of [
      'Revenue target FY2027: €15M',
      'Forecast revenue: €20M',
      'Our goal is revenue of €25M',
      'Planned revenue FY2028: €30M',
    ]) {
      expect(isExcludedLine(line)).toBe(true);
    }
    const r = reconcileFinancials(FORM, corpusOf(doc('strategic_docs', 'Revenue target FY2027: €15M')), '');
    expect(r.reviewerFlags).toEqual([]);
  });

  it('ignores unit rates — revenue per employee is not revenue', () => {
    expect(isExcludedLine('Revenue per employee: €95,000')).toBe(true);
    expect(isExcludedLine('Average revenue per order: €48')).toBe(true);
    const r = reconcileFinancials(FORM, corpusOf(doc('financial_summary', 'Revenue per employee: €95,000')), '');
    expect(r.reviewerFlags).toEqual([]);
  });

  it('ignores a number with no metric label — set membership, not intent-guessing', () => {
    expect(extractClaims('The office moved in 2019 to a 450 square metre unit.', 'document:x', false)).toEqual([]);
  });

  it('does not treat a percentage growth statement as a currency revenue figure', () => {
    const r = reconcileFinancials(FORM, corpusOf(doc('strategic_docs', 'Revenue grew 340% since 2021')), '');
    expect(r.reviewerFlags).toEqual([]);
  });
});

// ── A17c: advisory only, never a flag ───────────────────────────────────────────
describe('A17c — multi-valued metrics are listed, never asserted', () => {
  it('lists a metric with several values without flagging it', () => {
    const p = doc('financial_summary', 'Segment A revenue: €2M\nSegment B revenue: €3M\nSegment C revenue: €1M');
    const r = reconcileFinancials(FORM, corpusOf(p), '');
    expect(r.reviewerFlags).toEqual([]);
    const a17c = r.divergences.filter(d => d.check === 'A17c');
    expect(a17c).toHaveLength(1);
    expect(a17c[0].severity).toBe('advisory');
    expect(a17c[0].detail).toMatch(/not asserted as a defect/);
  });
});

// ── The divergence table ────────────────────────────────────────────────────────
describe('divergence table', () => {
  it('is emitted even when empty, so "no divergence" is an affirmative result', () => {
    const r = reconcileFinancials(FORM, corpusOf(doc('financial_summary', 'Total revenue FY2025: €6.4M')), '');
    expect(r.divergenceTable).toMatch(/no divergence detected/);
    expect(r.divergenceTable.split('\n')[0]).toMatch(/Check \| Metric \| Form \/ derived/);
  });

  it('marks each row declared or UNDECLARED', () => {
    const r = reconcileFinancials(FORM, corpusOf(doc('financial_summary', 'Total revenue FY2025: €12.4M')), '');
    expect(r.divergenceTable).toMatch(/\| A17a \| revenue \|.*\| blocker \| UNDECLARED \|/);
  });

  it('divergenceDeclared needs BOTH a reconciliation word and the metric', () => {
    expect(divergenceDeclared('- Revenue discrepancy noted; form adopted.', 'revenue')).toBe(true);
    expect(divergenceDeclared('- Revenue was €6.4M.', 'revenue')).toBe(false);       // no reconcile word
    expect(divergenceDeclared('- Headcount discrepancy noted.', 'revenue')).toBe(false); // wrong metric
  });
});

// ── Plumbing ────────────────────────────────────────────────────────────────────
describe('claim collection', () => {
  it('reads the declared form metric fields authoritatively', () => {
    const claims = collectClaims(FORM, corpusOf());
    expect(claims.find(c => c.metric === 'revenue' && c.isForm)).toMatchObject({ rangeLow: 5e6, rangeHigh: 8e6 });
    expect(claims.find(c => c.metric === 'headcount' && c.isForm)).toMatchObject({ rangeLow: 50, rangeHigh: 100 });
    expect(claims.find(c => c.metric === 'departments' && c.isForm)).toMatchObject({ value: 6 });
  });

  it('skips documents that failed to parse — an unparsed doc is absence of evidence', () => {
    const bad: ParsedDocument = { category: 'financial_summary', filename: 'x.pdf', text: 'Revenue: €99M', status: 'likely_scanned', confidence: 'low' };
    expect(collectClaims(FORM, corpusOf(bad)).filter(c => !c.isForm)).toEqual([]);
  });

  it('also mines free-text form answers, which carry metrics in practice', () => {
    const claims = collectClaims({ ...FORM, pain_point_1: 'Our net margin is 4.2% and falling.' }, corpusOf());
    expect(claims.some(c => c.metric === 'net_margin' && c.source === 'form:pain_point_1')).toBe(true);
  });
});
