import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { log } from './logger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SKILLS_DIR = path.join(__dirname, '../skills');

export async function invokeSkill(
  skillName: string,
  userMessage: string,
  maxTokens: number = 8000
): Promise<string> {
  const skillPath = path.join(SKILLS_DIR, `${skillName}.md`);
  const methodologyPath = path.join(SKILLS_DIR, 'methodology-and-contracts.md');

  if (!fs.existsSync(skillPath)) {
    throw new Error(`Skill file not found: ${skillPath}`);
  }
  if (!fs.existsSync(methodologyPath)) {
    throw new Error(`Methodology file not found: ${methodologyPath}`);
  }

  const skillContent = fs.readFileSync(skillPath, 'utf-8');
  const methodologyContent = fs.readFileSync(methodologyPath, 'utf-8');

  const systemPrompt = `${skillContent}\n\n---\n\n# SHARED METHODOLOGY REFERENCE\n\n${methodologyContent}`;

  log('info', `Invoking skill: ${skillName}`, { maxTokens, userMessageLength: userMessage.length });

  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error(`No text response from Claude for skill: ${skillName}`);
      }

      const result = textContent.text;
      log('info', `Skill ${skillName} complete`, { outputLength: result.length, stopReason: response.stop_reason });

      if (result.length < 200 && attempt < maxAttempts) {
        log('warn', `Suspiciously short output from ${skillName}, retrying with higher token limit`);
        await sleep(5000);
        continue;
      }

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) {
        log('warn', `Skill ${skillName} attempt ${attempt} failed, retrying in 30s: ${msg}`);
        await sleep(30000);
      } else {
        throw err;
      }
    }
  }

  throw new Error(`Skill ${skillName} failed after ${maxAttempts} attempts`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
