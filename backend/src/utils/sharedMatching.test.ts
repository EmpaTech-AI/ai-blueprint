// ─── v37.5a: the shared comparison layer (eight-batch report, Part II Law 1) ──────────────────────
//
// ~93% of the paired batch's blockers came from ONE class: exact matching against a form the producer
// does not guarantee. Every case below is a firing quoted from the v37.5 panels, and each must now be
// silent — while the genuine defect the guard exists to catch must still fire.
//
// Two of the four are my own code failing the law four days after I wrote it down: A18 hardcoded one
// phase opener against a contract that emits three, and the scaffold registry knew `[SELF_AUDIT]` but
// not the bare name in prose. The registry was built to stop a strip existing without a detector; it did
// not stop a detector knowing one SURFACE FORM of a token and not another.

import { normaliseName, normaliseNameList, namesResolve } from './enumNormalise';
import { validateDataInventory } from './inventoryGuards';
import { extractClaims, stripEnumeratorPrefix, reconcileFinancials } from './financialReconciliation';
import { renderPhaseAnchors, OpportunityScore } from './opportunityValidator';
import { stripSelfAudit, detectResidualScaffold, BARE_BLOCK_NAME_RE, MACHINE_BLOCK_NAMES } from './confidenceScorer';
import { FormAnswers, DocumentCorpus, ParsedDocument } from '../types/pipeline';

// ── I1: NAME cells are not enum cells ──────────────────────────────────────────
describe('I1 — compound and annotated system names (~32 BLOCKERs, largest single source)', () => {
  it('strips annotations without truncating a multi-word name', () => {
    expect(normaliseName('Zoho Recruit (migrating)')).toBe('zoho recruit');
    expect(normaliseName('**Shopify Plus**')).toBe('shopify plus');
  });

  // The distinction that matters: normaliseEnumCell takes the LEADING token, which would turn
  // `shopify plus` into `shopify`. Using it here would have been a second bug.
  it('splits compounds on the separators that mean "and", keeping multi-word names whole', () => {
    expect(normaliseNameList('Vincere/Zoho Recruit')).toEqual(['vincere', 'zoho recruit']);
    expect(normaliseNameList('shopify plus + klaviyo')).toEqual(['shopify plus', 'klaviyo']);
    expect(normaliseNameList('ERP, TMS and WMS')).toEqual(['erp', 'tms', 'wms']);
  });

  it('treats none/n-a as nothing to resolve, not as a system called "none"', () => {
    for (const s of ['none', 'n/a', 'N/A', 'unknown', '']) expect(normaliseNameList(s)).toEqual([]);
  });

  it('resolves every observed firing from the v37.5 panels', () => {
    const declared = ['Vincere', 'Zoho Recruit (migrating)', 'Shopify Plus', 'Klaviyo', 'GA4', 'Zendesk'];
    for (const cell of ['Vincere/Zoho Recruit', 'shopify plus + klaviyo', 'ga4', 'zendesk', 'Zoho Recruit']) {
      expect({ cell, ...namesResolve(cell, declared) }).toEqual({ cell, ok: true, missing: [] });
    }
  });

  it('still fires — and names the offender — when a system genuinely has no row', () => {
    const r = namesResolve('shopify plus + hubspot', ['Shopify Plus', 'Klaviyo']);
    expect(r).toEqual({ ok: false, missing: ['hubspot'] });
  });

  it('A15 accepts a compound system-of-record end to end', () => {
    const doc = [
      '# Dossier', '', '## [DATA_INVENTORY]', '', '### Core Systems',
      '| System | Record classes held | Core? | Core because (stated priority) | Confidence |',
      '|---|---|---|---|---|',
      '| Shopify Plus | orders | yes | Priority 1 | [Document-Backed] |',
      '| Klaviyo | marketing | yes | Priority 1 | [Document-Backed] |', '',
      '### Integrations',
      '| System A | System B | Mechanism | Status | Active? | Confidence |', '|---|---|---|---|---|---|',
      '| Shopify Plus | Klaviyo | scheduled (celigo) | functioning | yes | [Document-Backed] |', '',
      '### Record Classes',
      '| Record class | System of record | Load-bearing? | Load-bearing because | Rating | Rating because | Confidence |',
      '|---|---|---|---|---|---|---|',
      '| customer profiles | Shopify Plus + Klaviyo | yes | Priority 1 | Reliable | governed | [Document-Backed] |',
      '| marketing | Klaviyo | no | n/a | Reliable | governed | [Document-Backed] |', '',
      '<!-- inventory: n_core=2 active_integrations=1 integration_coverage=1.00 designated_ssot=klaviyo ' +
      'ssot_reconciles_all_load_bearing=yes load_bearing_degraded_or_absent=0 data_grade=Developing pp0_severity=none -->', '',
    ].join('\n');
    expect(validateDataInventory(doc).reviewerFlags).toEqual([]);
  });
});

// ── I2: an enumerator is structure, not data ───────────────────────────────────
describe('I2 — numbered headings read as metric values (~19 BLOCKERs)', () => {
  it('drops a leading enumerator, whatever the list form', () => {
    expect(stripEnumeratorPrefix('1. Revenue Summary').trim()).toBe('Revenue Summary');
    expect(stripEnumeratorPrefix('## 2) Revenue Breakdown').trim()).toBe('## Revenue Breakdown');
    expect(stripEnumeratorPrefix('- 3. Total revenue').trim()).toBe('- Total revenue');
  });

  it('leaves a real figure on the line intact', () => {
    expect(stripEnumeratorPrefix('1. Total revenue: €6.4M')).toMatch(/€6\.4M/);
  });

  // The exact defect: `1. Revenue Summary` became revenue=1, and A17b then reported
  // "revenue 1 − costs 84,000 = −83,999" as a profitability contradiction.
  it('a section heading yields NO claim rather than a value of 1', () => {
    expect(extractClaims('1. Revenue Summary', 'document:financial_summary', false)).toEqual([]);
  });

  it('the fabricated A17b contradiction no longer fires', () => {
    const doc = (category: string, text: string): ParsedDocument =>
      ({ category, filename: 'f.pdf', text, status: 'ok', confidence: 'high' });
    const corpus: DocumentCorpus =
      { parsedAt: '2026-08-04', documents: [doc('financial_summary', [
        '1. Revenue Summary',
        'Office rent (Ljubljana HQ) 84,000',
      ].join('\n'))], failedDocuments: [], missingRequiredCategories: [] };
    const form: FormAnswers = { revenue_range: '€2M–€10M' };
    expect(reconcileFinancials(form, corpus, '').reviewerFlags).toEqual([]);
  });

  it('still reads a genuine figure that happens to follow an enumerator', () => {
    const claims = extractClaims('3. Total revenue FY2025: €6,400,000', 'document:x', false);
    expect(claims.find(c => c.metric === 'revenue')?.value).toBe(6_400_000);
  });
});

// ── I4: the contract emits three phase openers; the guard knew one ─────────────
describe('I4 — phase-specific Why openers', () => {
  const scores: OpportunityScore[] = [
    { id: 'H-LC-02', impact: 4, feasibility: 4, alignment: 4, product: 64, class: 'QuickWin' },
    { id: 'H-LC-05', impact: 4, feasibility: 5, alignment: 4, product: 80, class: 'QuickWin' },
  ];
  // The REAL contract shapes: `*Why now:*` (Phase 1) and `*Why next, not now:*` (Phase 2).
  const roadmap = [
    '## Phase 1: Now (Months 1-3)', '', '### Returns Triage', '',
    '*Why now:* Returns cost is the largest addressable line.', '', 'Element: H-LC-02', '',
    '## Phase 2: Next (Months 3-6)', '', '### Demand Forecasting', '',
    '*Why next, not now:* Requires the returns feed to land first.', '', 'Element: H-LC-05', '',
    '## Phase 3: Later (Months 6-12)', '', '## Bridge to Deeper Engagement', '',
  ].join('\n');

  it('renders into a Phase-2 block, which the "Why now" literal could never reach', () => {
    const r = renderPhaseAnchors(roadmap, scores);
    expect(r.summary.malformed).toBe(0);
    expect(r.summary.inserted).toBe(2);
    expect(r.corrected).toMatch(/Why next, not now:.*Feasibility 5\/5 \[Archetype-Anchored/);
  });

  // The consequence for the withdrawn pin: with Phase 2 unreachable the rendered count could never
  // reach (Now + Next), so the pin was UNREACHABLE rather than wrong. It is reachable now.
  it('reaches exactly (Now + Next) once both openers are known', () => {
    expect(renderPhaseAnchors(roadmap, scores).summary.renderedTotal).toBe(2);
  });

  it('accepts every opener the contract declares', () => {
    for (const opener of ['Why now', 'Why next, not now', 'Why next', 'Why later', 'Why then']) {
      const one = ['## Phase 1: Now', '', '### Item', '', `*${opener}:* Because.`, '', 'Element: H-LC-02', '',
        '## Phase 2: Next', ''].join('\n');
      expect({ opener, malformed: renderPhaseAnchors(one, scores).summary.malformed })
        .toEqual({ opener, malformed: 0 });
    }
  });
});

// ── I5 / I6: B3's two remaining gaps ──────────────────────────────────────────
describe('I5 — parenthetical citation with a trailing gloss (RECURRENT)', () => {
  it('removes the observed "(REG-21 pin)" form', () => {
    expect(stripSelfAudit('Membership held (REG-21 pin).')).toBe('Membership held.');
    expect(stripSelfAudit('Placed in Later (T-27 rule) as required.')).toBe('Placed in Later as required.');
    expect(stripSelfAudit('Scored per the tree (REG-22 / WL-14 pinned).')).toBe('Scored per the tree.');
  });

  it('will not swallow a clause — the gloss is bounded and stops at punctuation', () => {
    const long = 'Verified (REG-21 and then a very long explanatory clause that runs on and on).';
    expect(stripSelfAudit(long)).toBe(long);
  });

  it('still leaves client content alone', () => {
    for (const s of ['Certified to ISO-27001 standard.', 'Model GPT-4 was evaluated.', 'Revenue rose (up 14% YoY).']) {
      expect(stripSelfAudit(s)).toBe(s);
    }
  });
});

describe('I6 — bare machine-channel block names in prose (the only false-CLEAN item)', () => {
  it('detects the observed leak: SELF_AUDIT named in client prose', () => {
    const flag = detectResidualScaffold('The SELF_AUDIT confirms every check passed.')
      .find(f => /block name in prose/.test(f));
    expect(flag).toBeDefined();
    expect(flag).toMatch(/found "SELF_AUDIT"/);
  });

  it('covers every machine channel, not just the one that leaked', () => {
    for (const name of MACHINE_BLOCK_NAMES) {
      expect({ name, hit: BARE_BLOCK_NAME_RE.test(`Per the ${name} we confirm this.`) })
        .toEqual({ name, hit: true });
    }
  });

  // One leak must not raise two BLOCKERs — the release-axis count is being measured.
  it('does NOT double-report a bracketed block form', () => {
    expect(BARE_BLOCK_NAME_RE.test('[SELF_AUDIT]')).toBe(false);
    expect(BARE_BLOCK_NAME_RE.test('[END SELF_AUDIT]')).toBe(false);
    expect(detectResidualScaffold('[END CONFIDENCE_PROPAGATION]')
      .filter(f => /block name in prose/.test(f))).toEqual([]);
  });

  it('is author-discipline by design — there is no correct way to strip a name out of a sentence', () => {
    const prose = 'The SELF_AUDIT confirms every check passed.';
    expect(stripSelfAudit(prose)).toBe(prose);
    expect(detectResidualScaffold(prose).length).toBeGreaterThan(0);
  });
});
