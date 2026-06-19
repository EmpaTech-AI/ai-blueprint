import { invokeSkillChunked } from '../utils/claudeClient';
import { log } from '../utils/logger';

// The blueprint-assembly SKILL.md uses the same 3-chunk protocol as blueprint-intake.
// Chunk 1: Sections 1+2 (Exec Summary + Readiness Snapshot) → CHECKPOINT 1
// Chunk 2: Sections 3+4 (Key Findings + Opportunity Map) → CHECKPOINT 2
// Chunk 3: Sections 5–8 + [JUSTIFICATION] → 'End of AI Value Blueprint'
//
// Using invokeSkill (single-pass) caused every run to halt at CHECKPOINT 1 because the
// model intentionally stops with stop_reason='end_turn' after Chunk 1 — not 'max_tokens' —
// so the one-shot continuation in invokeSkill never fired. Assembly was always Sections 1–2 only.
export async function runStepE(
  dossier: string,
  maturity: string,
  opportunities: string,
  roadmap: string,
  correctiveNote?: string,
): Promise<string> {
  log('info', 'Step E: Running blueprint-assembly skill (chunked 3-pass)');

  let userMessage =
    `# COMPRESSED CLIENT DOSSIER (Step 1 Output)\n\n${dossier}\n\n---\n\n` +
    `# AI READINESS SNAPSHOT (Step 2 Output)\n\n${maturity}\n\n---\n\n` +
    `# SCORED OPPORTUNITY MAP (Step 3 Output)\n\n${opportunities}\n\n---\n\n` +
    `# RECOMMENDED ACTION SEQUENCE (Step 4 Output)\n\n${roadmap}`;
  if (correctiveNote) userMessage += correctiveNote;
  const result = await invokeSkillChunked('blueprint-assembly', userMessage, 8192, 'End of AI Value Blueprint');
  log('info', 'Step E: blueprint-assembly complete', { wordCount: result.split(/\s+/).length });
  return result;
}
