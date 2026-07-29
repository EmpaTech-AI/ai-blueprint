// ─── C1: mandatory correction log for Class-A derived values (contract v1.2 §2 / v1.3) ──────
//
// Every correcting guard emits ONE record per Class-A value, ALWAYS, in every enforcement mode.
// The mode controls only which value the ARTIFACT carries — never whether the fork is recorded:
//   • acceptance/test  → the artifact keeps the AUTHORED value, so the raw model fork rate stays
//                         observable in the emitted document (Ruling 4 §4.3 fork-rate signal);
//   • production/client→ the artifact carries the ROOT-COMPUTED value, so a client gets it right.
// Recording is unconditional in both. The residual Class-A rate (reading rule R1) is read FROM
// THIS LOG (agreed=false ÷ total), never from a corrected document — grading a corrected document
// for fork rate is void. This is the first manifest-independent, continuous, value-level instrument
// in the engagement: it compares authored vs root_computed, both internal to the run, so it works
// on real client engagements where no signed manifest exists.

export type EnforcementMode = 'acceptance' | 'production';

export interface CorrectionRecord {
  stage: string;
  elementId: string;
  field: string;
  authoredValue: string | number;
  rootComputedValue: string | number;
  agreed: boolean;
  rootInputs: Record<string, unknown>;
  ruleId: string;
}

export function makeRecord(
  stage: string,
  elementId: string,
  field: string,
  authoredValue: string | number,
  rootComputedValue: string | number,
  rootInputs: Record<string, unknown>,
  ruleId: string,
): CorrectionRecord {
  return {
    stage,
    elementId,
    field,
    authoredValue,
    rootComputedValue,
    agreed: String(authoredValue) === String(rootComputedValue),
    rootInputs,
    ruleId,
  };
}

// The value the artifact should carry under the given mode. Emission is mode-dependent; the record
// (above) is written regardless. Keeping these two concerns in one place stops them drifting apart.
export function emittedValue(rec: CorrectionRecord, mode: EnforcementMode): string | number {
  return mode === 'production' ? rec.rootComputedValue : rec.authoredValue;
}

// Reading rule R1 — residual Class-A defect rate, read from the log (never from an emitted document).
export function residualRate(records: CorrectionRecord[]): { total: number; forks: number; rate: number } {
  const total = records.length;
  const forks = records.filter(r => !r.agreed).length;
  return { total, forks, rate: total === 0 ? 0 : forks / total };
}
