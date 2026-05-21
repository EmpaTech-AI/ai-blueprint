import { ConfidenceResult } from '../types/pipeline';

function extractTaggedSnippets(text: string, tag: string): string[] {
  const snippets: string[] = [];
  for (const line of text.split('\n')) {
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

export function calculateConfidence(stepOutput: string): ConfidenceResult {
  const documentBacked = (stepOutput.match(/\[Document-Backed\]/g) || []).length;
  const formStated    = (stepOutput.match(/\[Form-Stated\]/g)    || []).length;
  const inferred      = (stepOutput.match(/\[Inferred\]/g)        || []).length;
  const assumption    = (stepOutput.match(/\[Assumption\]/g)      || []).length;

  const high  = documentBacked + formStated;
  const low   = inferred + assumption;
  const total = high + low;
  const score = total === 0 ? 50 : Math.round((high / total) * 100);

  const inferredSnippets   = inferred   > 0 ? extractTaggedSnippets(stepOutput, '[Inferred]')   : undefined;
  const assumptionSnippets = assumption > 0 ? extractTaggedSnippets(stepOutput, '[Assumption]') : undefined;

  let noTagsReason: string | undefined;
  if (total === 0) {
    const words = stepOutput.trim().split(/\s+/).length;
    noTagsReason = words < 50
      ? 'Output is too short — the AI may not have generated content for this step.'
      : 'No citation tags found in AI output. The skill prompt for this step does not include confidence tagging instructions. Update the skill to emit [Document-Backed], [Form-Stated], [Inferred], and [Assumption] tags on each claim.';
  }

  return {
    score,
    highConfidenceCount: high,
    lowConfidenceCount: low,
    needsReview: score < 76,
    breakdown: { documentBacked, formStated, inferred, assumption, total },
    inferredSnippets,
    assumptionSnippets,
    noTagsReason,
  };
}
