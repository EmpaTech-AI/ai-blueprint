// ─── One normaliser for every guard that compares model-produced text ────────────────────────────
//
// v37.4a. The Practice's six-batch report identifies this as the single largest source of defects in
// the guard layer — larger than the fork class it replaced — at its seventh instance:
//
//   1. stripCheckpointScaffold  exact heading match                      hardened v32
//   2. stripJustification       exact level + brackets + terminator      fixed v37.4
//   3. GATE-4 phase check       tested for a bold run                    fixed v37.4
//   4. Stage-3 allowlist        literal heading match, self-disarmed     partially fixed
//   5. A17a                     numeric type guess                       fixed v37.4a
//   6. A14                      `scheduled (celigo connector)` vs {scheduled, event}   fixed v37.4a
//   7. the Practice's own token lists — grepped a literal label, six times
//
// Every one is an exact match against a form the PRODUCER DOES NOT GUARANTEE. The contract says
// `mechanism=scheduled`; the model writes `scheduled (celigo connector)`, which is not wrong — it is
// more informative. A guard that rejects it is asserting a grammar the contract never fixed.
//
// The single fix shape, and the reason this lives in one file: normalise before comparing, match on
// set membership, never on exact form. Four guards were audited into this module rather than patched
// individually, so the next enum cell added inherits the tolerance instead of re-learning it.

// Take the leading token of an enum cell, dropping parenthetical and bracketed annotations.
//   "scheduled (celigo connector)"  → "scheduled"
//   "yes — daily since 2024"        → "yes"
//   "Critical (systemic)"           → "critical"
//   "Degraded (siloed, 2/5)"        → "degraded"
//   "**Early**"                     → "early"
export function normaliseEnumCell(cell: string): string {
  return cell
    .replace(/\([^)]*\)/g, ' ')          // (celigo connector)
    .replace(/\[[^\]]*\]/g, ' ')         // a confidence tag pasted into the wrong column
    .split(/[\s,;/|—–-]+/)               // leading token of "scheduled — daily" / "scheduled, daily"
    .map(t => t.replace(/[^a-z0-9]/gi, ''))
    .filter(Boolean)[0]?.toLowerCase() ?? '';
}

// Set membership after normalisation. Returns the normalised token too, so a guard can report what it
// actually compared — a false fire that names its own comparison is diagnosable; one that does not is
// the five-batch mystery this class keeps producing.
export function enumMatches(cell: string, allowed: string[]): { ok: boolean; normalised: string } {
  const normalised = normaliseEnumCell(cell);
  return { ok: allowed.includes(normalised), normalised };
}

// yes/no cells. `no` is the default for anything unrecognised — a flag that cannot be read must never
// read as set, because every flag in this pipeline raises severity or reduces a score when set.
export function isYes(cell: string | undefined | null): boolean {
  return normaliseEnumCell(cell ?? '') === 'yes';
}

// Equality between two model-produced enum cells (an emitted value vs an archetype row, say). Both
// sides are normalised, so `yes` matches `yes (documented in the tech inventory)`.
export function enumEquals(a: string | number, b: string | number): boolean {
  const na = typeof a === 'number' ? String(a) : normaliseEnumCell(a);
  const nb = typeof b === 'number' ? String(b) : normaliseEnumCell(b);
  return na === nb;
}
