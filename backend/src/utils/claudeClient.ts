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

function loadSkillSystemPrompt(skillName: string): string {
  const flatSkillPath = path.join(SKILLS_DIR, `${skillName}.md`);
  const folderSkillPath = path.join(SKILLS_DIR, skillName);
  const methodologyPath = path.join(SKILLS_DIR, 'methodology-and-contracts.md');

  const hasFlatSkill = fs.existsSync(flatSkillPath);
  const hasFolderSkill = fs.existsSync(path.join(folderSkillPath, 'SKILL.md'));

  if (!hasFlatSkill && !hasFolderSkill) throw new Error(`Skill file not found: ${skillName}`);
  if (!fs.existsSync(methodologyPath)) throw new Error(`Methodology file not found: ${methodologyPath}`);

  const skillContent = hasFolderSkill
    ? loadFolderSkill(folderSkillPath)
    : fs.readFileSync(flatSkillPath, 'utf-8');
  const methodologyContent = fs.readFileSync(methodologyPath, 'utf-8');

  return `${skillContent}\n\n---\n\n# SHARED METHODOLOGY REFERENCE\n\n${methodologyContent}`;
}

export async function invokeSkill(
  skillName: string,
  userMessage: string,
  maxTokens: number = 8000
): Promise<string> {
  const systemPrompt = loadSkillSystemPrompt(skillName);

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

// ─── Chunked invocation (blueprint-intake v2.x protocol) ──────────────────────
//
// The blueprint-intake SKILL.md v2.x uses a 3-chunk generation protocol to work
// around the ~4,100-word mid-Section-D truncation observed in single-pass runs.
// Each chunk ends with a CHECKPOINT block; the next chunk is triggered by sending
// "continue to chunk N" as the next user turn with the full prior context included.

type MessageParam = { role: 'user' | 'assistant'; content: string };

async function invokeChunk(
  systemPrompt: string,
  messages: MessageParam[],
  maxTokens: number,
  skillName: string,
  chunkNum: number,
): Promise<string> {
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
        messages,
      });

      const textContent = response.content.find((b) => b.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error(`No text response from Claude for ${skillName} chunk ${chunkNum}`);
      }

      const result = textContent.text;
      log('info', `${skillName} chunk ${chunkNum} API call complete`, {
        outputLength: result.length,
        stopReason: response.stop_reason,
      });

      if (result.length < 200 && attempt < maxAttempts) {
        log('warn', `Suspiciously short chunk ${chunkNum} from ${skillName}, retrying`);
        await sleep(5000);
        continue;
      }

      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) {
        log('warn', `${skillName} chunk ${chunkNum} attempt ${attempt} failed, retrying in 30s: ${msg}`);
        await sleep(30000);
      } else {
        throw err;
      }
    }
  }

  throw new Error(`${skillName} chunk ${chunkNum} failed after ${maxAttempts} attempts`);
}

function validateCheckpoint(chunk: string, chunkNum: number, skillName: string): void {
  const marker = `## CHECKPOINT ${chunkNum} —`;
  if (!chunk.includes(marker)) {
    throw new Error(
      `${skillName} chunk ${chunkNum} is missing checkpoint marker "${marker}". ` +
      `The model may have truncated mid-generation. Output length: ${chunk.length} chars.`,
    );
  }
}

function validateFinalMarker(chunk: string, skillName: string): void {
  if (!chunk.includes('End of Compressed Client Dossier')) {
    throw new Error(
      `${skillName} chunk 3 is missing the final marker "End of Compressed Client Dossier". ` +
      `The model may have truncated mid-Section H or mid-[JUSTIFICATION].`,
    );
  }
}

// Strips the CHECKPOINT block from the end of a chunk (the --- separator + ## CHECKPOINT N ... to EOF).
function stripCheckpointBlock(chunk: string, chunkNum: number): string {
  return chunk.replace(new RegExp(`\\n---\\n+## CHECKPOINT ${chunkNum}[\\s\\S]*$`), '').trim();
}

export async function invokeSkillChunked(
  skillName: string,
  userMessage: string,
  maxTokensPerChunk: number = 8192,
): Promise<string> {
  const systemPrompt = loadSkillSystemPrompt(skillName);

  log('info', `Invoking skill (chunked 3-pass): ${skillName}`, {
    maxTokensPerChunk,
    userMessageLength: userMessage.length,
  });

  // Chunk 1 — initial invocation produces Header + Document Receipt + Sections A & B + CHECKPOINT 1
  const chunk1 = await invokeChunk(
    systemPrompt,
    [{ role: 'user', content: userMessage }],
    maxTokensPerChunk, skillName, 1,
  );
  validateCheckpoint(chunk1, 1, skillName);
  log('info', `${skillName} chunk 1 validated`, { length: chunk1.length });

  // Chunk 2 — continuation produces Sections C & D + CHECKPOINT 2
  const chunk2 = await invokeChunk(
    systemPrompt,
    [
      { role: 'user',      content: userMessage },
      { role: 'assistant', content: chunk1 },
      { role: 'user',      content: 'continue to chunk 2' },
    ],
    maxTokensPerChunk, skillName, 2,
  );
  validateCheckpoint(chunk2, 2, skillName);
  log('info', `${skillName} chunk 2 validated`, { length: chunk2.length });

  // Chunk 3 — continuation produces Sections E–H + [JUSTIFICATION] + final marker
  const chunk3 = await invokeChunk(
    systemPrompt,
    [
      { role: 'user',      content: userMessage },
      { role: 'assistant', content: chunk1 },
      { role: 'user',      content: 'continue to chunk 2' },
      { role: 'assistant', content: chunk2 },
      { role: 'user',      content: 'continue to chunk 3' },
    ],
    maxTokensPerChunk, skillName, 3,
  );
  validateFinalMarker(chunk3, skillName);
  log('info', `${skillName} chunk 3 validated`, { length: chunk3.length });

  // Strip checkpoint blocks from chunks 1 and 2, then concatenate
  const assembled = [
    stripCheckpointBlock(chunk1, 1),
    stripCheckpointBlock(chunk2, 2),
    chunk3,
  ].join('\n\n');

  log('info', `${skillName} chunked assembly complete`, { totalLength: assembled.length });
  return assembled;
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
