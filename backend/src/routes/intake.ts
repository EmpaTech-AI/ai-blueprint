import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createJob } from '../storage/jobStore';
import { getUserByEmail, createUser } from '../storage/userStore';
import { runPipeline } from '../pipeline/orchestrator';
import { PipelineJob } from '../types/pipeline';
import { log } from '../utils/logger';

const router = express.Router();

const UPLOADS_DIR = process.env.UPLOADS_DIR ||
  (process.env.NODE_ENV === 'production' ? '/app/data/uploads' : path.join(__dirname, '../../uploads'));
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const jobId = (req as Request & { jobId?: string }).jobId || 'tmp';
    const dir = path.join(UPLOADS_DIR, jobId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.xlsx', '.csv', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

router.post('/', (req: Request, res: Response, next) => {
  const jobId = uuidv4();
  (req as Request & { jobId: string }).jobId = jobId;
  next();
}, upload.any(), async (req: Request, res: Response) => {
  try {
    const jobId = (req as Request & { jobId?: string }).jobId || uuidv4();
    const { clientName, clientEmail, formAnswers, password } = req.body as {
      clientName?: string;
      clientEmail?: string;
      formAnswers?: string;
      password?: string;
    };

    if (!clientName || !clientEmail) {
      res.status(400).json({ error: 'clientName and clientEmail are required' });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Please set a password (minimum 8 characters) to access your dashboard.' });
      return;
    }

    let parsedAnswers: PipelineJob['formAnswers'] = {};
    if (formAnswers) {
      try {
        parsedAnswers = JSON.parse(formAnswers) as PipelineJob['formAnswers'];
      } catch {
        res.status(400).json({ error: 'Invalid form data format — please re-submit.' });
        return;
      }
    }

    // Create or link client user account
    let userId: string | undefined;
    try {
      const existingUser = getUserByEmail(clientEmail.toLowerCase());
      if (existingUser) {
        const valid = await bcrypt.compare(password, existingUser.passwordHash);
        if (!valid) {
          res.status(400).json({ error: 'An account with this email already exists. Please use your existing password to link this submission to your account.' });
          return;
        }
        userId = existingUser.id;
      } else {
        const hash = await bcrypt.hash(password, 10);
        const newUser = createUser({ email: clientEmail.toLowerCase(), passwordHash: hash, role: 'client', name: clientName });
        userId = newUser.id;
      }
    } catch (err) {
      log('error', 'User creation error during intake', { error: err instanceof Error ? err.message : String(err) });
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const uploadedFiles: PipelineJob['uploadedFiles'] = {};

    for (const file of files) {
      const categoryId = file.fieldname;
      uploadedFiles[categoryId] = {
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        storagePath: file.path,
        fileData: fs.readFileSync(file.path).toString('base64'),
      };
    }

    const job: PipelineJob = {
      jobId,
      clientName,
      clientEmail,
      status: 'pending',
      currentStep: 'A',
      startedAt: new Date().toISOString(),
      formAnswers: parsedAnswers,
      uploadedFiles,
      userId,
    };

    createJob(job);

    runPipeline(jobId).catch((err: unknown) => {
      log('error', `Async pipeline error for ${jobId}`, { error: err instanceof Error ? err.message : String(err) });
    });

    res.status(201).json({
      jobId,
      message: 'Intake received. Your Blueprint is being prepared.',
    });
  } catch (err: unknown) {
    log('error', 'Intake route error', { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
