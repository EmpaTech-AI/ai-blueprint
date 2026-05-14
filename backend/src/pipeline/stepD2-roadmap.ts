import { invokeSkill } from '../utils/claudeClient';
import { log } from '../utils/logger';

export async function runStepD2(opportunities: string, maturity: string): Promise<string> {
  log('info', 'Step D2: Running blueprint-roadmap skill');
  const userMessage = `# SCORED OPPORTUNITY MAP\n\n${opportunities}\n\n---\n\n# AI READINESS SNAPSHOT\n\n${maturity}`;
  const result = await invokeSkill('blueprint-roadmap', userMessage, 6000);
  log('info', 'Step D2: blueprint-roadmap complete', { wordCount: result.split(/\s+/).length });
  return result;
}
