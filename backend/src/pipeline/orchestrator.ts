import { PipelineJob, ConfidenceResult } from '../types/pipeline';
import {
  loadJob,
  updateJobStatus,
  saveStepOutput,
  appendErrorLog,
  updateConfidenceScores,
  updateReviewerFlags,
  saveDocxData,
  savePdfData,
  saveTxtData,
  jobExists,
} from '../storage/jobStore';
import { runStepA } from './stepA-parser';
import { runStepB } from './stepB-intake';
import { runStepC } from './stepC-maturity';
import { runStepD } from './stepD-opportunities';
import { runStepD2 } from './stepD2-roadmap';
import { runStepE } from './stepE-assembly';
import { generateBlueprintDocx, generateBlueprintPdf, generateBlueprintTxt } from '../docx/assembler';
import { calculateConfidence, stripJustification, stripForDelivery } from '../utils/confidenceScorer';
import { log } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const JOBS_DIR = process.env.JOBS_DIR ||
  (process.env.NODE_ENV === 'production' ? '/app/data/jobs' : path.join(__dirname, '../../jobs'));

class CancelledError extends Error {
  constructor(jobId: string) { super(`Job ${jobId} was cancelled`); this.name = 'CancelledError'; }
}

function assertNotCancelled(jobId: string): void {
  if (!jobExists(jobId)) throw new CancelledError(jobId);
}

// ─── Quality gate helpers ──────────────────────────────────────────────────────

type ScoreBand = 'green' | 'amber' | 'blue' | 'red';

function scoreBand(score: number): ScoreBand {
  if (score >= 90) return 'green';
  if (score >= 76) return 'amber';
  if (score >= 60) return 'blue';
  return 'red';
}

function buildCorrectiveNote(result: ConfidenceResult, stepLabel: string): string {
  const band = scoreBand(result.score).toUpperCase();
  return (
    `\n\n---\n[AUTOMATED QUALITY GATE FEEDBACK — RETRY REQUEST]\n` +
    `Your previous output for ${stepLabel} scored ${result.score}% (${band} band).\n` +
    (result.scoreContext ? `Diagnosis: ${result.scoreContext}\n` : '') +
    `Please regenerate the complete output. Priority actions:\n` +
    `- Replace [Inferred] and [Assumption] tags with [Document-Backed] or [Form-Stated] ` +
    `citations wherever the underlying evidence exists in the provided materials\n` +
    `- Ensure all required sections are complete and meet minimum depth requirements\n` +
    `- Where evidence is genuinely absent, keep [Assumption] or [Inferred] but ensure ` +
    `every such tag has a corresponding [JUSTIFICATION] appendix entry\n` +
    `[END FEEDBACK]`
  );
}

// Runs a pipeline step, enforces the quality gate, and retries once if Red or Blue.
//
// Decision logic (mirrors quality-gate-algorithm.md):
//   Green (≥90%)  → proceed, no flag
//   Amber (76–89%) → proceed, add reviewer flag
//   Blue  (60–75%) → retry once with corrective note; if retry ≥60% proceed with flag; if retry Red → fail
//   Red   (<60%)   → retry once with corrective note; if retry ≥60% proceed with flag; if retry Red → fail
async function runStepWithGate(
  stepLabel: string,
  scoreKey: string,
  runner: (corrective?: string) => Promise<string>,
  confidenceScores: Record<string, ConfidenceResult>,
  reviewerFlags: string[],
): Promise<string> {
  let output = await runner();
  let score = calculateConfidence(output);
  const initialBand = scoreBand(score.score);
  let initialScore = score.score;
  let retried = false;

  if (initialBand === 'red' || initialBand === 'blue') {
    retried = true;
    const corrective = buildCorrectiveNote(score, stepLabel);
    log('warn', `Quality gate ${initialBand.toUpperCase()} for ${stepLabel}: ${score.score}% — running automated retry`);

    const retriedOutput = await runner(corrective);
    const retriedScore = calculateConfidence(retriedOutput);

    if (scoreBand(retriedScore.score) === 'red') {
      throw new Error(
        `Quality gate FAIL: ${stepLabel} scored ${retriedScore.score}% (Red) after automated retry. ` +
        `Pipeline halted for manual review. Initial score: ${initialScore}%.`,
      );
    }

    output = retriedOutput;
    score = retriedScore;
    log('info', `${stepLabel} retry improved score: ${initialScore}% → ${score.score}% (${scoreBand(score.score).toUpperCase()})`);
  }

  confidenceScores[scoreKey] = score;

  if (score.score < 76) {
    const retryNote = retried ? ` (automated retry performed; initial score: ${initialScore}%)` : '';
    reviewerFlags.push(`${stepLabel} confidence: ${score.score}% — below Amber threshold (76%)${retryNote}`);
  } else if (retried) {
    log('info', `${stepLabel} gate resolved to ${scoreBand(score.score).toUpperCase()} after retry — no reviewer flag needed`);
  }

  return output;
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────

export async function runPipeline(jobId: string): Promise<void> {
  const job = loadJob(jobId);
  const reviewerFlags: string[] = [];
  const confidenceScores: PipelineJob['confidenceScores'] = {};

  log('info', `Pipeline started for job ${jobId}`, { client: job.clientName });

  try {
    // Step A — parse documents
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'A');
    const corpus = await runStepA(job.uploadedFiles);
    await saveStepOutput(jobId, 'A', corpus);

    if (corpus.failedDocuments.length > 0) {
      const names = corpus.failedDocuments.map((d) => d.filename).join(', ');
      throw new Error(
        `Document parse failure: ${corpus.failedDocuments.length} file(s) could not be parsed (${names}). ` +
        `Pipeline halted to preserve output quality — fix or remove the failing file(s) and re-run.`,
      );
    }
    if (corpus.missingRequiredCategories.length > 0) {
      reviewerFlags.push(`Missing required document categories: ${corpus.missingRequiredCategories.join(', ')}`);
    }

    // Step B — blueprint-intake (chunked 3-pass invocation)
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'B');
    const dossier = await runStepWithGate(
      'Stage 1 (Intake Analysis)', 'stepB',
      (corrective?) => runStepB(job.formAnswers, corpus, corrective),
      confidenceScores, reviewerFlags,
    );
    await saveStepOutput(jobId, 'B', dossier);
    const dossierClean = stripJustification(dossier);

    // Step C — blueprint-maturity
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'C');
    const maturity = await runStepWithGate(
      'Stage 2 (Maturity Scoring)', 'stepC',
      (corrective?) => runStepC(dossierClean, corrective),
      confidenceScores, reviewerFlags,
    );
    await saveStepOutput(jobId, 'C', maturity);
    const maturityClean = stripJustification(maturity);

    // Step D — blueprint-opportunities
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'D');
    const opportunities = await runStepWithGate(
      'Stage 3 (Opportunity Mapping)', 'stepD',
      (corrective?) => runStepD(dossierClean, maturityClean, corrective),
      confidenceScores, reviewerFlags,
    );
    await saveStepOutput(jobId, 'D', opportunities);
    const opportunitiesClean = stripJustification(opportunities);

    // Step D2 — blueprint-roadmap
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'D2');
    const roadmap = await runStepWithGate(
      'Stage 4 (Action Roadmap)', 'stepD2',
      (corrective?) => runStepD2(opportunitiesClean, maturityClean, corrective),
      confidenceScores, reviewerFlags,
    );
    await saveStepOutput(jobId, 'D2', roadmap);
    const roadmapClean = stripJustification(roadmap);

    // Step E — blueprint-assembly
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'E');
    const assembled = await runStepWithGate(
      'Stage 5 (Document Assembly)', 'stepE',
      (corrective?) => runStepE(dossierClean, maturityClean, opportunitiesClean, roadmapClean, corrective, jobId),
      confidenceScores, reviewerFlags,
    );
    await saveStepOutput(jobId, 'E', assembled);

    // Strip confidence tags and justification block before generating client documents.
    const assembledForDelivery = stripForDelivery(assembled);

    // Generate DOCX
    fs.mkdirSync(JOBS_DIR, { recursive: true });
    const docxFilename = `AI Value Blueprint - ${sanitizeName(job.clientName)}.docx`;
    const docxPath = path.join(JOBS_DIR, jobId, docxFilename);
    fs.mkdirSync(path.dirname(docxPath), { recursive: true });
    const docxBuffer = await generateBlueprintDocx(job.clientName, assembledForDelivery, docxPath);

    await saveDocxData(jobId, docxBuffer.toString('base64'));

    const pdfBuffer = await generateBlueprintPdf(job.clientName, assembledForDelivery);
    await savePdfData(jobId, pdfBuffer.toString('base64'));

    const txtContent = generateBlueprintTxt(job.clientName, assembledForDelivery);
    await saveTxtData(jobId, txtContent);

    await updateConfidenceScores(jobId, confidenceScores);
    await updateReviewerFlags(jobId, reviewerFlags);
    await updateJobStatus(jobId, 'review_ready', 'complete', { outputDocxPath: docxPath, confidenceScores });

    log('info', `Pipeline complete for job ${jobId}`, { docxPath, flags: reviewerFlags.length });
  } catch (error: unknown) {
    if (error instanceof CancelledError) {
      log('info', `Pipeline cancelled for job ${jobId}`);
      return;
    }
    const msg = error instanceof Error ? error.message : String(error);
    log('error', `Pipeline failed for job ${jobId}: ${msg}`);
    try {
      await appendErrorLog(jobId, msg);
      const current = loadJob(jobId);
      await updateJobStatus(jobId, 'failed', current.currentStep);
    } catch {
      // job was deleted while pipeline was running
    }
    throw error;
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().substring(0, 60);
}
