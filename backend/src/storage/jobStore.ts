import { db } from './db';
import { PipelineJob, TruncationMeta, ClientUpload } from '../types/pipeline';
import { log } from '../utils/logger';

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    jobId TEXT PRIMARY KEY,
    clientName TEXT NOT NULL,
    clientEmail TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    currentStep TEXT NOT NULL DEFAULT 'A',
    startedAt TEXT NOT NULL,
    completedAt TEXT,
    formAnswers TEXT NOT NULL DEFAULT '{}',
    uploadedFiles TEXT NOT NULL DEFAULT '{}',
    stepA_corpus TEXT,
    stepB_dossier TEXT,
    stepC_maturity TEXT,
    stepD_opportunities TEXT,
    stepD2_roadmap TEXT,
    stepE_assembly TEXT,
    confidenceScores TEXT,
    reviewerFlags TEXT,
    outputDocxPath TEXT,
    outputDocxData TEXT,
    outputPdfData TEXT,
    outputTxtData TEXT,
    errorLog TEXT
  );
`);

// Safe migrations for columns added after initial schema
try { db.exec('ALTER TABLE jobs ADD COLUMN outputDocxData TEXT'); }    catch { /* already exists */ }
try { db.exec('ALTER TABLE jobs ADD COLUMN outputPdfData TEXT'); }     catch { /* already exists */ }
try { db.exec('ALTER TABLE jobs ADD COLUMN outputTxtData TEXT'); }     catch { /* already exists */ }
try { db.exec('ALTER TABLE jobs ADD COLUMN truncationMeta TEXT'); }    catch { /* already exists */ }
try { db.exec('ALTER TABLE jobs ADD COLUMN userId TEXT'); }            catch { /* already exists */ }
try { db.exec('ALTER TABLE jobs ADD COLUMN approvedByName TEXT'); }   catch { /* already exists */ }
try { db.exec('ALTER TABLE jobs ADD COLUMN reuploadAllowed INTEGER DEFAULT 0'); } catch { /* already exists */ }
try { db.exec("ALTER TABLE jobs ADD COLUMN clientUploads TEXT DEFAULT '[]'"); }   catch { /* already exists */ }

export function createJob(job: PipelineJob): void {
  const stmt = db.prepare(`
    INSERT INTO jobs (
      jobId, clientName, clientEmail, status, currentStep, startedAt,
      formAnswers, uploadedFiles, userId
    ) VALUES (
      @jobId, @clientName, @clientEmail, @status, @currentStep, @startedAt,
      @formAnswers, @uploadedFiles, @userId
    )
  `);
  stmt.run({
    ...job,
    formAnswers: JSON.stringify(job.formAnswers),
    uploadedFiles: JSON.stringify(job.uploadedFiles),
    userId: job.userId ?? null,
  });
  log('info', `Job created: ${job.jobId}`);
}

export function loadJob(jobId: string): PipelineJob {
  const row = db.prepare('SELECT * FROM jobs WHERE jobId = ?').get(jobId) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Job not found: ${jobId}`);
  return deserializeJob(row);
}

export function updateJobStatus(
  jobId: string,
  status: PipelineJob['status'],
  currentStep: PipelineJob['currentStep'],
  extra?: Partial<PipelineJob>
): void {
  const completedAt = status === 'review_ready' || status === 'failed' ? new Date().toISOString() : undefined;

  const updates: string[] = ['status = @status', 'currentStep = @currentStep'];
  const params: Record<string, unknown> = { jobId, status, currentStep };

  if (completedAt) {
    updates.push('completedAt = @completedAt');
    params.completedAt = completedAt;
  }

  if (extra?.outputDocxPath) {
    updates.push('outputDocxPath = @outputDocxPath');
    params.outputDocxPath = extra.outputDocxPath;
  }

  if (extra?.confidenceScores) {
    updates.push('confidenceScores = @confidenceScores');
    params.confidenceScores = JSON.stringify(extra.confidenceScores);
  }

  db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE jobId = @jobId`).run(params);
}

export function saveStepOutput(jobId: string, step: string, output: unknown): void {
  const colMap: Record<string, string> = {
    A: 'stepA_corpus',
    B: 'stepB_dossier',
    C: 'stepC_maturity',
    D: 'stepD_opportunities',
    D2: 'stepD2_roadmap',
    E: 'stepE_assembly',
  };
  const col = colMap[step];
  if (!col) throw new Error(`Unknown step: ${step}`);
  const value = typeof output === 'string' ? output : JSON.stringify(output);
  db.prepare(`UPDATE jobs SET ${col} = ? WHERE jobId = ?`).run(value, jobId);
}

export function appendErrorLog(jobId: string, message: string): void {
  const job = loadJob(jobId);
  const existing = job.errorLog || [];
  existing.push(`[${new Date().toISOString()}] ${message}`);
  db.prepare('UPDATE jobs SET errorLog = ? WHERE jobId = ?').run(JSON.stringify(existing), jobId);
}

export function updateConfidenceScores(jobId: string, scores: PipelineJob['confidenceScores']): void {
  db.prepare('UPDATE jobs SET confidenceScores = ? WHERE jobId = ?').run(JSON.stringify(scores), jobId);
}

export function updateReviewerFlags(jobId: string, flags: string[]): void {
  db.prepare('UPDATE jobs SET reviewerFlags = ? WHERE jobId = ?').run(JSON.stringify(flags), jobId);
}

export function getAllJobs(): PipelineJob[] {
  const rows = db.prepare('SELECT * FROM jobs ORDER BY startedAt DESC').all() as Record<string, unknown>[];
  return rows.map(deserializeJob);
}

export function getJobsByUserId(userId: string): PipelineJob[] {
  const rows = db.prepare('SELECT * FROM jobs WHERE userId = ? ORDER BY startedAt DESC').all(userId) as Record<string, unknown>[];
  return rows.map(deserializeJob);
}

export function saveDocxData(jobId: string, base64: string): void {
  db.prepare('UPDATE jobs SET outputDocxData = ? WHERE jobId = ?').run(base64, jobId);
}

export function savePdfData(jobId: string, base64: string): void {
  db.prepare('UPDATE jobs SET outputPdfData = ? WHERE jobId = ?').run(base64, jobId);
}

export function saveTxtData(jobId: string, txt: string): void {
  db.prepare('UPDATE jobs SET outputTxtData = ? WHERE jobId = ?').run(txt, jobId);
}

export function approveJob(jobId: string, approvedByName?: string): void {
  if (approvedByName) {
    db.prepare("UPDATE jobs SET status = 'approved', approvedByName = ? WHERE jobId = ?").run(approvedByName, jobId);
  } else {
    db.prepare("UPDATE jobs SET status = 'approved' WHERE jobId = ?").run(jobId);
  }
}

export function deleteJob(jobId: string): void {
  db.prepare('DELETE FROM jobs WHERE jobId = ?').run(jobId);
}

export function jobExists(jobId: string): boolean {
  return !!db.prepare('SELECT 1 FROM jobs WHERE jobId = ?').get(jobId);
}

export function saveTruncationMeta(jobId: string, meta: TruncationMeta): void {
  db.prepare('UPDATE jobs SET truncationMeta = ? WHERE jobId = ?').run(JSON.stringify(meta), jobId);
}

export function getTruncationMeta(jobId: string): TruncationMeta | undefined {
  const row = db.prepare('SELECT truncationMeta FROM jobs WHERE jobId = ?').get(jobId) as { truncationMeta?: string } | undefined;
  if (!row?.truncationMeta) return undefined;
  return safeJsonParse<TruncationMeta>(row.truncationMeta, undefined as unknown as TruncationMeta);
}

export function resetRunningJobs(): number {
  const result = db
    .prepare("UPDATE jobs SET status = 'failed', completedAt = ? WHERE status = 'running'")
    .run(new Date().toISOString());
  return result.changes;
}

export function resetJobForRetry(jobId: string): void {
  db.prepare(`
    UPDATE jobs SET
      status = 'pending',
      currentStep = 'A',
      completedAt = NULL,
      stepA_corpus = NULL,
      stepB_dossier = NULL,
      stepC_maturity = NULL,
      stepD_opportunities = NULL,
      stepD2_roadmap = NULL,
      stepE_assembly = NULL,
      confidenceScores = NULL,
      reviewerFlags = NULL,
      outputDocxPath = NULL,
      outputDocxData = NULL,
      outputPdfData = NULL,
      outputTxtData = NULL,
      errorLog = NULL
    WHERE jobId = ?
  `).run(jobId);
}

export function setJobUserId(jobId: string, userId: string): void {
  db.prepare('UPDATE jobs SET userId = ? WHERE jobId = ?').run(userId, jobId);
}

export function toggleReupload(jobId: string, allowed: boolean): void {
  db.prepare('UPDATE jobs SET reuploadAllowed = ? WHERE jobId = ?').run(allowed ? 1 : 0, jobId);
}

export function addClientUpload(jobId: string, upload: ClientUpload): void {
  const job = loadJob(jobId);
  const existing = job.clientUploads || [];
  existing.push(upload);
  db.prepare('UPDATE jobs SET clientUploads = ? WHERE jobId = ?').run(JSON.stringify(existing), jobId);
}

function deserializeJob(row: Record<string, unknown>): PipelineJob {
  return {
    ...(row as unknown as PipelineJob),
    formAnswers: safeJsonParse(row.formAnswers as string, {}),
    uploadedFiles: safeJsonParse(row.uploadedFiles as string, {}),
    confidenceScores: row.confidenceScores ? safeJsonParse(row.confidenceScores as string, {}) : undefined,
    reviewerFlags: row.reviewerFlags ? safeJsonParse(row.reviewerFlags as string, []) : undefined,
    errorLog: row.errorLog ? safeJsonParse(row.errorLog as string, []) : undefined,
    truncationMeta: row.truncationMeta ? safeJsonParse(row.truncationMeta as string, undefined as unknown as TruncationMeta) : undefined,
    reuploadAllowed: row.reuploadAllowed ? Boolean(row.reuploadAllowed) : false,
    clientUploads: row.clientUploads ? safeJsonParse(row.clientUploads as string, []) : [],
  };
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
