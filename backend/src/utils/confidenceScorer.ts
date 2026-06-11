import { ConfidenceResult, JustificationEntry } from '../types/pipeline';

// ─── Stage-keyed composition thresholds (mirrors frontend COMPOSITION_THRESHOLDS) ──
// Both must remain in sync until Step-5 calibration can unify them into a shared config.
const BACKEND_COMPOSITION_THRESHOLDS: Record<string, { green: number; amber: number }> = {
  stepB:  { green: 70, amber: 45 },
  stepC:  { green: 75, amber: 50 },
  stepD:  { green: 75, amber: 50 },
  stepD2: { green: 75, amber: 50 },
  stepE:  { green: 80, amber: 50 },
};

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

// Strips both justification block and inline confidence tags — use before generating client documents.
export function stripForDelivery(text: string): string {
  return stripConfidenceTags(stripJustification(text));
}

// ─── Justification block parser ───────────────────────────────────────────────

function parseJustificationBlock(text: string): { overview: string; entries: JustificationEntry[] } {
  const blockMatch = text.match(/## \[JUSTIFICATION\]([\s\S]*?)\[END JUSTIFICATION\]/i);
  if (!blockMatch) return { overview: '', entries: [] };

  const block = blockMatch[1];

  const overview = block.match(/### Confidence Overview\s*([\s\S]*?)(?=###|$)/i)?.[1]?.trim() ?? '';

  const entries: JustificationEntry[] = [];
  // Match each numbered entry: #### N. [Tag] Label
  // Accepts [Inferred], [Assumption], [Assumed] in any case
  const entryRegex = /#### (\d+)\.\s*\[(Inferred|Assumption|Assumed)\]\s*(.+?)\n([\s\S]*?)(?=#### \d+\.|### |\[END JUSTIFICATION\]|$)/gi;
  let m: RegExpExecArray | null;

  while ((m = entryRegex.exec(block)) !== null) {
    const body = m[4];
    const rawTag = m[2];

    const claim             = extractField(body, ['Claim']);
    const whyTagged         = extractField(body, ['Why inferred', 'Why assumed', 'Why infer', 'Why assum']);
    const missingData       = extractField(body, ['Missing data']);
    const consultantAction  = extractField(body, ['Consultant action']);

    if (claim || whyTagged) {
      entries.push({
        index: parseInt(m[1], 10),
        // Normalise [Assumed] → 'Assumption' so the frontend type is satisfied
        tag: rawTag.toLowerCase() === 'inferred' ? 'Inferred' : 'Assumption',
        label: m[3].trim(),
        claim,
        whyTagged,
        missingData,
        consultantAction,
      });
    }
  }

  return { overview, entries };
}

function extractField(body: string, keys: string[]): string {
  for (const key of keys) {
    const pattern = new RegExp(`\\*\\*${key}[^*]*\\*\\*:?\\s*"?([\\s\\S]*?)"?(?=\\n-\\s*\\*\\*|\\n####|$)`, 'i');
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

  const documentBacked = (contentOnly.match(TAG_PATTERNS.documentBacked) || []).length;
  const formStated     = (contentOnly.match(TAG_PATTERNS.formStated)     || []).length;
  const inferred       = (contentOnly.match(TAG_PATTERNS.inferred)       || []).length;
  const assumption     = (contentOnly.match(TAG_PATTERNS.assumption)     || []).length;

  const high  = documentBacked + formStated;
  const low   = inferred + assumption;
  const total = high + low;
  // Zero tags means the skill prompt was not followed at all — treat as Red (0),
  // not a neutral 50. The noTagsReason field explains this to the consultant.
  const score = total === 0 ? 0 : Math.round((high / total) * 100);

  // Try to parse the structured justification block first
  const { overview, entries } = parseJustificationBlock(stepOutput);

  // Fall back to raw snippet extraction if no structured block was produced
  const hasStructured = entries.length > 0 || overview.length > 0;
  const inferredSnippets   = !hasStructured && inferred   > 0 ? extractTaggedSnippets(stepOutput, TAG_PATTERNS.inferred)   : undefined;
  const assumptionSnippets = !hasStructured && assumption > 0 ? extractTaggedSnippets(stepOutput, TAG_PATTERNS.assumption) : undefined;

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
  const compositionDescriptor   = deriveCompositionDescriptor(documentVerifiedPercent, high, total, stepKey);

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

function deriveCompositionDescriptor(documentVerifiedPercent: number, high: number, total: number, stepKey?: string): string {
  if (total === 0) return '';
  if (high === 0)  return 'No high-confidence claims — all tags are low-confidence';

  const t = BACKEND_COMPOSITION_THRESHOLDS[stepKey ?? 'stepE'] ?? BACKEND_COMPOSITION_THRESHOLDS.stepE;

  if (documentVerifiedPercent >= t.green) {
    // Stage 1 green means "within expected range for intake", not an absolute "strongly documentary" verdict.
    if (stepKey === 'stepB') return 'Documentary share within expected range for intake — suitable for pipeline use';
    return 'Strongly documentary — suitable for client delivery';
  }
  if (documentVerifiedPercent >= t.amber) {
    if (stepKey === 'stepB') return 'Form-stated proportion elevated for intake — review client-stated claims before proceeding';
    return 'Mixed grounding — review form-stated items before delivery';
  }
  if (stepKey === 'stepB') return 'Predominantly form-stated — verify all client assertions before high-stakes use';
  return 'Predominantly form-stated — verify before high-stakes use';
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
