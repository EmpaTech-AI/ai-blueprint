import { ConfidenceResult, JustificationEntry } from '../types/pipeline';

// ─── Stage-keyed composition thresholds (mirrors frontend COMPOSITION_THRESHOLDS) ──
// Both must remain in sync until Step-5 calibration can unify them into a shared config.
// P0: exported so download.ts and freeze-guard tests share a single source of truth.
export const BACKEND_COMPOSITION_THRESHOLDS: Record<string, { green: number; amber: number }> = {
  stepB:  { green: 70, amber: 45 },
  stepC:  { green: 75, amber: 50 },
  stepD:  { green: 75, amber: 50 },
  stepD2: { green: 75, amber: 50 },
  stepE:  { green: 80, amber: 50 },
};

// P0: exported so download.ts badge logic and freeze-guard tests share this constant.
// Do NOT recalibrate this threshold — see Dev_Team_Action_Note_v16 §P0.
export const GROUNDING_GREEN = 88;

// ─── Tag patterns ─────────────────────────────────────────────────────────────
// Each pattern handles:
//   • Bare form:     [Document-Backed]
//   • Space variant: [Document Backed]
//   • Extended form: [Document-Backed — source info here]
//   • Any case:      [document-backed], [INFERRED], etc.
//   • [Assumed] is accepted as a synonym for [Assumption]

const TAG_PATTERNS = {
  documentBacked: /\[Document[- ]?Backed[^\]]*\]/gi,
  formStated:     /\[Form[- ]?Stated[^\]]*\]/gi,
  inferred:       /\[Inferred[^\]]*\]/gi,
  assumption:     /\[(Assumption|Assumed)[^\]]*\]/gi,
} as const;

// ─── Public strip helpers ─────────────────────────────────────────────────────

export function stripJustification(text: string): string {
  // Case-insensitive: catches [JUSTIFICATION], [justification], [Justification] variants
  return text.replace(/\n*## \[JUSTIFICATION\][\s\S]*?\[END JUSTIFICATION\]\n*/gi, '').trim();
}

export function stripConfidenceTags(text: string): string {
  return text.replace(
    /\s*\[(Document[- ]?Backed|Form[- ]?Stated|Inferred|Assumption|Assumed)[^\]]*\]/gi,
    '',
  );
}

export function stripBuildStamp(text: string): string {
  return text.replace(/^<!-- pipeline-build:.*?-->\n/m, '');
}

// Strips build stamp, justification block, and inline confidence tags — use before generating client documents.
export function stripForDelivery(text: string): string {
  return stripConfidenceTags(stripJustification(stripBuildStamp(text)));
}

// ─── Justification block parser ───────────────────────────────────────────────

function parseJustificationBlock(text: string): { overview: string; entries: JustificationEntry[] } {
  // Primary: canonical terminator. Fallback: match to end of text — v24+ intake outputs
  // omit [END JUSTIFICATION] and close with the "End of Compressed Client Dossier" footer.
  const blockMatch =
    text.match(/## \[JUSTIFICATION\]([\s\S]*?)\[END JUSTIFICATION\]/i) ??
    text.match(/## \[JUSTIFICATION\]([\s\S]*?)$/i);
  if (!blockMatch) return { overview: '', entries: [] };

  const block = blockMatch[1];

  const overview = block.match(/### Confidence Overview\s*([\s\S]*?)(?=###|$)/i)?.[1]?.trim() ?? '';

  const entries: JustificationEntry[] = [];

  // Canonical format: #### N. [Inferred|Assumption|Assumed] Label
  // Accepts [Inferred], [Assumption], [Assumed] in any case
  const canonicalEntryRegex = /#### (\d+)\.\s*\[(Inferred|Assumption|Assumed)\]\s*(.+?)\n([\s\S]*?)(?=#### \d+\.|### |\[END JUSTIFICATION\]|$)/gi;

  // Floor format (v24+ intake): #### N. Label [floor]
  // Tag is derived from the body field: "Why assumed" → Assumption, otherwise → Inferred.
  const floorEntryRegex = /#### (\d+)\.\s*(.+?)\s*\[floor\]\s*\n([\s\S]*?)(?=#### \d+\.|### |\[END JUSTIFICATION\]|\*End of|$)/gi;

  let m: RegExpExecArray | null;

  while ((m = canonicalEntryRegex.exec(block)) !== null) {
    const body   = m[4];
    const rawTag = m[2];
    // Push every entry whose #### N. [Tag] header matched — the header is the authoritative
    // signal that a genuine LC item was enumerated. Do NOT gate on claim/whyTagged: if the
    // LLM uses non-canonical field names the extractField calls return '', both are falsy,
    // and the entry would be silently dropped — leaving entries.length = 0 and falling
    // through to body counting every run. (Root cause of P3a not firing in v17/v18/v18.1.)
    entries.push({
      index: parseInt(m[1], 10),
      // Normalise [Assumed] → 'Assumption' so the frontend type is satisfied
      tag:   rawTag.toLowerCase() === 'inferred' ? 'Inferred' : 'Assumption',
      label: m[3].trim(),
      claim:            extractField(body, ['Claim']),
      whyTagged:        extractField(body, ['Why inferred', 'Why assumed', 'Why infer', 'Why assum']),
      missingData:      extractField(body, ['Missing data']),
      consultantAction: extractField(body, ['Consultant action']),
    });
  }

  // If canonical format produced no entries, try the floor format.
  if (entries.length === 0) {
    while ((m = floorEntryRegex.exec(block)) !== null) {
      const body = m[3];
      // Derive tag from the body's field label — "Why assumed" signals Assumption.
      const tag: 'Inferred' | 'Assumption' = /\*\*Why assumed/i.test(body) ? 'Assumption' : 'Inferred';
      entries.push({
        index: parseInt(m[1], 10),
        tag,
        label:            m[2].trim(),
        claim:            extractField(body, ['Claim']),
        whyTagged:        extractField(body, ['Why inferred', 'Why assumed', 'Why infer', 'Why assum']),
        missingData:      extractField(body, ['Missing data']),
        consultantAction: extractField(body, ['Consultant action']),
      });
    }
  }

  return { overview, entries };
}

function extractField(body: string, keys: string[]): string {
  for (const key of keys) {
    // Lookahead accepts both - and • list bullets (v24+ intake uses •).
    const pattern = new RegExp(`\\*\\*${key}[^*]*\\*\\*:?\\s*"?([\\s\\S]*?)"?(?=\\n[•\\-]\\s*\\*\\*|\\n####|$)`, 'i');
    const match = body.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/^"/, '').replace(/"$/, '');
  }
  return '';
}

// ─── Tag snippet extractor (fallback when no structured block present) ────────
//
// Returns ONE snippet per tag OCCURRENCE (not per line). This ensures
// snippets.length === the count produced by TAG_PATTERNS.xxx.match() in
// calculateConfidence, so the breakdown numbers and the expanded list are
// always consistent.
//
// For each regex match we extract the surrounding sentence (bounded by
// newlines, full-stops, or list markers) as human-readable context.

function extractTaggedSnippets(text: string, tagPattern: RegExp): string[] {
  const clean   = stripJustification(text);
  const snippets: string[] = [];

  // Always create a fresh /gi copy so lastIndex resets and we don't mutate the global pattern
  const re = new RegExp(tagPattern.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = re.exec(clean)) !== null) {
    const tagStart = match.index;

    // Walk back to the nearest sentence / list boundary
    let sentenceStart = tagStart;
    while (sentenceStart > 0) {
      const ch = clean[sentenceStart - 1];
      if (/[\n.!?]/.test(ch)) break;
      sentenceStart--;
    }

    // Walk forward to end-of-line
    let lineEnd = clean.indexOf('\n', tagStart + match[0].length);
    if (lineEnd === -1) lineEnd = clean.length;

    const fragment = clean.slice(sentenceStart, lineEnd).trim();

    const cleaned = stripConfidenceTags(fragment)
      .replace(/^[#\-•*>\s|:]+/, '')
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .trim();

    if (cleaned.length > 0) snippets.push(cleaned);
  }

  return snippets;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateConfidence(stepOutput: string, stepKey?: string): ConfidenceResult {
  // Count tags on the content portion only (ignore the justification block itself)
  const contentOnly = stripJustification(stepOutput);

  // High-confidence tags: counted from the body for all steps.
  // No structural spans exist among DB/FS tags, so body counting is reliable here.
  const documentBacked = (contentOnly.match(TAG_PATTERNS.documentBacked) || []).length;
  const formStated     = (contentOnly.match(TAG_PATTERNS.formStated)     || []).length;

  // Parse the justification block early — it is the authoritative LC source for stepB.
  const { overview, entries } = parseJustificationBlock(stepOutput);
  const hasStructured = entries.length > 0 || overview.length > 0;

  let inferred: number;
  let assumption: number;

  if (stepKey === 'stepB' && entries.length > 0) {
    // P3: Positive LC counting for stepB.
    //
    // Body-section [Inferred] and [Assumption] tags include structural scaffolding:
    // overview-enumeration items (e.g. "H-RT-02 ([Inferred] — …)"), appendix cross-references
    // ("[Inferred — derivation per appendix item N]"), and text-mention false-positives —
    // all present in sections A–G at positions that vary run-to-run, making any negative
    // (strip-based) approach position-keyed and non-deterministic.
    //
    // The justification block enumerates only genuine LC claims in a stable #### N. [Tag]
    // format. Using entry count is format-keyed and run-stable (measured: 8 across all 4 v16
    // runs). Fall back to body counting below only when no structured block is present.
    inferred  = entries.filter(e => e.tag === 'Inferred').length;
    assumption = entries.filter(e => e.tag === 'Assumption').length;
  } else {
    inferred  = (contentOnly.match(TAG_PATTERNS.inferred)  || []).length;
    assumption = (contentOnly.match(TAG_PATTERNS.assumption) || []).length;
  }

  const high  = documentBacked + formStated;
  const low   = inferred + assumption;
  const total = high + low;
  // Zero tags means the skill prompt was not followed at all — treat as Red (0),
  // not a neutral 50. The noTagsReason field explains this to the consultant.
  const score = total === 0 ? 0 : Math.round((high / total) * 100);

  // Fall back to raw snippet extraction if no structured block was produced
  const inferredSnippets   = !hasStructured && inferred   > 0 ? extractTaggedSnippets(contentOnly, TAG_PATTERNS.inferred)   : undefined;
  const assumptionSnippets = !hasStructured && assumption > 0 ? extractTaggedSnippets(contentOnly, TAG_PATTERNS.assumption) : undefined;

  let noTagsReason: string | undefined;
  if (total === 0) {
    const words = contentOnly.trim().split(/\s+/).length;
    noTagsReason = words < 50
      ? 'Output is too short — the AI may not have generated content for this step.'
      : 'No citation tags found in AI output. The skill prompt for this step may not be applying confidence tags correctly.';
  }

  const scoreContext = deriveScoreContext({ score, total, high, low, documentBacked, formStated, inferred, assumption, hasStructuredBlock: hasStructured });

  // Scenario C — compute split within the high-confidence pool (not against total)
  const documentVerifiedPercent = high > 0 ? Math.round((documentBacked / high) * 100) : 0;
  const formStatedSharePercent  = high > 0 ? Math.round((formStated  / high) * 100) : 0;
  const compositionDescriptor   = deriveCompositionDescriptor(documentVerifiedPercent, high, total, stepKey, score);

  return {
    score,
    highConfidenceCount: high,
    lowConfidenceCount: low,
    needsReview: score < 76,
    breakdown: { documentBacked, formStated, inferred, assumption, total },
    documentVerifiedPercent,
    formStatedSharePercent,
    compositionDescriptor,
    confidenceOverview:   overview || undefined,
    justificationEntries: entries.length > 0 ? entries : undefined,
    // legacy fallback fields — present only when no structured block was found
    ...(inferredSnippets   ? { inferredSnippets }   : {}),
    ...(assumptionSnippets ? { assumptionSnippets } : {}),
    noTagsReason,
    scoreContext,
  };
}

function deriveCompositionDescriptor(documentVerifiedPercent: number, high: number, total: number, stepKey?: string, blendedScore?: number): string {
  if (total === 0) return '';
  if (high === 0)  return 'No high-confidence claims — all tags are low-confidence';

  const t = BACKEND_COMPOSITION_THRESHOLDS[stepKey ?? 'stepE'] ?? BACKEND_COMPOSITION_THRESHOLDS.stepE;
  const compositionGreen = documentVerifiedPercent >= t.green;
  const compositionAmber = !compositionGreen && documentVerifiedPercent >= t.amber;

  let base: string;
  if (compositionGreen) {
    // Stage 1 green means "within expected range for intake", not an absolute "strongly documentary" verdict.
    if (stepKey === 'stepB') base = 'Documentary share within expected range for intake — suitable for pipeline use';
    else base = 'Strongly documentary — suitable for client delivery';
  } else if (compositionAmber) {
    if (stepKey === 'stepB') base = 'Form-stated proportion elevated for intake — review client-stated claims before proceeding';
    else base = 'Mixed grounding — review form-stated items before delivery';
  } else {
    if (stepKey === 'stepB') base = 'Predominantly form-stated — verify all client assertions before high-stakes use';
    else base = 'Predominantly form-stated — verify before high-stakes use';
  }

  // P3 factor-attribution: when composition quality is green but LC volume degrades the blended score,
  // make clear which factor is responsible so the consultant knows composition itself is not the issue.
  if (compositionGreen && blendedScore !== undefined && blendedScore < GROUNDING_GREEN) {
    base += ` — overall badge degraded by LC volume (blended ${blendedScore}%), not composition quality`;
  }

  return base;
}

function deriveScoreContext(p: {
  score: number; total: number; high: number; low: number;
  documentBacked: number; formStated: number; inferred: number; assumption: number;
  hasStructuredBlock: boolean;
}): string | undefined {
  if (p.total === 0) return undefined; // noTagsReason already handles this case

  if (p.high === 0) {
    const breakdown: string[] = [];
    if (p.inferred > 0)   breakdown.push(`${p.inferred} Inferred`);
    if (p.assumption > 0) breakdown.push(`${p.assumption} Assumption`);
    return `All ${p.total} tags are low-confidence (${breakdown.join(', ')}). Zero document-backed or form-stated citations found. `
      + `This step is reasoning entirely from judgment without anchoring claims to source facts. `
      + `Check that phase placements and sequencing rationales reference specific client facts (e.g. confirmed dates, stated priorities, documents on file).`;
  }

  if (p.assumption > 0 && p.inferred === 0) {
    const tail = p.hasStructuredBlock
      ? `Review the low-confidence items below; each has a consultant action that could replace the assumption with a confirmed fact.`
      : `Review the low-confidence items below and replace each assumption with a confirmed fact from the client's documents or a direct question to the client.`;
    return `Score driven down by ${p.assumption} Assumption tag${p.assumption > 1 ? 's' : ''} — claims with no client evidence at all, based on general knowledge or industry norms. ` + tail;
  }

  if (p.inferred > 0 && p.assumption === 0) {
    const tail = p.hasStructuredBlock
      ? `Inferences are more defensible than assumptions but should be validated. Each has a missing-data note below.`
      : `Inferences are more defensible than assumptions but should be validated against source documents or confirmed with the client.`;
    return `Score driven down by ${p.inferred} Inferred tag${p.inferred > 1 ? 's' : ''} — conclusions drawn from partial evidence rather than explicit statements. ` + tail;
  }

  if (p.inferred > 0 && p.assumption > 0) {
    const tail = p.hasStructuredBlock
      ? `Assumptions (no evidence) are the higher priority to address — see consultant actions below.`
      : `Assumptions (no evidence) are the higher priority to address — validate each against source documents before delivery.`;
    return `Score driven down by ${p.inferred} Inferred and ${p.assumption} Assumption item${p.low > 1 ? 's' : ''}. ` + tail;
  }

  if (p.score === 100) {
    return `All ${p.total} tags are document-backed or form-stated. Every claim in this output is directly traceable to uploaded documents or form responses.`;
  }

  return undefined;
}
