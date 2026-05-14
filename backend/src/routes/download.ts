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

// Pipeline logs — document parse results + error log
router.get('/:jobId/logs', (req: Request, res: Response) => {
  const token = req.query.token || req.headers['x-reviewer-token'];
  if (token !== process.env.REVIEWER_SECRET_TOKEN) {
    res.status(401).send('<p>Unauthorized</p>');
    return;
  }

  try {
    const job = loadJob(req.params.jobId);
    const corpus = job.stepA_corpus
      ? (JSON.parse(job.stepA_corpus) as {
          parsedAt?: string;
          documents?: Array<{ filename: string; category: string; status: string; confidence: string; wordCount?: number; pageCount?: number; error?: string }>;
          failedDocuments?: Array<{ filename: string; category: string; status: string; confidence: string; error?: string }>;
          missingRequiredCategories?: string[];
        })
      : null;

    const html = renderLogsHtml(job, corpus);
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

type Corpus = {
  parsedAt?: string;
  documents?: Array<{ filename: string; category: string; status: string; confidence: string; wordCount?: number; pageCount?: number; error?: string }>;
  failedDocuments?: Array<{ filename: string; category: string; status: string; confidence: string; error?: string }>;
  missingRequiredCategories?: string[];
} | null;

function renderLogsHtml(job: { clientName: string; status: string; currentStep: string; startedAt: string; errorLog?: string[] }, corpus: Corpus): string {
  const statusColor: Record<string, string> = {
    ok: '#16a34a', likely_scanned: '#d97706', parse_error: '#dc2626', empty: '#dc2626', unsupported: '#dc2626',
  };

  const docRows = (docs: NonNullable<Corpus>['documents'], failed: boolean) =>
    (docs || []).map((d) => `
      <tr>
        <td>${esc(d.filename)}</td>
        <td style="font-size:12px;color:#6b7280">${esc(d.category)}</td>
        <td><span style="color:${statusColor[d.status] || '#374151'};font-weight:600">${esc(d.status)}</span></td>
        <td>${d.wordCount ?? '—'}</td>
        <td>${failed && d.error ? `<span style="color:#dc2626;font-family:monospace;font-size:12px">${esc(d.error)}</span>` : '—'}</td>
      </tr>`).join('');

  const parsedSection = corpus ? `
    <h2>Document Parsing — Step A</h2>
    <p style="color:#6b7280;font-size:13px;margin-bottom:16px">Parsed at: ${corpus.parsedAt ?? 'unknown'}</p>

    ${(corpus.documents?.length ?? 0) > 0 ? `
    <h3 style="color:#16a34a">✓ Successfully Parsed (${corpus.documents!.length})</h3>
    <table>
      <thead><tr><th>File</th><th>Category</th><th>Status</th><th>Words</th><th>Error</th></tr></thead>
      <tbody>${docRows(corpus.documents, false)}</tbody>
    </table>` : '<p style="color:#6b7280">No documents were successfully parsed.</p>'}

    ${(corpus.failedDocuments?.length ?? 0) > 0 ? `
    <h3 style="color:#dc2626;margin-top:24px">✗ Failed to Parse (${corpus.failedDocuments!.length})</h3>
    <table>
      <thead><tr><th>File</th><th>Category</th><th>Status</th><th>Words</th><th>Error</th></tr></thead>
      <tbody>${docRows(corpus.failedDocuments, true)}</tbody>
    </table>` : ''}

    ${(corpus.missingRequiredCategories?.length ?? 0) > 0 ? `
    <h3 style="color:#d97706;margin-top:24px">⚠ Missing Required Categories</h3>
    <ul>${corpus.missingRequiredCategories!.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
  ` : '<p style="color:#6b7280">Step A (document parsing) has not run yet or produced no output.</p>';

  const errorSection = job.errorLog && job.errorLog.length > 0 ? `
    <h2 style="color:#dc2626;margin-top:32px">Pipeline Error Log</h2>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px">
      ${job.errorLog.map((e) => `<p style="font-family:monospace;font-size:13px;color:#991b1b;margin-bottom:6px">${esc(e)}</p>`).join('')}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Logs — ${esc(job.clientName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;background:#f9fafb;padding:32px 24px}
  .page{max-width:900px;margin:0 auto}
  .header{background:#2E5FA1;color:#fff;padding:24px 28px;border-radius:8px 8px 0 0}
  .header h1{font-size:20px;font-weight:700}
  .header .meta{font-size:13px;opacity:.8;margin-top:6px}
  .body{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px}
  h2{font-size:16px;font-weight:700;color:#2E5FA1;margin:24px 0 12px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}
  h2:first-child{margin-top:0}
  h3{font-size:14px;font-weight:700;margin:16px 0 8px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:13px}
  th{background:#f3f4f6;text-align:left;padding:8px 10px;font-weight:600;color:#374151;border:1px solid #e5e7eb}
  td{padding:8px 10px;border:1px solid #e5e7eb;vertical-align:top}
  tr:nth-child(even) td{background:#f9fafb}
  ul{padding-left:20px;margin-top:4px}
  li{margin-bottom:4px}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>Pipeline Logs — ${esc(job.clientName)}</h1>
    <div class="meta">Status: ${esc(job.status)} &nbsp;·&nbsp; Last step: ${esc(job.currentStep)} &nbsp;·&nbsp; Started: ${new Date(job.startedAt).toLocaleString()}</div>
  </div>
  <div class="body">
    ${parsedSection}
    ${errorSection}
  </div>
</div>
</body>
</html>`;
}

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
