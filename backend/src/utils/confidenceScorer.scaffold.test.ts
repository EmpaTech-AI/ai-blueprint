// v37.4 (LunaCart TC1, items 4 + 5).
//
// Two things are pinned here:
//   1. stripJustification tolerates every heading-drift form. The old pattern demanded `## ` at
//      exactly level 2, brackets, AND the `[END JUSTIFICATION]` terminator; any one drifting let the
//      whole block through, which is the observed LunaCart 2-of-4 / ~25-occurrence Stage-5 leak.
//   2. The scaffold-form registry stays honest in BOTH directions — the detector can never be
//      narrower than the strips (the failure that produced a "0 leaks ×4" report on a leaking
//      pipeline), and no strip can exist without a registered form.

import {
  SCAFFOLD_FORMS,
  detectResidualScaffold,
  stripForDelivery,
  stripJustification,
  stripBuildStamp,
  stripCheckpointScaffold,
  stripConfidenceTags,
  stripGate4SelfCheck,
  stripHtmlComments,
  stripProcessNarration,
  stripStatusAndMetaAsides,
  stripEditorialBrackets,
  stripOperatorPreamble,
  stripOperatorAssembly,
  stripConfidencePropagation,
  stripDataInventory,
  stripFieldTokens,
} from './confidenceScorer';

// ── Item 4: stripJustification drift tolerance ──────────────────────────────────
describe('stripJustification — heading/terminator drift tolerance (the LunaCart S5 leak)', () => {
  const body = '\n### Confidence Overview\nGrounded: 1 of 2 tagged claims.\n\n#### 1. [Inferred] Adoption rate\n- Element: H-LC-01\n';

  it('still removes the contract form (heading level 2, brackets, terminator)', () => {
    const t = `# Section\n\n## [JUSTIFICATION]\n${body}\n[END JUSTIFICATION]\n`;
    expect(stripJustification(t)).toBe('# Section');
  });

  // Each of these three passed straight through the old all-or-nothing regex.
  it('removes an UNBRACKETED heading with NO terminator (the observed leak form)', () => {
    const t = `# Section\n\n## JUSTIFICATION\n${body}`;
    expect(stripJustification(t)).toBe('# Section');
  });

  it('removes a heading at the wrong level', () => {
    for (const h of ['#', '###', '####']) {
      const t = `# Section\n\n${h} [JUSTIFICATION]\n${body}\n[END JUSTIFICATION]\n`;
      expect(stripJustification(t)).toBe('# Section');
    }
  });

  it('removes bold and trailing-colon heading variants', () => {
    for (const h of ['## **[JUSTIFICATION]**', '## **JUSTIFICATION**', '## [JUSTIFICATION]:', '##   JUSTIFICATION  ']) {
      expect(stripJustification(`# Section\n\n${h}\n${body}`)).toBe('# Section');
    }
  });

  it('consumes the block INCLUDING its own ###/#### sub-headings when the terminator is missing', () => {
    const out = stripJustification(`# Section\n\n## JUSTIFICATION\n${body}`);
    expect(out).not.toMatch(/Confidence Overview/);
    expect(out).not.toMatch(/H-LC-01/);
  });

  it('swallows a horizontal rule that belonged to the block', () => {
    expect(stripJustification(`# Section\n\n---\n\n## JUSTIFICATION\n${body}`)).toBe('# Section');
  });

  // ── Bounded over-consumption: the sibling-or-higher stop ──
  it('does NOT match a heading that merely CONTAINS the word', () => {
    const t = '# Section\n\n## Confidence Justification Report\n\nReal client content here.\n';
    expect(stripJustification(t)).toBe(t.trim());
  });

  it('preserves the Final marker when the terminator is missing (the S5 envelope needs it)', () => {
    const out = stripJustification(`# Section\n\n## JUSTIFICATION\n${body}\n*End of AI Value Blueprint*\n`);
    expect(out).toMatch(/End of AI Value Blueprint/);
    expect(out).not.toMatch(/Confidence Overview/);
  });

  it('stops at a following sibling-level section instead of eating it', () => {
    const out = stripJustification(`## Findings\n\n## JUSTIFICATION\n${body}\n## Appendix\n\nReal content.\n`);
    expect(out).toMatch(/## Appendix/);
    expect(out).toMatch(/Real content/);
    expect(out).not.toMatch(/Confidence Overview/);
  });

  // §3.3 R3: the handoff copy calls stripJustification directly (NOT stripForDelivery) and the
  // Stage-2 → Stage-4 propagation channel must survive it.
  it('leaves the [CONFIDENCE_PROPAGATION] handoff channel intact', () => {
    const out = stripJustification(`## JUSTIFICATION\n${body}\n## [CONFIDENCE_PROPAGATION]\nData: Inferred\n`);
    expect(out).toMatch(/CONFIDENCE_PROPAGATION/);
    expect(out).toMatch(/Data: Inferred/);
    expect(out).not.toMatch(/Confidence Overview/);
  });

  it('removes multiple blocks in one pass', () => {
    const out = stripJustification(`# A\n\n## JUSTIFICATION\n${body}\n[END JUSTIFICATION]\n\n# B\n\n## JUSTIFICATION\n${body}`);
    expect(out).not.toMatch(/Confidence Overview/);
    expect(out).toMatch(/# A/);
    expect(out).toMatch(/# B/);
  });

  it('is a no-op on a document with no block', () => {
    const t = '# Executive Summary\n\nThe firm has 12 recruiters.';
    expect(stripJustification(t)).toBe(t);
  });
});

// ── Item 5: registry self-consistency, both directions ──────────────────────────
describe('SCAFFOLD_FORMS — detector and strips can never drift apart', () => {
  it('every form detects its own canonical sample', () => {
    for (const form of SCAFFOLD_FORMS) {
      expect(form.detect.test(form.sample)).toBe(true);
    }
  });

  // A `g` flag would make `.test()` stateful (lastIndex persists), so a form could silently fail to
  // fire on alternating calls — exactly the kind of intermittent blindness this registry exists to end.
  it('no detector carries the g flag (test() must be stateless)', () => {
    for (const form of SCAFFOLD_FORMS) {
      expect(form.detect.global).toBe(false);
    }
  });

  it('form ids are unique', () => {
    const ids = SCAFFOLD_FORMS.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // DIRECTION 1 — detector ⊇ pipeline: anything the delivery strip claims to remove must actually be
  // gone, and the detector must agree it is gone.
  it('every delivery-strip form is removed by stripForDelivery', () => {
    for (const form of SCAFFOLD_FORMS.filter(f => f.removedBy === 'delivery-strip')) {
      const stripped = stripForDelivery(form.sample);
      expect({ id: form.id, detected: form.detect.test(stripped) })
        .toEqual({ id: form.id, detected: false });
    }
  });

  it('detectResidualScaffold reports nothing for a delivery-stripped sample', () => {
    for (const form of SCAFFOLD_FORMS.filter(f => f.removedBy === 'delivery-strip')) {
      const flags = detectResidualScaffold(stripForDelivery(form.sample), 'Stage 5');
      expect({ id: form.id, flags }).toEqual({ id: form.id, flags: [] });
    }
  });

  // DIRECTION 2 — pipeline ⊆ detector: every strip in the stripForDelivery pipe must neutralise at
  // least one REGISTERED form. A strip added without a registry entry fails here. This is the check
  // that surfaced stripConfidencePropagation and stripOperatorPreamble having no detector at all.
  it('every strip in the delivery pipe neutralises at least one registered form', () => {
    const pipe: Record<string, (t: string) => string> = {
      stripBuildStamp, stripJustification, stripCheckpointScaffold, stripConfidenceTags,
      stripGate4SelfCheck, stripHtmlComments, stripProcessNarration, stripStatusAndMetaAsides,
      stripEditorialBrackets, stripOperatorPreamble, stripOperatorAssembly,
      stripConfidencePropagation, stripDataInventory, stripFieldTokens,
    };
    for (const [name, fn] of Object.entries(pipe)) {
      const covered = SCAFFOLD_FORMS.filter(f => f.detect.test(f.sample) && !f.detect.test(fn(f.sample)));
      expect({ strip: name, covered: covered.length > 0 }).toEqual({ strip: name, covered: true });
    }
  });

  it('author-discipline forms are declared as such — the detector is their only guard', () => {
    const authorOnly = SCAFFOLD_FORMS.filter(f => f.removedBy === 'author-discipline');
    expect(authorOnly.map(f => f.id).sort()).toEqual(['engineering-id', 'h-rt-placeholder', 'quality-check']);
    // They survive the delivery strip by design; the never-ship BLOCKER is what stops them.
    for (const form of authorOnly) {
      expect(detectResidualScaffold(form.sample).length).toBeGreaterThan(0);
    }
  });

  it('regression: the JUSTIFICATION form detects the unbracketed heading the old detector missed', () => {
    const form = SCAFFOLD_FORMS.find(f => f.id === 'justification')!;
    expect(form.detect.test('## JUSTIFICATION\n')).toBe(true);       // old detector: false
    expect(form.detect.test('#### [justification]\n')).toBe(true);   // old detector: true only by luck
    expect(form.detect.test('## Confidence Justification Report\n')).toBe(false);
  });

  it('regression: CONFIDENCE_PROPAGATION and the operator preamble are now detected', () => {
    expect(detectResidualScaffold('[END CONFIDENCE_PROPAGATION]').length).toBe(1);
    expect(detectResidualScaffold('I have received the three input documents.').length).toBe(1);
  });

  // v37.4: the [DATA_INVENTORY] machine channel must be removed whole, from a realistic dossier,
  // without eating the sections around it. It sits mid-document between two real sections.
  it('removes the [DATA_INVENTORY] block without eating the sections around it', () => {
    const doc = [
      '# Compressed Client Dossier', '', '## Section A — Executive Summary', '',
      'LunaCart is a DTC retailer.', '', '## [DATA_INVENTORY]', '', '### Core Systems',
      '| System | Record classes held | Core? | Core because (stated priority) | Confidence |',
      '|---|---|---|---|---|',
      '| shopify | orders, products | yes | Priority 1 | [Document-Backed] |', '',
      '<!-- inventory: n_core=7 active_integrations=2 integration_coverage=0.33 data_grade=Early -->', '',
      '## Section H — Reviewer Checklist', '', '- Confirm the returns feed.', '',
      '# End of AI Value Blueprint',
    ].join('\n');
    const out = stripDataInventory(doc);
    expect(out).toMatch(/## Section A/);
    expect(out).toMatch(/LunaCart is a DTC retailer/);
    expect(out).toMatch(/## Section H/);
    expect(out).toMatch(/Confirm the returns feed/);
    expect(out).toMatch(/End of AI Value Blueprint/);   // the S5 envelope needs this
    expect(out).not.toMatch(/DATA_INVENTORY|inventory:|shopify/);
    expect(detectResidualScaffold(stripForDelivery(doc))).toEqual([]);
  });

  // The registry sample is a bare line (which pins the EOF fix — every stripOperatorPreamble
  // alternative used to require a trailing newline). This is the production shape: a preamble
  // precedes the document, and only the preamble may be removed.
  it('removes an operator preamble that precedes the document without touching the document', () => {
    const out = stripForDelivery("I have received the three input documents.\nProceeding to Chunk 1.\n\n# Executive Summary\n\nThe firm has 12 recruiters.\n");
    expect(out).toMatch(/# Executive Summary/);
    expect(out).toMatch(/12 recruiters/);
    expect(out).not.toMatch(/I have received/);
    expect(out).not.toMatch(/Proceeding to Chunk/);
    expect(detectResidualScaffold(out)).toEqual([]);
  });
});
