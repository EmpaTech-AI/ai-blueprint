import express, { Request, Response } from 'express';
import { loadJob, getAllJobs, approveJob } from '../storage/jobStore';
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

export default router;
