import {
  calculateConfidence,
  stripJustification,
  stripConfidenceTags,
  stripForDelivery,
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

  it('other step keys always use body-tag counting, not entry count', () => {
    // For stepC: body has 3 [Inferred] but justification block has only 1 entry.
    // All 3 body tags must be counted (positive-counting is stepB-only).
    const input = [
      'Revenue [Document-Backed] is strong.',
      'Risk A [Inferred] noted.',
      'Risk B [Inferred] noted.',
      'Risk C [Inferred] noted.',
      '',
      '## [JUSTIFICATION]',
      '### Confidence Overview',
      'Three risks.',
      '#### 1. [Inferred] First risk',
      '- **Claim**: "Risk A."',
      '- **Why inferred**: Indirect evidence.',
      '[END JUSTIFICATION]',
    ].join('\n');
    const result = calculateConfidence(input, 'stepC');
    expect(result.breakdown.inferred).toBe(3);     // body count, not entry count (1)
  });
});
