import express, { Request, Response } from 'express';
import { loadJob } from '../storage/jobStore';
import { generateBlueprintPdf, generateBlueprintDocx } from '../docx/assembler';
import { requireAdmin } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import os from 'os';

const router = express.Router();

router.get('/:jobId', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const filename = job.outputDocxPath
      ? path.basename(job.outputDocxPath)
      : `AI Value Blueprint - ${job.clientName}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Fast path: serve from disk if the file still exists
    if (job.outputDocxPath && fs.existsSync(job.outputDocxPath)) {
      const stream = fs.createReadStream(job.outputDocxPath);
      stream.on('error', () => {
        if (!res.headersSent) res.status(500).json({ error: 'File read error' });
      });
      stream.pipe(res);
      return;
    }

    // Fallback: serve from the base64 copy persisted in the database
    if (job.outputDocxData) {
      res.send(Buffer.from(job.outputDocxData, 'base64'));
      return;
    }

    res.status(404).json({ error: 'Document not available yet' });
  } catch (err) {
    res.status(404).json({ error: 'Job not found' });
  }
});

// PDF download
router.get('/:jobId/pdf', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    if (!job.outputPdfData) {
      res.status(404).json({ error: 'PDF not available — re-run the pipeline to generate it' });
      return;
    }
    const filename = `AI Value Blueprint - ${sanitizeFilename(job.clientName)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(job.outputPdfData, 'base64'));
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// TXT download
router.get('/:jobId/txt', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    if (!job.outputTxtData) {
      res.status(404).json({ error: 'TXT not available — re-run the pipeline to generate it' });
      return;
    }
    const filename = `AI Value Blueprint - ${sanitizeFilename(job.clientName)}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(job.outputTxtData);
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// LC tags — helpers

const LC_STEP_LABELS: Record<string, string> = {
  stepB:  'Stage 1 — Intake Analysis',
  stepC:  'Stage 2 — Maturity Scoring',
  stepD:  'Stage 3 — Opportunity Mapping',
  stepD2: 'Stage 4 — Action Roadmap',
  stepE:  'Stage 5 — Document Assembly',
};

// Mirror of the frontend compositionColor() badge logic
const LC_COMPOSITION_THRESHOLDS: Record<string, { green: number; amber: number }> = {
  stepB:  { green: 70, amber: 45 },
  stepC:  { green: 75, amber: 50 },
  stepD:  { green: 75, amber: 50 },
  stepD2: { green: 75, amber: 50 },
  stepE:  { green: 80, amber: 50 },
};
const LC_GROUNDING_GREEN = 88;
const LC_TIER_BANDS       = ['Strongly documentary', 'Mixed grounding', 'Form-stated', 'Low grounding'] as const;
const LC_TIER_DESCRIPTORS = [
  'Strongly documentary — suitable for client delivery',
  'Mixed grounding — review form-stated items or low-confidence tags before delivery',
  'Predominantly form-stated — verify before high-stakes use',
  'Low grounding — address low-confidence items before proceeding',
] as const;
const LC_STAGE_GREEN_DESCRIPTORS: Record<string, string> = {
  stepB:  'Documentary share within expected range for intake — suitable for pipeline use',
  stepC:  'Strongly documentary for this stage — suitable for proceeding',
  stepD:  'Strongly documentary for this stage — suitable for proceeding',
  stepD2: 'Strongly documentary for this stage — suitable for proceeding',
  stepE:  'Strongly documentary — suitable for client delivery',
};

type LcStepData = {
  score?: number;
  highConfidenceCount?: number;
  lowConfidenceCount?: number;
  breakdown?: { documentBacked: number; formStated: number; inferred: number; assumption: number; total: number };
  documentVerifiedPercent?: number;
  justificationEntries?: Array<{ index: number; tag: string; label: string; claim: string; whyTagged: string; missingData: string; consultantAction: string }>;
  inferredSnippets?: string[];
  assumptionSnippets?: string[];
};

function computeLcBadge(stepKey: string, data: LcStepData): { band: string; descriptor: string } {
  const db   = data.breakdown?.documentBacked ?? 0;
  const fs   = data.breakdown?.formStated     ?? 0;
  const high = db + fs;
  const docPct      = data.documentVerifiedPercent ?? (high > 0 ? Math.round((db / high) * 100) : (data.score ?? 0));
  const blendedScore = data.score ?? 0;

  if (high === 0) return { band: LC_TIER_BANDS[3], descriptor: LC_TIER_DESCRIPTORS[3] };

  const t          = LC_COMPOSITION_THRESHOLDS[stepKey] ?? LC_COMPOSITION_THRESHOLDS.stepE;
  const compTier   = docPct      >= t.green            ? 0 : docPct      >= t.amber ? 1 : 2;
  const groundTier = blendedScore >= LC_GROUNDING_GREEN ? 0 : blendedScore >= 76    ? 1 : blendedScore >= 60 ? 2 : 3;
  const tier       = Math.max(compTier, groundTier);

  const band       = LC_TIER_BANDS[tier];
  const descriptor = tier === 0
    ? (LC_STAGE_GREEN_DESCRIPTORS[stepKey] ?? LC_TIER_DESCRIPTORS[0])
    : LC_TIER_DESCRIPTORS[tier];

  return { band, descriptor };
}

function buildLcTagsMarkdown(job: ReturnType<typeof loadJob>, filterStep?: string): { title: string; markdown: string } {
  const scores = job.confidenceScores ?? {};
  const entries = filterStep
    ? Object.entries(scores).filter(([k]) => k === filterStep)
    : Object.entries(scores);

  if (filterStep) {
    const stageLabel = LC_STEP_LABELS[filterStep] ?? filterStep;
    const title = `LC Tags — ${stageLabel}`;
    const data  = (scores[filterStep] ?? {}) as LcStepData;
    const lines: string[] = [`# ${title}`, `**Client:** ${job.clientName}`, ''];
    appendLcStageHeader(lines, filterStep, stageLabel, data);
    appendLcStepEntries(lines, data);
    return { title, markdown: lines.join('\n') };
  }

  const title = 'LC Tags Report';
  const lines: string[] = [`# ${title}`, `**Client:** ${job.clientName}`, ''];
  for (const [stepKey, raw] of entries) {
    const stageLabel = LC_STEP_LABELS[stepKey] ?? stepKey;
    const data = raw as LcStepData;
    lines.push(`## ${stageLabel}`, '');
    appendLcStageHeader(lines, stepKey, stageLabel, data);
    appendLcStepEntries(lines, data);
  }
  return { title, markdown: lines.join('\n') };
}

function appendLcStageHeader(lines: string[], stepKey: string, stageLabel: string, data: LcStepData): void {
  const { band, descriptor } = computeLcBadge(stepKey, data);

  const db      = data.breakdown?.documentBacked ?? 0;
  const fs      = data.breakdown?.formStated     ?? 0;
  const high    = db + fs;
  const docPct  = data.documentVerifiedPercent ?? (high > 0 ? Math.round((db / high) * 100) : (data.score ?? 0));
  const blended = data.score ?? 0;
  const total   = data.breakdown?.total ?? 0;
  const inf     = data.breakdown?.inferred   ?? 0;
  const asm     = data.breakdown?.assumption ?? 0;
  const lcCount = data.lowConfidenceCount ?? (inf + asm);

  lines.push(
    `**Grounding:** ${band}`,
    `**Documentary (doc%):** ${docPct}%   ·   **Blended:** ${blended}%   ·   **Low-confidence tags:** ${lcCount}`,
    '',
    `*${descriptor}*`,
    '',
    `**Citation breakdown — ${total} total tags**`,
    `Document-Backed: **${db}**   ·   Form-Stated: **${fs}**   ·   Inferred: **${inf}**   ·   Assumption: **${asm}**`,
    '',
    '---',
    '',
  );
}

function appendLcStepEntries(lines: string[], data: LcStepData): void {
  if (data.justificationEntries?.length) {
    for (const e of data.justificationEntries) {
      lines.push(`### [${e.tag}] ${e.label}`, '');
      if (e.claim)            lines.push(`**Claim:** ${e.claim}`, '');
      if (e.whyTagged)        lines.push(`**Why tagged:** ${e.whyTagged}`, '');
      if (e.missingData)      lines.push(`**Missing data:** ${e.missingData}`, '');
      if (e.consultantAction) lines.push(`**Consultant action:** ${e.consultantAction}`, '');
      lines.push('');
    }
    return;
  }
  for (const s of (data.inferredSnippets  ?? [])) { lines.push('### [Inferred]',    '', s, ''); }
  for (const s of (data.assumptionSnippets ?? [])) { lines.push('### [Assumption]', '', s, ''); }
  if (!data.inferredSnippets?.length && !data.assumptionSnippets?.length) {
    lines.push('*No low-confidence items in this stage.*', '');
  }
}

// LC tags DOCX — all stages
router.get('/:jobId/lc-tags/docx', requireAdmin, async (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    if (!job.confidenceScores || Object.keys(job.confidenceScores).length === 0) {
      res.status(404).json({ error: 'No confidence data available yet — run the pipeline first' });
      return;
    }
    const { markdown } = buildLcTagsMarkdown(job);
    const tmpPath = path.join(os.tmpdir(), `lc-tags-${req.params.jobId}.docx`);
    const docxBuffer = await generateBlueprintDocx(job.clientName, markdown, tmpPath);
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    const filename = `LC Tags - ${sanitizeFilename(job.clientName)}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(docxBuffer);
  } catch { res.status(500).json({ error: 'Failed to generate DOCX' }); }
});

// LC tags PDF — all stages
router.get('/:jobId/lc-tags/pdf', requireAdmin, async (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    if (!job.confidenceScores || Object.keys(job.confidenceScores).length === 0) {
      res.status(404).json({ error: 'No confidence data available yet — run the pipeline first' });
      return;
    }
    const { markdown } = buildLcTagsMarkdown(job);
    const pdfBuffer = await generateBlueprintPdf(job.clientName, markdown);
    const filename = `LC Tags - ${sanitizeFilename(job.clientName)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch { res.status(500).json({ error: 'Failed to generate PDF' }); }
});

// LC tags DOCX — single stage
router.get('/:jobId/lc-tags/:stepKey/docx', requireAdmin, async (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const { title, markdown } = buildLcTagsMarkdown(job, req.params.stepKey);
    const tmpPath = path.join(os.tmpdir(), `lc-tags-${req.params.jobId}-${req.params.stepKey}.docx`);
    const docxBuffer = await generateBlueprintDocx(job.clientName, markdown, tmpPath);
    try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    const filename = `${sanitizeFilename(job.clientName)} - ${sanitizeFilename(title)}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(docxBuffer);
  } catch { res.status(500).json({ error: 'Failed to generate DOCX' }); }
});

// LC tags PDF — single stage
router.get('/:jobId/lc-tags/:stepKey/pdf', requireAdmin, async (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const { title, markdown } = buildLcTagsMarkdown(job, req.params.stepKey);
    const pdfBuffer = await generateBlueprintPdf(job.clientName, markdown);
    const filename = `${sanitizeFilename(job.clientName)} - ${sanitizeFilename(title)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch { res.status(500).json({ error: 'Failed to generate PDF' }); }
});

// HTML preview of the assembled blueprint
router.get('/:jobId/preview', requireAdmin, (req: Request, res: Response) => {

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
router.get('/:jobId/logs', requireAdmin, (req: Request, res: Response) => {

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

// Step preview — inline PDF (opens in browser tab)
router.get('/:jobId/step/:step/preview', requireAdmin, async (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const raw = getStepRaw(job, req.params.step);
    if (!raw) { res.status(404).json({ error: 'Step output not available' }); return; }
    const { markdown } = buildStepContent(req.params.step, raw);
    const pdfBuffer = await generateBlueprintPdf(job.clientName, markdown);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview-step-${req.params.step}.pdf"`);
    res.send(pdfBuffer);
  } catch { res.status(500).json({ error: 'Failed to generate preview' }); }
});

// Step PDF download
router.get('/:jobId/step/:step/pdf', requireAdmin, async (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const raw = getStepRaw(job, req.params.step);
    if (!raw) { res.status(404).json({ error: 'Step output not available' }); return; }
    const { title, markdown } = buildStepContent(req.params.step, raw);
    const pdfBuffer = await generateBlueprintPdf(job.clientName, markdown);
    const filename = `${sanitizeFilename(job.clientName)} - ${title}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch { res.status(500).json({ error: 'Failed to generate PDF' }); }
});

// Step DOCX download
router.get('/:jobId/step/:step/docx', requireAdmin, async (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const raw = getStepRaw(job, req.params.step);
    if (!raw) { res.status(404).json({ error: 'Step output not available' }); return; }
    const { title, markdown } = buildStepContent(req.params.step, raw);
    const tmpPath = path.join(os.tmpdir(), `step-${req.params.jobId}-${req.params.step}.docx`);
    const docxBuffer = await generateBlueprintDocx(job.clientName, markdown, tmpPath);
    try { fs.unlinkSync(tmpPath); } catch { /* ignore cleanup failure */ }
    const filename = `${sanitizeFilename(job.clientName)} - ${title}.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(docxBuffer);
  } catch { res.status(500).json({ error: 'Failed to generate DOCX' }); }
});

// Intermediate output download
router.get('/:jobId/step/:step', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const stepMap: Record<string, string | undefined> = {
      A:  job.stepA_corpus,
      B:  job.stepB_dossier,
      C:  job.stepC_maturity,
      D:  job.stepD_opportunities,
      D2: job.stepD2_roadmap,
      E:  job.stepE_assembly,
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

// Admin: download an original intake-uploaded file
router.get('/:jobId/files/:fileKey', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const fileInfo = job.uploadedFiles[req.params.fileKey];
    if (!fileInfo) { res.status(404).json({ error: 'File not found' }); return; }
    const filename = sanitizeFilename(fileInfo.filename) || `file-${req.params.fileKey}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
    if (fileInfo.storagePath && fs.existsSync(fileInfo.storagePath)) {
      fs.createReadStream(fileInfo.storagePath).pipe(res);
      return;
    }
    if (fileInfo.fileData) {
      res.send(Buffer.from(fileInfo.fileData, 'base64'));
      return;
    }
    res.status(404).json({ error: 'File data not available' });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// Admin: download a client re-upload
router.get('/:jobId/client-uploads/:uploadId', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const upload = (job.clientUploads || []).find((u) => u.id === req.params.uploadId);
    if (!upload) { res.status(404).json({ error: 'Upload not found' }); return; }
    const filename = sanitizeFilename(upload.filename) || `upload-${req.params.uploadId}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', upload.mimeType || 'application/octet-stream');
    if (upload.storagePath && fs.existsSync(upload.storagePath)) {
      fs.createReadStream(upload.storagePath).pipe(res);
      return;
    }
    if (upload.fileData) {
      res.send(Buffer.from(upload.fileData, 'base64'));
      return;
    }
    res.status(404).json({ error: 'File data not available' });
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

export default router;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().substring(0, 60);
}

function getStepRaw(job: ReturnType<typeof loadJob>, step: string): string | undefined {
  const map: Record<string, string | undefined> = {
    A: job.stepA_corpus, B: job.stepB_dossier, C: job.stepC_maturity,
    D: job.stepD_opportunities, D2: job.stepD2_roadmap, E: job.stepE_assembly,
  };
  return map[step.toUpperCase()];
}

function buildStepContent(step: string, raw: string): { title: string; markdown: string } {
  const titles: Record<string, string> = {
    A: 'Pre-Processing: Document Parsing Results',
    B: 'Stage 1: Intake Analysis',
    C: 'Stage 2: Maturity Scoring',
    D: 'Stage 3: Opportunity Mapping',
    D2: 'Stage 4: Action Roadmap',
    E: 'Stage 5: Document Assembly',
  };
  const title = titles[step.toUpperCase()] ?? `Step ${step}`;

  if (step.toUpperCase() === 'A') {
    try {
      const corpus = JSON.parse(raw) as {
        parsedAt?: string;
        documents?: Array<{ filename: string; category: string; status: string; wordCount?: number }>;
        failedDocuments?: Array<{ filename: string; category: string; error?: string }>;
        missingRequiredCategories?: string[];
      };
      const lines = [`# ${title}`, '', `**Parsed at:** ${corpus.parsedAt ?? 'unknown'}`, ''];
      if (corpus.documents?.length) {
        lines.push(`## Successfully Parsed (${corpus.documents.length})`, '');
        for (const d of corpus.documents)
          lines.push(`- **${d.filename}** — ${d.category} — ${d.wordCount ?? 0} words — status: ${d.status}`);
        lines.push('');
      }
      if (corpus.failedDocuments?.length) {
        lines.push(`## Failed to Parse (${corpus.failedDocuments.length})`, '');
        for (const d of corpus.failedDocuments)
          lines.push(`- **${d.filename}** — ${d.category} — Error: ${d.error ?? 'unknown'}`);
        lines.push('');
      }
      if (corpus.missingRequiredCategories?.length) {
        lines.push('## Missing Required Categories', '');
        for (const cat of corpus.missingRequiredCategories) lines.push(`- ${cat}`);
      }
      return { title, markdown: lines.join('\n') };
    } catch {
      return { title, markdown: `# ${title}\n\nRaw data could not be parsed.` };
    }
  }

  // Steps B–E: raw content is already markdown; ensure it begins with a heading
  const markdown = raw.trimStart().startsWith('#') ? raw : `# ${title}\n\n${raw}`;
  return { title, markdown };
}

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
