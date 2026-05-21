import { ConfidenceResult, JustificationEntry } from '../types/pipeline';

// ─── Justification block parser ───────────────────────────────────────────────

export function stripJustification(text: string): string {
  return text.replace(/\n*## \[JUSTIFICATION\][\s\S]*?\[END JUSTIFICATION\]\n*/g, '').trim();
}

function parseJustificationBlock(text: string): { overview: string; entries: JustificationEntry[] } {
  const blockMatch = text.match(/## \[JUSTIFICATION\]([\s\S]*?)\[END JUSTIFICATION\]/);
  if (!blockMatch) return { overview: '', entries: [] };

  const block = blockMatch[1];

  const overview = block.match(/### Confidence Overview\s*([\s\S]*?)(?=###|$)/)?.[1]?.trim() ?? '';

  const entries: JustificationEntry[] = [];
  // Match each numbered entry: #### N. [Tag] Label
  const entryRegex = /#### (\d+)\.\s*\[(Inferred|Assumption)\]\s*(.+?)\n([\s\S]*?)(?=#### \d+\.|### |\[END JUSTIFICATION\]|$)/g;
  let m: RegExpExecArray | null;

  while ((m = entryRegex.exec(block)) !== null) {
    const body = m[4];

    const claim          = extractField(body, ['Claim']);
    const whyTagged      = extractField(body, ['Why inferred', 'Why assumed', 'Why infer', 'Why assum']);
    const missingData    = extractField(body, ['Missing data']);
    const consultantAction = extractField(body, ['Consultant action']);

    if (claim || whyTagged) {
      entries.push({
        index: parseInt(m[1], 10),
        tag: m[2] as 'Inferred' | 'Assumption',
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
  const snippets: string[] = [];
  for (const line of clean.split('\n')) {
    if (!line.includes(tag)) continue;
    const cleaned = line
      .replace(/^[#\-•*>\s]+/, '')
      .replace(/\[Document-Backed\]/g, '')
      .replace(/\[Form-Stated\]/g, '')
      .replace(/\[Inferred\]/g, '')
      .replace(/\[Assumption\]/g, '')
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

  const documentBacked = (contentOnly.match(/\[Document-Backed\]/g) || []).length;
  const formStated     = (contentOnly.match(/\[Form-Stated\]/g)     || []).length;
  const inferred       = (contentOnly.match(/\[Inferred\]/g)        || []).length;
  const assumption     = (contentOnly.match(/\[Assumption\]/g)      || []).length;

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
  };
}
