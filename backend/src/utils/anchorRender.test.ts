// ─── A18 (v37.5): Stage-4 anchors RENDERED, not instructed ───────────────────────────────────────
//
// Six batches of REG-26 self-check instruction never stabilised the count:
//   Meridian v37  4/5/5/5 · LunaCart v1  5/6/9/8 · LunaCart v1.1  5/3/8/9
// against a pin of exactly (Now + Next). Counting token occurrences across a 4,000-word document is
// what a language model is worst at, and the pin is a count rather than a judgement.
//
// The fact that settles it: `stripConfidenceTags` removes every `[Archetype-Anchored …]` tag on the
// delivery path, so the anchor is a GRADING artifact that never reaches a client. Rendering it writes
// to an internal surface — the last test here pins that.

import { renderPhaseAnchors, OpportunityScore } from './opportunityValidator';
import { stripForDelivery } from './confidenceScorer';

const scores: OpportunityScore[] = [
  { id: 'H-LC-02', impact: 4, feasibility: 4, alignment: 4, product: 64, class: 'QuickWin' },
  { id: 'H-LC-05', impact: 4, feasibility: 5, alignment: 4, product: 80, class: 'QuickWin' },
  { id: 'H-LC-01', impact: 5, feasibility: 2, alignment: 5, product: 50, class: 'BigBet' },
];

// The roadmap contract's real shape: H2 phase headings, H3 opportunity headings, *Why now:* lines.
const roadmap = (o: { nowWhy: string; nextWhy: string; laterWhy: string }) => [
  '## Sequencing Rationale', '', 'Returns first, then forecasting.', '',
  '## Phase 1: Now (Months 1-3)', '',
  '### Returns Triage Automation', '',
  `*Why now:* ${o.nowWhy}`, '',
  'Element: H-LC-02', '',
  '## Phase 2: Next (Months 3-6)', '',
  '### Demand Forecasting', '',
  `*Why now:* ${o.nextWhy}`, '',
  'Element: H-LC-05', '',
  '## Phase 3: Later (Months 6-12)', '',
  '### AI Company Brain', '',
  `*Why now:* ${o.laterWhy}`, '',
  'Element: H-LC-01', '',
  '## Bridge to Deeper Engagement', '',
].join('\n');

const ANCHOR = '[Archetype-Anchored — locked at Stage 1]';

describe('renderPhaseAnchors — the count becomes a function of the phase map', () => {
  it('inserts missing anchors and lands on exactly Now+Next', () => {
    const r = renderPhaseAnchors(roadmap({
      nowWhy: 'Returns cost is the largest addressable line.',
      nextWhy: 'Depends on the returns feed landing first.',
      laterWhy: 'Requires the unified data foundation.',
    }), scores);
    expect(r.summary.authoredTotal).toBe(0);
    expect(r.summary.renderedTotal).toBe(2);
    expect(r.summary.inserted).toBe(2);
    expect(r.corrected).toMatch(/Feasibility 4\/5 \[Archetype-Anchored — locked at Stage 1\]/);
    expect(r.corrected).toMatch(/Feasibility 5\/5 \[Archetype-Anchored — locked at Stage 1\]/);
  });

  it('attaches the tag to an existing "Feasibility n/5" mention rather than restating it', () => {
    const r = renderPhaseAnchors(roadmap({
      nowWhy: 'Feasibility 4/5 with the CRM data already in place.',
      nextWhy: 'Sequenced after returns.',
      laterWhy: 'Foundation first.',
    }), scores);
    expect(r.corrected).toMatch(/Feasibility 4\/5 \[Archetype-Anchored — locked at Stage 1\] with the CRM data/);
    expect((r.corrected.match(/Feasibility 4\/5/g) ?? []).length).toBe(1);
  });

  it('de-duplicates a block carrying several anchors', () => {
    const r = renderPhaseAnchors(roadmap({
      nowWhy: `Ready ${ANCHOR} and scoped ${ANCHOR}.`,
      nextWhy: `Sequenced after returns ${ANCHOR}.`,
      laterWhy: 'Foundation first.',
    }), scores);
    expect(r.summary.deduplicated).toBe(1);
    expect(r.summary.renderedTotal).toBe(2);
  });

  it('removes anchors from Later and Bridge — REG-26 pins the count to Now+Next', () => {
    const r = renderPhaseAnchors(roadmap({
      nowWhy: `Ready ${ANCHOR}.`,
      nextWhy: `Next ${ANCHOR}.`,
      laterWhy: `Foundation ${ANCHOR}.`,
    }), scores);
    expect(r.summary.removedFromLater).toBe(1);
    expect(r.summary.renderedTotal).toBe(2);
  });

  it('corrects a cited feasibility that disagrees with the locked Stage-1 score', () => {
    const r = renderPhaseAnchors(roadmap({
      nowWhy: `Feasibility 2/5 ${ANCHOR} - mis-cited.`,
      nextWhy: `Feasibility 5/5 ${ANCHOR}.`,
      laterWhy: 'Foundation first.',
    }), scores);
    expect(r.summary.valueCorrected).toBe(1);
    expect(r.corrected).toMatch(/Feasibility 4\/5 \[Archetype-Anchored/);
    expect(r.records.find(x => x.field === 'anchor_feasibility')).toMatchObject({
      elementId: 'h-lc-02', authoredValue: 2, rootComputedValue: 4, agreed: false,
    });
  });

  // The acceptance/production split: the artifact is corrected, the raw rate stays measurable.
  it('keeps the RAW authored rate observable in the C1 records', () => {
    const r = renderPhaseAnchors(roadmap({
      nowWhy: 'Nothing cited.', nextWhy: 'Nothing cited.', laterWhy: 'Foundation first.',
    }), scores);
    const counts = r.records.filter(x => x.field === 'anchor_count');
    expect(counts).toHaveLength(2);
    expect(counts.every(x => x.authoredValue === 0 && x.rootComputedValue === 1 && !x.agreed)).toBe(true);
  });

  it('is byte-identical on an already-conforming roadmap', () => {
    const conforming = roadmap({
      nowWhy: `Feasibility 4/5 ${ANCHOR} and scoped.`,
      nextWhy: `Feasibility 5/5 ${ANCHOR} once returns land.`,
      laterWhy: 'Requires the unified data foundation.',
    });
    const r = renderPhaseAnchors(conforming, scores);
    expect(r.corrected).toBe(conforming);
    expect(r.summary).toMatchObject({ inserted: 0, deduplicated: 0, valueCorrected: 0, removedFromLater: 0 });
    expect(r.reviewerFlags).toEqual([]);
  });

  // Fail loud rather than guess — writing into arbitrary prose is worse than an honest flag.
  it('does NOT guess a location when the block has no "Why now" line', () => {
    const malformed = [
      '## Phase 1: Now', '', '### Returns Triage', '', 'Element: H-LC-02', '', 'Some rationale.', '',
      '## Phase 2: Next', '', '## Phase 3: Later', '',
    ].join('\n');
    const r = renderPhaseAnchors(malformed, scores);
    expect(r.summary.malformed).toBe(1);
    expect(r.summary.inserted).toBe(0);
    expect(r.reviewerFlags.some(f => /phase-opener line/.test(f) && /NOT guessed/.test(f))).toBe(true);
  });

  it('flags rather than invents when no ID resolves to a locked score', () => {
    const unknown = [
      '## Phase 1: Now', '', '### Mystery Item', '', '*Why now:* Unclear provenance.', '',
      '## Phase 2: Next', '',
    ].join('\n');
    const r = renderPhaseAnchors(unknown, scores);
    expect(r.summary.malformed).toBe(1);
    expect(r.reviewerFlags.some(f => /locked Stage-1 feasibility is unknown/.test(f))).toBe(true);
  });

  it('is a safe no-op on a document with no phase headings', () => {
    const prose = '# Not a roadmap\n\nProse only.\n';
    const r = renderPhaseAnchors(prose, scores);
    expect(r.corrected).toBe(prose);
    expect(r.records).toEqual([]);
  });

  it('handles the six observed unstable counts, all converging on Now+Next', () => {
    // Every historic shape — under, over, and mixed — must land on 2 for this two-block roadmap.
    const shapes = [
      { nowWhy: 'a.', nextWhy: 'b.', laterWhy: 'c.' },                                     // 0 authored
      { nowWhy: `a ${ANCHOR}.`, nextWhy: 'b.', laterWhy: 'c.' },                           // 1
      { nowWhy: `a ${ANCHOR}.`, nextWhy: `b ${ANCHOR}.`, laterWhy: `c ${ANCHOR}.` },       // 3
      { nowWhy: `a ${ANCHOR} ${ANCHOR}.`, nextWhy: `b ${ANCHOR}.`, laterWhy: `c ${ANCHOR}.` }, // 4
    ];
    for (const s of shapes) {
      expect(renderPhaseAnchors(roadmap(s), scores).summary.renderedTotal).toBe(2);
    }
  });

  // The reason rendering is safe at all.
  it('the rendered anchor never reaches a client — it is stripped before delivery', () => {
    const r = renderPhaseAnchors(roadmap({
      nowWhy: 'Returns cost is large.', nextWhy: 'After returns.', laterWhy: 'Foundation first.',
    }), scores);
    expect(r.corrected).toMatch(/Archetype-Anchored/);
    expect(stripForDelivery(r.corrected)).not.toMatch(/Archetype-Anchored/);
  });
});
