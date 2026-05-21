import { ConfidenceResult, JustificationEntry } from '../types/pipeline';

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
  return text.replace(/\n*## \[JUSTIFICATION\][\s\S]*?\[END JUSTIFICATION\]\n*/g, '').trim();
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

function extractTaggedSnippets(text: string, tag: string): string[] {
  const clean = stripJustification(text);
  // Strip trailing ] so we match both bare and extended forms; lower-case for case-insensitive search
  const tagPrefixLower = tag.replace(']', '').toLowerCase();
  const snippets: string[] = [];
  for (const line of clean.split('\n')) {
    if (!line.toLowerCase().includes(tagPrefixLower)) continue;
    const cleaned = stripConfidenceTags(line)
      .replace(/^[#\-•*>\s]+/, '')
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .trim();
    if (cleaned.length > 5) snippets.push(cleaned);
  }
  return snippets;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateConfidence(stepOutput: string): ConfidenceResult {
  // Count tags on the content portion only (ignore the justification block itself)
  const contentOnly = stripJustification(stepOutput);

  const documentBacked = (contentOnly.match(TAG_PATTERNS.documentBacked) || []).length;
  const formStated     = (contentOnly.match(TAG_PATTERNS.formStated)     || []).length;
  const inferred       = (contentOnly.match(TAG_PATTERNS.inferred)       || []).length;
  const assumption     = (contentOnly.match(TAG_PATTERNS.assumption)     || []).length;

  const high  = documentBacked + formStated;
  const low   = inferred + assumption;
  const total = high + low;
  const score = total === 0 ? 50 : Math.round((high / total) * 100);

  // Try to parse the structured justification block first
  const { overview, entries } = parseJustificationBlock(stepOutput);

  // Fall back to raw snippet extraction if no structured block was produced
  const hasStructured = entries.length > 0 || overview.length > 0;
  const inferredSnippets   = !hasStructured && inferred   > 0 ? extractTaggedSnippets(stepOutput, '[Inferred]')   : undefined;
  const assumptionSnippets = !hasStructured && assumption > 0 ? extractTaggedSnippets(stepOutput, '[Assumption]') : undefined;

  let noTagsReason: string | undefined;
  if (total === 0) {
    const words = contentOnly.trim().split(/\s+/).length;
    noTagsReason = words < 50
      ? 'Output is too short — the AI may not have generated content for this step.'
      : 'No citation tags found in AI output. The skill prompt for this step may not be applying confidence tags correctly.';
  }

  const scoreContext = deriveScoreContext({ score, total, high, low, documentBacked, formStated, inferred, assumption });

  return {
    score,
    highConfidenceCount: high,
    lowConfidenceCount: low,
    needsReview: score < 76,
    breakdown: { documentBacked, formStated, inferred, assumption, total },
    confidenceOverview:   overview || undefined,
    justificationEntries: entries.length > 0 ? entries : undefined,
    // legacy fallback fields — present only when no structured block was found
    ...(inferredSnippets   ? { inferredSnippets }   : {}),
    ...(assumptionSnippets ? { assumptionSnippets } : {}),
    noTagsReason,
    scoreContext,
  };
}

function deriveScoreContext(p: {
  score: number; total: number; high: number; low: number;
  documentBacked: number; formStated: number; inferred: number; assumption: number;
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
    return `Score driven down by ${p.assumption} Assumption tag${p.assumption > 1 ? 's' : ''} — claims with no client evidence at all, based on general knowledge or industry norms. `
      + `Review the low-confidence items below; each has a consultant action that could replace the assumption with a confirmed fact.`;
  }

  if (p.inferred > 0 && p.assumption === 0) {
    return `Score driven down by ${p.inferred} Inferred tag${p.inferred > 1 ? 's' : ''} — conclusions drawn from partial evidence rather than explicit statements. `
      + `Inferences are more defensible than assumptions but should be validated. Each has a missing-data note below.`;
  }

  if (p.inferred > 0 && p.assumption > 0) {
    return `Score driven down by ${p.inferred} Inferred and ${p.assumption} Assumption item${p.low > 1 ? 's' : ''}. `
      + `Assumptions (no evidence) are the higher priority to address — see consultant actions below.`;
  }

  if (p.score === 100) {
    return `All ${p.total} tags are document-backed or form-stated. Every claim in this output is directly traceable to uploaded documents or form responses.`;
  }

  return undefined;
}
