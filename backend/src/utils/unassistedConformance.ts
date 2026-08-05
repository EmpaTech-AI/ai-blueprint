// ─── UCR: Unassisted Conformance Rate (v37.8, instated by the twelve-batch report §VI.3) ──────────
//
// The green-provenance audit found that **roughly 45–50% of the matrix's green is lock-assisted** — the
// artifact is honestly green because a render, patch, strip or freeze corrected it, while the model's
// authored input still errs. That is legitimate product machinery (the client receives the corrected
// product) but it means a rising artifact score with a flat model is indistinguishable from real progress.
//
// The report's ruling: every overall report carries BOTH figures — the artifact score, and the
// model-earned score with UCR. And its sharpest line, which is why this module exists:
//
//   "a rising artifact score with flat UCR is a better harness, not a better system"
//
// UCR was hand-estimated for the first reading (Meridian ≈62%, LunaCart ≈54%). It should not be
// hand-estimated twice: every input is already in the run's own correction log and repair counts. This
// computes it per run so the trend is measured.
//
// DEFINITION, stated precisely because the number is now load-bearing:
//   UCR = (intervention opportunities where NO app intervention was needed) ÷ (all intervention opportunities)
//
// An "intervention opportunity" is any point where the app COULD have corrected the model. Counting only
// the interventions that fired would make UCR unfalsifiable — a build with fewer guards would look better.
// So the denominator is opportunities, not corrections, which means adding a guard lowers UCR only if the
// model was already wrong on that surface. That is the property the metric needs.

export interface UcrInput {
  /** C1 correction records — one per Class-A value checked, `agreed:false` = the model needed correction. */
  correctionRecords: Array<{ ruleId: string; agreed: boolean }>;
  /** A18 anchor render: how many anchors the model authored vs how many the phase map required. */
  anchorsAuthored: number;
  anchorsRequired: number;
  /** A11 inventory render: marker fields the app had to rewrite, out of those it checks. */
  inventoryFieldsRendered: number;
  inventoryFieldsChecked: number;
  /** Scaffold/narration strip: forms the strip removed, out of the forms it looks for. */
  stripFormsRemoved: number;
  stripFormsChecked: number;
  /** Arithmetic auto-patch events (REG-23/REG-27a) out of score lines checked. */
  arithmeticPatched: number;
  arithmeticChecked: number;
}

export interface UcrResult {
  ucr: number | null;              // null when there were no opportunities at all
  clean: number;
  opportunities: number;
  bySurface: Array<{ surface: string; clean: number; opportunities: number }>;
}

export function computeUcr(input: UcrInput): UcrResult {
  const bySurface: UcrResult['bySurface'] = [];

  // C1 records, grouped by rule so a single noisy family cannot dominate the headline.
  const byRule = new Map<string, { clean: number; total: number }>();
  for (const r of input.correctionRecords) {
    const acc = byRule.get(r.ruleId) ?? { clean: 0, total: 0 };
    acc.total++;
    if (r.agreed) acc.clean++;
    byRule.set(r.ruleId, acc);
  }
  for (const [ruleId, acc] of [...byRule].sort()) {
    bySurface.push({ surface: `C1/${ruleId}`, clean: acc.clean, opportunities: acc.total });
  }

  // Render/patch/strip surfaces. Each contributes `opportunities` and the clean share of them.
  const add = (surface: string, corrected: number, checked: number) => {
    if (checked <= 0) return;
    bySurface.push({ surface, clean: Math.max(0, checked - corrected), opportunities: checked });
  };
  // Anchors: the opportunity count is what the phase map required; a shortfall OR an excess is assistance.
  add('A18/anchors', Math.abs(input.anchorsRequired - input.anchorsAuthored), Math.max(input.anchorsRequired, input.anchorsAuthored));
  add('A11/inventory-marker', input.inventoryFieldsRendered, input.inventoryFieldsChecked);
  add('strip/scaffold+narration', input.stripFormsRemoved, input.stripFormsChecked);
  add('patch/arithmetic', input.arithmeticPatched, input.arithmeticChecked);

  const clean = bySurface.reduce((n, s) => n + s.clean, 0);
  const opportunities = bySurface.reduce((n, s) => n + s.opportunities, 0);
  return {
    ucr: opportunities > 0 ? clean / opportunities : null,
    clean, opportunities, bySurface,
  };
}

export function formatUcr(r: UcrResult): string {
  if (r.ucr === null) {
    return 'UCR: n/a — no intervention opportunities measured this run (no Class-A values, no renders, no strips).';
  }
  const pct = (r.ucr * 100).toFixed(0);
  const worst = [...r.bySurface]
    .filter(s => s.opportunities > 0)
    .sort((a, b) => (a.clean / a.opportunities) - (b.clean / b.opportunities))
    .slice(0, 3)
    .map(s => `${s.surface} ${s.clean}/${s.opportunities}`);
  return (
    `UCR (Unassisted Conformance Rate): ${pct}% — ${r.clean} of ${r.opportunities} intervention ` +
    `opportunity/opportunities needed NO app correction. Weakest surfaces: ${worst.join(' · ')}. ` +
    `READING RULE: the artifact score prices what the client receives (the locks are legitimate product ` +
    `machinery); UCR prices what the model does unassisted. A rising artifact score with flat UCR is a ` +
    `better harness, not a better system — quote both.`
  );
}
