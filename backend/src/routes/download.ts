import express, { Request, Response } from 'express';
import { loadJob } from '../storage/jobStore';
import path from 'path';
import fs from 'fs';

const router = express.Router();

router.get('/:jobId', (req: Request, res: Response) => {
  const token = req.query.token || req.headers['x-reviewer-token'];
  if (token !== process.env.REVIEWER_SECRET_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const job = loadJob(req.params.jobId);
    if (!job.outputDocxPath || !fs.existsSync(job.outputDocxPath)) {
      res.status(404).json({ error: 'Document not available yet' });
      return;
    }

    const filename = path.basename(job.outputDocxPath);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(job.outputDocxPath).pipe(res);
  } catch (err) {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Intermediate output download
router.get('/:jobId/step/:step', (req: Request, res: Response) => {
  const token = req.query.token || req.headers['x-reviewer-token'];
  if (token !== process.env.REVIEWER_SECRET_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const job = loadJob(req.params.jobId);
    const stepMap: Record<string, string | undefined> = {
      B: job.stepB_dossier,
      C: job.stepC_maturity,
      D: job.stepD_opportunities,
      D2: job.stepD2_roadmap,
      E: job.stepE_assembly,
    };
    const content = stepMap[req.params.step.toUpperCase()];
    if (!content) {
      res.status(404).json({ error: 'Step output not available' });
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="step-${req.params.step}-${req.params.jobId}.txt"`);
    res.send(content);
  } catch (err) {
    res.status(404).json({ error: 'Job not found' });
  }
});

export default router;
