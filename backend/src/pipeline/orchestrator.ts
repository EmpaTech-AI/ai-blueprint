import { PipelineJob } from '../types/pipeline';
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
} from '../storage/jobStore';
import { runStepA } from './stepA-parser';
import { runStepB } from './stepB-intake';
import { runStepC } from './stepC-maturity';
import { runStepD } from './stepD-opportunities';
import { runStepD2 } from './stepD2-roadmap';
import { runStepE } from './stepE-assembly';
import { generateBlueprintDocx, generateBlueprintPdf, generateBlueprintTxt } from '../docx/assembler';
import { calculateConfidence } from '../utils/confidenceScorer';
import { log } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const JOBS_DIR = process.env.JOBS_DIR ||
  (process.env.NODE_ENV === 'production' ? '/app/data/jobs' : path.join(__dirname, '../../jobs'));

export async function runPipeline(jobId: string): Promise<void> {
  const job = loadJob(jobId);
  const reviewerFlags: string[] = [];
  const confidenceScores: PipelineJob['confidenceScores'] = {};

  log('info', `Pipeline started for job ${jobId}`, { client: job.clientName });

  try {
    // Step A — parse documents
    await updateJobStatus(jobId, 'running', 'A');
    const corpus = await runStepA(job.uploadedFiles);
    await saveStepOutput(jobId, 'A', corpus);

    if (corpus.missingRequiredCategories.length > 0) {
      reviewerFlags.push(`Missing required document categories: ${corpus.missingRequiredCategories.join(', ')}`);
    }
    if (corpus.failedDocuments.length > 0) {
      reviewerFlags.push(`${corpus.failedDocuments.length} document(s) failed to parse — check logs`);
    }

    // Step B — blueprint-intake
    await updateJobStatus(jobId, 'running', 'B');
    const dossier = await runStepB(job.formAnswers, corpus);
    await saveStepOutput(jobId, 'B', dossier);
    const bScore = calculateConfidence(dossier);
    confidenceScores.stepB = bScore;
    if (bScore.needsReview) reviewerFlags.push(`Stage 1 (Intake Analysis) confidence: ${bScore.score}% — below Amber threshold (76%)`);

    // Step C — blueprint-maturity
    await updateJobStatus(jobId, 'running', 'C');
    const maturity = await runStepC(dossier);
    await saveStepOutput(jobId, 'C', maturity);
    const cScore = calculateConfidence(maturity);
    confidenceScores.stepC = cScore;
    if (cScore.needsReview) reviewerFlags.push(`Stage 2 (Maturity Scoring) confidence: ${cScore.score}% — below Amber threshold (76%)`);

    // Step D — blueprint-opportunities
    await updateJobStatus(jobId, 'running', 'D');
    const opportunities = await runStepD(dossier, maturity);
    await saveStepOutput(jobId, 'D', opportunities);
    const dScore = calculateConfidence(opportunities);
    confidenceScores.stepD = dScore;
    if (dScore.needsReview) reviewerFlags.push(`Stage 3 (Opportunity Mapping) confidence: ${dScore.score}% — below Amber threshold (76%)`);

    // Step D2 — blueprint-roadmap
    await updateJobStatus(jobId, 'running', 'D2');
    const roadmap = await runStepD2(opportunities, maturity);
    await saveStepOutput(jobId, 'D2', roadmap);
    const d2Score = calculateConfidence(roadmap);
    confidenceScores.stepD2 = d2Score;
    if (d2Score.needsReview) reviewerFlags.push(`Stage 4 (Action Roadmap) confidence: ${d2Score.score}% — below Amber threshold (76%)`);

    // Step E — blueprint-assembly
    await updateJobStatus(jobId, 'running', 'E');
    const assembled = await runStepE(dossier, maturity, opportunities, roadmap);
    await saveStepOutput(jobId, 'E', assembled);
    const eScore = calculateConfidence(assembled);
    confidenceScores.stepE = eScore;
    if (eScore.needsReview) reviewerFlags.push(`Stage 5 (Document Assembly) confidence: ${eScore.score}% — below Amber threshold (76%)`);

    // Generate DOCX
    fs.mkdirSync(JOBS_DIR, { recursive: true });
    const docxFilename = `AI Value Blueprint - ${sanitizeName(job.clientName)}.docx`;
    const docxPath = path.join(JOBS_DIR, jobId, docxFilename);
    fs.mkdirSync(path.dirname(docxPath), { recursive: true });
    const docxBuffer = await generateBlueprintDocx(job.clientName, assembled, docxPath);

    // Persist all download formats in the database so they survive container restarts
    await saveDocxData(jobId, docxBuffer.toString('base64'));

    const pdfBuffer = await generateBlueprintPdf(job.clientName, assembled);
    await savePdfData(jobId, pdfBuffer.toString('base64'));

    const txtContent = generateBlueprintTxt(job.clientName, assembled);
    await saveTxtData(jobId, txtContent);

    await updateConfidenceScores(jobId, confidenceScores);
    await updateReviewerFlags(jobId, reviewerFlags);
    await updateJobStatus(jobId, 'review_ready', 'complete', { outputDocxPath: docxPath, confidenceScores });

    log('info', `Pipeline complete for job ${jobId}`, { docxPath, flags: reviewerFlags.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log('error', `Pipeline failed for job ${jobId}: ${msg}`);
    await appendErrorLog(jobId, msg);
    const current = loadJob(jobId);
    await updateJobStatus(jobId, 'failed', current.currentStep);
    throw error;
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().substring(0, 60);
}
