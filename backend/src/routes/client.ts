import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { loadJob, getJobsByUserId, addClientUpload } from '../storage/jobStore';
import { requireClient, AuthRequest } from '../middleware/auth';
import { log } from '../utils/logger';

const router = express.Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR ||
  (process.env.NODE_ENV === 'production' ? '/app/data/uploads' : path.join(__dirname, '../../uploads'));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'client-tmp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.xlsx', '.csv', '.pptx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${ext}`));
  },
});

const CLIENT_STATUS_LABELS: Record<string, string> = {
  pending:      'Your request has been received',
  running:      'We are analysing your data',
  review_ready: 'Under consultant review',
  approved:     'Your Blueprint is ready',
  failed:       'Processing issue — our team has been notified',
};

router.get('/jobs', requireClient, (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const jobs = getJobsByUserId(user.userId);
    res.json(jobs.map((j) => ({
      jobId: j.jobId,
      status: j.status,
      statusLabel: CLIENT_STATUS_LABELS[j.status] ?? j.status,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      reuploadAllowed: j.reuploadAllowed || false,
      clientUploadCount: (j.clientUploads || []).length,
      canDownload: j.status === 'approved',
    })));
  } catch (err) {
    log('error', 'Client jobs fetch error', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/jobs/:jobId', requireClient, (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const job = loadJob(req.params.jobId);
    if (job.userId !== user.userId) { res.status(403).json({ error: 'Access denied' }); return; }
    res.json({
      jobId: job.jobId,
      status: job.status,
      statusLabel: CLIENT_STATUS_LABELS[job.status] ?? job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      reuploadAllowed: job.reuploadAllowed || false,
      clientUploads: (job.clientUploads || []).map((u) => ({
        id: u.id,
        filename: u.filename,
        size: u.size,
        uploadedAt: u.uploadedAt,
      })),
      canDownload: job.status === 'approved',
    });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

router.post('/jobs/:jobId/upload', requireClient, upload.single('file'), async (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const job = loadJob(req.params.jobId);
    if (job.userId !== user.userId) { res.status(403).json({ error: 'Access denied' }); return; }
    if (!job.reuploadAllowed) {
      res.status(403).json({ error: 'File uploads are not currently enabled for this job.' });
      return;
    }
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file provided.' }); return; }

    // Move file to job-specific folder
    const destDir = path.join(UPLOADS_DIR, req.params.jobId, 'client-uploads');
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, destPath);

    const uploadEntry = {
      id: uuidv4(),
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      storagePath: destPath,
      fileData: fs.readFileSync(destPath).toString('base64'),
      uploadedAt: new Date().toISOString(),
    };

    addClientUpload(req.params.jobId, uploadEntry);
    res.status(201).json({ success: true, upload: { id: uploadEntry.id, filename: uploadEntry.filename, size: uploadEntry.size, uploadedAt: uploadEntry.uploadedAt } });
  } catch (err) {
    log('error', `Client upload error for ${req.params.jobId}`, { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

router.get('/jobs/:jobId/download', requireClient, (req: Request, res: Response) => {
  const { user } = req as AuthRequest;
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const job = loadJob(req.params.jobId);
    if (job.userId !== user.userId) { res.status(403).json({ error: 'Access denied' }); return; }
    if (job.status !== 'approved') {
      res.status(403).json({ error: 'Your Blueprint is not ready for download yet.' });
      return;
    }
    if (!job.outputDocxData && !job.outputDocxPath) {
      res.status(404).json({ error: 'Document not available yet.' });
      return;
    }
    const filename = `AI Value Blueprint - ${job.clientName}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (job.outputDocxPath && require('fs').existsSync(job.outputDocxPath)) {
      require('fs').createReadStream(job.outputDocxPath).pipe(res);
      return;
    }
    res.send(Buffer.from(job.outputDocxData!, 'base64'));
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

export default router;
