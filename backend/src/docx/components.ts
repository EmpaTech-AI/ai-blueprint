// ─── WS4 — Component markup contract (callouts / KPI cards / severity labels) ───
//
// Implements the markdown→component contract (Blueprint_Component_Markup_Contract_WS4):
//   • Callout   :::callout <narrative-thesis|key-insight> … :::
//   • KPI cards  ```kpi  with "Label | Value" lines
//   • Severity   {sev:<critical|high|medium|low>|Label text}
//
// Closed enums; fail-loud (§C4): a malformed marker throws ComponentError (a specific
// {component, location, offending} message) rather than degrading silently or leaking raw text.
// Renderers call `validateComponentSyntax` once up-front, then use the (non-throwing) match/parse
// helpers. `detectResidualComponentMarkers` is the §C6b post-render safety net.

import { BLOCKER_PREFIX } from '../types/pipeline';

// WS4 activation gate (§C9 sequencing). Default OFF so this build does not change deliverable
// output (no TOC, no up-front validation) before WS4's own n=4 acceptance run — keeping the pending
// T-10⁶ deliverable byte-stable. Flip `WS4_COMPONENTS=on` for the WS4 acceptance run, the Document
// Lab, and once WS1–3 styling is frozen. Read at call time so tests/runtime can toggle it.
export function ws4Enabled(): boolean {
  return process.env.WS4_COMPONENTS === 'on';
}

// ── Closed enums (§C3) ──────────────────────────────────────────────────────────
export const CALLOUT_LABELS: Record<string, string> = {
  'narrative-thesis': 'NARRATIVE THESIS',
  'key-insight': 'KEY INSIGHT',
};
export const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

// ── Fail-loud error (§C4) ─────────────────────────────────────────────────────────
export class ComponentError extends Error {
  constructor(component: string, location: string, offending: string, reason: string) {
    super(`Malformed ${component} marker — ${reason}. Offending: "${offending.trim().slice(0, 120)}" (at: ${location}).`);
    this.name = 'ComponentError';
  }
}

// ── Class-C marker patterns (§C5) ─────────────────────────────────────────────────
const CALLOUT_OPEN = /^:::callout[ \t]+(\S+)[ \t]*$/;
const CALLOUT_CLOSE = /^:::[ \t]*$/;
const ANY_DIRECTIVE_OPEN = /^:::(?![ \t]*$)/; // a ::: line that is not the bare close
// Well-formed inline severity: level in enum, label non-empty, no nested | or }.
const SEVERITY_WELLFORMED = /\{sev:(critical|high|medium|low)\|([^}|]+)\}/g;
const SEVERITY_OPENER = /\{sev:/g;

// ── Non-throwing match helpers (used by renderers after validation) ───────────────
export function matchCalloutOpen(line: string): { type: string; label: string } | null {
  const m = line.trim().match(CALLOUT_OPEN);
  if (!m || !(m[1] in CALLOUT_LABELS)) return null;
  return { type: m[1], label: CALLOUT_LABELS[m[1]] };
}
export function isCalloutClose(line: string): boolean {
  return CALLOUT_CLOSE.test(line.trim());
}
export function isKpiFence(line: string): boolean {
  return line.trim().replace(/^```/, '').trim().toLowerCase() === 'kpi';
}
export function parseKpiRows(bodyLines: string[]): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  for (const raw of bodyLines) {
    if (!raw.trim()) continue;
    const parts = raw.split('|');
    rows.push({ label: parts[0].trim(), value: parts[1].trim() });
  }
  return rows;
}
// Split a prose string into ordered segments; severity segments carry their level.
export function splitSeveritySpans(text: string): Array<{ text: string; level?: SeverityLevel }> {
  const out: Array<{ text: string; level?: SeverityLevel }> = [];
  let last = 0;
  const re = new RegExp(SEVERITY_WELLFORMED.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[2], level: m[1] as SeverityLevel });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
export function hasSeverity(text: string): boolean {
  return new RegExp(SEVERITY_WELLFORMED.source).test(text);
}

// ── Fail-loud validation (§C4) — run once per document before rendering ────────────
export function validateComponentSyntax(markdown: string): void {
  const lines = markdown.split('\n');
  let calloutOpenAt = -1;
  let inKpi = false;
  let kpiStartAt = -1;
  let kpiRowCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    const loc = `line ${i + 1}`;

    // KPI fence boundaries
    if (t.startsWith('```')) {
      if (isKpiFence(raw)) {
        if (inKpi) throw new ComponentError('kpi', loc, t, 'nested ```kpi fence');
        inKpi = true; kpiStartAt = i; kpiRowCount = 0; continue;
      }
      if (inKpi) { // closing fence of a kpi block
        if (kpiRowCount === 0) throw new ComponentError('kpi', `line ${kpiStartAt + 1}`, '```kpi', 'block is empty');
        inKpi = false; continue;
      }
      // a non-kpi code fence — toggle handled by renderers; skip validation here
      continue;
    }
    if (inKpi) {
      if (t) {
        const parts = raw.split('|');
        if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
          throw new ComponentError('kpi', loc, raw, 'each non-blank line must be exactly "Label | Value"');
        }
        kpiRowCount++;
      }
      continue;
    }

    // Callout directives
    if (ANY_DIRECTIVE_OPEN.test(t)) {
      if (calloutOpenAt >= 0) throw new ComponentError('callout', loc, t, 'nested callout (previous block not closed)');
      const m = t.match(CALLOUT_OPEN);
      if (!m) throw new ComponentError('callout', loc, t, 'expected ":::callout <narrative-thesis|key-insight>"');
      if (!(m[1] in CALLOUT_LABELS)) throw new ComponentError('callout', loc, t, `type must be one of ${Object.keys(CALLOUT_LABELS).join(' | ')}`);
      calloutOpenAt = i; continue;
    }
    if (isCalloutClose(t)) {
      if (calloutOpenAt < 0) throw new ComponentError('callout', loc, t, 'closing ":::" with no open callout');
      calloutOpenAt = -1; continue;
    }

    // Severity inline: any opener that is not part of a well-formed marker is malformed.
    if (t.includes('{sev:')) {
      const openers = (raw.match(SEVERITY_OPENER) || []).length;
      const wellFormed = (raw.match(SEVERITY_WELLFORMED) || []).length;
      if (openers !== wellFormed) {
        throw new ComponentError('severity', loc, raw, 'expected "{sev:<critical|high|medium|low>|Label}"');
      }
    }
  }

  if (inKpi) throw new ComponentError('kpi', `line ${kpiStartAt + 1}`, '```kpi', 'fence never closed');
  if (calloutOpenAt >= 0) throw new ComponentError('callout', `line ${calloutOpenAt + 1}`, ':::callout', 'block never closed');
}

// ── §C6b post-render residual detector (safety net) ───────────────────────────────
const RESIDUAL_PATTERNS: Array<[RegExp, string]> = [
  [/^:::callout\b/im, 'unrendered callout open'],
  [/^:::[ \t]*$/im, 'unrendered callout close'],
  [/^```kpi\b/im, 'unrendered KPI fence'],
  [/\{sev:/i, 'unrendered severity marker'],
];
export function detectResidualComponentMarkers(rendered: string): string[] {
  const flags: string[] = [];
  for (const [re, label] of RESIDUAL_PATTERNS) {
    if (re.test(rendered)) {
      flags.push(`${BLOCKER_PREFIX} Stage 5 residual component marker (${label}) survived rendering — do not release.`);
    }
  }
  return flags;
}
