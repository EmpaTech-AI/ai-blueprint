import {
  calculateConfidence,
  stripJustification,
  stripConfidenceTags,
  stripForDelivery,
  stripOperatorAssembly,
  stripCheckpointScaffold,
  stripHtmlComments,
  stripProcessNarration,
  stripGate4SelfCheck,
  stripStatusAndMetaAsides,
  stripToDeliveryEnvelope,
  stripForDeliveryStage5,
  detectResidualScaffold,
  BACKEND_COMPOSITION_THRESHOLDS,
  GROUNDING_GREEN,
} from './confidenceScorer';

// ── stripJustification ────────────────────────────────────────────────────────

describe('stripJustification', () => {
  it('removes the justification block and nothing else', () => {
    const input = 'Before content.\n\n## [JUSTIFICATION]\nSome details.\n[END JUSTIFICATION]\n\nAfter content.';
    const result = stripJustification(input);
    expect(result).toContain('Before content.');
    expect(result).toContain('After content.');
    expect(result).not.toContain('[JUSTIFICATION]');
    expect(result).not.toContain('[END JUSTIFICATION]');
    expect(result).not.toContain('Some details.');
  });

  it('is case-insensitive on the block markers', () => {
    const input = 'Header.\n## [justification]\nStuff.\n[end justification]\nTrailer.';
    expect(stripJustification(input)).toContain('Trailer.');
    expect(stripJustification(input)).not.toContain('Stuff.');
  });

  it('returns the input unchanged when no justification block exists', () => {
    const input = 'No block here.';
    expect(stripJustification(input)).toBe('No block here.');
  });
});

// ── stripConfidenceTags ───────────────────────────────────────────────────────

describe('stripConfidenceTags', () => {
  it('removes all confidence tag variants', () => {
    const input = 'Revenue [Document-Backed] is growing. Culture [Inferred — from pattern] is strong. Budget [Assumption] is limited. Goal [Form-Stated] is clear.';
    const result = stripConfidenceTags(input);
    expect(result).not.toMatch(/\[Document[- ]?Backed[^\]]*\]/i);
    expect(result).not.toMatch(/\[Inferred[^\]]*\]/i);
    expect(result).not.toMatch(/\[Assumption[^\]]*\]/i);
    expect(result).not.toMatch(/\[Form[- ]?Stated[^\]]*\]/i);
    expect(result).toContain('Revenue');
    expect(result).toContain('is growing');
  });
});

// ── stripForDelivery ──────────────────────────────────────────────────────────

describe('stripForDelivery', () => {
  it('removes both the justification block and inline tags', () => {
    const input =
      'Revenue [Document-Backed] is strong.\n\n## [JUSTIFICATION]\nDetails.\n[END JUSTIFICATION]\n\nGoal [Form-Stated] achieved.';
    const result = stripForDelivery(input);
    expect(result).not.toContain('[JUSTIFICATION]');
    expect(result).not.toMatch(/\[Document[- ]?Backed\]/i);
    expect(result).not.toMatch(/\[Form[- ]?Stated\]/i);
    expect(result).toContain('Revenue');
    expect(result).toContain('Goal');
  });
});

// ── calculateConfidence ───────────────────────────────────────────────────────

describe('calculateConfidence', () => {
  it('scores 100% when all tags are high-confidence', () => {
    const text = 'Revenue [Document-Backed] is growing. Timeline [Form-Stated] is 12 months.';
    const result = calculateConfidence(text);
    expect(result.score).toBe(100);
    expect(result.breakdown.documentBacked).toBe(1);
    expect(result.breakdown.formStated).toBe(1);
    expect(result.breakdown.inferred).toBe(0);
    expect(result.breakdown.assumption).toBe(0);
    expect(result.needsReview).toBe(false);
  });

  it('scores 0% when all tags are low-confidence', () => {
    const text = 'Culture [Inferred] is collaborative. Budget [Assumption] is limited.';
    const result = calculateConfidence(text);
    expect(result.score).toBe(0);
    expect(result.breakdown.inferred).toBe(1);
    expect(result.breakdown.assumption).toBe(1);
    expect(result.needsReview).toBe(true);
  });

  it('scores 0% (Red, not 50) when there are NO tags — D6 regression', () => {
    // Before the D6 fix this returned 50. After the fix it returns 0.
    const text = 'The company has strong revenue growth and a motivated team.';
    const result = calculateConfidence(text);
    expect(result.score).toBe(0);
    expect(result.breakdown.total).toBe(0);
    expect(result.noTagsReason).toBeDefined();
    expect(result.needsReview).toBe(true);
  });

  it('scores correctly with mixed high and low tags', () => {
    // 3 high (2 doc-backed + 1 form-stated), 1 low (inferred) → 75%
    const text = 'Revenue [Document-Backed] up. Team [Document-Backed] strong. Goal [Form-Stated] set. Risk [Inferred] moderate.';
    const result = calculateConfidence(text);
    expect(result.score).toBe(75);
    expect(result.breakdown.total).toBe(4);
    expect(result.highConfidenceCount).toBe(3);
    expect(result.lowConfidenceCount).toBe(1);
  });

  it('accepts [Assumed] as a synonym for [Assumption]', () => {
    const text = 'Growth rate [Assumed] is 20%.';
    const result = calculateConfidence(text);
    expect(result.breakdown.assumption).toBe(1);
    expect(result.score).toBe(0);
  });

  it('accepts extended tag forms with extra content', () => {
    const text = 'Revenue [Document-Backed — see annual report p.12] grew 18%.';
    const result = calculateConfidence(text);
    expect(result.breakdown.documentBacked).toBe(1);
    expect(result.score).toBe(100);
  });

  it('excludes tags inside the justification block from scoring', () => {
    // The justification block itself contains tag text — it should not inflate scores.
    const text =
      'Revenue [Document-Backed] is strong.\n\n## [JUSTIFICATION]\n### Confidence Overview\nSome overview.\n#### 1. [Inferred] Some risk\n- **Claim**: "A claim"\n- **Why inferred**: Partial data.\n[END JUSTIFICATION]';
    const result = calculateConfidence(text);
    // Only the [Document-Backed] in the content should be counted, not the [Inferred] in the block.
    expect(result.breakdown.documentBacked).toBe(1);
    expect(result.breakdown.inferred).toBe(0);
    expect(result.score).toBe(100);
  });

  it('provides noTagsReason with a helpful message when output is short', () => {
    const result = calculateConfidence('Short output.');
    expect(result.noTagsReason).toContain('too short');
  });

  it('provides noTagsReason citing skill prompt when output is long but has no tags', () => {
    const longText = 'Word '.repeat(60); // > 50 words, no tags
    const result = calculateConfidence(longText);
    expect(result.noTagsReason).toBeTruthy();
    expect(result.noTagsReason).not.toContain('too short');
  });

  it('sets needsReview true for scores below 76', () => {
    const text = 'A [Inferred] B [Inferred] C [Document-Backed]'; // 1/3 = 33%
    const result = calculateConfidence(text);
    expect(result.needsReview).toBe(true);
  });

  it('sets needsReview false for scores >= 76', () => {
    const text = '[Document-Backed] [Document-Backed] [Document-Backed] [Inferred]'; // 3/4 = 75%... wait that's < 76
    // Use 4 high 1 low = 80%
    const text2 = '[Document-Backed] [Document-Backed] [Document-Backed] [Document-Backed] [Inferred]';
    const result = calculateConfidence(text2);
    expect(result.score).toBe(80);
    expect(result.needsReview).toBe(false);
  });
});

// ── P0 Freeze guards ──────────────────────────────────────────────────────────
// These tests are stability anchors. A failure here means a protected constant
// was changed. Consult Dev_Team_Action_Note_v16 before modifying the expected values.
//
// P0 OUTCOME-FREEZE (multi-run reproducibility) is NOT here — it belongs in the P4 harness:
//   • assert identical selected-ID set across 4 runs
//   • assert 6/6 maturity dimensions present across 4 runs
//   • assert spine-overview element set stable across 4 runs
// These require multi-run fixtures. They MUST be implemented in P4 — do not treat this
// unit suite as covering them.

describe('P0 Freeze guards — threshold stability', () => {
  it('GROUNDING_GREEN is 88 — do not recalibrate without Practice sign-off', () => {
    expect(GROUNDING_GREEN).toBe(88);
  });

  it('BACKEND_COMPOSITION_THRESHOLDS has exactly the expected step keys', () => {
    expect(Object.keys(BACKEND_COMPOSITION_THRESHOLDS)).toEqual(
      ['stepB', 'stepC', 'stepD', 'stepD2', 'stepE'],
    );
  });

  it('BACKEND_COMPOSITION_THRESHOLDS values are frozen to agreed calibration', () => {
    expect(BACKEND_COMPOSITION_THRESHOLDS).toEqual({
      stepB:  { green: 70, amber: 45 },
      stepC:  { green: 75, amber: 50 },
      stepD:  { green: 75, amber: 50 },
      stepD2: { green: 75, amber: 50 },
      stepE:  { green: 80, amber: 50 },
    });
  });

  it('stepB uses justification-entry count as authoritative LC — body structural spans excluded', () => {
    // Body has 3 [Inferred] tags: two appendix cross-refs + one text-mention false-positive.
    // Justification block has exactly 1 genuine entry.
    // Score must be derived from entry count (1), not body tag count (3).
    const input = [
      'Revenue [Document-Backed] is strong.',
      'Savings [Inferred — derivation per appendix item 1].',
      'Risk [Inferred — derivation per appendix item 2].',
      'Would replace [Inferred] tag once confirmed.',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'One genuine inference.',
      '#### 1. [Inferred] Estimated savings timeline',
      '- **Claim**: "Timeline is estimated."',
      '- **Why inferred**: No pilot data.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepB');
    expect(result.breakdown.documentBacked).toBe(1);
    expect(result.breakdown.inferred).toBe(1);     // entry count, not body count (3)
    expect(result.score).toBe(50);                  // 1 high / 2 total
  });

  it('stepB: overview-enumeration and checklist mentions are excluded via positive counting', () => {
    // Overview block uses H-RT-NN ([Inferred] — …) format; checklist mentions tag names as prose.
    // Both are structural scaffolding. With positive counting neither inflates the LC count.
    const input = [
      'Revenue [Document-Backed] is strong.',
      'H-RT-02 ([Inferred] — monthly savings derived from staffing model).',
      'H-RT-03 ([Inferred] — timeline estimated from vendor data).',
      '## H) Reviewer Checklist',
      '8 items carry [Inferred] or [Assumption] tags.',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'Two genuine inferences.',
      '#### 1. [Inferred] Monthly savings',
      '- **Claim**: "Savings estimate."',
      '- **Why inferred**: No pilot data.',
      '#### 2. [Inferred] Timeline',
      '- **Claim**: "Timeline."',
      '- **Why inferred**: Vendor data only.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepB');
    expect(result.breakdown.inferred).toBe(2);     // entry count — overview+checklist excluded
    expect(result.score).toBe(33);                  // 1 high / 3 total
  });

  it('stepB counts entries with non-canonical field names — P3a regression guard', () => {
    // Root cause of P3a never firing in v17/v18/v18.1 production batches.
    // LLM used "**Rationale**" / "**Evidence gap**" instead of "**Claim**" / "**Why inferred**".
    // extractField returned '' for both → old `if (claim || whyTagged)` guard dropped the entry
    // → entries.length = 0 → positive-counting branch skipped → body counting used (LC = 23-31).
    // Fix: header match is the authoritative signal; entry is always pushed regardless of body fields.
    const input = [
      'Revenue [Document-Backed] is strong.',
      'Savings [Inferred — derivation per appendix item 1].',
      'Risk [Inferred — derivation per appendix item 2].',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'One genuine inference.',
      '#### 1. [Inferred] Estimated savings timeline',
      '- **Rationale**: No pilot data available.',
      '- **Evidence gap**: Client time-tracking not provided.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepB');
    // entry.claim = '', entry.whyTagged = '' (non-canonical) — but header matched → must be pushed
    expect(result.breakdown.inferred).toBe(1);  // entry count, not body count (2)
    expect(result.score).toBe(50);               // 1 high / 2 total
  });

  it('stepB falls back to body-tag counting when no justification block is present', () => {
    // If the model fails to produce a structured block, body counting is the safe fallback.
    const noBlock = 'Revenue [Document-Backed] is strong. Risk [Inferred] is moderate.';
    const result = calculateConfidence(noBlock, 'stepB');
    expect(result.breakdown.inferred).toBe(1);     // body count used (no entries to count from)
    expect(result.score).toBe(50);
  });

  it('stepB: floor format without [END JUSTIFICATION] — v24+ intake regression guard', () => {
    // v24+ blueprint-intake outputs omit [END JUSTIFICATION] and use "#### N. Label [floor]"
    // header format with • bullets. Both changes caused P3a to fall back to body-count (LC 25-31).
    // Fix: blockMatch falls back to $; floorEntryRegex handles label-first + [floor] headers;
    // extractField accepts • as a field delimiter.
    const input = [
      'Revenue [Document-Backed] is strong.',
      'Savings [Inferred — derivation per appendix item 1].',
      'Risk [Inferred — derivation per appendix item 2].',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'Grounded: 94 of 102 tagged claims are high-confidence (92%). Low-confidence elements: H-RT-02.',
      '',
      '### Low-Confidence Items',
      '',
      '#### 1. Consultant time savings estimate [floor]',
      '• **Claim:** "200–300 hours per month."',
      '• **Element:** H-RT-02',
      '• **Floor category:** F-2',
      '• **Why inferred:** Arithmetic chain from SOP data.',
      '• **Missing data:** Direct measurement.',
      '• **Consultant action:** Instrument time-tracking.',
      '',
      '#### 2. Vendor integration feasibility [floor]',
      '• **Claim:** "Integration would eliminate friction."',
      '• **Element:** H-RT-05',
      '• **Floor category:** F-3',
      '• **Why assumed:** No client evaluation exists.',
      '• **Missing data:** Vendor confirmation.',
      '• **Consultant action:** Check with vendor.',
      '',
      '*End of Compressed Client Dossier. Schema: intake_v1.0. Chunks 1–3 complete.*',
    ].join('\n');
    const result = calculateConfidence(input, 'stepB');
    // entry count (2) used — not body count (inflated structural tags)
    expect(result.breakdown.inferred).toBe(1);    // entry 1: Why inferred → Inferred
    expect(result.breakdown.assumption).toBe(1);  // entry 2: Why assumed → Assumption
    expect(result.justificationEntries).toHaveLength(2);
    expect(result.justificationEntries?.[0].tag).toBe('Inferred');
    expect(result.justificationEntries?.[1].tag).toBe('Assumption');
  });

  it('stepC with structured block uses entry count (P3c — Stage-2 duplicate-count fix)', () => {
    // Body has 3 [Inferred] tags; justification block has 1 entry.
    // P3c: positive counting is now active for stepC — entry count (1) is used, not body count (3).
    const input = [
      'Revenue [Document-Backed] is strong.',
      'Risk A [Inferred] noted.',
      'Risk B [Inferred] noted.',
      'Risk C [Inferred] noted.',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'One genuine inference.',
      '#### 1. [Inferred] First risk',
      '- **Claim**: "Risk A."',
      '- **Why inferred**: Indirect evidence.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepC');
    expect(result.breakdown.inferred).toBe(1);  // entry count, not body count (3)
    expect(result.score).toBe(50);               // 1 high / 2 total
  });

  it('stepC deduplicates entries with the same normalised label (Stage-2 T3=3/T4=1 defect)', () => {
    // The LLM emits the same element three times in the JUSTIFICATION block (T3 defect).
    // Dedup collapses them to 1 — the score should match a run that emits it once (T4).
    const input = [
      'Revenue [Document-Backed] stable.',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'One real inference, listed three times.',
      '#### 1. [Assumption] Absence of formal AI training programme',
      '- **Claim**: "No formal AI training exists."',
      '- **Why assumed**: Not documented.',
      '#### 2. [Assumption] Absence of formal AI training programme',
      '- **Claim**: "No formal AI training exists."',
      '- **Why assumed**: Not documented.',
      '#### 3. [Assumption] Absence of formal AI training programme',
      '- **Claim**: "No formal AI training exists."',
      '- **Why assumed**: Not documented.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepC');
    expect(result.breakdown.assumption).toBe(1);  // deduped: 3 entries → 1 distinct
    expect(result.score).toBe(50);                 // 1 high / 2 total
  });

  it('stepC falls back to body-tag counting when no structured block is present', () => {
    // Confirms body-count fallback is preserved when the LLM produces no JUSTIFICATION block.
    const noBlock = 'Revenue [Document-Backed] is strong. Risk A [Inferred] noted. Risk B [Inferred] noted.';
    const result = calculateConfidence(noBlock, 'stepC');
    expect(result.breakdown.inferred).toBe(2);  // body count (no block to count from)
    expect(result.score).toBe(33);
  });

  it('stepD with structured block uses entry count (P3c — Stage-3 LC inflation fix)', () => {
    // Same pattern as stepC — positive counting extended to stepD.
    const input = [
      'Revenue [Document-Backed] is strong.',
      'Savings [Inferred] are estimated at 20%.',
      'Timeline [Assumption] is 6 months.',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'Two genuine items.',
      '#### 1. [Inferred] Savings estimate',
      '- **Claim**: "20% savings."',
      '- **Why inferred**: Industry benchmark.',
      '#### 2. [Assumption] Timeline',
      '- **Claim**: "6-month timeline."',
      '- **Why assumed**: No prior project data.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepD');
    expect(result.breakdown.inferred).toBe(1);
    expect(result.breakdown.assumption).toBe(1);
    // 1 Document-Backed (high) + 1 Inferred + 1 Assumption (low) = 3 total → 33%
    expect(result.score).toBe(33);
  });

  it('stepD2 uses entry-based counting (POSITIVE_COUNT_STEPS) when a structured block is present', () => {
    // stepD2 is in POSITIVE_COUNT_STEPS — entry count (1) is used, not body count (2).
    // Body-counting would inflate LC at Stage 4 because upstream inherited claims
    // (phase labels, H-RT-XX references) hit [Inferred] patterns erroneously.
    const input = [
      'Revenue [Document-Backed] is strong.',
      'Risk A [Inferred] noted.',
      'Risk B [Inferred] noted.',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'One entry.',
      '#### 1. [Inferred] First risk',
      '- **Claim**: "Risk A."',
      '- **Why inferred**: Indirect.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepD2');
    expect(result.breakdown.inferred).toBe(1);  // entry count (not body count of 2)
  });
});

// ── S-23 archetype-anchored basis + T-04 element-keyed dedup ────────────────────

describe('S-23 / D-9 (B′) [Archetype-Anchored] de-conflated metric', () => {
  it('does NOT fold archetype-anchored into the grounding numerator (B′)', () => {
    // grounding = (DB+FS)/total — AA stays in the denominator, NOT the numerator.
    // delivery-readiness is the composite that also credits the reproducible AA basis.
    const input = [
      'Scores: Impact 5 | Feasibility 3 | Alignment 5 [Archetype-Anchored — locked at Stage 1].',
      'The client uses Vincere [Document-Backed].',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'No low-confidence items.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepD');
    expect(result.breakdown.archetypeAnchored).toBe(1);
    // 1 DB (grounding numerator) ÷ (1 DB + 1 AA) total = 50% grounding — AA NOT folded in.
    expect(result.score).toBe(50);
    // delivery-readiness DOES credit AA: (1 DB + 1 AA) / 2 = 100%.
    expect(result.deliveryReadiness).toBe(100);
    // AA is not low-confidence, so it must not appear in the low-confidence count.
    expect(result.lowConfidenceCount).toBe(0);
  });

  it('archetype-anchored basis does not dilute the documentary composition split', () => {
    // documentVerifiedPercent = DB / (DB+FS) — archetype-anchored is excluded from the denominator.
    const input = [
      'Scores [Archetype-Anchored — locked at Stage 1].',
      'Vincere licensed [Document-Backed]. API access [Form-Stated].',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'No low-confidence items.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepD');
    // 1 DB out of (1 DB + 1 FS) client-evidence claims = 50%, NOT 33% (which including AA would give)
    expect(result.documentVerifiedPercent).toBe(50);
  });

  it('stripConfidenceTags removes [Archetype-Anchored] before delivery', () => {
    const input = 'Feasibility 3/5 [Archetype-Anchored — locked at Stage 1] is solid.';
    expect(stripConfidenceTags(input)).not.toMatch(/\[Archetype[- ]?Anchored[^\]]*\]/i);
  });
});

describe('T-15 stripCheckpointScaffold — format-tolerant leak fix', () => {
  const realSection = '# AI Value Blueprint\n\n## Section A\n\nExecutive summary content here.';

  it('strips the canonical checkpoint block (--- + ## CHECKPOINT N + metadata)', () => {
    const input = [
      '# AI Value Blueprint',
      '',
      '## Section A',
      'Content.',
      '',
      '---',
      '',
      '## CHECKPOINT 1 — Foundation Complete',
      '**Engagement:** Meridian',
      '**Chunk 1 word count:** 1500',
      '- Financial baseline: ✓',
      '',
      '## Section B',
      'More content.',
    ].join('\n');
    const out = stripCheckpointScaffold(input);
    expect(out).not.toMatch(/CHECKPOINT/i);
    expect(out).toContain('## Section A');
    expect(out).toContain('## Section B');   // real sections preserved
    expect(out).toContain('More content.');
  });

  it('strips checkpoint blocks with formatting drift (no rule, single newline, lowercase, H3)', () => {
    // The exact variance that made the old rigid regex miss the block intermittently.
    const variants = [
      '### checkpoint 2 — Analytical Core\n**Hypotheses selected:** 7\n',          // H3 + lowercase + no rule
      '----\n## Checkpoint 1\n**Engagement:** X\n',                                 // 4-dash rule + mixed case
      '##\tCHECKPOINT 2\n**Chunk 2 word count:** 2200\n',                           // tab after ##
    ];
    for (const v of variants) {
      const input = `# Title\n\n## Section A\nReal content.\n\n${v}\n## Section B\nKept.`;
      const out = stripCheckpointScaffold(input);
      expect(out).not.toMatch(/CHECKPOINT/i);
      expect(out).toContain('Real content.');
      expect(out).toContain('Kept.');
    }
  });

  it('does not touch documents with no checkpoint blocks', () => {
    expect(stripCheckpointScaffold(realSection)).toBe(realSection);
  });

  it('is applied by stripForDelivery so every emission path is covered', () => {
    const input = '# Title\n\n## Section A\nContent.\n\n---\n\n## CHECKPOINT 1\n**Engagement:** X\n';
    expect(stripForDelivery(input)).not.toMatch(/CHECKPOINT/i);
  });
});

describe('T-04 element-keyed LC dedup', () => {
  it('deduplicates same-element same-tag entries even when labels differ (v24 defect)', () => {
    // Same element (H-RT-02), same tag, different free-text labels across what would be runs.
    // Element-keyed dedup pins the count to 1 — labels alone would count 2.
    const input = [
      'Revenue [Document-Backed] stable.',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'Same element, two phrasings.',
      '#### 1. [Assumption] Sourcing time saving estimate',
      '- **Claim**: "40% saving."',
      '- **Element**: H-RT-02',
      '- **Why assumed**: Industry benchmark.',
      '#### 2. [Assumption] Automation impact projection',
      '- **Claim**: "40% saving."',
      '- **Element**: H-RT-02',
      '- **Why assumed**: Industry benchmark.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepD');
    expect(result.breakdown.assumption).toBe(1);  // deduped on element+tag
  });

  it('does NOT collapse different tags on the same element (distinct concerns)', () => {
    const input = [
      'Revenue [Document-Backed] stable.',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'One inferred, one assumption, same element.',
      '#### 1. [Inferred] Feasibility reduced by Stage 2 grounding',
      '- **Claim**: "Reduced to 3."',
      '- **Element**: H-RT-02',
      '- **Why inferred**: Partial Stage 2 grounding.',
      '#### 2. [Assumption] Sourcing time saving estimate',
      '- **Claim**: "40% saving."',
      '- **Element**: H-RT-02',
      '- **Why assumed**: Industry benchmark.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepD');
    expect(result.breakdown.inferred).toBe(1);
    expect(result.breakdown.assumption).toBe(1);  // not collapsed — different tag categories
  });
});

// ── v33: T-23 / T-25 / T-26 scaffold-relocation strips ──────────────────────────

describe('T-26 stripHtmlComments — score-stub / doubled-marker leak fix', () => {
  it('removes the literal id=H-RT-XX placeholder stub (v32 S-29 leak)', () => {
    const input = [
      '## Opportunity 1',
      '**Scores:** Impact 5/5 | Feasibility 4/5 | Alignment 5/5',
      '<!-- score: id=H-RT-XX impact={x} feasibility={y} alignment={z} class={QuickWin} -->',
      'Body text continues.',
    ].join('\n');
    const out = stripHtmlComments(input);
    expect(out).not.toContain('<!--');
    expect(out).not.toContain('H-RT-XX');
    expect(out).toContain('Body text continues.');
  });

  it('removes ALL comment forms (score, pp-id, INTAKE_FACTS, build) — not just build', () => {
    const input = [
      '<!-- INTAKE_FACTS CEO_NAME=Dimitar Popov -->',
      '# Title',
      'Pain point text. <!-- pp-id: PP-RT-01 -->',
      '<!-- score: id=H-RT-02 impact=5 -->',
      '<!-- build: date=2026-06-25 pipeline=v33 sha=unset -->',
      'Real content.',
    ].join('\n');
    const out = stripHtmlComments(input);
    expect(out).not.toContain('<!--');
    expect(out).toContain('# Title');
    expect(out).toContain('Real content.');
  });
});

describe('T-23 stripProcessNarration — relocated leak (S-28)', () => {
  it('removes a leading "Step N (Stage):" process-narration block', () => {
    const input = [
      'Step 1 (Intake): Compressed the dossier into Sections A–D. Step 2 (Maturity): Scored six dimensions.',
      '',
      '# Executive Summary',
      'Real deliverable content.',
    ].join('\n');
    const out = stripProcessNarration(input);
    expect(out).not.toMatch(/Step\s+1\s*\(Intake\)/i);
    expect(out).not.toMatch(/Step\s+2\s*\(Maturity\)/i);
    expect(out).toContain('# Executive Summary');
    expect(out).toContain('Real deliverable content.');
  });

  it('removes narration in bold or bullet form, and the "Stage N — Name:" variant', () => {
    const input = [
      '**Step 3 (Opportunities):** Identified seven opportunities.',
      '- Step 4 (Roadmap): Sequenced into Now/Next/Later.',
      'Stage 5 — Assembly: Compiled the deliverable.',
      'Kept body line.',
    ].join('\n');
    const out = stripProcessNarration(input);
    expect(out).not.toMatch(/Step\s+3/i);
    expect(out).not.toMatch(/Step\s+4/i);
    expect(out).not.toMatch(/Stage\s+5/i);
    expect(out).toContain('Kept body line.');
  });

  it('does NOT touch real headings or ordinary prose mentioning a step', () => {
    const input = [
      '# 1. Executive Summary',
      '## Now — Months 1 to 3',
      'The first step the client should take is to license a writing tool.',
    ].join('\n');
    expect(stripProcessNarration(input)).toBe(input);
  });
});

describe('T-25 stripGate4SelfCheck — internal checklist leak (S-25)', () => {
  it('removes a leaked GATE-4 self-check block but keeps surrounding sections', () => {
    const input = [
      '### Sequencing Rationale',
      'This order builds momentum.',
      '',
      '### GATE-4 self-check (run before producing output)',
      '- [ ] At least 1 Quick Win in Now',
      '- [ ] All 7 opportunities assigned',
      '',
      '### Phase 1: Now (Months 1–3)',
      'Deploy the writing tool.',
    ].join('\n');
    const out = stripGate4SelfCheck(input);
    expect(out).not.toMatch(/GATE-?\s*4 self-check/i);
    expect(out).toContain('Sequencing Rationale');
    expect(out).toContain('Phase 1: Now');
    expect(out).toContain('Deploy the writing tool.');
  });
});

describe('stripForDelivery integration — all v33 scaffold forms in one pass', () => {
  it('removes narration, comments, GATE-4 self-check, checkpoint, justification and tags together', () => {
    const input = [
      'Step 1 (Intake): Compressed the dossier.',
      '',
      '# Executive Summary',
      'Revenue [Document-Backed] is strong.',
      '<!-- score: id=H-RT-XX impact={x} -->',
      '',
      '### GATE-4 self-check (run before producing output)',
      '- [ ] All opportunities assigned',
      '',
      '## Section B',
      'More content [Form-Stated].',
      '',
      '---',
      '',
      '## CHECKPOINT 1 — Foundation Complete',
      '**Engagement:** X',
      '',
      '## [JUSTIFICATION]',
      '#### 1. [Inferred] Something',
      '[END JUSTIFICATION]',
    ].join('\n');
    const out = stripForDelivery(input);
    expect(out).not.toMatch(/Step\s+1\s*\(Intake\)/i);
    expect(out).not.toContain('<!--');
    expect(out).not.toContain('H-RT-XX');
    expect(out).not.toMatch(/GATE-?\s*4 self-check/i);
    expect(out).not.toMatch(/CHECKPOINT/i);
    expect(out).not.toContain('[JUSTIFICATION]');
    expect(out).not.toMatch(/\[Document[- ]?Backed\]/i);
    expect(out).toContain('# Executive Summary');
    expect(out).toContain('Revenue');
    expect(out).toContain('More content');
  });
});

// ── T-24 / D-9: archetype-anchored count is PINNED (no 7/13/9/18 fork) ───────────

describe('T-24 / D-9 archetype-anchored count pinning', () => {
  const buildOppOutput = (aaTagCount: number, scoreMarkerIds: string[]) => {
    const lines = ['# Opportunity Map'];
    for (let i = 0; i < aaTagCount; i++) {
      lines.push(`Scores line ${i} [Archetype-Anchored — locked at Stage 1].`);
    }
    lines.push('Vincere licensed [Document-Backed].');
    for (const id of scoreMarkerIds) {
      lines.push(`<!-- score: id=${id} impact=5 feasibility=4 alignment=5 product=100 class=QuickWin ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no d_gate4=no compliance_deadline=none system_event_deadline=none phase_dependency=n/a -->`);
    }
    return lines.join('\n');
  };

  it('pins AA to the number of UNIQUE scored hypothesis IDs regardless of raw tag count', () => {
    // Two "runs": one over-tags AA 13×, one tags 7× — both have the same 7 scored markers.
    const ids = ['H-RT-01', 'H-RT-02', 'H-RT-03', 'H-RT-04', 'H-RT-05', 'H-RT-07', 'H-RT-08'];
    const run1 = calculateConfidence(buildOppOutput(13, ids), 'stepD');
    const run2 = calculateConfidence(buildOppOutput(7, ids), 'stepD');
    expect(run1.breakdown.archetypeAnchored).toBe(7);
    expect(run2.breakdown.archetypeAnchored).toBe(7);   // no fork — both pin to 7
  });

  it('deduplicates a doubled marker (S-29) so it does not inflate the AA count', () => {
    const ids = ['H-RT-02', 'H-RT-08', 'H-RT-08'];   // H-RT-08 doubled
    const result = calculateConfidence(buildOppOutput(3, ids), 'stepD');
    expect(result.breakdown.archetypeAnchored).toBe(2);  // 2 unique IDs, not 3
  });

  it('excludes the literal H-RT-XX placeholder stub from the pinned count', () => {
    const ids = ['H-RT-02', 'H-RT-XX'];   // one real, one unsubstituted stub
    const result = calculateConfidence(buildOppOutput(2, ids), 'stepD');
    expect(result.breakdown.archetypeAnchored).toBe(1);  // stub excluded
  });

  it('falls back to raw tag count when no score markers are present (e.g. Stage 5 prose)', () => {
    const input = [
      'Feasibility 3/5 [Archetype-Anchored — locked at Stage 1].',
      'Impact 5/5 [Archetype-Anchored — locked at Stage 1].',
      'Vincere [Document-Backed].',
    ].join('\n');
    const result = calculateConfidence(input, 'stepE');
    expect(result.breakdown.archetypeAnchored).toBe(2);  // raw count — no markers to pin to
  });

  it('reports grounding and delivery-readiness as separate numbers (the honest 77–84% case)', () => {
    // The §40-I.1 shape: DB-dominant client evidence + a few AA + a couple of low-confidence.
    // grounding = (DB+FS)/total must read ~84%, delivery-readiness higher, AA never folded in.
    const dbLines = Array.from({ length: 7 }, (_, i) => `Fact ${i} [Document-Backed].`);
    const input = [
      ...dbLines,                                  // 7 DB
      'Scores A [Archetype-Anchored].',            // 2 AA (no score markers → raw count)
      'Scores B [Archetype-Anchored].',
      'Estimate [Inferred]. Guess [Assumption].',  // 1 Inf + 1 Asm
    ].join('\n');
    const result = calculateConfidence(input, 'stepE');
    // total = 7 DB + 2 AA + 2 low = 11; grounding = 7/11 = 64%; readiness = 9/11 = 82%
    expect(result.breakdown.archetypeAnchored).toBe(2);
    expect(result.score).toBe(64);
    expect(result.deliveryReadiness).toBe(82);
    expect(result.score).toBeLessThan(result.deliveryReadiness as number);  // AA lifts readiness, not grounding
  });
});

// ── v33: position envelope + status strips + residual-scaffold detector ─────────

describe('T-23 stripStatusAndMetaAsides — mid-body relocation forms', () => {
  it('strips Coverage/Confidence/Sections status lines and (Internal: …) asides', () => {
    const input = [
      '# Executive Summary',
      'Coverage: A–H',
      'Confidence: high',
      'The firm processes 258 mandates (Internal: 8 pain points mapped) annually.',
      'Real prose continues.',
    ].join('\n');
    const out = stripStatusAndMetaAsides(input);
    expect(out).not.toMatch(/^Coverage:/m);
    expect(out).not.toMatch(/^Confidence:/m);
    expect(out).not.toContain('(Internal:');
    expect(out).toContain('# Executive Summary');
    expect(out).toContain('The firm processes 258 mandates');
    expect(out).toContain('Real prose continues.');
  });

  it('does not strip ordinary prose that merely starts with a status word', () => {
    const input = 'Confidence in these estimates is moderate given the data available.';
    expect(stripStatusAndMetaAsides(input)).toBe(input);
  });
});

describe('T-23 stripToDeliveryEnvelope — the credited KR5 guarantee', () => {
  it('removes everything before the first section header and after the Final marker', () => {
    const input = [
      'I have received all four inputs and will now assemble.',
      'Step 1 (Intake): compressed the dossier.',
      '',
      '# Executive Summary',
      'Body content.',
      '',
      '*End of AI Value Blueprint. Chunks 1–3 complete.*',
      '',
      'Document ready for DOCX conversion — let me know if anything else is needed.',
    ].join('\n');
    const out = stripToDeliveryEnvelope(input);
    expect(out.startsWith('# Executive Summary')).toBe(true);
    expect(out).not.toMatch(/I have received/);
    expect(out).not.toMatch(/Step 1 \(Intake\)/);
    expect(out).not.toMatch(/Document ready for DOCX/);
    expect(out.trimEnd().endsWith('Chunks 1–3 complete.*')).toBe(true);
  });

  it('is form-agnostic — strips a novel leading scaffold form the enumeration would miss', () => {
    const input = '>>> ASSEMBLY TRACE v7 :: tokens=5123 ::\n\n# 1. Executive Summary\nReal content.';
    const out = stripToDeliveryEnvelope(input);
    expect(out.startsWith('# 1. Executive Summary')).toBe(true);
    expect(out).not.toContain('ASSEMBLY TRACE');
  });
});

describe('stripForDeliveryStage5 + detectResidualScaffold — guarantee then scan', () => {
  it('produces a clean deliverable and an empty detector result', () => {
    const input = [
      'Step 1 (Intake): compressed the dossier.',
      '',
      '# Executive Summary',
      'Revenue [Document-Backed] is strong.',
      '<!-- score: id=H-RT-XX impact={x} -->',
      'Coverage: A–H',
      '',
      '### GATE-4 self-check (run before producing output)',
      '- [ ] All opportunities assigned',
      '',
      '## Methodology',
      'Framework content.',
      '',
      '*End of AI Value Blueprint. Chunks 1–3 complete.*',
    ].join('\n');
    const out = stripForDeliveryStage5(input);
    expect(detectResidualScaffold(out)).toEqual([]);   // scan confirms the guarantee
    expect(out.startsWith('# Executive Summary')).toBe(true);
    expect(out).toContain('Revenue');
    expect(out).toContain('Framework content.');
  });

  it('detector flags a residual scaffold form if one survives', () => {
    const flags = detectResidualScaffold('# Title\nSome CHECKPOINT 2 leaked here.');
    expect(flags.length).toBeGreaterThan(0);
    expect(flags[0]).toMatch(/CHECKPOINT/);
  });

  it('S-31: strips the "Step 4 of 5" pipeline-position breadcrumb (heading, bold, and plain)', () => {
    const input = [
      '# Recommended Action Sequence',
      '## Step 4 of 5',
      '**Step 4 of 5**',
      'Step 4 of 5',
      'The roadmap sequences seven opportunities.',
      '',
      '*End of AI Value Blueprint.*',
    ].join('\n');
    const out = stripForDeliveryStage5(input);
    expect(out).not.toMatch(/Step 4 of 5/);
    expect(out).toContain('The roadmap sequences seven opportunities.');
    expect(detectResidualScaffold(out)).toEqual([]);
  });

  it('S-31: detector flags a "Step N of M" breadcrumb if one survives', () => {
    const flags = detectResidualScaffold('# Title\n## Step 4 of 5\nbody');
    expect(flags.some(f => /Step N of M|S-31/.test(f))).toBe(true);
  });

  it('S-31: does not strip "Step 4 of 5" inside ordinary prose', () => {
    const input = '# Title\nThey will reach step 4 of 5 in the onboarding flow next quarter.\n*End of AI Value Blueprint.*';
    const out = stripForDeliveryStage5(input);
    expect(out).toContain('step 4 of 5 in the onboarding flow');
  });
});

// ── T-28: whole-pipeline leak coverage (the Era-K Stage-1 relocation) ───────────

describe('T-28 — operator-assembly leak strip + whole-pipeline detection', () => {
  const stage1Leak = [
    '# Compressed Client Dossier',
    'The firm has 258 mandates a year.',
    '',
    '## Operator Assembly Instructions',
    'Note: the generation run did not stop at the Checkpoint 2 boundary as expected.',
    'Re-emit the dossier from the top.',
    '',
    '## Section A — Firmographics',
    'Real content continues here.',
  ].join('\n');

  it('stripOperatorAssembly removes the block but keeps real sections', () => {
    const out = stripOperatorAssembly(stage1Leak);
    expect(out).not.toMatch(/Operator Assembly Instructions/i);
    expect(out).not.toMatch(/did not stop at the Checkpoint 2 boundary/i);
    expect(out).toContain('Section A — Firmographics');
    expect(out).toContain('Real content continues here.');
  });

  it('stripForDelivery now removes the operator-assembly block (every stage)', () => {
    expect(stripForDelivery(stage1Leak)).not.toMatch(/Operator Assembly Instructions/i);
  });

  it('detector flags the operator-assembly form and the checkpoint-boundary narration', () => {
    // The raw Stage-1 leak (pre-strip) is what the detector guards against per stage.
    const flags = detectResidualScaffold(stage1Leak, 'Stage 1 (Intake)');
    expect(flags.length).toBeGreaterThan(0);
    expect(flags.every(f => f.startsWith('BLOCKER:'))).toBe(true);
    expect(flags.some(f => /Stage 1 \(Intake\)/.test(f))).toBe(true);
    expect(flags.some(f => /operator-assembly|CHECKPOINT/i.test(f))).toBe(true);
  });

  it('uses the default Stage 5 label when none is given', () => {
    expect(detectResidualScaffold('CHECKPOINT 2 leaked')[0]).toMatch(/Stage 5/);
  });
});

// ── S-35 / S-36: capacity self-check + internal-identifier bleed (Era L) ────────

describe('Era-L leak forms — capacity self-check (S-35) and internal identifiers (S-36/WL-14)', () => {
  it('detects a GATE-4 capacity self-check variant (S-35)', () => {
    expect(detectResidualScaffold('## GATE-4 capacity self-check\n- [ ] ≤3 per phase').length).toBeGreaterThan(0);
    expect(detectResidualScaffold('Capacity self-check: 3 items in Now.').length).toBeGreaterThan(0);
  });

  it('stripGate4SelfCheck removes the capacity-self-check block but keeps real content', () => {
    const input = '## GATE-4 capacity self-check\n- [ ] all assigned\n\n## Phase 1: Now\nReal content.';
    const out = stripGate4SelfCheck(input);
    expect(out).not.toMatch(/capacity self-check/i);
    expect(out).toContain('Phase 1: Now');
    expect(out).toContain('Real content.');
  });

  it('detects an internal engineering identifier (S-36): "Per the T-27 rule…"', () => {
    const flags = detectResidualScaffold('Per the T-27 rule, this Big Bet is placed in Later.', 'Stage 4 (Roadmap)');
    expect(flags.some(f => /internal engineering identifier/.test(f))).toBe(true);
    expect(flags.every(f => f.startsWith('BLOCKER:'))).toBe(true);
  });

  it('does NOT flag the hypothesis ID form H-RT-04 as an internal identifier (boundary safety)', () => {
    const flags = detectResidualScaffold('Opportunity H-RT-04 is sequenced into Later.');
    expect(flags.some(f => /internal engineering identifier/.test(f))).toBe(false);
  });
});
