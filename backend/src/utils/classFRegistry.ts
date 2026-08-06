// ─── The Class-F enumeration: every client-visible property, guarded or declared unguarded ────────
//
// Instated by the sixteen-batch report (§III.4, §IV.1 criterion 6, correlation C8) and it GATES the
// engineering-v1 declaration. The report's own framing, which this file exists to make operable:
//
//     "Every defect in the register is a missing pin — and every UNDETECTED defect is a missing
//      question. Pins fix the producer; assertions fix the observer."
//     "The system's assurance is bounded by its assertion inventory."
//
// ── Why this is CODE and not a document ──────────────────────────────────────────────────────────
// A markdown enumeration would be accurate on the day it was written and drift silently thereafter —
// which is precisely the failure mode Class F names. The v37.4 precedent is SCAFFOLD_FORMS: a registry
// that also declares which chokepoint removes each form, so the audit can never again be narrower than
// the strips it audits. Two of the forms in that registry were found BY the audit it enabled.
//
// So the enumeration is a typed list with two executable invariants, asserted in the test suite:
//   1. every `guardedBy` id names a guard that actually runs (no claimed-but-absent assurance);
//   2. every entry is either GUARDED or has a stated `whyUnguarded` (no silent gaps).
//
// A green in the pillar matrix is 🟢(U) — earned-but-unasserted — until its property appears here as
// GUARDED. That is the report's I.4 rule 1, and this file is where (U) gets discharged.

export type AssuranceState =
  | 'guarded'          // an assertion fails loudly when the property is violated
  | 'reported'         // a flag fires but does not block — the reviewer is told, release is not stopped
  | 'unguarded';       // nothing asks. Must carry `whyUnguarded`.

export interface ClientVisibleProperty {
  id: string;
  stage: 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'cross';
  /** What the client sees, phrased as the property that must hold — not as the guard's name. */
  property: string;
  state: AssuranceState;
  /** Assertion ids that enforce it. Every id here must exist in ASSERTION_IDS. */
  guardedBy: string[];
  /** Required when state is not 'guarded': why, and what it would take to close. */
  whyUnguarded?: string;
  /** Set when this entry was added because the property FAILED in a batch. */
  provenance?: string;
}

// Every assertion id the pipeline actually runs. The registry may not claim one that is not here, which
// is invariant 1 — it is what stops this file becoming a description of assurance we do not have.
export const ASSERTION_IDS = [
  'A4', 'A5', 'A9', 'A11', 'A12', 'A13', 'A14', 'A15', 'A16', 'A16c', 'A17a', 'A17b', 'A17c',
  'A18', 'A19', 'A20a', 'A20b', 'S4-UNIQ', 'P-rules', 'T1-overflow', 'T-19', 'T-23', 'T-26', 'T-29',
  'REG-27a', 'E1-repair', 'scaffold-detector', 'client-prose-corpus', 'client-sections-corpus',
  'C1-log', 'UCR', 'G1-G3',
] as const;

export const CLASS_F_REGISTRY: ClientVisibleProperty[] = [
  // ── S1 · the Compressed Client Dossier ───────────────────────────────────────────────────────────
  { id: 'S1-inventory-arithmetic', stage: 'S1', state: 'guarded', guardedBy: ['A11'],
    property: 'Integration Coverage shown to the client equals active ÷ (n_core − 1) over the tables beside it.' },
  { id: 'S1-pp0-severity', stage: 'S1', state: 'guarded', guardedBy: ['A12'],
    property: 'PP-0 severity is the band its coverage figure falls in.' },
  { id: 'S1-data-grade', stage: 'S1', state: 'guarded', guardedBy: ['A13', 'G1-G3'],
    property: 'The Data grade is the D4 Step-4 aggregation over the Record Classes table.' },
  { id: 'S1-active-integrations', stage: 'S1', state: 'guarded', guardedBy: ['A14'],
    property: 'Every integration counted as active is inventoried, automatic, functioning and cited (N4).',
    provenance: 'v37.9 N4; v37.10 instance 23 (P-a aliases) and the P-b annotation read' },
  { id: 'S1-cross-table-integrity', stage: 'S1', state: 'guarded', guardedBy: ['A15'],
    property: 'Every system named in one inventory table exists in the Core Systems table.' },
  { id: 'S1-endpoint-completeness', stage: 'S1', state: 'guarded', guardedBy: ['A20b'],
    property: 'No integration references a system with no Core Systems row, whatever its Active? value.',
    provenance: 'v37.10 Class F #6 — P-a alone was silent when the author also wrote no' },
  { id: 'S1-data-grade-coverage', stage: 'S1', state: 'reported', guardedBy: ['A20a'],
    property: 'The Data grade covers every record class the Core Systems table declares.',
    whyUnguarded: 'The intake contract requires only ≥1 class per system (A15), so a subset is PERMITTED ' +
      'and every fixture in the repo has one. Blocking would legislate a rule the contract does not carry. ' +
      'Closes when the Practice rules on whether the Record Classes table must be exhaustive.',
    provenance: 'v37.10 Class F #6' },
  { id: 'S1-financial-containment', stage: 'S1', state: 'guarded', guardedBy: ['A17a'],
    property: 'No document figure contradicts a declared form band without the divergence being recorded.' },
  { id: 'S1-financial-arithmetic', stage: 'S1', state: 'guarded', guardedBy: ['A17b'],
    property: 'A stated profit or margin agrees with the P&L level it is derived from.',
    provenance: 'v37.9 the level ladder; v37.10 instances 22/22b (component prefix, segment qualifier)' },
  { id: 'S1-figure-provenance', stage: 'S1', state: 'guarded', guardedBy: ['E1-repair'],
    property: 'No figure shown to the client was manufactured by extraction (phantom magnitudes, cell joins).',
    provenance: 'instances 19, 20, 20b + the slash-pair and period-token rules' },
  { id: 'S1-multi-valued-metrics', stage: 'S1', state: 'reported', guardedBy: ['A17c'],
    property: 'A metric appearing with two values is scoped by period or segment, not contradictory.',
    whyUnguarded: 'Period and segment scoping make this legitimately common, so a BLOCKER would fire on ' +
      'almost every real pack. Listed for verification by design — this is a deliberate `reported`, not a gap.' },

  // ── S2 · Maturity ────────────────────────────────────────────────────────────────────────────────
  { id: 'S2-dimension-class', stage: 'S2', state: 'guarded', guardedBy: ['A5'],
    property: 'Each dimension grade is the D6b tree applied to its inputs.' },
  { id: 'S2-governance-gate', stage: 'S2', state: 'guarded', guardedBy: ['G1-G3'],
    property: 'Established is awarded only on named-owner + documented-standard + operative evidence.' },
  { id: 'S2-band-reproducibility', stage: 'S2', state: 'unguarded', guardedBy: [],
    property: 'The same inputs produce the same Band on every run.',
    whyUnguarded: 'Observed at 52/52 across five pairs and asserted NOWHERE — a 🟢(U) by the report\'s own ' +
      'rule. Closing it needs a per-run band recompute from the frozen dimension grades, which is the same ' +
      'shape as A4. Not in v37.10 because it has never failed; listed so that record is visible rather than ' +
      'mistaken for assurance.' },

  // ── S3 · Opportunities ───────────────────────────────────────────────────────────────────────────
  { id: 'S3-feasibility-recompute', stage: 'S3', state: 'guarded', guardedBy: ['A4'],
    property: 'Every feasibility score shown is max(1, base − firing flags) from the archetype root.' },
  { id: 'S3-root-integrity', stage: 'S3', state: 'guarded', guardedBy: ['A9'],
    property: 'Scores trace to a declared archetype root, or the run declares the root UNAVAILABLE.' },
  { id: 'S3-pool-exclusions', stage: 'S3', state: 'guarded', guardedBy: ['A16', 'A16c'],
    property: 'Every excluded candidate is excluded for a stated, legitimate reason with provenance.',
    provenance: 'M2 recurs at 2/12 — caught both times; the counted-rule spec is with the Practice' },
  { id: 'S3-stage1-freeze', stage: 'S3', state: 'guarded', guardedBy: ['A19'],
    property: 'No Stage-1 fact is re-derived downstream; a reduction is the A4 adjustment, not a fork.' },
  { id: 'S3-score-comment-fields', stage: 'S3', state: 'guarded', guardedBy: ['T-19', 'REG-27a'],
    property: 'Every score comment carries its phase fields and contradicts no arithmetic.' },

  // ── S4 · Roadmap ─────────────────────────────────────────────────────────────────────────────────
  { id: 'S4-phase-placement', stage: 'S4', state: 'guarded', guardedBy: ['P-rules'],
    property: 'Each item sits in the phase the pinned rules derive from its frozen flags.' },
  { id: 'S4-one-phase-per-item', stage: 'S4', state: 'guarded', guardedBy: ['S4-UNIQ'],
    property: 'No opportunity is rendered in more than one phase.',
    provenance: 'S4-DUP, EH 1.35 — Class F #5. Unassertable before v37.10: the reader was a Map keyed by id' },
  { id: 'S4-anchor-present', stage: 'S4', state: 'guarded', guardedBy: ['A18'],
    property: 'Every Now/Next block carries a phase-opener line stating why the item sits in that phase.',
    provenance: 'v37.10 — the flag existed and did not block, so a malformed block shipped' },
  { id: 'S4-anchor-value', stage: 'S4', state: 'guarded', guardedBy: ['A18'],
    property: 'Each rendered anchor states the LOCKED Stage-1 feasibility, not a re-derived one.' },
  { id: 'S4-now-capacity', stage: 'S4', state: 'guarded', guardedBy: ['P-rules', 'T1-overflow'],
    property: 'Phase 1 carries at most P1 items, and over-commitment by undeferrable items is reported.' },
  { id: 'S4-phase-count-stability', stage: 'S4', state: 'unguarded', guardedBy: [],
    property: 'The same frozen inputs produce the same phase counts on every run.',
    whyUnguarded: 'The derived map is asserted against the emitted roadmap per run (P-rules), but nothing ' +
      'compares run to run — a cross-run property has no single artifact to assert over. This is the 🟢(U) ' +
      'that S4-DUP cost: five builds of 20/20 invariance were verified by Practice review, not by a guard. ' +
      'Closing it needs the harness to diff the derived maps across a pair, which is harness work, not ' +
      'pipeline work.' },

  // ── S5 · Assembly ────────────────────────────────────────────────────────────────────────────────
  { id: 'S5-position-envelope', stage: 'S5', state: 'guarded', guardedBy: ['T-23'],
    property: 'The deliverable begins at its first section header and ends at the Final marker.' },
  { id: 'S5-no-machine-markers', stage: 'S5', state: 'guarded', guardedBy: ['T-26'],
    property: 'No HTML comment or machine marker reaches the client.' },
  { id: 'S5-no-residual-scaffold', stage: 'S5', state: 'guarded', guardedBy: ['scaffold-detector'],
    property: 'No scaffold form survives the delivery strip.' },
  { id: 'S5-client-prose-preserved', stage: 'S5', state: 'guarded', guardedBy: ['client-prose-corpus', 'client-sections-corpus'],
    property: 'The delivery strip removes only scaffold — it is the identity on ordinary client prose.',
    provenance: 'v37.9 item 2 destroyed 6/8 roadmap sentences; stripOperatorPreamble\'s /m flag deleted ' +
      'bold headings and anchor lines. Both were vocabulary/position defects that per-case tests missed' },
  { id: 'S5-embedded-block-names', stage: 'S5', state: 'reported', guardedBy: ['scaffold-detector'],
    property: 'No machine-channel block name appears in client prose.',
    whyUnguarded: 'A name inside a real sentence has no correct inline edit — removing a noun from a clause ' +
      'either mangles the sentence or eventually eats client content. Author-discipline by declaration, ' +
      'reported by the detector. This will not become guarded; the honest state is `reported`.' },

  // ── Cross-cutting ────────────────────────────────────────────────────────────────────────────────
  { id: 'X-correction-log', stage: 'cross', state: 'guarded', guardedBy: ['C1-log'],
    property: 'Every authored-vs-derived disagreement is recorded, agreeing or not.' },
  { id: 'X-unassisted-rate', stage: 'cross', state: 'guarded', guardedBy: ['UCR'],
    property: 'The run reports what the model got right unassisted, over intervention OPPORTUNITIES.',
    provenance: 'UCR is blind to Class F by construction — no opportunity exists for an unasked question, ' +
      'so it is read beside this registry, never alone' },
  { id: 'X-permit-unverified', stage: 'cross', state: 'guarded', guardedBy: ['T-29'],
    property: 'A property that could not be verified says so, rather than reading as verified.' },
  { id: 'X-build-provenance', stage: 'cross', state: 'reported', guardedBy: [],
    property: 'Every artifact names the build that produced it, verifiably.',
    whyUnguarded: 'The label is printed and a LABEL-ONLY run says so, but `sha=unset` is the normal local ' +
      'state, so the stamp is a human tag rather than a verifiable anchor on most runs. Closing it is CI ' +
      'work (inject the sha at build time), not pipeline work. Fourth occurrence in the register.' },
];

export const byState = (state: AssuranceState) => CLASS_F_REGISTRY.filter(p => p.state === state);

/** The one number this file exists to produce. Read beside every artifact score, per §III.4. */
export function assuranceCoverage() {
  const total = CLASS_F_REGISTRY.length;
  const guarded = byState('guarded').length;
  return {
    total,
    guarded,
    reported: byState('reported').length,
    unguarded: byState('unguarded').length,
    fraction: Number((guarded / total).toFixed(2)),
  };
}

/** Invariant 1: the registry may not claim a guard that does not run. */
export function unknownGuardIds(): string[] {
  const known = new Set<string>(ASSERTION_IDS);
  return [...new Set(CLASS_F_REGISTRY.flatMap(p => p.guardedBy).filter(g => !known.has(g)))];
}

/** Invariant 2: nothing is un-guarded silently. */
export function undeclaredGaps(): string[] {
  return CLASS_F_REGISTRY.filter(p => p.state !== 'guarded' && !p.whyUnguarded?.trim()).map(p => p.id);
}
