import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  log('info', `Backend running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  log('info', 'Received SIGTERM, shutting down gracefully');
  server.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });
});

export default app;
