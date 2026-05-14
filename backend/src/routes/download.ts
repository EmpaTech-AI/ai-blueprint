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

// HTML preview of the assembled blueprint
router.get('/:jobId/preview', (req: Request, res: Response) => {
  const token = req.query.token || req.headers['x-reviewer-token'];
  if (token !== process.env.REVIEWER_SECRET_TOKEN) {
    res.status(401).send('<p>Unauthorized</p>');
    return;
  }

  try {
    const job = loadJob(req.params.jobId);
    if (!job.stepE_assembly) {
      res.status(404).send('<p>Preview not available — pipeline not complete.</p>');
      return;
    }

    const html = renderPreviewHtml(job.clientName, job.stepE_assembly);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.status(404).send('<p>Job not found</p>');
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

function renderPreviewHtml(clientName: string, markdown: string): string {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const body = markdown
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return '<div style="height:0.6em"></div>';
      if (t.startsWith('### ')) return `<h3>${esc(t.slice(4))}</h3>`;
      if (t.startsWith('## '))  return `<h2>${esc(t.slice(3))}</h2>`;
      if (t.startsWith('# '))   return `<h1>${esc(t.slice(2))}</h1>`;
      if (t.startsWith('- ') || t.startsWith('• ')) return `<li>${inlineFormat(t.slice(2))}</li>`;
      return `<p>${inlineFormat(t)}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Value Blueprint — ${esc(clientName)}</title>
<style>
  :root { --blue:#2E5FA1; --dark:#404040; --gray:#6b7280; --light:#f0f6ff; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,Helvetica,sans-serif; font-size:15px; color:var(--dark);
         background:#f9fafb; padding:0; }
  .page { max-width:860px; margin:0 auto; background:#fff;
          box-shadow:0 1px 8px rgba(0,0,0,.08); min-height:100vh; }
  .cover { background:var(--blue); color:#fff; padding:72px 60px 56px; }
  .cover .label { font-size:11px; letter-spacing:.12em; text-transform:uppercase;
                  opacity:.75; margin-bottom:18px; }
  .cover h1 { font-size:34px; font-weight:700; line-height:1.2; margin-bottom:12px; }
  .cover .client { font-size:20px; font-weight:600; opacity:.9; margin-bottom:32px; }
  .cover .meta { font-size:13px; opacity:.65; }
  .content { padding:52px 60px 80px; }
  h1 { font-size:22px; font-weight:700; color:var(--blue);
       border-bottom:2px solid var(--blue); padding-bottom:8px;
       margin:40px 0 16px; }
  h2 { font-size:17px; font-weight:700; color:var(--dark); margin:28px 0 10px; }
  h3 { font-size:15px; font-weight:700; color:var(--dark); margin:20px 0 8px; }
  p  { line-height:1.7; margin-bottom:8px; }
  li { line-height:1.7; margin:3px 0 3px 22px; }
  strong { font-weight:700; }
  em { font-style:italic; }
  @media print {
    body { background:#fff; }
    .page { box-shadow:none; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="cover">
    <div class="label">AI Assist BG — Confidential</div>
    <h1>AI Value Blueprint</h1>
    <div class="client">${esc(clientName)}</div>
    <div class="meta">Prepared by AI Assist BG &nbsp;·&nbsp; ${today}</div>
  </div>
  <div class="content">
    ${body}
  </div>
</div>
</body>
</html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inlineFormat(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}
