import express, { Request, Response } from 'express';
import { loadJob, getAllJobs, approveJob, resetJobForRetry, deleteJob } from '../storage/jobStore';
import { runPipeline } from '../pipeline/orchestrator';
import { log } from '../utils/logger';
import fs from 'fs';

const router = express.Router();

const STEP_PROGRESS: Record<string, number> = {
  A: 10, B: 30, C: 50, D: 65, D2: 80, E: 90, complete: 100,
};

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
  } catch (err: unknown) {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: list all jobs
router.get('/', (req: Request, res: Response) => {
  const token = req.headers['x-reviewer-token'];
  if (token !== process.env.REVIEWER_SECRET_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
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
  })));
});

// Admin: retry a failed job
router.post('/:jobId/retry', (req: Request, res: Response) => {
  const token = req.headers['x-reviewer-token'];
  if (token !== process.env.REVIEWER_SECRET_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const job = loadJob(req.params.jobId);
    if (job.status !== 'failed') {
      res.status(400).json({ error: 'Only failed jobs can be retried' });
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

// Admin: approve a job
router.post('/:jobId/approve', (req: Request, res: Response) => {
  const token = req.headers['x-reviewer-token'];
  if (token !== process.env.REVIEWER_SECRET_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    approveJob(req.params.jobId);
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: delete a job
router.delete('/:jobId', (req: Request, res: Response) => {
  const token = req.headers['x-reviewer-token'];
  if (token !== process.env.REVIEWER_SECRET_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    loadJob(req.params.jobId); // throws if not found
    deleteJob(req.params.jobId);
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

export default router;
