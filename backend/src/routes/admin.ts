import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getAllUsers, createUser, deleteUser, updatePassword, getUserById, getUserByEmail } from '../storage/userStore';
import { requireAdmin } from '../middleware/auth';
import { generateBlueprintPdf, generateBlueprintTxt, generateBlueprintDocx } from '../docx/assembler';
import { generateBlueprintHtml } from '../docx/htmlAssembler';
import { stripForDeliveryStage5, stripToAllowlistedSections } from '../utils/confidenceScorer';
import { SAMPLE_ASSEMBLED_CONTENT, SAMPLE_CLIENT_NAME } from '../docx/sampleBlueprint';
import path from 'path';
import fs from 'fs';
import os from 'os';

const router = express.Router();

// ─── Document Lab — render the assemblers without running the pipeline ──────────
//
// Lets an operator see exactly how the current code styles a deliverable (HTML/PDF/TXT)
// against either the bundled sample or pasted assembled-markdown. The content is run through
// the same stripForDelivery + generator path as production, so the preview is faithful.

type PreviewFormat = 'html' | 'pdf' | 'txt' | 'docx';

async function renderPreview(format: PreviewFormat, clientName: string, rawContent: string, res: Response): Promise<void> {
  const content = stripToAllowlistedSections(stripForDeliveryStage5(rawContent), 'stepE'); // T-29 permit-only
  const name = clientName.trim() || SAMPLE_CLIENT_NAME;

  if (format === 'pdf') {
    const buf = await generateBlueprintPdf(name, content);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.send(buf);
    return;
  }
  if (format === 'docx') {
    // generateBlueprintDocx writes to a path and returns the buffer; render to a temp file and
    // remove it. The same generator the pipeline uses, so the Lab DOCX is faithful to delivery.
    const tmpPath = path.join(os.tmpdir(), `lab-preview-${uuidv4()}.docx`);
    const buf = await generateBlueprintDocx(name, content, tmpPath);
    try { fs.unlinkSync(tmpPath); } catch { /* ignore cleanup failure */ }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="preview.docx"');
    res.send(buf);
    return;
  }
  if (format === 'txt') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(generateBlueprintTxt(name, content));
    return;
  }
  // default: html
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(generateBlueprintHtml(name, content));
}

function parseFormat(value: unknown): PreviewFormat {
  return value === 'pdf' || value === 'txt' || value === 'docx' ? value : 'html';
}

// GET /api/admin/preview?format=html|pdf|txt — render the bundled sample.
router.get('/preview', requireAdmin, async (req: Request, res: Response) => {
  try {
    await renderPreview(parseFormat(req.query.format), SAMPLE_CLIENT_NAME, SAMPLE_ASSEMBLED_CONTENT, res);
  } catch (err) {
    res.status(500).json({ error: `Preview render failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

// GET /api/admin/preview/sample-source — the raw sample markdown, so the Lab can prefill its editor.
router.get('/preview/sample-source', requireAdmin, (_req: Request, res: Response) => {
  res.json({ clientName: SAMPLE_CLIENT_NAME, content: SAMPLE_ASSEMBLED_CONTENT });
});

// POST /api/admin/preview — render custom pasted content. Body: { format, clientName, content }.
router.post('/preview', requireAdmin, async (req: Request, res: Response) => {
  const { format, clientName, content } = req.body as { format?: string; clientName?: string; content?: string };
  if (typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'content is required.' });
    return;
  }
  try {
    await renderPreview(parseFormat(format), clientName ?? '', content, res);
  } catch (err) {
    res.status(500).json({ error: `Preview render failed: ${err instanceof Error ? err.message : String(err)}` });
  }
});

router.get('/users', requireAdmin, (_req: Request, res: Response) => {
  res.json(getAllUsers());
});

router.post('/users', requireAdmin, async (req: Request, res: Response) => {
  const { email, password, role, name } = req.body as {
    email?: string;
    password?: string;
    role?: string;
    name?: string;
  };
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, and name are required.' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }
  if (role !== 'admin' && role !== 'client') {
    res.status(400).json({ error: 'role must be "admin" or "client".' });
    return;
  }
  if (getUserByEmail(email)) {
    res.status(409).json({ error: 'A user with that email already exists.' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = createUser({ email: email.trim().toLowerCase(), passwordHash, role, name });
  res.status(201).json(user);
});

router.delete('/users/:userId', requireAdmin, (req: Request, res: Response) => {
  const user = getUserById(req.params.userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  deleteUser(req.params.userId);
  res.json({ success: true });
});

router.post('/users/:userId/change-password', requireAdmin, async (req: Request, res: Response) => {
  const { newPassword } = req.body as { newPassword?: string };
  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'newPassword must be at least 8 characters.' });
    return;
  }
  const user = getUserById(req.params.userId);
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  const hash = await bcrypt.hash(newPassword, 10);
  updatePassword(req.params.userId, hash);
  res.json({ success: true });
});

export default router;
