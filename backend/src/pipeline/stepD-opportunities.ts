import { invokeSkill } from '../utils/claudeClient';
import { log } from '../utils/logger';

export async function runStepD(dossier: string, maturity: string): Promise<string> {
  log('info', 'Step D: Running blueprint-opportunities skill');
  const userMessage = `# COMPRESSED CLIENT DOSSIER\n\n${dossier}\n\n---\n\n# AI READINESS SNAPSHOT\n\n${maturity}`;
  const result = await invokeSkill('blueprint-opportunities', userMessage, 8000);
  log('info', 'Step D: blueprint-opportunities complete', { wordCount: result.split(/\s+/).length });
  return result;
}
