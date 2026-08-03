import { PipelineJob, ConfidenceResult, BLOCKER_PREFIX } from '../types/pipeline';
import { BUILD } from '../utils/buildInfo';
import { parseRunIndex, resolveClientTitleName } from '../utils/clientName';
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
import { validateOpportunityScores, validateRoadmapPhases, validateRelayFields, validateRoleNames, validateStrictDependencyPhases, validateFirmSurnameBleed, validatePortfolioMembership, validateClassificationLabels, classificationCorrectionRecords } from '../utils/opportunityValidator';
import { validateFeasibilityFromRoot, validateRootIntegrity, parseArchetypeHypothesisTable, assessMaturityAvailability, buildGateACoverage, formatGateACoverage, FamilyCoverage, HypothesisRoot } from '../utils/classGGuards';
import { validateDataInventory, validatePoolExclusions } from '../utils/inventoryGuards';
import { reconcileFinancials } from '../utils/financialReconciliation';
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

// Resolve the archetype hypothesis roots (base scores + flags) for the emitted hypothesis IDs by
// scanning the archetype library and picking the file whose table best covers those IDs. READ-ONLY
// — the archetype files are a frozen GREEN stage; we read, never edit.
//
// v37.4 (LunaCart TC1): this used to return a bare Map and swallow every failure in one `catch`, so
// three distinct outcomes were indistinguishable to the caller — "no archetype covers these IDs"
// (legitimate: 6 of 9 industries are SKELETON ONLY), "the directory could not be read" (a bug), and
// "one file covered 1 of 8 IDs" (which made a 12%-covered run report exactly like a full one). The
// resolution is now a diagnostic result so the guards can declare which of those actually happened.
interface ArchetypeResolution {
  roots: Map<string, HypothesisRoot>;
  cover: number;          // how many of the emitted IDs the chosen table actually carries
  source: string | null;  // which archetype file won
  filesScanned: number;
  error: string | null;   // non-null ⇒ internal fault, NOT a missing reference
}

function resolveArchetypeRoots(emittedIds: Set<string>): ArchetypeResolution {
  const dir = path.join(__dirname, '../skills/blueprint-intake/archetypes');
  const res: ArchetypeResolution = { roots: new Map(), cover: 0, source: null, filesScanned: 0, error: null };
  try {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md') || file.startsWith('_')) continue;
      res.filesScanned++;
      const roots = parseArchetypeHypothesisTable(fs.readFileSync(path.join(dir, file), 'utf-8'));
      const cover = Array.from(emittedIds).filter(id => roots.has(id)).length;
      if (cover > res.cover) { res.roots = roots; res.cover = cover; res.source = file; }
    }
  } catch (e) {
    res.error = String(e);
  }
  return res;
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

    // A11–A15 (v37.4, F13a/F13b): relational guards over the Stage-1 [DATA_INVENTORY] block. These
    // recompute Integration Coverage, PP-0 severity and the Data grade from the inventory TABLES and
    // compare them to the emitted marker — the same recompute-from-root shape as A4, but over a
    // relationship (rule ↔ inventory) rather than a value.
    //
    // ARCHETYPE-INDEPENDENT BY CONSTRUCTION: the inventory comes from the client's own documents, not
    // an archetype file, so unlike A4/A9 these run on every case — including VelocityFreight and
    // GoldenBite, which have no ACTIVE archetype. That is the point: the two defects carrying 91% of
    // LunaCart's expected harm were both rule-vs-architecture gaps that no value guard could see.
    const inventoryResult = validateDataInventory(dossier);
    if (inventoryResult.reviewerFlags.length > 0) {
      reviewerFlags.push(...inventoryResult.reviewerFlags);
      log('warn', 'GATE 1: [DATA_INVENTORY] relational guard findings (A11–A15)', {
        jobId, count: inventoryResult.reviewerFlags.length, unavailable: inventoryResult.unavailableReason,
      });
    }
    reviewerFlags.push(inventoryResult.unavailableReason
      ? `⚠ C1 coverage — A11–A15 inventory relational guards: 0 of 5 assertion(s) checked — UNAVAILABLE (${inventoryResult.unavailableReason}). PP-0 severity and the Data grade are UNPINNED this run.`
      : `C1 coverage — A11–A15 inventory relational guards [${inventoryResult.checked.join('/')}]: ${inventoryResult.checked.length} of 5 assertion(s) checked, ${inventoryResult.records.filter(r => !r.agreed).length} fork(s) in the checked scope.`);

    // A17 (F12): form-vs-document numeric reconciliation. All four LunaCart financial defects escaped
    // because nothing compared a form figure to a document figure — the pipeline adopted one source and
    // never recorded that the other disagreed. Choosing an authoritative source is correct; choosing it
    // SILENTLY is the defect, so a divergence must be declared or it BLOCKERs. Archetype-independent.
    const reconciliation = reconcileFinancials(job.formAnswers, corpus, dossier);
    if (reconciliation.reviewerFlags.length > 0) {
      reviewerFlags.push(...reconciliation.reviewerFlags);
      log('warn', 'GATE 1: A17 undeclared form-vs-document divergence (F12)', {
        jobId, count: reconciliation.reviewerFlags.length,
      });
    }
    // The divergence table is emitted EVERY run, empty or not, so "no divergence" is an affirmative
    // result rather than an absence of output — the reading rule the LunaCart batch established.
    reviewerFlags.push(
      `C1 coverage — A17 financial reconciliation (F12): ${reconciliation.claimsFound} numeric claim(s) ` +
      `extracted, ${reconciliation.divergences.filter(d => d.severity === 'blocker').length} blocker-grade ` +
      `and ${reconciliation.divergences.filter(d => d.severity === 'advisory').length} advisory ` +
      `divergence(s); table at financial_divergences.md.`,
    );
    try {
      const logDir = path.join(JOBS_DIR, jobId);
      fs.mkdirSync(logDir, { recursive: true });
      fs.writeFileSync(path.join(logDir, 'financial_divergences.md'), reconciliation.divergenceTable);
    } catch { /* non-fatal */ }

    // A16: candidate-pool membership vs PP-0 severity. Deliberately asymmetric — see validatePoolExclusions.
    // This is the guard for the defect class a count-based read cannot see: Section D stays at 7+H-0
    // while its MEMBERSHIP diverges because an unauthorised band1_pool=no exclusion fired.
    const poolResult = validatePoolExclusions(dossier);
    if (poolResult.reviewerFlags.length > 0) {
      reviewerFlags.push(...poolResult.reviewerFlags);
      log('warn', 'GATE 1: A16 candidate-pool exclusion finding', {
        jobId, severity: poolResult.severity, excluded: poolResult.excludedIds,
      });
    }
    reviewerFlags.push(
      `C1 coverage — A16 pool exclusions [A16]: PP-0 ${poolResult.severity ?? 'unresolvable'}, ` +
      `${poolResult.excludedIds.length} band1_pool=no exclusion(s)` +
      (poolResult.excludedIds.length > 0 ? ` [${poolResult.excludedIds.join(', ')}]` : '') +
      (poolResult.declarationPresent ? ' · empty-set declaration present' : '') + '.',
    );

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

    // REG-25 (v37.1): D6b classification-label fork — the class label (marker or prose) must
    // match the pinned tree applied to the emitted scores. Recompute-from-I/F, zero-false-fire.
    const { reviewerFlags: classFlags } = validateClassificationLabels(opportunities);
    if (classFlags.length > 0) {
      reviewerFlags.push(...classFlags);
      log('warn', 'GATE 3: D6b classification-label fork detected (REG-25)', { jobId, count: classFlags.length });
    }

    // REG-27 (A4, Class-G): recompute each card's post-adjustment feasibility FROM ROOT — archetype
    // base_F + Stage-1 flags + Early maturity dimensions (two flags on one Early dimension stack to
    // −2). Emits the C1 correction log (authored vs root_computed) for every card, unconditionally.
    // Acceptance-mode behaviour: flag + log, emit authored (raw model rate stays observable in the
    // document); production-mode overwrite is gated separately by ENFORCEMENT_MODE (not yet wired).
    // v37.4 (LunaCart TC1, items 1+2): guards FAIL LOUDLY, never skip. Each family declares its own
    // coverage (checked of expected) and, when it cannot run, WHY — separating a genuinely missing
    // reference (no ACTIVE archetype: loud, partial scope) from an internal fault (a BLOCKER).
    try {
      const emittedIds = new Set<string>();
      const idRe = /<!--\s*score:\s*id=([\w-]+)/gi;
      let idm: RegExpExecArray | null;
      while ((idm = idRe.exec(opportunities)) !== null) emittedIds.add(idm[1].toLowerCase());
      const resolution = resolveArchetypeRoots(emittedIds);
      const roots = resolution.roots;
      const maturityAvail = assessMaturityAvailability(maturity);
      const earlyDims = maturityAvail.earlyDims;
      const cardsEmitted = emittedIds.size;
      const logDir = path.join(JOBS_DIR, jobId);
      const families: FamilyCoverage[] = [];

      // The single unavailability shared by both root guards: no archetype table carries these IDs.
      // `filesScanned`/`cover` are reported so a 1-of-8 partial cover can never look like a full run.
      const rootsUnavailable = resolution.error
        ? { cause: 'archetype_read_error' as const,
            detail: `the archetype library could not be read (${resolution.error}).` }
        : roots.size === 0
          ? { cause: 'no_archetype_match' as const,
              detail: `no archetype file covers the emitted hypothesis IDs ` +
                `[${[...emittedIds].sort().join(', ') || 'none'}] — scanned ${resolution.filesScanned} ` +
                `file(s), best cover 0 of ${cardsEmitted}. This industry has no ACTIVE archetype.` }
          : null;

      // A5 (class) — recompute from emitted I/F. Archetype-independent, so it is available whenever
      // cards were emitted; this is the family that survived the LunaCart archetype gap.
      const classRecords = classificationCorrectionRecords(opportunities);
      // A11–A13 records join the C1 log so the R1 residual rate covers the inventory assertions too
      // (they are Class-A derived values like any other: authored marker vs root-computed from tables).
      const correctionRecords = [...classRecords, ...inventoryResult.records];
      const classChecked = new Set(classRecords.map(r => r.elementId));
      families.push({
        family: 'A5 class (D6b recompute from emitted I/F)',
        ruleId: 'A5',
        expected: cardsEmitted,
        checked: classChecked.size,
        forks: classRecords.filter(r => !r.agreed).length,
        unchecked: [...emittedIds].filter(id => !classChecked.has(id))
          .map(id => ({ id, reason: 'unparseable_emitted_value' as const })),
        unavailable: cardsEmitted === 0
          ? { cause: 'guard_threw' as const, detail: 'no score markers found in the Stage-3 output.' }
          : null,
      });

      // A4 (feasibility) recompute FROM ROOT — needs the archetype base_F and the dimension grades.
      // An EMPTY earlyDims set is no longer a skip: adjustedF = base_F − 0 is a real assertion.
      const a4Unavailable = rootsUnavailable ?? maturityAvail.unavailable;
      if (!a4Unavailable) {
        const { records: feasRecords, reviewerFlags: feasFlags, checked, unchecked } =
          validateFeasibilityFromRoot(opportunities, roots, earlyDims);
        correctionRecords.push(...feasRecords);
        if (feasFlags.length > 0) {
          reviewerFlags.push(...feasFlags);
          log('warn', 'GATE 3: A4 feasibility fork detected (REG-27)', { jobId, count: feasFlags.length });
        }
        families.push({
          family: 'A4 feasibility (REG-27 root recompute)', ruleId: 'A4', expected: cardsEmitted,
          checked: checked.length, forks: feasRecords.filter(r => !r.agreed).length, unchecked,
          unavailable: null,
        });
      } else {
        families.push({
          family: 'A4 feasibility (REG-27 root recompute)', ruleId: 'A4', expected: cardsEmitted,
          checked: 0, forks: 0, unchecked: [], unavailable: a4Unavailable,
        });
      }

      // A9 (root integrity) — impact/alignment/pinned-flags vs archetype row; Override Register.
      // Previously an `if (roots.size > 0)` with NO else, so on a non-archetype run A9 emitted
      // nothing at all — not even a skip line. It now always declares its state.
      if (!rootsUnavailable) {
        const { reviewerFlags: a9Flags, overrideRegister, checked, unchecked } =
          validateRootIntegrity(opportunities, roots);
        if (a9Flags.length > 0) {
          reviewerFlags.push(...a9Flags);
          log('warn', 'GATE 3: A9 root-integrity deviation without citation', { jobId, count: a9Flags.length });
        }
        reviewerFlags.push(`A9 Override Register: ${overrideRegister.length} cited/uncited deviation(s) from the archetype row; records at override_register.json`);
        families.push({
          family: 'A9 root integrity (impact/alignment/pinned flags)', ruleId: 'A9',
          expected: cardsEmitted, checked: checked.length, forks: a9Flags.length, unchecked,
          unavailable: null,
        });
        try {
          fs.mkdirSync(logDir, { recursive: true });
          fs.writeFileSync(path.join(logDir, 'override_register.json'), JSON.stringify(overrideRegister, null, 2));
        } catch { /* non-fatal */ }
      } else {
        families.push({
          family: 'A9 root integrity (impact/alignment/pinned flags)', ruleId: 'A9',
          expected: cardsEmitted, checked: 0, forks: 0, unchecked: [], unavailable: rootsUnavailable,
        });
      }

      // C1 correction log — written unconditionally (every Class-A value, every mode). Residual
      // rate (R1) is read from this file, never from the emitted documents. The per-family coverage
      // declaration is what makes the fork count interpretable: a bare "N checked, 0 forks" is
      // uninterpretable without knowing which families ran and over how many cards.
      const coverage = buildGateACoverage(cardsEmitted, families);
      const forks = correctionRecords.filter(r => !r.agreed).length;
      reviewerFlags.push(`C1 correction log: ${correctionRecords.length} Class-A value-check(s) recorded, ${forks} fork(s); records at correction_log.json`);
      reviewerFlags.push(...formatGateACoverage(coverage));
      if (!coverage.gradeable) {
        log('warn', 'GATE A coverage PARTIAL — Class-G guard family unavailable or incomplete', {
          jobId,
          unavailable: coverage.families.filter(f => f.unavailable).map(f => `${f.ruleId}:${f.unavailable!.cause}`),
        });
      }
      try {
        fs.mkdirSync(logDir, { recursive: true });
        fs.writeFileSync(path.join(logDir, 'correction_log.json'), JSON.stringify(correctionRecords, null, 2));
        // Machine-readable coverage, so the acceptance harness keys off `gradeable` rather than prose.
        fs.writeFileSync(path.join(logDir, 'gate_a_coverage.json'), JSON.stringify(coverage, null, 2));
      } catch { /* non-fatal: log persistence best-effort */ }
    } catch (e) {
      // Was `log('warn', ...)` only — a thrown guard produced NO reviewer flag at all, the most
      // silent failure in the layer. A guard that crashed did not check anything: say so, loudly.
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 3 Class-G guards THREW (${String(e)}) — A4/A5/A9 did not complete, so ` +
        `NO Class-A value was verified this run. Treat Gate A as ungraded; this is an internal fault.`,
      );
      log('error', 'Class-G guards threw — Gate A ungraded', { jobId, error: String(e) });
    }

    // T-26 (S-29): cross-stage relay-field drift — the nine T-19 fields must be byte-identical
    // Stage 1 → Stage 3, else Stage 4 phase placement can fork. Compares raw score comments by ID.
    const { reviewerFlags: relayFlags } = validateRelayFields(dossier, opportunities);
    if (relayFlags.length > 0) {
      reviewerFlags.push(...relayFlags);
      log('warn', 'GATE 3: relay-field drift detected', { jobId, count: relayFlags.length });
    }

    // REG-21 (Era-O): Stage-3 membership must equal Stage-1 Section D exactly — BLOCKER on drift.
    const { reviewerFlags: membershipFlags } = validatePortfolioMembership(dossier, opportunities);
    if (membershipFlags.length > 0) {
      reviewerFlags.push(...membershipFlags);
      log('warn', 'GATE 3: portfolio membership re-derivation detected (REG-21)', { jobId });
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
    reviewerFlags.push(`Build: date=${buildStampDate} pipeline=${BUILD.pipelineLabel} sha=${buildStampSha} anchor=${anchored ? 'sha' : 'label-only'}`);
    if (!anchored) {
      reviewerFlags.push(
        `Provenance: this run is LABEL-ONLY (sha=unset) — pipeline=${BUILD.pipelineLabel} is a human tag, not a verifiable ` +
        'build anchor. Populate RAILWAY_GIT_COMMIT_SHA (migrate Railway) so the SHA anchors the n=4 fleet-uniformity check.',
      );
    }


    // Generate DOCX
    fs.mkdirSync(JOBS_DIR, { recursive: true });
    const docxFilename = `AI Value Blueprint - ${sanitizeName(job.clientName)}.docx`;
    const docxPath = path.join(JOBS_DIR, jobId, docxFilename);
    fs.mkdirSync(path.dirname(docxPath), { recursive: true });
    // S-46: the client-facing title comes from INTAKE_FACTS CLIENT_NAME, never the operator job label.
    const titleClientName = resolveClientTitleName(dossier, deliveryClientName);
    const docxBuffer = await generateBlueprintDocx(titleClientName, assembledForDelivery, docxPath);

    await saveDocxData(jobId, docxBuffer.toString('base64'));

    const pdfBuffer = await generateBlueprintPdf(titleClientName, assembledForDelivery);
    await savePdfData(jobId, pdfBuffer.toString('base64'));

    const txtContent = generateBlueprintTxt(titleClientName, assembledForDelivery);
    await saveTxtData(jobId, txtContent);

    const htmlContent = generateBlueprintHtml(titleClientName, assembledForDelivery);
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
    // v37.4 (admissibility): stamp the run identity as the FIRST line of the panel. A grader holding
    // four panels from one batch previously could not attribute a flag to a run — the panels
    // referenced different hypothesis IDs, so they were clearly different runs, but nothing mapped
    // them to T1–T4. The index is recovered from the operator's job label, which already carries it.
    const runIndex = parseRunIndex(job.clientName);
    reviewerFlags.unshift(
      `RUN: index=${runIndex ?? 'UNLABELLED'} job=${jobId} client="${job.clientName}" ` +
      `date=${buildStampDate} pipeline=${BUILD.pipelineLabel} sha=${buildStampSha}` +
      (runIndex ? '' : ' — no run index in the job label; jobId is the only key that maps this panel ' +
        'to a run. Name the job "<Client> <version> Test N" to make the batch attributable.'),
    );
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
