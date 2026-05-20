import { ConfidenceResult } from '../types/pipeline';

export function calculateConfidence(stepOutput: string): ConfidenceResult {
  const documentBacked = (stepOutput.match(/\[Document-Backed\]/g) || []).length;
  const formStated    = (stepOutput.match(/\[Form-Stated\]/g)    || []).length;
  const inferred      = (stepOutput.match(/\[Inferred\]/g)        || []).length;
  const assumption    = (stepOutput.match(/\[Assumption\]/g)      || []).length;

  const high  = documentBacked + formStated;
  const low   = inferred + assumption;
  const total = high + low;
  const score = total === 0 ? 50 : Math.round((high / total) * 100);

  return {
    score,
    highConfidenceCount: high,
    lowConfidenceCount: low,
    needsReview: score < 76,  // Amber threshold per EmpaTech quality gate spec
    breakdown: { documentBacked, formStated, inferred, assumption, total },
  };
}
