// ─── A11–A15: relational guards over the Stage-1 [DATA_INVENTORY] block ──────────────────────────
//
// v37.4, ratified 31 Jul 2026 (F13a / F13b). These close the two spec gaps the LunaCart batch found,
// and they are a different CATEGORY of guard from everything before them.
//
// Every guard up to v37.3 checks a VALUE: A4 recomputes feasibility, A5 recomputes the D6b class, A9
// compares an emitted score to an archetype row. The LunaCart forks were not wrong values — each run
// reasoned soundly to a different answer because the RULE did not cover the architecture:
//   • PP-CORE-00's C1 turned on "zero or near-zero active integrations between core systems", with
//     core system, active integration and near-zero all undefined → High×1 / Critical×3.
//   • D2's floor gate turned on "a documented systematic quality failure on the primary data source",
//     with "primary" undefined for a multi-source stack → Developing×1 / Early×3.
// Meridian has one primary source and one ACTIVE archetype, so 16 runs never exposed either.
//
// The fix is specification, not enforcement — but once the rules are counted rather than judged, they
// become mechanically checkable, and that is what these guards do. Each checks a RELATIONSHIP (the
// rule against the inventory) rather than a value. Critically they are ARCHETYPE-INDEPENDENT: the
// inventory comes from the client's own documents, so unlike A4/A9 these run on every case including
// VelocityFreight and GoldenBite, which have no ACTIVE archetype.
//
// Architecture note: A11–A13 use the same recompute-from-root shape as A4. The tables are the root;
// the `<!-- inventory: ... -->` marker is the derived value; a disagreement is a fork. That means a
// model that miscounts its own table is caught, which is the failure mode a prose gate could not see.

import { BLOCKER_PREFIX } from '../types/pipeline';
import { CorrectionRecord, makeRecord } from './correctionLog';
// v37.4a (LunaCart v1.1 §3): every enum comparison in this module goes through the shared normaliser.
// A14 rejected `mechanism=scheduled (celigo connector)` — the mechanism IS scheduled; the parenthetical
// names the tool. Rating, data grade and PP-0 severity carried the identical bug and were fixed in the
// same sweep (`Degraded (siloed, 2/5)`, `Early (capped)`, `Critical systemic` without parentheses).
import { normaliseEnumCell, enumMatches, enumEquals, isYes, namesResolve } from './enumNormalise';
export { normaliseEnumCell, enumMatches, isYes };

// ─── Parsed shapes ───────────────────────────────────────────────────────────────

export interface CoreSystemRow {
  system: string;
  recordClasses: string[];
  isCore: boolean;
  coreBecause: string;
  confidence: string;
}

export interface IntegrationRow {
  a: string;
  b: string;
  mechanism: string;
  status: string;
  active: boolean;
  confidence: string;
}

export interface RecordClassRow {
  recordClass: string;
  systemOfRecord: string;
  loadBearing: boolean;
  loadBearingBecause: string;
  rating: string;          // reliable | degraded | absent
  ratingBecause: string;
  confidence: string;
}

// G1–G3 (blueprint-maturity D4 Step 4, ratified 31 Jul 2026). Governance is an INPUT fact about the
// client, not a derived value, so it arrives in the marker the way earlyDims arrives at A4 — A13
// recomputes the aggregation over it, not the facts themselves.
//
// These fields exist because the first draft made Established UNREACHABLE: the aggregation defaulted
// governance to false and nothing supplied it, so a fully governed client recomputed to Developing and
// A13 would have BLOCKERed the correct answer as a fork. A level that cannot be reached is not a
// stringent gate, it is dead code — and the two are indistinguishable until a case sits at the top of
// the scale (fixtures/band3_calibration.md).
export interface GovernanceEvidence {
  ownerNamed: boolean;          // G1 — a person/role accountable for data quality
  ownerName: string | null;     // the name itself, so A15 can reject a bare `yes`
  standardDocumented: boolean;  // G2 — an explicit threshold on record, not an aspiration
  standardOperative: boolean;   // G3 — a review/audit/remediation, or an automated control
}

export interface InventoryMarker {
  nCore: number | null;
  activeIntegrations: number | null;
  integrationCoverage: number | null;
  designatedSsot: string | null;
  ssotReconcilesAllLoadBearing: boolean | null;
  loadBearingDegradedOrAbsent: number | null;
  dataGrade: string | null;
  pp0Severity: string | null;
  governance: GovernanceEvidence;
}

export interface DataInventory {
  present: boolean;
  coreSystems: CoreSystemRow[];
  integrations: IntegrationRow[];
  recordClasses: RecordClassRow[];
  marker: InventoryMarker | null;
}

// ─── Parsing ─────────────────────────────────────────────────────────────────────

const GROUNDED_CONFIDENCE = /\[(Document[- ]?Backed|Form[- ]?Stated)/i;

// Split a markdown table row into trimmed cells, dropping the leading/trailing pipe artefacts and
// any inline bold. Shared by all three tables so a formatting quirk cannot affect one and not another.
function cells(line: string): string[] {
  const parts = line.split('|').map(c => c.replace(/\*\*/g, '').trim());
  if (parts.length && parts[0] === '') parts.shift();
  if (parts.length && parts[parts.length - 1] === '') parts.pop();
  return parts;
}

function isSeparator(line: string): boolean {
  return /^\|[\s:|-]+\|?\s*$/.test(line.trim());
}

// Extract the data rows of the markdown table that follows a `### <heading>` line, stopping at the
// next heading or at the first non-table line after the table has started.
function tableRowsAfterHeading(text: string, heading: RegExp): string[][] {
  const lines = text.split('\n');
  let i = lines.findIndex(l => /^#{2,4}[ \t]/.test(l) && heading.test(l));
  if (i < 0) return [];
  const rows: string[][] = [];
  let started = false;
  for (i++; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{1,4}[ \t]/.test(line)) break;                       // next heading ends the table
    if (!line.trim().startsWith('|')) { if (started) break; continue; }
    if (isSeparator(line)) { started = true; continue; }
    const c = cells(line);
    // Skip the header row: it is the one whose first cell is a known column label.
    if (!started && /^(system|record class|system a)\b/i.test(c[0] ?? '')) continue;
    started = true;
    rows.push(c);
  }
  return rows;
}

const MARKER_RE = /<!--\s*inventory:\s*([\s\S]*?)-->/i;

export function parseInventoryMarker(text: string): InventoryMarker | null {
  const m = MARKER_RE.exec(text);
  if (!m) return null;
  // v37.4a: values run to the next `key=` boundary, not to the next space. The old `[^\s]+` truncated
  // every multi-word value — `governance_owner=Head of Data (M. Lindqvist)` parsed as "Head", which
  // still satisfied G1's presence check while silently losing the name the check exists to capture.
  const fields: Record<string, string> = {};
  for (const f of m[1].matchAll(/(\w+)\s*=\s*([\s\S]*?)(?=\s+\w+\s*=|\s*$)/g)) {
    fields[f[1]] = f[2].trim();
  }
  const num = (k: string): number | null => {
    const v = fields[k];
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const bool = (k: string): boolean | null => (fields[k] == null ? null : isYes(fields[k]));
  return {
    nCore: num('n_core'),
    activeIntegrations: num('active_integrations'),
    integrationCoverage: num('integration_coverage'),
    designatedSsot: fields.designated_ssot ?? null,
    ssotReconcilesAllLoadBearing: bool('ssot_reconciles_all_load_bearing'),
    loadBearingDegradedOrAbsent: num('load_bearing_degraded_or_absent'),
    dataGrade: fields.data_grade ?? null,
    pp0Severity: fields.pp0_severity ?? null,
    governance: {
      ownerNamed: bool('governance_owner_named') === true,
      ownerName: fields.governance_owner && !/^(none|n\/a|unknown)$/i.test(fields.governance_owner)
        ? fields.governance_owner : null,
      standardDocumented: bool('governance_standard_documented') === true,
      standardOperative: bool('governance_standard_operative') === true,
    },
  };
}

export function parseDataInventory(dossier: string): DataInventory {
  // Scope to the [DATA_INVENTORY] section when present, so a "### Integrations" heading elsewhere in
  // the dossier cannot be mistaken for the inventory table.
  const start = dossier.search(/^#{1,4}[ \t]*\[?DATA_INVENTORY\]?/im);
  const present = start >= 0;
  const scope = present ? dossier.slice(start) : dossier;
  // End the scope at the next top-level section so a later table is not absorbed.
  const endRel = scope.slice(1).search(/^#{1,2}[ \t]+(?!\[?DATA_INVENTORY)/im);
  const body = present && endRel >= 0 ? scope.slice(0, endRel + 1) : scope;

  const coreSystems = tableRowsAfterHeading(body, /core systems/i).map(c => ({
    system: (c[0] ?? '').toLowerCase(),
    recordClasses: (c[1] ?? '').split(',').map(s => s.trim().toLowerCase()).filter(s => s && s !== 'n/a' && s !== 'none'),
    isCore: isYes(c[2]),
    coreBecause: c[3] ?? '',
    confidence: c[4] ?? '',
  }));

  const integrations = tableRowsAfterHeading(body, /integrations/i).map(c => ({
    a: (c[0] ?? '').toLowerCase(),
    b: (c[1] ?? '').toLowerCase(),
    mechanism: (c[2] ?? '').toLowerCase(),
    status: (c[3] ?? '').toLowerCase(),
    active: isYes(c[4]),
    confidence: c[5] ?? '',
  }));

  const recordClasses = tableRowsAfterHeading(body, /record classes/i).map(c => ({
    recordClass: (c[0] ?? '').toLowerCase(),
    systemOfRecord: (c[1] ?? '').toLowerCase(),
    loadBearing: isYes(c[2]),
    loadBearingBecause: c[3] ?? '',
    rating: normaliseEnumCell(c[4] ?? ''),   // "Degraded (siloed, 2/5)" → "degraded"
    ratingBecause: c[5] ?? '',
    confidence: c[6] ?? '',
  }));

  return { present, coreSystems, integrations, recordClasses, marker: parseInventoryMarker(body) };
}

// ─── Recompute from root (the tables ARE the root) ────────────────────────────────

export interface ComputedInventory {
  nCore: number;
  activeIntegrations: number;
  integrationCoverage: number;
  loadBearingDegradedOrAbsent: number;
  dataGrade: string;
}

// `_core.md` §2.1: coverage = active ÷ (n_core − 1). n_core ≤ 1 leaves the ratio undefined → 0.
export function computeIntegrationCoverage(nCore: number, activeIntegrations: number): number {
  if (nCore <= 1) return 0;
  return activeIntegrations / (nCore - 1);
}

// `_core.md` §2.1 threshold table. The bands TILE the range — the ratified text had "≤ 25%" then
// "26–60%", which left (25%, 26%) undefined; implemented as ≤0.25 / >0.25..≤0.60 / >0.60 so every
// value falls in exactly one band by construction.
export function pp0SeverityFromCoverage(coverage: number, ssotReconcilesAllLoadBearing: boolean): string {
  if (coverage <= 0.25) return 'Critical';
  if (coverage <= 0.60) return 'High';
  return ssotReconcilesAllLoadBearing ? 'none' : 'High';
}

// D4 Step 4 (blueprint-maturity SKILL.md). Priority-weighted, not worst-class and not majority.
// Established additionally requires G1 + G2 + G3 — see GovernanceEvidence.
export function governanceGatePasses(g: GovernanceEvidence | undefined): boolean {
  return !!g && g.ownerNamed && g.standardDocumented && g.standardOperative;
}

export function dataGradeFromRecordClasses(rows: RecordClassRow[], governance?: GovernanceEvidence): string {
  const bad = (r: RecordClassRow) => r.rating === 'degraded' || r.rating === 'absent';
  if (rows.some(r => r.loadBearing && bad(r))) return 'Early';
  if (rows.some(r => !r.loadBearing && bad(r))) return 'Developing';
  // All classes Reliable — the governance gate is what separates Established from Developing.
  return governanceGatePasses(governance) ? 'Established' : 'Developing';
}

export function computeInventory(inv: DataInventory): ComputedInventory {
  const coreIds = new Set(inv.coreSystems.filter(s => s.isCore).map(s => s.system));
  const nCore = coreIds.size;
  // Only integrations BETWEEN two core systems count toward coverage (§2.1: "active integrations
  // among core systems"). Deduplicated as unordered pairs, so an A→B / B→A double-emission counts once.
  const seen = new Set<string>();
  for (const i of inv.integrations) {
    if (!i.active || !coreIds.has(i.a) || !coreIds.has(i.b)) continue;
    seen.add([i.a, i.b].sort().join('|'));
  }
  const activeIntegrations = seen.size;
  return {
    nCore,
    activeIntegrations,
    integrationCoverage: computeIntegrationCoverage(nCore, activeIntegrations),
    loadBearingDegradedOrAbsent: inv.recordClasses.filter(
      r => r.loadBearing && (r.rating === 'degraded' || r.rating === 'absent'),
    ).length,
    dataGrade: dataGradeFromRecordClasses(inv.recordClasses, inv.marker?.governance),
  };
}

// ─── A11–A15 ─────────────────────────────────────────────────────────────────────

export interface InventoryGuardResult {
  reviewerFlags: string[];
  records: CorrectionRecord[];
  checked: string[];          // assertion ids that ran
  unavailableReason: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function validateDataInventory(dossier: string): InventoryGuardResult {
  const inv = parseDataInventory(dossier);
  const reviewerFlags: string[] = [];
  const records: CorrectionRecord[] = [];
  const checked: string[] = [];

  if (!inv.present) {
    return {
      reviewerFlags: [
        `${BLOCKER_PREFIX} GATE 1 A11-A15: the Stage-1 [DATA_INVENTORY] block is ABSENT. The ` +
        `PP-CORE-00 severity gate (_core.md §2.1) and the Data dimension gate (D4 Step 1-4) both read ` +
        `it, so neither is verifiable this run and both are unpinned. Emit the block.`,
      ],
      records, checked, unavailableReason: 'inventory_absent',
    };
  }

  const computed = computeInventory(inv);
  const m = inv.marker;

  if (!m) {
    reviewerFlags.push(
      `${BLOCKER_PREFIX} GATE 1 A11: the [DATA_INVENTORY] tables are present but the ` +
      `<!-- inventory: ... --> computed marker is MISSING, so the counted values cannot be compared ` +
      `to the tables. Recomputed from the tables: n_core=${computed.nCore}, ` +
      `active=${computed.activeIntegrations}, coverage=${round2(computed.integrationCoverage)}, ` +
      `data_grade=${computed.dataGrade}.`,
    );
    return { reviewerFlags, records, checked, unavailableReason: 'marker_absent' };
  }

  // ── A11: coverage arithmetic, recomputed from the tables ──
  checked.push('A11');
  const a11 = [
    ['n_core', m.nCore, computed.nCore],
    ['active_integrations', m.activeIntegrations, computed.activeIntegrations],
    ['integration_coverage', m.integrationCoverage == null ? null : round2(m.integrationCoverage), round2(computed.integrationCoverage)],
    ['load_bearing_degraded_or_absent', m.loadBearingDegradedOrAbsent, computed.loadBearingDegradedOrAbsent],
  ] as const;
  for (const [field, emitted, root] of a11) {
    records.push(makeRecord('stage1', 'data_inventory', field, emitted ?? 'absent', root, {
      nCore: computed.nCore, activeIntegrations: computed.activeIntegrations,
      rule: 'A11 coverage = active ÷ (n_core − 1)',
    }, 'A11'));
    if (emitted == null || emitted !== root) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 1 A11 (inventory arithmetic): marker ${field}=${emitted ?? 'absent'} ` +
        `but recompute from the tables = ${root} (n_core=${computed.nCore} core systems, ` +
        `${computed.activeIntegrations} active integration(s) between core systems, coverage = ` +
        `active ÷ (n_core − 1)). Correct the marker or the table it disagrees with.`,
      );
    }
  }

  // ── A12: PP-0 severity from coverage (the F13b rule) ──
  checked.push('A12');
  const rootSeverity = pp0SeverityFromCoverage(
    computed.integrationCoverage, m.ssotReconcilesAllLoadBearing === true,
  );
  // Normalised, so "Critical (systemic)" AND "Critical systemic" (no parentheses — the form the
  // LunaCart v1 T3 run actually emitted) both resolve to the same token.
  const emittedSeverity = m.pp0Severity ? (normaliseEnumCell(m.pp0Severity) || 'absent') : 'absent';
  // Both sides normalised so the record's `agreed` matches the guard's own comparison — a record whose
  // agreement disagrees with its flag would corrupt the R1 residual rate read from this log.
  // The raw marker value is preserved in rootInputs and printed in the flag, so nothing is lost.
  records.push(makeRecord('stage1', 'pp-core-00', 'severity', emittedSeverity, normaliseEnumCell(rootSeverity), {
    emittedRaw: m.pp0Severity ?? 'absent',
    coverage: round2(computed.integrationCoverage),
    ssotReconcilesAllLoadBearing: m.ssotReconcilesAllLoadBearing,
    rule: 'A12 _core.md §2.1 threshold table',
  }, 'A12'));
  if (!enumEquals(emittedSeverity, rootSeverity)) {
    reviewerFlags.push(
      `${BLOCKER_PREFIX} GATE 1 A12 (PP-0 severity, F13b): marker pp0_severity=${m.pp0Severity ?? 'absent'} but ` +
      `Integration Coverage ${round2(computed.integrationCoverage)} with ` +
      `ssot_reconciles_all_load_bearing=${m.ssotReconcilesAllLoadBearing === true ? 'yes' : 'no'} ` +
      `resolves to ${rootSeverity} under the _core.md §2.1 threshold table (≤0.25 Critical; ` +
      `>0.25–0.60 High; >0.60 High unless the SSOT reconciles every load-bearing class, then none). ` +
      `Inheriting Meridian's Critical (systemic) on a better-integrated stack is the archetype-template ` +
      `failure this assertion exists to catch.`,
    );
  }

  // ── A13: Data grade from the record classes (the F13a rule) ──
  checked.push('A13');
  records.push(makeRecord('stage1', 'maturity_data', 'data_grade',
    m.dataGrade ? normaliseEnumCell(m.dataGrade) : 'absent', normaliseEnumCell(computed.dataGrade), {
      emittedRaw: m.dataGrade ?? 'absent',
      loadBearingDegradedOrAbsent: computed.loadBearingDegradedOrAbsent,
      rule: 'A13 D4 Step 4 priority-weighted aggregation',
    }, 'A13'));
  if (m.dataGrade == null || !enumEquals(m.dataGrade, computed.dataGrade)) {
    reviewerFlags.push(
      `${BLOCKER_PREFIX} GATE 1 A13 (Data grade, F13a): marker data_grade=${m.dataGrade ?? 'absent'} but ` +
      `${computed.loadBearingDegradedOrAbsent} load-bearing record class(es) are Degraded/Absent, which ` +
      `resolves to ${computed.dataGrade} under D4 Step 4. "primary data source" was removed 31 Jul 2026 — ` +
      `a functioning core warehouse does not lift the grade when the classes the client's own stated ` +
      `priorities depend on are the siloed ones.`,
    );
  }

  // ── A14: every Active?=yes row is genuinely scheduled/event + functioning + grounded ──
  checked.push('A14');
  for (const i of inv.integrations.filter(r => r.active)) {
    const reasons: string[] = [];
    // Normalised set membership, not exact match — "scheduled (celigo connector)" is scheduled.
    const mech = enumMatches(i.mechanism, ['scheduled', 'event']);
    const stat = enumMatches(i.status, ['functioning']);
    if (!mech.ok) reasons.push(`mechanism=${i.mechanism || 'absent'} → normalised "${mech.normalised || 'empty'}" (must be scheduled or event)`);
    if (!stat.ok) reasons.push(`status=${i.status || 'absent'} → normalised "${stat.normalised || 'empty'}" (must be functioning)`);
    if (!GROUNDED_CONFIDENCE.test(i.confidence)) reasons.push(`confidence=${i.confidence || 'absent'} (must be Document-Backed or Form-Stated)`);
    if (reasons.length > 0) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 1 A14 (active-integration integrity): ${i.a}↔${i.b} is marked ` +
        `Active?=yes but ${reasons.join('; ')}. An integration counts as active only when data moves ` +
        `without human action, on a schedule or event trigger, and is currently functioning — a manual ` +
        `export, a broken feed, or a planned one inflates Integration Coverage and can under-state PP-0.`,
      );
    }
  }

  // ── A15: referential integrity of the inventory's own claims ──
  checked.push('A15');
  for (const s of inv.coreSystems.filter(r => r.isCore)) {
    if (s.recordClasses.length === 0) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 1 A15 (core-system integrity): ${s.system} is marked Core?=yes but ` +
        `names no record class. A system is core only if it is the system of record for ≥1 record ` +
        `class a stated priority depends on — an extra core system inflates n_core and lowers coverage.`,
      );
    }
    if (!/\S/.test(s.coreBecause) || /^n\/?a$/i.test(s.coreBecause.trim())) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 1 A15 (core-system integrity): ${s.system} is marked Core?=yes but ` +
        `names no stated priority in "Core because". Tie it to the engagement's own scope or set Core?=no.`,
      );
    }
  }
  for (const r of inv.recordClasses.filter(x => x.loadBearing)) {
    if (!/\S/.test(r.loadBearingBecause) || /^n\/?a$/i.test(r.loadBearingBecause.trim())) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 1 A15 (load-bearing integrity): record class ${r.recordClass} is marked ` +
        `Load-bearing?=yes but names no stated priority. Load-bearing drives the Data grade (D4 Step 4), ` +
        `so an unjustified one changes the maturity band.`,
      );
    }
  }
  // G1 cannot be asserted as a bare `yes` — Established turns on it, and "someone owns the data" with
  // nobody named is exactly the cheap-predicate failure the G1–G3 gate was written to close.
  if (m.governance.ownerNamed && !m.governance.ownerName) {
    reviewerFlags.push(
      `${BLOCKER_PREFIX} GATE 1 A15 (governance integrity): governance_owner_named=yes but ` +
      `governance_owner names nobody. G1 requires a person or role accountable for data quality — ` +
      `an unnamed owner is the cheap predicate the G1-G3 gate exists to reject.`,
    );
  }
  // A record class whose system of record is not a declared core system means the two tables disagree.
  //
  // v37.5a (I1, ~32 BLOCKERs — the largest single blocker source in the paired batch): this compared raw
  // lowercase strings, so `Vincere/Zoho Recruit`, `shopify plus + klaviyo` and `zoho recruit (migrating)`
  // all failed against correctly-declared systems. A system-of-record cell legitimately names MORE THAN
  // ONE system, and either side may carry an annotation. Compared as name SETS now — and note this uses
  // `namesResolve`, not `normaliseEnumCell`, because the leading-token rule would turn `shopify plus`
  // into `shopify` and silently match the wrong system.
  const declared = inv.coreSystems.map(s => s.system);
  for (const r of inv.recordClasses) {
    const resolution = namesResolve(r.systemOfRecord, declared);
    if (!resolution.ok) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 1 A15 (cross-table integrity): record class ${r.recordClass} names ` +
        `system of record "${r.systemOfRecord}", of which ${resolution.missing.map(m => `"${m}"`).join(', ')} ` +
        `${resolution.missing.length === 1 ? 'is' : 'are'} absent from the Core Systems table. Every system ` +
        `of record must appear there (Core?=yes or no) or the two tables describe different stacks. ` +
        `Compound cells ("a + b", "a / b") and annotations ("(migrating)") are tolerated — this names the ` +
        `system that genuinely has no row.`,
      );
    }
  }

  return { reviewerFlags, records, checked, unavailableReason: null };
}

// ─── III.3 pin 2 (v37.6): the inventory marker is RENDERED from the tables ───────────────────────
//
// Eight-batch register R1 — the heaviest model item of the era, and R2/R9 with it. LunaCart's marker
// claimed `active_integrations=4/4/5` against a table recompute of 2/2/3, in 4 of 4 runs, and Meridian
// forked the same way in 2 of 4. The marker feeds C1 → PP-0 → H-CORE-00, so a wrong count is a wrong
// input on the keystone chain: R2 showed PP-0 reaching the right severity via the WRONG CLAUSE, one
// differently-shaped client away from silently dropping the AI Company Brain.
//
// The tables are transcription (copying); the marker is arithmetic over them (deriving). Law 2 of the
// eight-batch report: copying is reproducible, deriving is sampled. So the model should not derive it —
// the app should. Same render-don't-instruct move as A18, applied to the input side.
//
// IMPORTANT — this deliberately does NOT make A11 vacuous. Rendering the marker would remove the defect
// AND the evidence, so the authored values are still recorded as C1 A11 records against the rendered
// ones. The artifact becomes correct; the model's raw derivation rate stays measurable. Removing a
// defect and its measurement in one change is how a fix becomes unfalsifiable.
export interface InventoryRenderResult {
  corrected: string;
  rendered: boolean;
  changedFields: string[];
}

const round2r = (n: number) => Math.round(n * 100) / 100;

export function renderInventoryMarker(dossier: string): InventoryRenderResult {
  const inv = parseDataInventory(dossier);
  if (!inv.present || !inv.marker) return { corrected: dossier, rendered: false, changedFields: [] };

  const computed = computeInventory(inv);
  const m = inv.marker;
  const changedFields: string[] = [];
  const setField = (text: string, key: string, value: string): string => {
    const re = new RegExp(`(${key}\\s*=\\s*)([\\s\\S]*?)(?=\\s+\\w+\\s*=|\\s*-->)`, 'i');
    return re.test(text) ? text.replace(re, `$1${value}`) : text;
  };

  const marker = MARKER_RE.exec(dossier);
  if (!marker) return { corrected: dossier, rendered: false, changedFields: [] };
  let block = marker[0];

  const derived: Array<[string, number | string, number | string]> = [
    ['n_core', m.nCore ?? 'absent', computed.nCore],
    ['active_integrations', m.activeIntegrations ?? 'absent', computed.activeIntegrations],
    ['integration_coverage', m.integrationCoverage == null ? 'absent' : round2r(m.integrationCoverage), round2r(computed.integrationCoverage).toFixed(2)],
    ['load_bearing_degraded_or_absent', m.loadBearingDegradedOrAbsent ?? 'absent', computed.loadBearingDegradedOrAbsent],
    ['data_grade', m.dataGrade ?? 'absent', computed.dataGrade],
  ];
  for (const [key, authored, root] of derived) {
    if (String(authored) !== String(root)) changedFields.push(key);
    block = setField(block, key, String(root));
  }

  // pp0_severity is derived from the rendered coverage, so it renders too — this is R2's fix.
  const rootSeverity = pp0SeverityFromCoverage(computed.integrationCoverage, m.ssotReconcilesAllLoadBearing === true);
  if (!enumEquals(m.pp0Severity ?? 'absent', rootSeverity)) changedFields.push('pp0_severity');
  block = setField(block, 'pp0_severity', rootSeverity);

  return {
    corrected: changedFields.length > 0 ? dossier.replace(marker[0], block) : dossier,
    rendered: changedFields.length > 0,
    changedFields,
  };
}

// ─── A16: band1_pool exclusions vs PP-0 severity ─────────────────────────────────
//
// The `band1_pool=no` exclusion rule (references/algorithms/hypothesis_selection.md §35) removes
// standalone product-build bets from the candidate pool when PP-0 is instantiated at Critical
// (systemic) — a fragile Layer 1 cannot carry them. On LunaCart, PP-0 forked Critical×3 / High×1, so
// T2–T4 applied exclusions that T1 correctly did not. Section C stayed at 8 and Section D at 7+H-0 in
// all four runs, so the COUNT was stable while MEMBERSHIP diverged — which is why a count-based read
// of the packs reported "selection stable" and could not see it.
//
// THE ASSERTION IS DELIBERATELY ASYMMETRIC. The biconditional is unsafe in one direction:
//
//   • PP-0 ≠ Critical → exclusions MUST be empty.  HARD. Zero-false-fire: the rule simply does not
//     fire at any other severity, so any exclusion is unauthorised. This is the direction that
//     catches LunaCart.
//
//   • PP-0 = Critical → exclusions non-empty is NOT safe. Critical *enables* the rule, but non-empty
//     output additionally requires that at least one candidate actually carries `band1_pool=no`.
//     Meridian had two (H-RT-08, H-RT-09); a Critical case whose pool contains none would emit empty
//     exclusions legitimately, and asserting non-empty would BLOCKER a correct run. So this direction
//     is a DECLARATION requirement instead of a count check: the run must SAY that no candidate
//     qualified. Same shape as the coverage-band tiling fix — the unstated case is the bug, not the value.
const EXCLUSION_VERB = /\b(?:exclud|remov|dropp|omitt)/i;
const HYPOTHESIS_ID = /\bH-[A-Z]+-\d+\b/gi;
// The canonical declaration for the Critical-but-empty case (contract: intake SKILL.md Section H).
const NO_QUALIFYING_CANDIDATE =
  /no\s+(?:candidate|hypothes\w+)[^.\n]{0,80}(?:band1_pool|exclusion criteri)|band1_pool=no[^.\n]{0,40}\bnone\b/i;

export interface PoolExclusionResult {
  reviewerFlags: string[];
  severity: string | null;
  excludedIds: string[];
  declarationPresent: boolean;
  unavailableReason: string | null;
  provenanceChecked: boolean;
}

// A16c (v37.4a): exclusion-flag PROVENANCE. A16 asserts an exclusion is *authorised* by PP-0's
// severity; A16c asserts it has a *root*. `band1_pool` is an archetype column, so an exclusion is only
// verifiable against the archetype's CORE-columns table. Three outcomes:
//
//   • row says band1_pool=no                → authorised and rooted. Clean.
//   • row says band1_pool=yes, or ID absent → the exclusion CONTRADICTS or LACKS its root. BLOCKER.
//   • no archetype resolvable, exclusions present → the exclusion rests on a model assertion with no
//     authoritative source. BLOCKER, because unlike A4/A9's unavailability this one CHANGED THE
//     OUTPUT: a fabricated exclusion silently removes a real opportunity from the client's
//     deliverable. Unverifiable-and-inert is a ⚠; unverifiable-and-acted-upon is not.
//
// `poolFlags` is supplied by the caller (the orchestrator resolves the archetype); pass an empty map
// when none resolved — that is the third case, not a reason to skip.
export function validatePoolExclusions(
  dossier: string,
  poolFlags: Map<string, { band1Pool: string }> = new Map(),
): PoolExclusionResult {
  const marker = parseInventoryMarker(dossier);
  const severity = marker?.pp0Severity ? marker.pp0Severity.replace(/\s*\(.*\)$/, '') : null;

  // Collect IDs from ANY line that both mentions the flag and uses an exclusion verb — a broader net
  // than the canonical summary line, so a reworded record cannot slip the hard direction.
  // v37.5a (I3, 13 BLOCKERs on Meridian): this scraped EVERY hypothesis ID from any line that mentioned
  // `band1_pool=no` plus an exclusion verb. Section H also carries a candidate REGISTER that lists the
  // whole evaluated pool on one line and narrates the exclusion in the same sentence — so a 2-item
  // exclusion was read as the full 13-ID library, and A16c then reported 11 "contradicts its root"
  // BLOCKERs for candidates that were never excluded.
  //
  // The record names its excluded IDs AFTER the label, not anywhere on the line. Scope to that segment:
  // the text following the last colon after the flag, up to the first em-dash (which begins the
  // rationale in the canonical form: "…: H-RT-08 (score 50); H-RT-09 (score 32) — both standalone bets").
  const excludedIds = new Set<string>();
  let claimedSeverity: string | null = null;
  for (const line of dossier.split('\n')) {
    if (!/band1_pool\s*=\s*no/i.test(line) || !EXCLUSION_VERB.test(line)) continue;
    const flagAt = line.toLowerCase().lastIndexOf('band1_pool');
    const afterFlag = line.slice(flagAt);
    const colon = afterFlag.indexOf(':');
    const tail = colon >= 0 ? afterFlag.slice(colon + 1).split(/\s[—–]\s|\.\s/)[0] : '';
    let captured = tail.match(HYPOTHESIS_ID) ?? [];
    // Fallback for the reworded record form — "H-RT-08 was removed from the pool (`band1_pool=no`)" —
    // where the ID PRECEDES the flag and there is no label. Scoped to the CLAUSE containing the flag,
    // not the whole line, so a register that lists the pool in an earlier clause is still excluded.
    if (captured.length === 0) {
      const clauses = line.split(/;|\.\s/);
      let offset = 0;
      for (const clause of clauses) {
        const end = offset + clause.length;
        if (flagAt >= offset && flagAt <= end) { captured = clause.match(HYPOTHESIS_ID) ?? []; break; }
        offset = end + 1;
      }
    }
    for (const id of captured) excludedIds.add(id.toLowerCase());
    const claim = /PP-0\s+(Critical|High)/i.exec(line);
    if (claim) claimedSeverity = claim[1];
  }
  const ids = [...excludedIds].sort();
  const declarationPresent = NO_QUALIFYING_CANDIDATE.test(dossier);
  const reviewerFlags: string[] = [];

  if (!severity) {
    return {
      reviewerFlags: [
        `${BLOCKER_PREFIX} GATE 1 A16: PP-0 severity is not resolvable (no pp0_severity in the ` +
        `[DATA_INVENTORY] marker), so the ${ids.length} band1_pool exclusion(s) cannot be checked ` +
        `against it. Candidate-pool membership is UNVERIFIED this run.`,
      ],
      severity: null, excludedIds: ids, declarationPresent,
      unavailableReason: 'severity_unresolvable', provenanceChecked: false,
    };
  }

  const isCritical = /^critical$/i.test(severity);

  // Direction 1 — hard.
  if (!isCritical && ids.length > 0) {
    reviewerFlags.push(
      `${BLOCKER_PREFIX} GATE 1 A16 (unauthorised pool exclusion): PP-0 severity is ${severity}, but ` +
      `${ids.length} candidate(s) were excluded under band1_pool=no [${ids.join(', ')}]` +
      (claimedSeverity ? ` — the exclusion record itself claims "PP-0 ${claimedSeverity}"` : '') +
      `. The rule fires ONLY at Critical (systemic), so these candidates belong in the pool. This ` +
      `changes Section D MEMBERSHIP while leaving its COUNT at 7+H-0, which is why a count-based ` +
      `read cannot see it.`,
    );
  }

  // Direction 2 — declaration, not a count.
  if (isCritical && ids.length === 0 && !declarationPresent) {
    reviewerFlags.push(
      `${BLOCKER_PREFIX} GATE 1 A16 (undeclared empty exclusion set): PP-0 severity is Critical, which ` +
      `fires the band1_pool=no rule, but no exclusion was recorded and the output does not state that ` +
      `no candidate qualified. Empty may be correct — a pool containing no band1_pool=no candidate ` +
      `legitimately excludes nothing — but silence is indistinguishable from the rule not having been ` +
      `applied. Record either the exclusions or an explicit "no candidate carried band1_pool=no" in Section H.`,
    );
  }

  // ── A16c: does each exclusion have a root? ──
  //
  // Over-capture fail-safe (v37.5a). If the scrape claims most of the archetype library was excluded,
  // that is a parse failure, not 11 client-facing defects. Emit ONE diagnostic instead of N BLOCKERs:
  // the eight-batch lesson is that an instrument defect which floods the panel costs more than the
  // defect it was looking for, because it buries the real findings beside it.
  let provenanceChecked = false;
  const overCaptured = poolFlags.size >= 4 && ids.length > poolFlags.size / 2;
  if (overCaptured) {
    reviewerFlags.push(
      `⚠ GATE 1 A16c SUSPENDED (probable register-format over-capture): the exclusion scrape returned ` +
      `${ids.length} of ${poolFlags.size} library IDs [${ids.join(', ')}]. An exclusion set larger than ` +
      `half the pool is a parse failure, not a finding — Section H's candidate register lists the whole ` +
      `evaluated pool and narrates the exclusion in the same line. Provenance NOT checked this run; ` +
      `verify the exclusion record's shape against the contract.`,
    );
  } else if (ids.length > 0) {
    if (poolFlags.size === 0) {
      reviewerFlags.push(
        `${BLOCKER_PREFIX} GATE 1 A16c (exclusion provenance): ${ids.length} candidate(s) excluded under ` +
        `band1_pool=no [${ids.join(', ')}] but NO archetype resolved, so the flag has no authoritative ` +
        `source and the exclusion is a model assertion. Unlike A4/A9's unavailability this one CHANGED ` +
        `THE OUTPUT — a fabricated exclusion silently removes a real opportunity from the client's ` +
        `deliverable. Restore the candidates or supply the archetype row that carries the flag.`,
      );
    } else {
      provenanceChecked = true;
      for (const id of ids) {
        const root = poolFlags.get(id);
        if (!root) {
          reviewerFlags.push(
            `${BLOCKER_PREFIX} GATE 1 A16c (exclusion provenance): ${id} was excluded under ` +
            `band1_pool=no but the ID is ABSENT from the archetype's CORE-columns table, so the flag ` +
            `has no root. An exclusion may only rest on an archetype row, never on a per-run judgement.`,
          );
        } else if (!/^no$/.test(root.band1Pool)) {
          reviewerFlags.push(
            `${BLOCKER_PREFIX} GATE 1 A16c (exclusion provenance): ${id} was excluded under ` +
            `band1_pool=no but its archetype row carries band1_pool=${root.band1Pool || 'empty'}. The ` +
            `exclusion CONTRADICTS its own root — restore the candidate to the pool.`,
          );
        }
      }
    }
  }

  return { reviewerFlags, severity, excludedIds: ids, declarationPresent, unavailableReason: null, provenanceChecked };
}
