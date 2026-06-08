import express, { Request, Response } from 'express';
import {
  loadJob, getAllJobs, approveJob, resetJobForRetry, deleteJob,
  getTruncationMeta, toggleReupload, setClientVisibleStatus,
} from '../storage/jobStore';
import { runPipeline } from '../pipeline/orchestrator';
import { callClaude } from '../utils/claudeClient';
import { log } from '../utils/logger';
import { requireAdmin, AuthRequest } from '../middleware/auth';
import type { ConfidenceResult, JustificationEntry } from '../types/pipeline';

const router = express.Router();

const STEP_PROGRESS: Record<string, number> = {
  A: 10, B: 30, C: 50, D: 65, D2: 80, E: 90, complete: 100,
};

// Public: client status check by jobId
router.get('/:jobId', (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const progress = STEP_PROGRESS[job.currentStep] || 0;
    const downloadUrl =
      job.status === 'review_ready' || job.status === 'approved'
        ? `/api/download/${job.jobId}`
        : undefined;
    res.json({
      jobId: job.jobId,
      status: job.status,
      currentStep: job.currentStep,
      progress,
      confidenceScores: job.confidenceScores || {},
      reviewerFlags: job.reviewerFlags || [],
      downloadUrl,
    });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: list all jobs
router.get('/', requireAdmin, (_req: Request, res: Response) => {
  const jobs = getAllJobs();
  res.json(jobs.map((j) => ({
    jobId: j.jobId,
    clientName: j.clientName,
    clientEmail: j.clientEmail,
    status: j.status,
    currentStep: j.currentStep,
    startedAt: j.startedAt,
    completedAt: j.completedAt,
    confidenceScores: j.confidenceScores || {},
    reviewerFlags: j.reviewerFlags || [],
    errorLog: j.status === 'failed' ? (j.errorLog || []) : [],
    progress: STEP_PROGRESS[j.currentStep] || 0,
    truncationMeta: j.truncationMeta
      ? { field: j.truncationMeta.field, originalLength: j.truncationMeta.originalLength, truncatedLength: j.truncationMeta.truncatedLength }
      : undefined,
    approvedByName: j.approvedByName ?? null,
    reuploadAllowed: j.reuploadAllowed || false,
    clientUploadCount: (j.clientUploads || []).length,
    clientVisibleStatus: j.clientVisibleStatus ?? null,
  })));
});

// Admin: retry a failed job
router.post('/:jobId/retry', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    if (job.status === 'running' || job.status === 'pending') {
      res.status(400).json({ error: 'Job is already running or pending' });
      return;
    }
    resetJobForRetry(req.params.jobId);
    runPipeline(req.params.jobId).catch((err: unknown) => {
      log('error', `Retry pipeline error for ${req.params.jobId}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: approve a job (records who approved)
router.post('/:jobId/approve', requireAdmin, (req: Request, res: Response) => {
  const adminName = (req as AuthRequest).user?.name;
  try {
    approveJob(req.params.jobId, adminName);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: set the status the client sees (completely separate from pipeline status)
router.post('/:jobId/client-status', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.body as { status?: string };
  const valid = ['received', 'in_progress', 'under_review', 'ready'] as const;
  if (!status || !(valid as readonly string[]).includes(status)) {
    res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    return;
  }
  try {
    loadJob(req.params.jobId);
    setClientVisibleStatus(req.params.jobId, status as typeof valid[number]);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: toggle client re-upload permission
router.post('/:jobId/request-reupload', requireAdmin, (req: Request, res: Response) => {
  const { enabled } = req.body as { enabled?: boolean };
  try {
    loadJob(req.params.jobId);
    toggleReupload(req.params.jobId, enabled !== false);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: get intake data (form answers + uploaded files metadata + client re-uploads)
router.get('/:jobId/intake-data', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    res.json({
      formAnswers: job.formAnswers,
      uploadedFiles: Object.fromEntries(
        Object.entries(job.uploadedFiles).map(([k, v]) => [k, {
          filename: v.filename,
          size: v.size,
          mimeType: v.mimeType,
        }]),
      ),
      clientUploads: (job.clientUploads || []).map((u) => ({
        id: u.id,
        filename: u.filename,
        size: u.size,
        mimeType: u.mimeType,
        uploadedAt: u.uploadedAt,
      })),
    });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: generate AI risk summary for the final stage's low-confidence items
router.post('/:jobId/risk-summary', requireAdmin, async (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const stepE = job.confidenceScores?.stepE as ConfidenceResult | undefined;

    if (!stepE || stepE.lowConfidenceCount === 0) {
      res.status(400).json({ error: 'No low-confidence items found in Stage 5' });
      return;
    }

    const lines: string[] = [];
    if (stepE.justificationEntries?.length) {
      stepE.justificationEntries.forEach((entry: JustificationEntry, idx: number) => {
        lines.push(`${idx + 1}. [${entry.tag.toUpperCase()}] ${entry.label}`);
        if (entry.claim)            lines.push(`   Claim: "${entry.claim}"`);
        if (entry.whyTagged)        lines.push(`   Why tagged: ${entry.whyTagged}`);
        if (entry.missingData)      lines.push(`   Missing data: ${entry.missingData}`);
        if (entry.consultantAction) lines.push(`   Consultant action: ${entry.consultantAction}`);
        lines.push('');
      });
    } else {
      (stepE.inferredSnippets   ?? []).forEach((s, i) => lines.push(`${i + 1}. [INFERRED] ${s}`));
      (stepE.assumptionSnippets ?? []).forEach((s, i) => lines.push(`${lines.length + 1}. [ASSUMPTION] ${s}`));
    }

    const scoreBreakdown =
      `Score: ${stepE.score}% (${stepE.breakdown.documentBacked} Document-Backed, ` +
      `${stepE.breakdown.formStated} Form-Stated, ${stepE.breakdown.inferred} Inferred, ` +
      `${stepE.breakdown.assumption} Assumption — ${stepE.breakdown.total} total tags)`;

    const userMessage =
      `CLIENT: ${job.clientName}\n` +
      `BLUEPRINT CONFIDENCE — ${scoreBreakdown}\n\n` +
      `LOW-CONFIDENCE ITEMS (${stepE.lowConfidenceCount} total):\n\n` +
      lines.join('\n');

    const summary = await callClaude(
      `You are a senior AI consulting analyst preparing an internal pre-delivery briefing for a consultant.
You will receive a list of low-confidence claims (Inferred or Assumption) from the final AI Value Blueprint document.

Write a consultant briefing (350–500 words) structured as follows:

## Key Risk Themes
Group related low-confidence items into 2–4 themes. For each theme, name it, explain what it covers, and list the specific items (numbered references).

## Priority Actions Before Delivery
A numbered list of the most critical things the consultant must verify or confirm before presenting to the client. Lead with the highest-risk items.

## Lower-Priority Items
Bullet list of items that can be addressed in follow-up or during the engagement, with a one-line note on each.

Rules: Be direct and specific. Reference actual claim text, not vague categories. No filler language. This is an internal document — be candid about risks.`,
      userMessage,
      1800,
    );

    res.json({ summary });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log('error', `Risk summary generation failed for ${req.params.jobId}: ${msg}`);
    res.status(500).json({ error: msg });
  }
});

// Admin: delete a job
router.delete('/:jobId', requireAdmin, (req: Request, res: Response) => {
  try {
    loadJob(req.params.jobId);
    deleteJob(req.params.jobId);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: get truncation comparison data
router.get('/:jobId/compare-truncation', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const meta = getTruncationMeta(req.params.jobId);
    if (!meta) {
      res.status(404).json({ error: 'No truncation data for this job — Step E ran without truncation.' });
      return;
    }
    res.json({
      field: meta.field,
      originalLength: meta.originalLength,
      truncatedLength: meta.truncatedLength,
      original: job.stepD_opportunities ?? '',
      truncated: meta.truncatedText,
    });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

export default router;
