import express, { Request, Response } from 'express';
import { loadJob } from '../storage/jobStore';
import { generateBlueprintPdf, generateBlueprintDocx } from '../docx/assembler';
import { generateBlueprintHtml } from '../docx/htmlAssembler';
import { TOKENS_VERSION } from '../docx/designTokens';
import { BACKEND_COMPOSITION_THRESHOLDS, GROUNDING_GREEN, stripForDelivery, stripForDeliveryStage5 } from '../utils/confidenceScorer';
import { requireAdmin } from '../middleware/auth';
import path from 'path';
import fs from 'fs';
import os from 'os';

const router = express.Router();

// T-07: build provenance. parent_build anchors the fleet-uniformity check; fix_lineage records
// which prior batch each surface descends from so a reviewer can trace a fix to its origin.
const PARENT_BUILD = 'v33.2 (S-26 firm-stoplist; pending T-10⁶ acceptance)';
// T-07 Option B: document the historical stamp drift so the fleet-uniformity check anchors on the
// SHA from v33 onward, not the hand-set vNN label (which lagged — confirmed in git history).
const STAMP_LINEAGE_NOTE: string[] = [
  'Build stamps before v33 LAGGED the Practice report eras. The `pipeline=vNN` label was set to ' +
  '`v30` (commit 2971c03) and left unchanged through the commit messaged `v31.2`, so the Era H ' +
  '("v31") batch ran on a **v30-stamped** orchestrator. The `vNN` label is a human-readable tag, ' +
  'NOT a verifiable build anchor.',
  'From v33 onward the fleet-uniformity anchor is the **commit SHA** (`anchor=sha`). A run stamped ' +
  '`sha=unset` is **label-only / unanchored** — migrate Railway so `RAILWAY_GIT_COMMIT_SHA` is ' +
  'populated and the SHA becomes the real anchor for the n=4 check.',
];
const FIX_LINEAGE: string[] = [
  'T-23/S-28 (leak): v32 narration relocation → v33 position-envelope guarantee + enumerated scan',
  'T-24/D-9 (grounding): v32 AA folded into numerator → v33 de-conflated (grounding = DB+FS/total; AA on reproducibility axis; pinned one-per-scored-ID)',
  'T-25/S-25 (Stage-4 structure): v32 self-check fork → v33 self-check suppressed + mandatory Phase Summary table',
  'T-26/S-29 (emission): v32 H-RT-XX stub / doubled marker / relay drift → v33 comment-class strip + GATE-3 stub/duplicate flags + cross-stage relay-field validator',
  'S-26/WL-8 (CEO name): v32 "Petrov" hallucination → v33 role-attributed name validator + INTAKE_FACTS pin',
  'T-27/S-30 (phase determinism): v33 T-10⁵ regressed KR3 — H-RT-04 forked Later×3/Next×1 because the strict-dependency rule was pinned only for "antecedent in Next" → v33.1 pins phase_dependency=strict ⇒ Later unconditionally (SKILL) + validateStrictDependencyPhases BLOCKER (code)',
  'S-31 (Stage-4 breadcrumb): v33 leaked "Step 4 of 5" pipeline-position subtitle 1/4 → v33.1 stripProcessNarration + detector enumerate the "Step N of M" form',
  'S-26 hardening (firm-context bleed): the v32 "Petrov" was AI Assist BG\'s own CEO surname bleeding from firm standing context → v33.2 validateFirmSurnameBleed — a firm-surname stoplist (env-extensible, client-name exempt) behind the role-name guard; any firm surname in a client Blueprint is a never-ship BLOCKER',
  'S-26 roster (Practice v33.2 §1.2): v33.3 seeds the full firm roster (petrov, gumushian, montin, kara) into the default stoplist — house-fact bleed guarded proactively, not per-incident; token-scoped INTAKE_FACTS exemption disables only the specific shared surname',
];

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

// T-07: Reviewer-metadata export (internal-facing). Bundles the build stamp (date + pipeline
// version + commit SHA), reviewer flags, and per-stage confidence scores into a single
// downloadable file so a run can self-verify which build produced it — closing the provenance
// gap without embedding the SHA in the client-facing document.
router.get('/:jobId/reviewer-metadata', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    const flags = job.reviewerFlags ?? [];
    const buildFlag = flags.find((f) => /^Build:/i.test(f));

    // T-07 (v33 schema): build_date · pipeline_version · commit_sha · parent_build · per-stage
    // {DB,FS,AA,Inf,Asm,grounding,doc%,LC} · reviewer_flags · fix_lineage. AA is its OWN column,
    // never folded into grounding (D-9/B′). Grounding = (DB+FS)/total; delivery-readiness credits AA.
    const buildStamp = buildFlag ? buildFlag.replace(/^Build:\s*/i, '') : 'not recorded';
    const pipelineVersion = buildStamp.match(/pipeline=(\S+)/)?.[1] ?? 'unknown';
    const anchored = buildStamp !== 'not recorded' && !/sha=unset/i.test(buildStamp);
    const anchorStatus = anchored ? 'anchored (commit SHA present)' : 'LABEL-ONLY (sha=unset — not a verifiable anchor)';

    const lines: string[] = [
      `# Reviewer Metadata — ${job.clientName}`,
      '',
      `**Job ID:** ${req.params.jobId}`,
      `**Status:** ${job.status}`,
      `**Build stamp:** ${buildStamp}`,
      `**Pipeline version:** ${pipelineVersion}`,
      `**Design system:** v${TOKENS_VERSION} (renderer palette/type scale; separate axis from the pipeline version)`,
      `**Parent build:** ${PARENT_BUILD}`,
      `**Provenance anchor:** ${anchorStatus}`,
      '',
      '## Build Provenance & Stamp Lineage',
      '',
      ...STAMP_LINEAGE_NOTE.map(n => `- ${n}`),
      '',
      '## Confidence Scores by Stage',
      '',
      '_Grounding = client-evidence (DB+FS) ÷ total. Archetype-Anchored is a separate reproducibility',
      'axis and is NOT folded into grounding (D-9/B′). Delivery-readiness = (DB+FS+AA) ÷ total._',
      '',
    ];

    const scores = job.confidenceScores ?? {};
    const stageLabels: Record<string, string> = {
      stepB: 'Stage 1 — Intake', stepC: 'Stage 2 — Maturity', stepD: 'Stage 3 — Opportunities',
      stepD2: 'Stage 4 — Roadmap', stepE: 'Stage 5 — Assembly',
    };
    const scoreKeys = Object.keys(scores);
    if (scoreKeys.length) {
      lines.push(
        '| Stage | Grounding | Delivery-Ready | doc% | LC | DB | FS | Archetype | Inferred | Assumption |',
        '|---|---|---|---|---|---|---|---|---|---|',
      );
      for (const key of ['stepB', 'stepC', 'stepD', 'stepD2', 'stepE']) {
        const s = scores[key];
        if (!s) continue;
        const b = s.breakdown;
        const db = b?.documentBacked ?? 0;
        const fs = b?.formStated ?? 0;
        const aa = b?.archetypeAnchored ?? 0;
        const total = b?.total ?? 0;
        const docPct = s.documentVerifiedPercent ?? (db + fs > 0 ? Math.round((db / (db + fs)) * 100) : 0);
        const ready = s.deliveryReadiness ?? (total > 0 ? Math.round(((db + fs + aa) / total) * 100) : s.score);
        const lc = s.lowConfidenceCount ?? ((b?.inferred ?? 0) + (b?.assumption ?? 0));
        lines.push(
          `| ${stageLabels[key] ?? key} | ${s.score}% | ${ready}% | ${docPct}% | ${lc} | ${db} | ${fs} | ` +
          `${aa} | ${b?.inferred ?? 0} | ${b?.assumption ?? 0} |`,
        );
      }
      lines.push('');
    } else {
      lines.push('_No confidence scores recorded for this job._', '');
    }

    lines.push('## Reviewer Flags', '');
    if (flags.length) for (const f of flags) lines.push(`- ${f}`);
    else lines.push('_No reviewer flags raised._');
    lines.push('');

    lines.push('## Fix Lineage', '');
    for (const entry of FIX_LINEAGE) lines.push(`- ${entry}`);
    lines.push('');

    const filename = `Reviewer Metadata - ${sanitizeFilename(job.clientName)}.md`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(lines.join('\n'));
  } catch {
    res.status(404).json({ error: 'Job not found' });
  }
});

// HTML download
router.get('/:jobId/html', requireAdmin, (req: Request, res: Response) => {
  try {
    const job = loadJob(req.params.jobId);
    if (!job.outputHtmlData) {
      res.status(404).json({ error: 'HTML not available — re-run the pipeline to generate it' });
      return;
    }
    const filename = `AI Value Blueprint - ${sanitizeFilename(job.clientName)}.html`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(job.outputHtmlData);
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
  deliveryReadiness?: number;
  highConfidenceCount?: number;
  lowConfidenceCount?: number;
  breakdown?: { documentBacked: number; formStated: number; archetypeAnchored?: number; inferred: number; assumption: number; total: number };
  documentVerifiedPercent?: number;
  justificationEntries?: Array<{ index: number; tag: string; label: string; claim: string; whyTagged: string; missingData: string; consultantAction: string }>;
  inferredSnippets?: string[];
  assumptionSnippets?: string[];
};

function computeLcBadge(stepKey: string, data: LcStepData): { band: string; descriptor: string } {
  const db   = data.breakdown?.documentBacked ?? 0;
  const fs   = data.breakdown?.formStated     ?? 0;
  const aa   = data.breakdown?.archetypeAnchored ?? 0;
  // Composition (docPct) is the documentary-vs-form split of CLIENT-EVIDENCE claims only —
  // archetype-anchored basis is excluded here so it does not dilute the reading (S-23).
  const high = db + fs;
  // Grounded-presence guard counts the full grounded pool (incl. archetype-anchored basis):
  // a card scored purely off the archetype with no DB/FS relevance claims is still grounded.
  const grounded = db + fs + aa;
  const docPct      = data.documentVerifiedPercent ?? (high > 0 ? Math.round((db / high) * 100) : (data.score ?? 0));
  const blendedScore = data.score ?? 0;

  if (grounded === 0) return { band: LC_TIER_BANDS[3], descriptor: LC_TIER_DESCRIPTORS[3] };

  const t          = BACKEND_COMPOSITION_THRESHOLDS[stepKey] ?? BACKEND_COMPOSITION_THRESHOLDS.stepE;
  const compTier   = docPct      >= t.green         ? 0 : docPct      >= t.amber ? 1 : 2;
  const groundTier = blendedScore >= GROUNDING_GREEN ? 0 : blendedScore >= 76    ? 1 : blendedScore >= 60 ? 2 : 3;
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

  const db       = data.breakdown?.documentBacked ?? 0;
  const fs       = data.breakdown?.formStated     ?? 0;
  const aa       = data.breakdown?.archetypeAnchored ?? 0;
  const high     = db + fs;
  const docPct   = data.documentVerifiedPercent ?? (high > 0 ? Math.round((db / high) * 100) : (data.score ?? 0));
  const grounding = data.score ?? 0;
  const total    = data.breakdown?.total ?? 0;
  const inf      = data.breakdown?.inferred   ?? 0;
  const asm      = data.breakdown?.assumption ?? 0;
  const lcCount  = data.lowConfidenceCount ?? (inf + asm);
  // D-9 / B′: grounding (client-evidence) and delivery-readiness (which credits the archetype
  // basis) are reported on SEPARATE axes — AA is never summed into a numerator called "grounding".
  const deliveryReadiness = data.deliveryReadiness ?? (total > 0 ? Math.round(((high + aa) / total) * 100) : grounding);

  lines.push(
    `**Grounding:** ${band}`,
    `**Grounding (client-evidence, DB+FS ÷ total):** ${grounding}%   ·   **Documentary (doc%):** ${docPct}%   ·   **Low-confidence tags:** ${lcCount}`,
    '',
    `*${descriptor}*`,
    '',
    // D-9 / B′: Archetype-Anchored is reported on its own reproducibility axis and is NEVER folded
    // into the grounding numerator (the v32 "invisible remainder" that bought a green badge).
    `**Citation breakdown — ${total} total tags**`,
    `Document-Backed: **${db}**   ·   Form-Stated: **${fs}**   ·   Archetype-Anchored: **${aa}**   ·   Inferred: **${inf}**   ·   Assumption: **${asm}**`,
    '',
  );
  if (aa > 0) {
    lines.push(
      `> **Archetype-Anchored basis (${aa} — reproducibility axis, NOT grounding):** score components ` +
      `locked to the matched archetype's Typical values — deterministic, byte-identical across runs, ` +
      `pinned one-per-scored-opportunity. This basis is **not** client evidence, so it is excluded ` +
      `from the grounding figure above. **Delivery-readiness composite (DB+FS+AA ÷ total): ${deliveryReadiness}%** ` +
      `— the figure that credits the reproducible basis. Read grounding and delivery-readiness as two ` +
      `facts; never as one "grounding ${deliveryReadiness}%" headline.`,
      '',
    );
  }
  lines.push('---', '');
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

// HTML preview of the assembled blueprint — the faithful deliverable design.
// Serves the production-generated HTML (job.outputHtmlData, built with the same
// generateBlueprintHtml renderer as the Document Lab) so the preview matches the actual
// deliverable. Falls back to a live render from the raw Stage-5 output for jobs created
// before HTML was persisted.
router.get('/:jobId/preview', requireAdmin, (req: Request, res: Response) => {

  try {
    const job = loadJob(req.params.jobId);
    const html = job.outputHtmlData
      ?? (job.stepE_assembly ? generateBlueprintHtml(job.clientName, stripForDeliveryStage5(job.stepE_assembly)) : undefined);
    if (!html) {
      res.status(404).send('<p>Preview not available — pipeline not complete.</p>');
      return;
    }

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

  // Steps B–E: strip build stamp / LC tags / justification before rendering. Step E (the client
  // deliverable) also gets the position-envelope guarantee; intermediate stages don't (they don't
  // start with a `# ` header, so the envelope must not run on them).
  const clean = step.toUpperCase() === 'E' ? stripForDeliveryStage5(raw) : stripForDelivery(raw);
  const markdown = clean.trimStart().startsWith('#') ? clean : `# ${title}\n\n${clean}`;
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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
