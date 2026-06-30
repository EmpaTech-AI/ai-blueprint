import { PipelineJob, ConfidenceResult, BLOCKER_PREFIX } from '../types/pipeline';
import {
  loadJob,
  updateJobStatus,
  saveStepOutput,
  appendErrorLog,
  updateConfidenceScores,
  updateReviewerFlags,
  saveDocxData,
  savePdfData,
  saveTxtData,
  saveHtmlData,
  jobExists,
} from '../storage/jobStore';
import { runStepA } from './stepA-parser';
import { runStepB } from './stepB-intake';
import { runStepC } from './stepC-maturity';
import { runStepD } from './stepD-opportunities';
import { runStepD2 } from './stepD2-roadmap';
import { runStepE } from './stepE-assembly';
import { generateBlueprintDocx, generateBlueprintPdf, generateBlueprintTxt } from '../docx/assembler';
import { generateBlueprintHtml } from '../docx/htmlAssembler';
import { detectResidualComponentMarkers } from '../docx/components';
import { calculateConfidence, stripJustification, stripForDelivery, stripForDeliveryStage5, detectResidualScaffold, stripToAllowlistedSections, allowlistStatus } from '../utils/confidenceScorer';
// stripJustification retained for intermediate *Clean handoffs; stripForDeliveryStage5 is the Stage-5 chokepoint.
import { validateOpportunityScores, validateRoadmapPhases, validateRelayFields, validateRoleNames, validateStrictDependencyPhases, validateFirmSurnameBleed } from '../utils/opportunityValidator';
import { log } from '../utils/logger';
import path from 'path';
import fs from 'fs';

const JOBS_DIR = process.env.JOBS_DIR ||
  (process.env.NODE_ENV === 'production' ? '/app/data/jobs' : path.join(__dirname, '../../jobs'));

class CancelledError extends Error {
  constructor(jobId: string) { super(`Job ${jobId} was cancelled`); this.name = 'CancelledError'; }
}

function assertNotCancelled(jobId: string): void {
  if (!jobExists(jobId)) throw new CancelledError(jobId);
}

// ─── Quality gate helpers ──────────────────────────────────────────────────────

type ScoreBand = 'green' | 'amber' | 'blue' | 'red';

function scoreBand(score: number): ScoreBand {
  if (score >= 90) return 'green';
  if (score >= 76) return 'amber';
  if (score >= 60) return 'blue';
  return 'red';
}

function buildCorrectiveNote(result: ConfidenceResult, stepLabel: string): string {
  const band = scoreBand(result.score).toUpperCase();
  return (
    `\n\n---\n[AUTOMATED QUALITY GATE FEEDBACK — RETRY REQUEST]\n` +
    `Your previous output for ${stepLabel} scored ${result.score}% (${band} band).\n` +
    (result.scoreContext ? `Diagnosis: ${result.scoreContext}\n` : '') +
    `Please regenerate the complete output. Priority actions:\n` +
    `- Replace [Inferred] and [Assumption] tags with [Document-Backed] or [Form-Stated] ` +
    `citations wherever the underlying evidence exists in the provided materials\n` +
    `- Ensure all required sections are complete and meet minimum depth requirements\n` +
    `- Where evidence is genuinely absent, keep [Assumption] or [Inferred] but ensure ` +
    `every such tag has a corresponding [JUSTIFICATION] appendix entry\n` +
    `[END FEEDBACK]`
  );
}

// Runs a pipeline step, enforces the quality gate, and retries once if Red or Blue.
//
// Decision logic (mirrors quality-gate-algorithm.md):
//   Green (≥90%)  → proceed, no flag
//   Amber (76–89%) → proceed, add reviewer flag
//   Blue  (60–75%) → retry once with corrective note; if retry ≥60% proceed with flag; if retry Red → fail
//   Red   (<60%)   → retry once with corrective note; if retry ≥60% proceed with flag; if retry Red → fail
async function runStepWithGate(
  stepLabel: string,
  scoreKey: string,
  runner: (corrective?: string) => Promise<string>,
  confidenceScores: Record<string, ConfidenceResult>,
  reviewerFlags: string[],
): Promise<string> {
  let output = await runner();
  let score = calculateConfidence(output, scoreKey);
  const initialBand = scoreBand(score.score);
  let initialScore = score.score;
  let retried = false;

  if (initialBand === 'red' || initialBand === 'blue') {
    retried = true;
    const corrective = buildCorrectiveNote(score, stepLabel);
    log('warn', `Quality gate ${initialBand.toUpperCase()} for ${stepLabel}: ${score.score}% — running automated retry`);

    const retriedOutput = await runner(corrective);
    const retriedScore = calculateConfidence(retriedOutput, scoreKey);

    if (scoreBand(retriedScore.score) === 'red') {
      throw new Error(
        `Quality gate FAIL: ${stepLabel} scored ${retriedScore.score}% (Red) after automated retry. ` +
        `Pipeline halted for manual review. Initial score: ${initialScore}%.`,
      );
    }

    output = retriedOutput;
    score = retriedScore;
    log('info', `${stepLabel} retry improved score: ${initialScore}% → ${score.score}% (${scoreBand(score.score).toUpperCase()})`);
  }

  confidenceScores[scoreKey] = score;

  if (score.score < 76) {
    const retryNote = retried ? ` (automated retry performed; initial score: ${initialScore}%)` : '';
    reviewerFlags.push(`${stepLabel} confidence: ${score.score}% — below Amber threshold (76%)${retryNote}`);
  } else if (retried) {
    log('info', `${stepLabel} gate resolved to ${scoreBand(score.score).toUpperCase()} after retry — no reviewer flag needed`);
  }

  return output;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// D8: Record server start time at module load so the build-freshness guard can
// compare it against dist/ file mtimes during each pipeline run.
const SERVER_START_TIME_MS = Date.now() - Math.round(process.uptime() * 1000);

// Strip internal test-run labels (e.g. "v17 Test 1", "v18 Test 2") from the client
// name before it appears on client-facing cover pages and document metadata.
// The job record itself retains the original name for internal tracking.
function stripTestLabel(name: string): string {
  return name.replace(/\s+v?\d+(\.\d+)*[\s_-]*[Tt]est[\s_-]*\d+\s*$/i, '').trim();
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────

export async function runPipeline(jobId: string): Promise<void> {
  const job = loadJob(jobId);
  const reviewerFlags: string[] = [];
  const confidenceScores: PipelineJob['confidenceScores'] = {};

  // D8: Build-freshness guard. In production the server runs node dist/server.js — if
  // npm run build was executed after this process started, dist/ is newer than the loaded
  // modules. Reject the run immediately so the operator gets a clear error rather than
  // silently running stale code for another full batch.
  const distFilesToCheck = [
    path.join(__dirname, '../utils/confidenceScorer.js'),
    path.join(__dirname, '../docx/assembler.js'),
    path.join(__dirname, '../docx/htmlAssembler.js'),
  ];
  for (const distPath of distFilesToCheck) {
    if (fs.existsSync(distPath)) {
      const buildMtime = fs.statSync(distPath).mtimeMs;
      if (buildMtime > SERVER_START_TIME_MS) {
        const filename = path.basename(distPath);
        throw new Error(
          `D8 STALE BUILD: dist/${filename} was rebuilt after this server process started. ` +
          'Restart the server (npm start) to load the latest compiled code before running new pipeline jobs.',
        );
      }
    }
  }

  // Strip internal test-run labels before the name is embedded in client-facing deliverables.
  const deliveryClientName = stripTestLabel(job.clientName);

  log('info', `Pipeline started for job ${jobId}`, {
    client: job.clientName,
    gitCommit: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unknown',
  });

  try {
    // Step A — parse documents
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'A');
    const corpus = await runStepA(job.uploadedFiles);
    await saveStepOutput(jobId, 'A', corpus);

    if (corpus.failedDocuments.length > 0) {
      const names = corpus.failedDocuments.map((d) => d.filename).join(', ');
      throw new Error(
        `Document parse failure: ${corpus.failedDocuments.length} file(s) could not be parsed (${names}). ` +
        `Pipeline halted to preserve output quality — fix or remove the failing file(s) and re-run.`,
      );
    }
    if (corpus.missingRequiredCategories.length > 0) {
      reviewerFlags.push(`Missing required document categories: ${corpus.missingRequiredCategories.join(', ')}`);
    }

    // Step B — blueprint-intake (chunked 3-pass invocation)
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'B');
    const dossier = await runStepWithGate(
      'Stage 1 (Intake Analysis)', 'stepB',
      (corrective?) => runStepB(job.formAnswers, corpus, corrective),
      confidenceScores, reviewerFlags,
    );
    await saveStepOutput(jobId, 'B', dossier);
    const dossierClean = stripJustification(dossier);

    // Step C — blueprint-maturity
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'C');
    const maturity = await runStepWithGate(
      'Stage 2 (Maturity Scoring)', 'stepC',
      (corrective?) => runStepC(dossierClean, corrective),
      confidenceScores, reviewerFlags,
    );
    await saveStepOutput(jobId, 'C', maturity);

    // P2-2a (completeness guard): Verify all 6 dimension headings present in raw Step C output.
    // Checks source before proceeding — D6 satisfied. Worth keeping standalone.
    // The real P2-2 (per-dimension absence-of-record check) requires D3 sign-off and will be
    // built alongside P1 — it must not be considered delivered by this guard.
    const MATURITY_DIMENSIONS = ['Strategy', 'Data', 'Technology', 'People', 'Processes', 'Governance'];
    const missingDimensions = MATURITY_DIMENSIONS.filter(
      (dim) => !new RegExp(`##?#?\\s+${dim}\\b`, 'im').test(maturity),
    );
    if (missingDimensions.length > 0) {
      reviewerFlags.push(
        `Stage 2 (Maturity) is missing ${missingDimensions.length}/6 dimension(s): ` +
        `${missingDimensions.join(', ')} — verify Step C output before proceeding; ` +
        `downstream steps may produce incomplete maturity data.`,
      );
      log('warn', `Stage 2 missing dimensions: ${missingDimensions.join(', ')}`, { jobId });
    }

    const maturityClean = stripJustification(maturity);

    // Step D — blueprint-opportunities
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'D');
    const opportunitiesRaw = await runStepWithGate(
      'Stage 3 (Opportunity Mapping)', 'stepD',
      (corrective?) => runStepD(dossierClean, maturityClean, corrective),
      confidenceScores, reviewerFlags,
    );

    // GATE 3: validate product arithmetic, classification consistency, and portfolio shape.
    // Auto-patches product field arithmetic errors; flags classification violations for manual review.
    const { corrected: opportunities, reviewerFlags: gate3Flags, scores: gate3Scores } = validateOpportunityScores(opportunitiesRaw);
    if (gate3Flags.length > 0) {
      reviewerFlags.push(...gate3Flags);
      log('warn', 'GATE 3: Stage 3 validation issues detected', { jobId, count: gate3Flags.length });
    }

    // T-26 (S-29): cross-stage relay-field drift — the nine T-19 fields must be byte-identical
    // Stage 1 → Stage 3, else Stage 4 phase placement can fork. Compares raw score comments by ID.
    const { reviewerFlags: relayFlags } = validateRelayFields(dossier, opportunities);
    if (relayFlags.length > 0) {
      reviewerFlags.push(...relayFlags);
      log('warn', 'GATE 3: relay-field drift detected', { jobId, count: relayFlags.length });
    }

    await saveStepOutput(jobId, 'D', opportunities);
    const opportunitiesClean = stripJustification(opportunities);

    // Step D2 — blueprint-roadmap
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'D2');
    const roadmap = await runStepWithGate(
      'Stage 4 (Action Roadmap)', 'stepD2',
      (corrective?) => runStepD2(opportunitiesClean, maturityClean, corrective),
      confidenceScores, reviewerFlags,
    );
    // GATE 4: validate phase structure and Quick Win placement against Stage 3 scores.
    const { reviewerFlags: gate4Flags } = validateRoadmapPhases(roadmap, gate3Scores);
    if (gate4Flags.length > 0) {
      reviewerFlags.push(...gate4Flags);
      log('warn', 'GATE 4: Stage 4 roadmap validation issues detected', { jobId, count: gate4Flags.length });
    }

    // T-27 (S-30 / KR3): strict-dependency phase determinism. A `phase_dependency=strict` opportunity
    // must be placed in Later unconditionally — the pinned rule that closes the H-RT-04 fork. Reads the
    // field from the Stage-3 score comments and the assignment from the Phase Summary table; a strict
    // opportunity placed anywhere but Later is a BLOCKER (clean fail, not a silent decision-layer fork).
    const { reviewerFlags: strictDepFlags } = validateStrictDependencyPhases(roadmap, opportunities);
    if (strictDepFlags.length > 0) {
      reviewerFlags.push(...strictDepFlags);
      log('warn', 'GATE 4: strict-dependency phase placement violation (T-27)', { jobId, count: strictDepFlags.length });
    }

    await saveStepOutput(jobId, 'D2', roadmap);
    const roadmapClean = stripJustification(roadmap);

    // Step E — blueprint-assembly
    assertNotCancelled(jobId);
    await updateJobStatus(jobId, 'running', 'E');
    const assembled = await runStepWithGate(
      'Stage 5 (Document Assembly)', 'stepE',
      (corrective?) => runStepE(dossierClean, maturityClean, opportunitiesClean, roadmapClean, corrective),
      confidenceScores, reviewerFlags,
    );
    await saveStepOutput(jobId, 'E', assembled);

    // T-23: Stage-5 delivery strip — shared scaffold strips PLUS the position-envelope guarantee
    // (document begins at first section header, ends at the Final marker; margins removed wholesale).
    // T-29: then permit-only the known Stage-5 sections (any non-permitted top-level section stripped).
    const assembledStripped = stripForDeliveryStage5(assembled);
    const assembledForDelivery = stripToAllowlistedSections(assembledStripped, 'stepE');
    // Practice §2 (WL-15 evidence): emit an affirmative per-stage allowlist run-status into the
    // reviewer-metadata, for EVERY stage incl. clean — a NO-OP (ran=false) means the stage is
    // UNVERIFIED for leaks (indistinguishable from clean unless flagged).
    const s5Status = allowlistStatus(assembledStripped, 'stepE');
    reviewerFlags.push(s5Status.ran
      ? `T-29 allowlist (Stage 5): ${s5Status.detail}`
      : `⚠ T-29 allowlist (Stage 5): ${s5Status.detail} — stage UNVERIFIED for leaks; do not certify clean.`);
    if (!s5Status.ran) log('warn', 'Stage 5: T-29 allowlist NO-OP (fail-safe engaged)', { jobId, detail: s5Status.detail });

    // T-23 (Block 2.2) envelope fail-closed guard: the position envelope is only DEFINED when both
    // ends are present — a leading top-level `# ` header and the Final marker. A run missing either
    // is a malformed assembly where the envelope cannot bound the document; fail closed (BLOCKER →
    // un-approvable) rather than fail open (ship an unbounded doc).
    if (!/^#[ \t]+\S/m.test(assembledForDelivery)) {
      reviewerFlags.push(`${BLOCKER_PREFIX} Stage 5 envelope undefined — no top-level "# " section header in the assembled deliverable (malformed assembly). Fail closed: do not release.`);
    }
    if (!/End of AI Value Blueprint/i.test(assembledForDelivery)) {
      reviewerFlags.push(`${BLOCKER_PREFIX} Stage 5 envelope undefined — no Final marker ("End of AI Value Blueprint") in the assembled deliverable. Fail closed: do not release.`);
    }

    // T-23 detector (the scan): assert no scaffold form survived the strip+envelope. Observability —
    // a residual flag means a relocation we did not anticipate; the envelope should make this empty.
    const residualFlags = detectResidualScaffold(assembledForDelivery);
    if (residualFlags.length > 0) {
      reviewerFlags.push(...residualFlags);
      log('warn', 'Stage 5: residual scaffold detected after delivery strip', { jobId, count: residualFlags.length });
    }

    // T-28 (REG-14 / WL-13): whole-pipeline leak coverage. The Era-K leak relocated to the Stage-1
    // Intake deliverable because the strip+scan had only ever run on Stage 5. Run the same strip and
    // detector on EVERY staged deliverable — a residual at any stage is now a never-ship BLOCKER.
    const stageDeliverables: Array<[string, string, string]> = [
      ['Stage 1 (Intake)', 'stepB', dossier],
      ['Stage 2 (Maturity)', 'stepC', maturity],
      ['Stage 3 (Opportunities)', 'stepD', opportunities],
      ['Stage 4 (Roadmap)', 'stepD2', roadmap],
    ];
    for (const [label, stepKey, raw] of stageDeliverables) {
      const base = stripForDelivery(raw);
      // Practice §2 (WL-15 evidence): affirmative per-stage allowlist run-status (every stage).
      const st = allowlistStatus(base, stepKey);
      reviewerFlags.push(st.ran
        ? `T-29 allowlist (${label}): ${st.detail}`
        : `⚠ T-29 allowlist (${label}): ${st.detail} — stage UNVERIFIED for leaks; do not certify clean.`);
      if (!st.ran) log('warn', `${label}: T-29 allowlist NO-OP (fail-safe engaged)`, { jobId, detail: st.detail });
      const stageResidual = detectResidualScaffold(stripToAllowlistedSections(base, stepKey), label);
      if (stageResidual.length > 0) {
        reviewerFlags.push(...stageResidual);
        log('warn', `${label}: residual scaffold detected after delivery strip (T-28)`, { jobId, count: stageResidual.length });
      }
    }

    // S-26 (WL-8): role-attributed CEO-name check against the pinned INTAKE_FACTS value (never-ship).
    const { reviewerFlags: roleFlags } = validateRoleNames(assembledForDelivery, dossier);
    if (roleFlags.length > 0) {
      reviewerFlags.push(...roleFlags);
      log('warn', 'Stage 5: role-attributed name mismatch detected', { jobId, count: roleFlags.length });
    }

    // S-26 hardening: firm-context surname stoplist — defense in depth behind the role-name guard.
    // No AI Assist BG name may appear in a client Blueprint; catches the v32 "Petrov" firm-bleed
    // even in non-role contexts and when no CEO_NAME is pinned (client names are exempted).
    const { reviewerFlags: firmFlags } = validateFirmSurnameBleed(assembledForDelivery, dossier);
    if (firmFlags.length > 0) {
      reviewerFlags.push(...firmFlags);
      log('warn', 'Stage 5: firm-context surname bleed detected', { jobId, count: firmFlags.length });
    }

    // T-07: Record pipeline build stamp unconditionally in reviewer metadata so every run
    // carries a traceable date+sha regardless of whether the assembly model emitted one.
    const buildStampDate = new Date().toISOString().split('T')[0];
    const buildStampSha = process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unset';
    // T-07 Option B (stamp anchoring): the hand-set `pipeline=vNN` label historically lagged the
    // Practice report eras (the Era H "v31" batch ran on a v30-stamped orchestrator). So from v33
    // onward the fleet-uniformity anchor is the commit SHA, not the label. Each run self-declares
    // whether it is anchored (real SHA present) or label-only (SHA unset → the vNN is a tag, not proof).
    const anchored = buildStampSha !== 'unset';
    log('info', `Pipeline build stamp: date=${buildStampDate} sha=${buildStampSha} anchored=${anchored}`, { jobId });
    reviewerFlags.push(`Build: date=${buildStampDate} pipeline=v35.1 sha=${buildStampSha} anchor=${anchored ? 'sha' : 'label-only'}`);
    if (!anchored) {
      reviewerFlags.push(
        'Provenance: this run is LABEL-ONLY (sha=unset) — pipeline=v35.1 is a human tag, not a verifiable ' +
        'build anchor. Populate RAILWAY_GIT_COMMIT_SHA (migrate Railway) so the SHA anchors the n=4 fleet-uniformity check.',
      );
    }


    // Generate DOCX
    fs.mkdirSync(JOBS_DIR, { recursive: true });
    const docxFilename = `AI Value Blueprint - ${sanitizeName(job.clientName)}.docx`;
    const docxPath = path.join(JOBS_DIR, jobId, docxFilename);
    fs.mkdirSync(path.dirname(docxPath), { recursive: true });
    const docxBuffer = await generateBlueprintDocx(deliveryClientName, assembledForDelivery, docxPath);

    await saveDocxData(jobId, docxBuffer.toString('base64'));

    const pdfBuffer = await generateBlueprintPdf(deliveryClientName, assembledForDelivery);
    await savePdfData(jobId, pdfBuffer.toString('base64'));

    const txtContent = generateBlueprintTxt(deliveryClientName, assembledForDelivery);
    await saveTxtData(jobId, txtContent);

    const htmlContent = generateBlueprintHtml(deliveryClientName, assembledForDelivery);
    await saveHtmlData(jobId, htmlContent);

    // WS4 §C6b: post-render residual-component-marker net. A well-formed Class-C marker that the
    // renderer failed to consume would surface as literal text in the output — never-ship. Scan the
    // rendered text artifacts (HTML + TXT share the parser family with DOCX/PDF). Malformed markers
    // already fail loud (§C4) inside the generators above, aborting the run before this point.
    const componentResidual = [
      ...new Set([
        ...detectResidualComponentMarkers(htmlContent),
        ...detectResidualComponentMarkers(txtContent),
      ]),
    ];
    if (componentResidual.length > 0) {
      reviewerFlags.push(...componentResidual);
      log('warn', 'Stage 5: residual component marker survived rendering', { jobId, count: componentResidual.length });
    }

    await updateConfidenceScores(jobId, confidenceScores);
    await updateReviewerFlags(jobId, reviewerFlags);
    await updateJobStatus(jobId, 'review_ready', 'complete', { outputDocxPath: docxPath, confidenceScores });

    log('info', `Pipeline complete for job ${jobId}`, { docxPath, flags: reviewerFlags.length });
  } catch (error: unknown) {
    if (error instanceof CancelledError) {
      log('info', `Pipeline cancelled for job ${jobId}`);
      return;
    }
    const msg = error instanceof Error ? error.message : String(error);
    log('error', `Pipeline failed for job ${jobId}: ${msg}`);
    try {
      await appendErrorLog(jobId, msg);
      const current = loadJob(jobId);
      await updateJobStatus(jobId, 'failed', current.currentStep);
    } catch {
      // job was deleted while pipeline was running
    }
    throw error;
  }
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, '').trim().substring(0, 60);
}
