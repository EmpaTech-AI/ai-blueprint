import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { log } from './logger';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SKILLS_DIR = path.join(__dirname, '../skills');

// Subdirectories loaded for folder-based skills (in order), relative to the skill folder.
// Excludes: docs/ (developer notes), harness/ (Python scripts), golden/ (duplicate of examples/).
const FOLDER_SKILL_SUBDIRS = ['references', 'references/algorithms', 'archetypes', 'examples'];

function loadFolderSkill(skillDir: string): string {
  const parts: string[] = [fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf-8')];
  for (const subdir of FOLDER_SKILL_SUBDIRS) {
    const subdirPath = path.join(skillDir, subdir);
    if (!fs.existsSync(subdirPath)) continue;
    const files = fs.readdirSync(subdirPath)
      .filter(f => f.endsWith('.md') && fs.statSync(path.join(subdirPath, f)).isFile())
      .sort();
    for (const file of files) {
      const relativePath = `${subdir}/${file}`;
      const content = fs.readFileSync(path.join(subdirPath, file), 'utf-8');
      parts.push(`\n\n---\n\n## [SKILL RESOURCE: ${relativePath}]\n\n${content}`);
    }
  }
  return parts.join('');
}

export async function invokeSkill(
  skillName: string,
  userMessage: string,
  maxTokens: number = 8000
): Promise<string> {
  const flatSkillPath = path.join(SKILLS_DIR, `${skillName}.md`);
  const folderSkillPath = path.join(SKILLS_DIR, skillName);
  const methodologyPath = path.join(SKILLS_DIR, 'methodology-and-contracts.md');

  const hasFlatSkill = fs.existsSync(flatSkillPath);
  const hasFolderSkill = fs.existsSync(path.join(folderSkillPath, 'SKILL.md'));

  if (!hasFlatSkill && !hasFolderSkill) {
    throw new Error(`Skill file not found: ${skillName}`);
  }
  if (!fs.existsSync(methodologyPath)) {
    throw new Error(`Methodology file not found: ${methodologyPath}`);
  }

  const skillContent = hasFolderSkill
    ? loadFolderSkill(folderSkillPath)
    : fs.readFileSync(flatSkillPath, 'utf-8');
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
        temperature: 0,
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

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1500,
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  const block = response.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text response from Claude');
  return block.text;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
