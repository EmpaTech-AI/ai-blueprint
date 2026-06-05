import { invokeSkill } from '../utils/claudeClient';
import { log } from '../utils/logger';
import { saveTruncationMeta } from '../storage/jobStore';

// Combined input above this character count risks exceeding context limits at Step E.
// When triggered, the opportunities output (longest section) is trimmed to fit.
// Approx 80k chars ≈ 20k tokens of input context.
const MAX_STEP_E_INPUT_CHARS = parseInt(process.env.MAX_STEP_E_INPUT_CHARS || '80000', 10);

export async function runStepE(
  dossier: string,
  maturity: string,
  opportunities: string,
  roadmap: string,
  correctiveNote?: string,
  jobId?: string,
): Promise<string> {
  log('info', 'Step E: Running blueprint-assembly skill');

  // ── Input size guard ────────────────────────────────────────────────────────
  // Truncates the opportunities section (longest) when the combined input is too
  // large. Saves the truncation metadata so the admin panel can show a comparison.
  let opportunitiesForAssembly = opportunities;
  const rawLength = dossier.length + maturity.length + opportunities.length + roadmap.length;

  if (rawLength > MAX_STEP_E_INPUT_CHARS) {
    const excess = rawLength - MAX_STEP_E_INPUT_CHARS;
    const truncatedLength = Math.max(0, opportunities.length - excess - 500); // 500-char safety margin
    opportunitiesForAssembly =
      opportunities.substring(0, truncatedLength) +
      '\n\n[TRUNCATED — full version available for comparison in the admin panel]';

    log('warn',
      `Step E input exceeded limit (${rawLength} chars > ${MAX_STEP_E_INPUT_CHARS}). ` +
      `Truncated opportunities: ${opportunities.length} → ${truncatedLength} chars.`,
    );

    if (jobId) {
      saveTruncationMeta(jobId, {
        field: 'opportunities',
        originalLength: opportunities.length,
        truncatedLength,
        truncatedText: opportunitiesForAssembly,
      });
    }
  }
  // ── End size guard ──────────────────────────────────────────────────────────

  let userMessage =
    `# COMPRESSED CLIENT DOSSIER (Step 1 Output)\n\n${dossier}\n\n---\n\n` +
    `# AI READINESS SNAPSHOT (Step 2 Output)\n\n${maturity}\n\n---\n\n` +
    `# SCORED OPPORTUNITY MAP (Step 3 Output)\n\n${opportunitiesForAssembly}\n\n---\n\n` +
    `# RECOMMENDED ACTION SEQUENCE (Step 4 Output)\n\n${roadmap}`;
  if (correctiveNote) userMessage += correctiveNote;
  const result = await invokeSkill('blueprint-assembly', userMessage, 12000);
  log('info', 'Step E: blueprint-assembly complete', { wordCount: result.split(/\s+/).length });
  return result;
}
