// ─── A17 (F12): form-vs-document numeric reconciliation ──────────────────────────────────────────
//
// v37.4. The defect: all four LunaCart financial defects escaped because NOTHING in the pipeline
// compares a form figure to a document figure. The pipeline silently adopts one source and never
// records that the other disagreed — and the intake contract actively instructs the silence:
//
//   "REVENUE_RANGE is the form's stated range — never substitute a point figure from documents,
//    even a more precise one."  (blueprint-intake/SKILL.md, T-14 verbatim-copy rules)
//
// That rule is not wrong. Choosing an authoritative source is correct; choosing it SILENTLY is the
// defect. So A17 does not change which source wins — it makes a disagreement impossible to not record.
//
// Three checks, ordered by how certain they are. This ordering is deliberate: a reconciliation pass
// that false-fires on every run would be worse than none, because it trains the reviewer to skip it
// (the GATE-4 failure mode).
//
//   A17a  RANGE CONTAINMENT — the form states a band, a document states a point, the point falls
//         outside the band. Zero-false-fire: a number outside a stated range IS a contradiction.
//         This is the check that catches the LunaCart class.
//   A17b  DERIVED ARITHMETIC — revenue − costs ≠ profit, or margin ≠ profit ÷ revenue, within one
//         document and one period. Zero-false-fire: it is arithmetic. This is "the packs mis-state
//         their own profitability."
//   A17c  MULTI-VALUED METRICS — the same metric appears with different values. NOT a flag: period
//         and segment scoping make this legitimately common (FY24 vs FY25, segment vs total). Listed
//         in the divergence table as "verify scoping" and nothing more.
//
// Metric detection uses a CLOSED vocabulary of label patterns, per the house rule established for the
// S-37 step-narration detector: set membership, not intent-guessing. A number in a line that does not
// carry a known metric label is ignored rather than guessed at.

import { BLOCKER_PREFIX } from '../types/pipeline';
import { FormAnswers, DocumentCorpus } from '../types/pipeline';

export type MetricUnit = 'currency' | 'percent' | 'count';

export interface MetricSpec {
  metric: string;
  unit: MetricUnit;
  label: RegExp;
}

// Closed vocabulary. `label` must match on the same line as the number.
export const METRIC_SPECS: MetricSpec[] = [
  { metric: 'revenue',      unit: 'currency', label: /\b(?:annual\s+)?revenue\b|\bturnover\b|\bnet sales\b|\btotal sales\b/i },
  { metric: 'gross_profit', unit: 'currency', label: /\bgross profit\b/i },
  { metric: 'net_profit',   unit: 'currency', label: /\bnet profit\b|\bnet income\b|\bprofit after tax\b|\bEBITDA\b|\boperating profit\b/i },
  { metric: 'total_costs',  unit: 'currency', label: /\btotal costs?\b|\btotal expenses?\b|\boperating expenses?\b|\bopex\b|\bcost of (?:goods sold|sales)\b|\bCOGS\b/i },
  { metric: 'net_margin',   unit: 'percent',  label: /\bnet (?:profit )?margin\b|\bprofit margin\b|\bEBITDA margin\b/i },
  { metric: 'gross_margin', unit: 'percent',  label: /\bgross margin\b/i },
  { metric: 'headcount',    unit: 'count',    label: /\bheadcount\b|\bemployees\b|\bstaff\b|\bFTEs?\b|\bnumber of employees\b/i },
  { metric: 'departments',  unit: 'count',    label: /\bdepartments?\b/i },
  { metric: 'budget',       unit: 'currency', label: /\bbudget\b/i },
];

// Form fields whose ANSWER is authoritative for a metric. These are the schema's own ids
// (frontend/lib/formSchema.ts), so the pairing is declared rather than inferred from the label text.
export const FORM_METRIC_FIELDS: Record<string, string> = {
  revenue_range: 'revenue',
  company_size: 'headcount',
  departments: 'departments',
  budget_range: 'budget',
};

// What the number itself was written as. v37.4a: type-checking the QUANTITY, not just the metric
// label, is what stops a percentage or a currency figure being admitted as a headcount.
export type Qualifier = 'currency' | 'percent' | 'plain';

// Which quantity forms may satisfy which metric. A percentage is never a currency amount; a currency
// amount is never a count. Set membership, not a numeric type guess.
const QUALIFIER_ALLOWED: Record<MetricUnit, Qualifier[]> = {
  currency: ['currency', 'plain'],
  percent: ['percent'],
  count: ['plain'],
};

export interface FinancialClaim {
  metric: string;
  unit: MetricUnit;
  value: number | null;      // point value; null when the claim is a pure range
  rangeLow: number | null;
  rangeHigh: number | null;
  raw: string;
  source: string;            // "form:revenue_range" | "document:financial_summary (03_x.pdf)"
  isForm: boolean;
  period: string | null;     // FY2025 / 2024 — used to scope A17b and A17c
  // v37.4a (LunaCart v1.1 §2.1): TRUE only for a range read from a DECLARED form metric field
  // (FORM_METRIC_FIELDS). A range mined from free-text prose is not an authoritative band, and
  // treating it as one is what produced the entity-mismatch cluster: a LunaBox subscriber count from
  // `top_priorities` and an industry benchmark percentage from `pain_point_4` were both admitted as
  // revenue bands and compared against real revenue. Only a declared band can gate anything.
  isDeclaredBand: boolean;
}

// ─── Number normalisation ────────────────────────────────────────────────────────

const MULTIPLIER: Record<string, number> = {
  k: 1e3, thousand: 1e3,
  m: 1e6, mn: 1e6, million: 1e6,
  bn: 1e9, b: 1e9, billion: 1e9,
};

// A currency/count magnitude with optional symbol, thousands separators, decimal, and scale suffix.
const NUM = String.raw`(?:[€$£]\s*)?(\d{1,3}(?:[,\s]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k|m|mn|bn|b|thousand|million|billion)?`;
const PCT = String.raw`(\d+(?:\.\d+)?)\s*%`;
// En-dash, em-dash, hyphen, "to", "–" — the form emits "€5M–€8M".
const RANGE_SEP = String.raw`\s*(?:[-–—]|to)\s*`;

// A financial line almost always carries a fiscal-year token, and it is a NUMBER — "FY2025 total
// revenue: €6.4M" parsed to 2025 before this was handled, which would have made every A17b arithmetic
// check compare a year against a year. Two defences, both needed:
//   1. prefer a number that is SYMBOL- or SCALE-qualified (€6.4M, 12.4 million) — a bare year is neither;
//   2. failing that, strip period tokens before falling back to a bare number.
// The strip is reverted when it would leave no number at all, so a line whose only figure happens to
// look like a year still yields a value rather than nothing.
const NUM_CORE = String.raw`(\d{1,3}(?:[,\s]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)`;
const SCALE_SUFFIX = String.raw`(k|m|mn|bn|b|thousand|million|billion)`;
const NUM_SYMBOL = new RegExp(String.raw`[€$£]\s*${NUM_CORE}\s*${SCALE_SUFFIX}?`, 'i');
const NUM_SUFFIXED = new RegExp(`${NUM_CORE}\\s*${SCALE_SUFFIX}\\b`, 'i');
const NUM_BARE = new RegExp(NUM_CORE);
const PERIOD_TOKEN = /\b(?:FY\s?)?20\d{2}(?:\s*[/-]\s*\d{2,4})?\b/gi;

export function stripPeriodTokens(line: string): string {
  const stripped = line.replace(PERIOD_TOKEN, ' ');
  return NUM_BARE.test(stripped) ? stripped : line;
}

function scale(raw: string, suffix: string | undefined): number {
  const n = parseFloat(raw.replace(/[,\s]/g, ''));
  if (!Number.isFinite(n)) return NaN;
  return suffix ? n * (MULTIPLIER[suffix.toLowerCase()] ?? 1) : n;
}

// Parse "€5M–€8M" / "50-100" / "€2M to €10M" into a range; returns null when not a range.
export function parseRange(input: string): { low: number; high: number } | null {
  const text = stripPeriodTokens(input);
  const re = new RegExp(`${NUM}${RANGE_SEP}${NUM}`, 'i');
  const m = re.exec(text);
  if (!m) return null;
  const low = scale(m[1], m[2]);
  // "5–8M" — the scale suffix on the upper bound also governs the lower when the lower has none.
  const high = scale(m[3], m[4]);
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null;
  const lowScaled = m[2] ? low : (m[4] ? low * (MULTIPLIER[m[4].toLowerCase()] ?? 1) : low);
  return lowScaled <= high ? { low: lowScaled, high } : { low: high, high: lowScaled };
}

// Is the number at `index` (length `len`) immediately followed by a percent sign?
function followedByPercent(text: string, index: number, len: number): boolean {
  return /^\s*%/.test(text.slice(index + len));
}

// Returns the value AND how it was written. The qualifier is what lets a metric reject a quantity of
// the wrong kind — "58.2%" must not satisfy `revenue`, "€156,000" must not satisfy `headcount`.
export function parseQuantity(text: string, unit: MetricUnit): { value: number; qualifier: Qualifier } | null {
  if (unit === 'percent') {
    const m = new RegExp(PCT).exec(text);
    return m ? { value: parseFloat(m[1]), qualifier: 'percent' } : null;
  }
  // Qualified first — a fiscal-year token is neither symbol- nor scale-qualified, so this skips it.
  const sym = NUM_SYMBOL.exec(text);
  if (sym) {
    const v = scale(sym[1], sym[2]);
    if (Number.isFinite(v)) return { value: v, qualifier: 'currency' };
  }
  const suf = NUM_SUFFIXED.exec(text);
  if (suf) {
    const v = scale(suf[1], suf[2]);
    if (Number.isFinite(v)) {
      return { value: v, qualifier: followedByPercent(text, suf.index, suf[0].length) ? 'percent' : 'plain' };
    }
  }
  const stripped = stripPeriodTokens(text);
  const bare = NUM_BARE.exec(stripped);
  if (!bare) return null;
  const v = scale(bare[1], undefined);
  if (!Number.isFinite(v)) return null;
  return { value: v, qualifier: followedByPercent(stripped, bare.index, bare[0].length) ? 'percent' : 'plain' };
}

export function parsePoint(text: string, unit: MetricUnit): number | null {
  return parseQuantity(text, unit)?.value ?? null;
}

export function qualifierSatisfies(unit: MetricUnit, qualifier: Qualifier): boolean {
  return QUALIFIER_ALLOWED[unit].includes(qualifier);
}

const PERIOD_RE = /\b(?:FY\s?)?(20\d{2})(?:\s*[/-]\s*\d{2,4})?\b/i;
function periodOf(line: string): string | null {
  const m = PERIOD_RE.exec(line);
  return m ? m[1] : null;
}

// ─── Extraction ──────────────────────────────────────────────────────────────────

// Two closed-vocabulary EXCLUSIONS, both of which would otherwise produce false BLOCKERs on realistic
// packs. Each is a stated list rather than a heuristic, per the S-37 precedent.
//
//   PROJECTION — a forward-looking figure is not a claim about the present, so "Revenue target FY2027:
//   €15M" must not contradict a current-revenue band of €5M–€8M.
//   UNIT_RATE — a per-something figure is a different quantity entirely ("revenue per employee
//   €95,000" is not revenue).
const PROJECTION_MARKER = /\b(?:target|forecast|projected|projection|goal|ambition|plan(?:ned)?|guidance|expected|aim(?:ing)?|plateau|run[- ]rate|plateau)\b/i;
const UNIT_RATE_MARKER = /\bper\s+(?:employee|head|FTE|unit|customer|order|client|month|week|day|hour)\b|\baverage\b|\bmedian\b/i;

export function isExcludedLine(line: string): boolean {
  return PROJECTION_MARKER.test(line) || UNIT_RATE_MARKER.test(line);
}

// A metric label and a number must co-occur on one line. Lines are the unit because client financial
// documents are overwhelmingly tabular or bulleted — a sentence-spanning claim is rare, and widening
// the window is what produces false pairings.
export function extractClaims(text: string, source: string, isForm: boolean): FinancialClaim[] {
  const claims: FinancialClaim[] = [];
  for (const line of text.split('\n')) {
    if (line.length > 400) continue;                 // a wall of prose is not a figure line
    if (isExcludedLine(line)) continue;
    for (const spec of METRIC_SPECS) {
      if (!spec.label.test(line)) continue;
      const range = spec.unit === 'percent' ? null : parseRange(line);
      const q = range ? null : parseQuantity(line, spec.unit);
      // Quantity-kind check: reject a number written in a form this metric cannot take.
      if (q && !qualifierSatisfies(spec.unit, q.qualifier)) continue;
      if (!range && !q) continue;
      claims.push({
        metric: spec.metric, unit: spec.unit,
        value: q?.value ?? null, rangeLow: range?.low ?? null, rangeHigh: range?.high ?? null,
        raw: line.trim().slice(0, 200), source, isForm, period: periodOf(line),
        isDeclaredBand: false,   // mined from prose — never an authoritative band
      });
    }
  }
  return claims;
}

export function collectClaims(formAnswers: FormAnswers, corpus: DocumentCorpus): FinancialClaim[] {
  const claims: FinancialClaim[] = [];

  // Form side: declared metric fields first (authoritative pairing), then free-text answers.
  for (const [fieldId, metric] of Object.entries(FORM_METRIC_FIELDS)) {
    const answer = formAnswers[fieldId];
    if (answer == null) continue;
    const text = Array.isArray(answer) ? answer.join(' ') : String(answer);
    const spec = METRIC_SPECS.find(s => s.metric === metric)!;
    const range = parseRange(text);
    const q = range ? null : parseQuantity(text, spec.unit);
    if (q && !qualifierSatisfies(spec.unit, q.qualifier)) continue;
    if (!range && !q) continue;
    claims.push({
      metric, unit: spec.unit, value: q?.value ?? null,
      rangeLow: range?.low ?? null, rangeHigh: range?.high ?? null,
      raw: text.trim().slice(0, 200), source: `form:${fieldId}`, isForm: true, period: null,
      isDeclaredBand: range !== null,   // a declared metric field IS an authoritative band
    });
  }
  for (const [fieldId, answer] of Object.entries(formAnswers)) {
    if (FORM_METRIC_FIELDS[fieldId]) continue;       // already captured, authoritatively
    const text = Array.isArray(answer) ? answer.join('\n') : String(answer ?? '');
    claims.push(...extractClaims(text, `form:${fieldId}`, true));
  }

  // Document side.
  for (const doc of corpus.documents) {
    if (doc.status !== 'ok') continue;
    claims.push(...extractClaims(doc.text, `document:${doc.category} (${doc.filename})`, false));
  }
  return claims;
}

// ─── Divergence model ────────────────────────────────────────────────────────────

export interface Divergence {
  check: 'A17a' | 'A17b' | 'A17c';
  metric: string;
  formStated: string;
  documentStated: string;
  detail: string;
  severity: 'blocker' | 'advisory';
}

const fmt = (n: number, unit: MetricUnit) =>
  unit === 'percent' ? `${n}%` : unit === 'count' ? String(n) : n.toLocaleString('en-US');

// A17a — a document point figure outside the form's stated band.
//
// ASYMMETRIC, for the same reason A16 is: only one direction is safe to assert.
//
//   ABOVE the band → BLOCKER. A part cannot exceed the whole. A document figure larger than the
//   company-wide band cannot be a department, a segment, or a sub-total, so it is a genuine
//   contradiction of the form.
//   BELOW the band → ADVISORY. This is overwhelmingly a sub-component: "Sales team: 12 employees"
//   against a company_size band of 50–100, or one revenue line against total turnover. Asserting it
//   would BLOCKER correct runs on almost every real pack, which is the GATE-4 failure mode.
//
// The below-band case still appears in the divergence table, so the reviewer sees it — it is
// downgraded, not hidden. That is the distinction between an unsafe assertion and a lost signal.
// v37.4a (LunaCart v1.1 §2.1): the band side is now restricted to `isDeclaredBand` — a range read from
// a DECLARED form metric field. Previously any range mined from any form answer became a band once its
// line happened to carry a metric label, which admitted:
//   • a LunaBox subscriber count from `top_priorities` (2,840–5,000) as a revenue band
//   • an industry benchmark percentage from `pain_point_4` (15–20) as a revenue band
//   • a growth TARGET from `growth_targets` (18M–22M) as a current-revenue band
// All three then produced blocker-grade divergences against real revenue figures. Ivan's diagnosis was
// exact: pair only within a declared metric identity, matching on set membership rather than on a
// numeric type guess. `growth_targets` is additionally a projection by field semantics, so excluding
// undeclared fields closes the projection leak on the form side too.
function checkRangeContainment(claims: FinancialClaim[]): Divergence[] {
  const out: Divergence[] = [];
  const ranges = claims.filter(c => c.isDeclaredBand && c.rangeLow !== null && c.rangeHigh !== null);
  for (const range of ranges) {
    for (const doc of claims.filter(c => !c.isForm && c.metric === range.metric && c.value !== null)) {
      const v = doc.value!;
      if (v >= range.rangeLow! && v <= range.rangeHigh!) continue;
      const above = v > range.rangeHigh!;
      out.push({
        check: 'A17a',
        metric: range.metric,
        formStated: `${fmt(range.rangeLow!, range.unit)}–${fmt(range.rangeHigh!, range.unit)} (${range.source})`,
        documentStated: `${fmt(v, doc.unit)} (${doc.source})`,
        detail: above
          ? `the document figure EXCEEDS the form's stated band — a part cannot exceed the whole, so ` +
            `this is a contradiction, not a sub-component. Form line: "${range.raw}". Document line: "${doc.raw}".`
          : `the document figure falls below the form's stated band, which is usually a sub-component ` +
            `(a department, segment, or single line). Listed for verification, not asserted as a defect. ` +
            `Form line: "${range.raw}". Document line: "${doc.raw}".`,
        severity: above ? 'blocker' : 'advisory',
      });
    }
  }
  return out;
}

const REL_TOLERANCE = 0.01;   // 1% — client documents round
const PP_TOLERANCE = 0.5;     // half a percentage point on margins

// A17b — derived-financial arithmetic inside ONE source and ONE period.
function checkDerivedArithmetic(claims: FinancialClaim[]): Divergence[] {
  const out: Divergence[] = [];
  const byScope = new Map<string, FinancialClaim[]>();
  for (const c of claims.filter(x => x.value !== null)) {
    const key = `${c.source}::${c.period ?? 'no-period'}`;
    if (!byScope.has(key)) byScope.set(key, []);
    byScope.get(key)!.push(c);
  }
  for (const [scope, group] of byScope) {
    const pick = (metric: string) => group.find(c => c.metric === metric);
    const revenue = pick('revenue'), costs = pick('total_costs');
    const netProfit = pick('net_profit'), netMargin = pick('net_margin');

    if (revenue && costs && netProfit) {
      const expected = revenue.value! - costs.value!;
      if (Math.abs(expected - netProfit.value!) > Math.abs(revenue.value!) * REL_TOLERANCE) {
        out.push({
          check: 'A17b', metric: 'net_profit',
          formStated: `revenue ${fmt(revenue.value!, 'currency')} − costs ${fmt(costs.value!, 'currency')} = ${fmt(expected, 'currency')}`,
          documentStated: `stated net profit ${fmt(netProfit.value!, 'currency')} (${scope})`,
          detail: `the source contradicts its own arithmetic by ${fmt(Math.abs(expected - netProfit.value!), 'currency')}. ` +
            `Lines: "${revenue.raw}" / "${costs.raw}" / "${netProfit.raw}".`,
          severity: 'blocker',
        });
      }
    }
    if (revenue && netProfit && netMargin && revenue.value !== 0) {
      const expected = (netProfit.value! / revenue.value!) * 100;
      if (Math.abs(expected - netMargin.value!) > PP_TOLERANCE) {
        out.push({
          check: 'A17b', metric: 'net_margin',
          formStated: `net profit ${fmt(netProfit.value!, 'currency')} ÷ revenue ${fmt(revenue.value!, 'currency')} = ${expected.toFixed(1)}%`,
          documentStated: `stated margin ${fmt(netMargin.value!, 'percent')} (${scope})`,
          detail: `the source mis-states its own profitability by ${Math.abs(expected - netMargin.value!).toFixed(1)} ` +
            `percentage points. Lines: "${revenue.raw}" / "${netProfit.raw}" / "${netMargin.raw}".`,
          severity: 'blocker',
        });
      }
    }
  }
  return out;
}

// A17c — the same metric with different values. ADVISORY ONLY, never a flag: period and segment
// scoping make this legitimately common, and a BLOCKER here would fire on almost every real pack.
function checkMultiValued(claims: FinancialClaim[]): Divergence[] {
  const out: Divergence[] = [];
  const byMetric = new Map<string, FinancialClaim[]>();
  for (const c of claims.filter(x => x.value !== null && !x.isForm)) {
    if (!byMetric.has(c.metric)) byMetric.set(c.metric, []);
    byMetric.get(c.metric)!.push(c);
  }
  for (const [metric, group] of byMetric) {
    const distinct = [...new Set(group.map(c => c.value!))];
    if (distinct.length < 2) continue;
    const spec = METRIC_SPECS.find(s => s.metric === metric)!;
    out.push({
      check: 'A17c', metric,
      formStated: '—',
      documentStated: distinct.map(v => fmt(v, spec.unit)).join(' · '),
      detail: `${distinct.length} distinct values across ${group.length} mention(s). Period/segment ` +
        `scoping is a legitimate explanation — verify scoping, this is not asserted as a defect.`,
      severity: 'advisory',
    });
  }
  return out;
}

// ─── The pass ────────────────────────────────────────────────────────────────────

// Was the divergence declared in the dossier? The existing rule already requires it
// (references/confidence_thresholds.md: "Flag the discrepancy in Section H Reviewer Checklist. Use the
// higher-confidence source for the body claim") — nothing enforced it. Detection is deliberately
// forgiving on wording and strict on presence: the metric name plus a reconciliation word.
const RECONCILE_WORD = /\b(?:diverg|discrepan|reconcil|contradict|disagree|inconsisten|mismatch)/i;

export function divergenceDeclared(dossier: string, metric: string): boolean {
  const metricWords = metric.split('_').filter(w => w.length > 3);
  return dossier.split('\n').some(line =>
    RECONCILE_WORD.test(line) && metricWords.some(w => new RegExp(`\\b${w}`, 'i').test(line)));
}

export interface ReconciliationResult {
  divergences: Divergence[];
  reviewerFlags: string[];
  divergenceTable: string;
  claimsFound: number;
}

export function reconcileFinancials(
  formAnswers: FormAnswers,
  corpus: DocumentCorpus,
  dossier: string,
): ReconciliationResult {
  const claims = collectClaims(formAnswers, corpus);
  const divergences = [
    ...checkRangeContainment(claims),
    ...checkDerivedArithmetic(claims),
    ...checkMultiValued(claims),
  ];
  const reviewerFlags: string[] = [];

  for (const d of divergences) {
    if (d.severity !== 'blocker') continue;
    if (divergenceDeclared(dossier, d.metric)) continue;   // declared → the silence is broken
    reviewerFlags.push(
      `${BLOCKER_PREFIX} GATE 1 ${d.check} (F12 form-vs-document reconciliation) for ${d.metric}: ` +
      `${d.formStated} vs ${d.documentStated} — ${d.detail} UNDECLARED: no discrepancy note names ` +
      `this metric. Choosing an authoritative source is correct; choosing it silently is the defect. ` +
      `Record the divergence and the source chosen in Section H.`,
    );
  }

  // The divergence table Ivan asked for — emitted every run, including when empty, so "no divergences"
  // is an affirmative result rather than an absence of output.
  const rows = divergences.map(d =>
    `| ${d.check} | ${d.metric} | ${d.formStated} | ${d.documentStated} | ${d.severity} | ` +
    `${divergenceDeclared(dossier, d.metric) ? 'declared' : 'UNDECLARED'} |`);
  const divergenceTable = [
    '| Check | Metric | Form / derived | Document / stated | Severity | Declared? |',
    '|---|---|---|---|---|---|',
    ...(rows.length > 0 ? rows : ['| — | — | — | — | — | no divergence detected |']),
  ].join('\n');

  return { divergences, reviewerFlags, divergenceTable, claimsFound: claims.length };
}
