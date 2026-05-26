import { invokeSkill } from '../utils/claudeClient';
import { log } from '../utils/logger';

export async function runStepE(
  dossier: string,
  maturity: string,
  opportunities: string,
  roadmap: string,
  correctiveNote?: string,
): Promise<string> {
  log('info', 'Step E: Running blueprint-assembly skill');
  let userMessage =
    `# COMPRESSED CLIENT DOSSIER (Step 1 Output)\n\n${dossier}\n\n---\n\n` +
    `# AI READINESS SNAPSHOT (Step 2 Output)\n\n${maturity}\n\n---\n\n` +
    `# SCORED OPPORTUNITY MAP (Step 3 Output)\n\n${opportunities}\n\n---\n\n` +
    `# RECOMMENDED ACTION SEQUENCE (Step 4 Output)\n\n${roadmap}`;
  if (correctiveNote) userMessage += correctiveNote;
  const result = await invokeSkill('blueprint-assembly', userMessage, 12000);
  log('info', 'Step E: blueprint-assembly complete', { wordCount: result.split(/\s+/).length });
  return result;
}
