import { invokeSkill } from '../utils/claudeClient';
import { log } from '../utils/logger';

export async function runStepC(dossier: string, correctiveNote?: string): Promise<string> {
  log('info', 'Step C: Running blueprint-maturity skill');
  let userMessage = `# COMPRESSED CLIENT DOSSIER (from Step B)\n\n${dossier}`;
  if (correctiveNote) userMessage += correctiveNote;
  const result = await invokeSkill('blueprint-maturity', userMessage, 6000);
  log('info', 'Step C: blueprint-maturity complete', { wordCount: result.split(/\s+/).length });
  return result;
}
