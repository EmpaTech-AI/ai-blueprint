import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import intakeRouter from './routes/intake';
import statusRouter from './routes/status';
import downloadRouter from './routes/download';
import { log } from './utils/logger';

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
    // allow any vercel.app preview/production URL
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
