// ─── The archetype-activation ladder as a first-class output (v37.6, eight-batch report III.2) ─────
//
// Every company from any sector arrives at exactly one rung, and the rung sets VERIFICATION DEPTH —
// never verdict logic. The report's rule 3: "Rung is a first-class output. It appears in the run record
// and drives the coverage fraction on every reported score. Two Blueprints from different rungs are not
// comparable, and the system says so itself."
//
// That last clause is the whole point. The paired batch produced Meridian ≈90% [22/24 checked] and
// LunaCart ≈78% [8/24], and the earlier 88%≈88% parity claim had to be withdrawn because nobody could
// see from the artifact that one case was structurally a third as verifiable. Printing the rung and the
// coverage fraction on the run record makes that mistake unavailable rather than merely discouraged.
//
// Rule 2 also matters here: activation is never inferred from the client's industry label at runtime.
// The rung is read from the archetype library's own INDEX status for the archetype the run DECLARED —
// an explicit, logged decision, never a guess from the industry string.

import fs from 'fs';
import path from 'path';

export type Rung = 'A' | 'B' | 'C' | 'D';

export interface RungDeclaration {
  rung: Rung;
  archetype: string;          // the declared archetype slug, or 'generic'
  status: string;             // the INDEX status verbatim
  verification: 'FULL' | 'FULL-attempted' | 'PARTIAL' | 'intake-only';
  reason: string;
}

const RUNG_MEANING: Record<Rung, { verification: RungDeclaration['verification']; label: string }> = {
  A: { verification: 'FULL',           label: 'ACTIVE archetype — validated library for this industry' },
  B: { verification: 'FULL-attempted', label: 'PENDING VALIDATION — library exists, not yet validated' },
  C: { verification: 'PARTIAL',        label: 'NONE — no library for this industry (archetype-free)' },
  D: { verification: 'intake-only',    label: 'CONTRAINDICATED — pack too poor to instantiate PP-0' },
};

// Parse INDEX.md's routing table: | keywords | file | slug | STATUS |
function indexStatusFor(archetypesDir: string, slug: string): string | null {
  try {
    const md = fs.readFileSync(path.join(archetypesDir, 'INDEX.md'), 'utf-8');
    for (const line of md.split('\n')) {
      if (!line.trim().startsWith('|')) continue;
      const c = line.split('|').map(s => s.replace(/[`*]/g, '').trim()).filter((_, i) => i > 0);
      if (c.length < 4) continue;
      if (c[2]?.toLowerCase() === slug.toLowerCase()) return c[3] ?? '';
    }
  } catch { /* INDEX unreadable — the caller reports rung C with that reason */ }
  return null;
}

export function resolveRung(dossier: string, archetypesDir: string): RungDeclaration {
  const declared = /^\s*ARCHETYPE\s*[:=]\s*([\w-]+)/m.exec(dossier)?.[1]?.toLowerCase() ?? 'unknown';

  if (declared === 'generic' || declared === 'unknown') {
    return {
      rung: 'C', archetype: declared, status: 'none',
      verification: RUNG_MEANING.C.verification,
      reason: `the run declared ARCHETYPE=${declared}, so no industry library applies. ` +
        `Archetype-rooted checks (A4 / A9 / A16c) are UNAVAILABLE by fact, not by fault.`,
    };
  }

  const status = indexStatusFor(archetypesDir, declared);
  if (status === null) {
    return {
      rung: 'C', archetype: declared, status: 'unlisted',
      verification: RUNG_MEANING.C.verification,
      reason: `ARCHETYPE=${declared} is not listed in the archetype INDEX, so its activation state is ` +
        `unknown. Treated as rung C: an unlisted archetype has not passed an activation gate, and ` +
        `inferring ACTIVE from the presence of a file is exactly what rule 1 forbids.`,
    };
  }
  if (/^ACTIVE\b/i.test(status)) {
    return {
      rung: 'A', archetype: declared, status,
      verification: RUNG_MEANING.A.verification,
      reason: `${declared} is ACTIVE — validated against a golden case, so the full pin set applies and ` +
        `archetype-rooted checks are live.`,
    };
  }
  if (/PENDING/i.test(status)) {
    return {
      rung: 'B', archetype: declared, status,
      verification: RUNG_MEANING.B.verification,
      reason: `${declared} is PENDING VALIDATION — the library exists but no golden case has validated ` +
        `it, so archetype-rooted checks run ADVISORY. Activation is earned by calibration, not authorship.`,
    };
  }
  return {
    rung: 'C', archetype: declared, status,
    verification: RUNG_MEANING.C.verification,
    reason: `${declared} carries INDEX status "${status}", which is neither ACTIVE nor PENDING, so no ` +
      `validated library applies.`,
  };
}

// The line that goes on the run record, immediately after the RUN stamp. `checked`/`expected` come from
// the Gate A coverage model so the fraction is the measured one, never a nominal claim.
export function formatRungDeclaration(d: RungDeclaration, checked: number, expected: number): string {
  const fraction = expected > 0 ? `${checked}/${expected}` : 'n/a';
  return (
    `RUNG: ${d.rung} (${RUNG_MEANING[d.rung].label}) · archetype=${d.archetype} · INDEX status="${d.status}" · ` +
    `verification=${d.verification} · Class-A coverage ${fraction}. ${d.reason} ` +
    `READING RULE: the rung sets verification DEPTH, never verdict logic. Scores from different rungs are ` +
    `NOT comparable — quote this fraction beside any score taken from this run.`
  );
}
