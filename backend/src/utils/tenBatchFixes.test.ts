// ─── v37.7: the five engineering items from the ten-batch register ────────────────────────────────
//
// E1 (top item, PERSISTENT, both cases, two guards defeated) · N1 (A19 freeze extraction) ·
// N2 (self-narration routing) · N3 (GATE-4 mention-matching) · R6 (P-rules, advisory).
//
// Ivan's C4 correlation is now perfect across 13 fix-events: pins persist, instructions decay. Every fix
// here is a pin, a render, a route or a derived set — no instruction-type fix ships in this release.

import fs from 'fs';
import path from 'path';
import { repairConcatenatedCells, hasUnreliableFigures } from '../parsers/textRepair';
import { parseQuantity, reconcileFinancials, extractClaims } from './financialReconciliation';
import { extractStage1ManifestDetailed } from './stage1Manifest';
import { isPlacedIn, validateRoadmapPhases } from './opportunityValidator';
import { derivePlacement, emittedPlacement, validatePlacement, P_RULES_ENFORCING, classOf } from './phasePlacement';
import { detectResidualScaffold } from './confidenceScorer';
import { FormAnswers, DocumentCorpus, ParsedDocument } from '../types/pipeline';

// ── E1: separator-destroying extraction ────────────────────────────────────────
describe('E1 — repair separator-destroying extraction (top register item)', () => {
  // The observed corruption, verbatim from the LunaCart panel.
  it('separates two concatenated currency columns', () => {
    const r = repairConcatenatedCells('Office rent (Ljubljana HQ) 84,00078,000HQ only; Vienna in COGS');
    expect(r.text).toMatch(/84,000 78,000 HQ only/);
    expect(r.repairs).toBeGreaterThanOrEqual(2);
  });

  it('separates a digit run-on from a following word and a following symbol', () => {
    expect(repairConcatenatedCells('1,332,000Vienna').text).toBe('1,332,000 Vienna');
    expect(repairConcatenatedCells('84,000€78,000').text).toMatch(/84,000 €\s?78,000/);
    expect(repairConcatenatedCells('4.2%3.1%').text).toBe('4.2% 3.1%');
  });

  it('does NOT split a legitimate attached unit suffix off its number', () => {
    for (const s of ['€12.4M', '48 FTEs', 'Q3 revenue', '5Mn', '120 EUR']) {
      expect(repairConcatenatedCells(s).text).toBe(s);
    }
  });

  it('is a no-op on well-formed text', () => {
    const clean = 'FY2025 total revenue: €6,400,000\nFY2025 net profit: €256,000\n';
    const r = repairConcatenatedCells(clean);
    expect(r.text).toBe(clean);
    expect(r.repairs).toBe(0);
  });

  // The phantom €2.0B: a standalone column label "B" read as BILLION.
  it('no longer reads a spaced single-letter as a scale suffix — the phantom €2.0B', () => {
    expect(parseQuantity('Revenue 2.0 B 1,486,200', 'currency')?.value).not.toBe(2e9);
    expect(parseQuantity('Revenue 2.0 B', 'currency')?.value).toBe(2);
  });

  it('still reads both legitimate scale forms', () => {
    expect(parseQuantity('Revenue: €12.4M', 'currency')?.value).toBe(12_400_000);
    expect(parseQuantity('Revenue: 12.4 million', 'currency')?.value).toBe(12_400_000);
    expect(parseQuantity('Revenue: €2.0bn', 'currency')?.value).toBe(2e9);
  });

  it('refuses to parse figures on an unrepairable line rather than manufacturing a divergence', () => {
    expect(hasUnreliableFigures('Revenue 12345678901234')).toBe(true);
    expect(hasUnreliableFigures('Revenue 1.486.200.00')).toBe(true);
    expect(hasUnreliableFigures('Revenue €1,486,200')).toBe(false);
    expect(extractClaims('Total revenue 12345678901234', 'document:x', false)).toEqual([]);
  });

  it('the repaired corpus no longer produces a phantom A17b contradiction', () => {
    const raw = 'FY2025 total revenue 2.0 B 1,486,200\nFY2025 net profit: €256,000\n';
    const repaired = repairConcatenatedCells(raw).text;
    const doc = (text: string): ParsedDocument =>
      ({ category: 'financial_summary', filename: 'f.pdf', text, status: 'ok', confidence: 'high' });
    const corpus: DocumentCorpus =
      { parsedAt: 'x', documents: [doc(repaired)], failedDocuments: [], missingRequiredCategories: [] };
    const form: FormAnswers = { revenue_range: '€2M–€10M' };
    const flags = reconcileFinancials(form, corpus, '').reviewerFlags;
    expect(flags.filter(f => /2,000,000,000|EXCEEDS/.test(f))).toEqual([]);
  });
});

// ── N1: A19 freeze extraction ─────────────────────────────────────────────────
describe('N1 — A19 freeze extraction: duplicates, dedupe, conflicts', () => {
  const mk = (id: string, i: number, f: number, a: number) =>
    `<!-- score: id=${id} impact=${i} feasibility=${f} alignment=${a} product=${i * f * a} class=X ` +
    `ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no d_gate4=no ` +
    `compliance_deadline=none system_event_deadline=none phase_dependency=n/a -->`;

  it('freezes one element per ID even when a marker is duplicated', () => {
    const r = extractStage1ManifestDetailed([mk('H-EC-01', 5, 4, 5), mk('H-EC-01', 5, 4, 5), mk('H-EC-02', 4, 3, 4)].join('\n'));
    expect(r.manifest.ids).toEqual(['h-ec-01', 'h-ec-02']);
    expect(r.duplicateIds).toEqual(['h-ec-01']);
    expect(r.conflictingIds).toEqual([]);
  });

  // The deterministic forks: a duplicate whose VALUES differ made every run fork identically.
  it('reports a value-differing duplicate as a conflict rather than silently keeping one', () => {
    const r = extractStage1ManifestDetailed([mk('H-EC-01', 5, 4, 5), mk('H-EC-01', 3, 2, 3)].join('\n'));
    expect(r.conflictingIds).toEqual(['h-ec-01']);
    expect(r.manifest.elements).toHaveLength(1);
    expect(r.manifest.elements[0].impact).toBe(5);   // first occurrence wins, deterministically
  });

  it('the rung-C shape (15 markers, 8 elements) collapses to 8', () => {
    const ids = ['H-EC-01', 'H-EC-02', 'H-EC-03', 'H-EC-04', 'H-EC-05', 'H-EC-06', 'H-EC-07', 'H-CORE-00'];
    const doubled = [...ids, ...ids.slice(0, 7)].map(id => mk(id, 4, 3, 4)).join('\n');
    const r = extractStage1ManifestDetailed(doubled);
    expect(r.manifest.elements).toHaveLength(8);
    expect(r.duplicateIds).toHaveLength(7);
  });
});

// ── N2: routing, per Ivan's C6 prediction ─────────────────────────────────────
describe('N2 — self-narration routed on every stage, not only Stage 3', () => {
  const stages = ['blueprint-intake', 'blueprint-maturity', 'blueprint-roadmap', 'blueprint-opportunities'];

  it('every stage contract now declares the [SELF_AUDIT] channel', () => {
    for (const s of stages) {
      const md = fs.readFileSync(path.join(__dirname, `../skills/${s}/SKILL.md`), 'utf-8');
      expect({ s, has: /\[SELF_AUDIT\]/.test(md) }).toEqual({ s, has: true });
    }
  });

  it('each declares the boundary rule for receipts and block names, not just rule identifiers', () => {
    for (const s of stages.filter(x => x !== 'blueprint-opportunities')) {
      const md = fs.readFileSync(path.join(__dirname, `../skills/${s}/SKILL.md`), 'utf-8');
      expect({ s, receipts: /receipts/i.test(md) }).toEqual({ s, receipts: true });
    }
  });

  // The detector still catches a leak outside the channel — routing gives it a home, not immunity.
  it('a receipt or block name in prose is still a never-ship BLOCKER', () => {
    expect(detectResidualScaffold('The SELF_AUDIT confirms every check.').length).toBeGreaterThan(0);
    expect(detectResidualScaffold('I have received the three input documents.').length).toBeGreaterThan(0);
  });
});

// ── N3: mention vs placement ──────────────────────────────────────────────────
describe('N3 — GATE-4 mention-matching', () => {
  it('a prose mention is a discussion, not a placement', () => {
    const later = '\nUnlike H-EC-02, which lands in Now, this depends on the data foundation.\n';
    expect(isPlacedIn(later, 'H-EC-02')).toBe(false);
  });

  it('a structural position IS a placement', () => {
    expect(isPlacedIn('\nElement: H-EC-02\n', 'H-EC-02')).toBe(true);
    expect(isPlacedIn('\n| H-EC-02 | Later | Big Bet |\n', 'H-EC-02')).toBe(true);
    expect(isPlacedIn('\n### H-EC-02 AI Company Brain\n', 'H-EC-02')).toBe(true);
  });

  it('does not fire on a contrastive reference in the Later section', () => {
    const roadmap = [
      '## Phase 1: Now', '', '### A', '', 'Element: H-EC-01', '',
      '## Phase 2: Next', '',
      '## Phase 3: Later', '', '### B', '', 'Element: H-EC-09', '',
      'Unlike H-EC-01, which is a Quick Win in Now, this needs the foundation.', '',
      '## Bridge', '',
    ].join('\n');
    const scores = [{ id: 'H-EC-01', impact: 4, feasibility: 5, alignment: 4, product: 80, class: 'QuickWin' }];
    expect(validateRoadmapPhases(roadmap, scores).reviewerFlags
      .some(f => /Quick Win H-EC-01 appears/.test(f))).toBe(false);
  });
});

// ── R6: the P-rules engine, advisory pending two constants ────────────────────
describe('R6 — P-rules derive placement from pinned inputs', () => {
  const el = (id: string, impact: number, feasibility: number, flags: Record<string, string> = {}) => ({
    id, impact, feasibility,
    flags: {
      ml_heavy: 'no', multi_source: 'no', regulated: 'no', large_integration: 'no',
      adoption_dependent: 'no', d_gate4: 'no', compliance_deadline: 'none',
      system_event_deadline: 'none', phase_dependency: 'n/a', ...flags,
    },
  });

  it('classifies by post-adjustment feasibility', () => {
    expect(classOf(4, 5)).toBe('QuickWin');
    expect(classOf(5, 2)).toBe('BigBet');
    expect(classOf(3, 3)).toBe('FoundationBuilder');
  });

  it('strict dependency wins over every other rule, any class', () => {
    const d = derivePlacement([el('h-1', 5, 5, { phase_dependency: 'strict' })]);
    expect(d[0]).toMatchObject({ phase: 'Later', rule: expect.stringContaining('P0a') });
  });

  it('a dated deadline pulls toward Now, never past its own date', () => {
    const d = derivePlacement([el('h-1', 3, 3, { system_event_deadline: '2026-07-31' })]);
    expect(d[0]).toMatchObject({ phase: 'Now', rule: expect.stringContaining('P0b') });
  });

  it('places by class when no precedence rule fires', () => {
    const d = derivePlacement([el('h-1', 4, 5), el('h-2', 5, 2), el('h-3', 3, 3)]);
    expect(d.find(x => x.id === 'h-1')!.phase).toBe('Now');
    expect(d.find(x => x.id === 'h-2')!.phase).toBe('Later');
    expect(d.find(x => x.id === 'h-3')!.phase).toBe('Next');
  });

  it('every decision names the clause that fired — the I.4 reading rule', () => {
    for (const d of derivePlacement([el('h-1', 4, 5), el('h-2', 5, 2)])) {
      expect(d.rule).toMatch(/^P\d/);
    }
  });

  it('reads emitted placement structurally, ignoring prose mentions', () => {
    const roadmap = [
      '## Phase 1: Now', '', 'Element: H-EC-01', '',
      '## Phase 3: Later', '', 'Element: H-EC-02', '',
      'Note that H-EC-01 was sequenced earlier.', '',
    ].join('\n');
    const m = emittedPlacement(roadmap);
    expect(m.get('h-ec-01')).toBe('Now');
    expect(m.get('h-ec-02')).toBe('Later');
  });

  // The honest status: it runs, it reports, it does not gate.
  it('is ADVISORY until the Practice supplies P1 and P2, and says so', () => {
    expect(P_RULES_ENFORCING).toBe(false);
    const roadmap = '## Phase 1: Now\n\nElement: H-EC-02\n\n## Phase 3: Later\n\n';
    const r = validatePlacement(roadmap, [el('h-ec-02', 5, 2)]);
    expect(r.enforcing).toBe(false);
    expect(r.divergences).toEqual([{ id: 'h-ec-02', derived: 'Later', emitted: 'Now' }]);
    expect(r.reviewerFlags[0]).toMatch(/P-rules ADVISORY \(not enforcing\)/);
    expect(r.reviewerFlags[0]).toMatch(/R6 does not close until both are supplied/);
    // Advisory means no BLOCKER — a guessed threshold must never gate client sequencing.
    expect(r.reviewerFlags.some(f => f.startsWith('BLOCKER:'))).toBe(false);
  });
});
