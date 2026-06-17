import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import intakeRouter from './routes/intake';
import statusRouter from './routes/status';
import downloadRouter from './routes/download';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import clientRouter from './routes/client';
import { log } from './utils/logger';
import { resetRunningJobs } from './storage/jobStore';
import { countAdmins, getUserByEmail, createUser } from './storage/userStore';

// ── Security: require REVIEWER_SECRET_TOKEN before starting ──────────────────
if (!process.env.REVIEWER_SECRET_TOKEN) {
  throw new Error(
    'REVIEWER_SECRET_TOKEN environment variable is not set. ' +
    'Set it in Railway (or .env for local dev) before starting the server.',
  );
}

// Captured once at module load — used by /health to confirm a fresh process started.
const PROCESS_START_MS = Date.now();

// Hash all .md files in dist/skills at startup. Stable for a given build; differs
// the moment any SKILL.md changes — even if RAILWAY_GIT_COMMIT_SHA stays the same.
// Compare this value across instances to confirm fleet uniformity after a deploy.
function computeSkillsSig(): string {
  const skillsDir = path.join(__dirname, 'skills');
  if (!fs.existsSync(skillsDir)) return 'unknown';
  const hash = crypto.createHash('sha256');
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) { walk(full); }
      else if (entry.endsWith('.md')) { hash.update(entry); hash.update(fs.readFileSync(full)); }
    }
  }
  walk(skillsDir);
  return hash.digest('hex').slice(0, 12);
}
const SKILLS_SIG = computeSkillsSig();

// Hash the compiled confidenceScorer.js at startup. Changes whenever the scorer is rebuilt,
// even if the git SHA is identical. Lets you confirm P3a (or any scorer fix) is live without
// running a pipeline job — compare scorerSig across instances via /health.
function computeScorerSig(): string {
  const scorerPath = path.join(__dirname, 'utils', 'confidenceScorer.js');
  if (!fs.existsSync(scorerPath)) return 'unknown';
  return crypto.createHash('sha256').update(fs.readFileSync(scorerPath)).digest('hex').slice(0, 12);
}
const SCORER_SIG = computeScorerSig();

// ── Startup recovery ──────────────────────────────────────────────────────────
const orphaned = resetRunningJobs();
if (orphaned > 0) {
  log('warn', `Startup recovery: reset ${orphaned} orphaned running job(s) to failed`);
}

// ── Seed default admin account ────────────────────────────────────────────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  try {
    if (countAdmins() === 0 && !getUserByEmail(ADMIN_EMAIL)) {
      const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
      createUser({ email: ADMIN_EMAIL.toLowerCase(), passwordHash: hash, role: 'admin', name: 'Admin' });
      log('info', `Default admin account created: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    log('warn', `Admin seeding skipped: ${err instanceof Error ? err.message : String(err)}`);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  ...((process.env.FRONTEND_URL || '').split(',').map((u) => u.trim()).filter(Boolean)),
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    processStartedAt: new Date(PROCESS_START_MS).toISOString(),
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? 'local',
    gitCommit: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown',
    skillsSig: SKILLS_SIG,
    scorerSig: SCORER_SIG,
  });
});

app.use('/api/intake', intakeRouter);
app.use('/api/status', statusRouter);
app.use('/api/download', downloadRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/client', clientRouter);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log('error', err.message);
  res.status(500).json({ error: err.message });
});

const server = app.listen(PORT, () => {
  log('info', `Backend running on port ${PORT}`, {
    processStartedAt: new Date(PROCESS_START_MS).toISOString(),
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? 'local',
    gitCommit: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown',
    skillsSig: SKILLS_SIG,
    scorerSig: SCORER_SIG,
  });
});

process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down gracefully');
  server.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });
});

export default app;
