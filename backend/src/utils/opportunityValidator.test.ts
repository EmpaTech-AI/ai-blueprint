import {
  validateOpportunityScores,
  validateRelayFields,
  validateRoleNames,
  validateStrictDependencyPhases,
  validateFirmSurnameBleed,
} from './opportunityValidator';

const FULL_FIELDS =
  'ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no ' +
  'd_gate4=no compliance_deadline=none system_event_deadline=none phase_dependency=n/a';

// ── T-26 emission-hygiene flags in validateOpportunityScores ────────────────────

describe('T-26 validateOpportunityScores — stub + duplicate flags', () => {
  it('flags a literal H-RT-XX placeholder stub', () => {
    const out = `<!-- score: id=H-RT-XX impact=5 feasibility=4 alignment=5 product=100 class=QuickWin ${FULL_FIELDS} -->`;
    const { reviewerFlags } = validateOpportunityScores(out);
    expect(reviewerFlags.some(f => /T-26.*id=H-RT-XX/.test(f))).toBe(true);
  });

  it('flags a doubled marker for the same ID', () => {
    const marker = (id: string) => `<!-- score: id=${id} impact=5 feasibility=4 alignment=5 product=100 class=QuickWin ${FULL_FIELDS} -->`;
    const out = [marker('H-RT-02'), marker('H-RT-08'), marker('H-RT-08')].join('\n');
    const { reviewerFlags } = validateOpportunityScores(out);
    expect(reviewerFlags.some(f => /duplicate score marker.*H-RT-08/.test(f))).toBe(true);
  });
});

// ── T-26 cross-stage relay-field validator ──────────────────────────────────────

describe('validateRelayFields — cross-stage drift (H-RT-04 case)', () => {
  const stage1 =
    `<!-- score: id=H-RT-04 impact=4 feasibility=4 alignment=4 product=64 class=QuickWin ${FULL_FIELDS} -->`;

  it('flags a relay field that drifted between Stage 1 and Stage 3', () => {
    // Stage 3 invents a system_event_deadline where Stage 1 had `none` (the v32 H-RT-04 fork).
    const stage3 =
      '<!-- score: id=H-RT-04 impact=4 feasibility=4 alignment=4 product=64 class=QuickWin ' +
      'ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no ' +
      'd_gate4=no compliance_deadline=none system_event_deadline=2026-07-31 phase_dependency=n/a -->';
    const { reviewerFlags } = validateRelayFields(stage1, stage3);
    expect(reviewerFlags.some(f => /relay drift.*H-RT-04.*system_event_deadline/.test(f))).toBe(true);
  });

  it('passes when the relay fields are byte-identical', () => {
    const { reviewerFlags } = validateRelayFields(stage1, stage1);
    expect(reviewerFlags).toEqual([]);
  });

  it('treats an ABSENT field as drift, not as a field to ignore (Block 4.1)', () => {
    // Stage 3 drops system_event_deadline entirely; absence must register as a mismatch vs `none`.
    const stage3Missing =
      '<!-- score: id=H-RT-04 impact=4 feasibility=4 alignment=4 product=64 class=QuickWin ' +
      'ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no ' +
      'd_gate4=no compliance_deadline=none phase_dependency=n/a -->';
    const { reviewerFlags } = validateRelayFields(stage1, stage3Missing);
    expect(reviewerFlags.some(f => /relay drift.*system_event_deadline.*\(absent\)/.test(f))).toBe(true);
  });

  it('marks relay drift as a BLOCKER (refuses approval)', () => {
    const stage3 = stage1.replace('system_event_deadline=none', 'system_event_deadline=2026-07-31');
    const { reviewerFlags } = validateRelayFields(stage1, stage3);
    expect(reviewerFlags.every(f => f.startsWith('BLOCKER:'))).toBe(true);
  });
});

// ── S-26 role-attributed name validator ─────────────────────────────────────────

describe('validateRoleNames — CEO name vs INTAKE_FACTS', () => {
  const dossier = '<!-- INTAKE_FACTS\nCLIENT_NAME=Meridian Talent Partners OOD\nCEO_NAME=Dimitar Popov\n-->';

  it('flags a hallucinated CEO surname (the "Petrov" case)', () => {
    const deliverable = 'The engagement was sponsored by CEO Petrov, who set the growth target.';
    const { reviewerFlags } = validateRoleNames(deliverable, dossier);
    expect(reviewerFlags.some(f => /S-26.*Petrov.*Dimitar Popov/.test(f))).toBe(true);
  });

  it('accepts the correct CEO name (full or last-name only)', () => {
    const deliverable = 'CEO Dimitar Popov leads the firm. Later we note that CEO Popov approved the plan.';
    const { reviewerFlags } = validateRoleNames(deliverable, dossier);
    expect(reviewerFlags).toEqual([]);
  });

  it('catches a first-name-preserved hallucination "Dimitar Petrov" (Block 5.1 surname match)', () => {
    // Token-overlap would PASS this (shares "Dimitar"); surname-token match must flag it.
    const deliverable = 'The plan was approved by CEO Dimitar Petrov in Q1.';
    const { reviewerFlags } = validateRoleNames(deliverable, dossier);
    expect(reviewerFlags.some(f => /S-26.*Dimitar Petrov.*Dimitar Popov/.test(f))).toBe(true);
    expect(reviewerFlags.every(f => f.startsWith('BLOCKER:'))).toBe(true);
  });

  it('does not fire when no INTAKE_FACTS CEO_NAME is present', () => {
    const { reviewerFlags } = validateRoleNames('CEO Petrov said hello.', 'no facts block here');
    expect(reviewerFlags).toEqual([]);
  });
});

// ── S-26 hardening: firm-context surname stoplist ───────────────────────────────

describe('validateFirmSurnameBleed — AI Assist BG firm surname must never appear', () => {
  const dossier = '<!-- INTAKE_FACTS\nCLIENT_NAME=Meridian Talent Partners OOD\nCEO_NAME=Dimitar Popov\n-->';

  it('flags the seeded firm surname even in a non-role context (the v32 bleed mode)', () => {
    const deliverable = 'The roadmap was reviewed and, as Petrov noted, sourcing is the first win.';
    const { reviewerFlags } = validateFirmSurnameBleed(deliverable, dossier);
    expect(reviewerFlags.some(f => /firm-context bleed.*petrov/i.test(f))).toBe(true);
    expect(reviewerFlags.every(f => f.startsWith('BLOCKER:'))).toBe(true);
  });

  it('fires even when no INTAKE_FACTS / CEO_NAME is present (independent of the role guard)', () => {
    const { reviewerFlags } = validateFirmSurnameBleed('A note from Petrov.', undefined);
    expect(reviewerFlags.length).toBe(1);
  });

  it('does NOT flag a genuine client who shares the surname (INTAKE_FACTS exemption)', () => {
    const clientDossier = '<!-- INTAKE_FACTS\nCLIENT_NAME=Petrov Logistics EOOD\nCEO_NAME=Ivan Petrov\n-->';
    const { reviewerFlags } = validateFirmSurnameBleed('CEO Ivan Petrov leads the firm.', clientDossier);
    expect(reviewerFlags).toEqual([]);
  });

  it('does not flag a clean deliverable', () => {
    const { reviewerFlags } = validateFirmSurnameBleed('CEO Dimitar Popov approved the plan.', dossier);
    expect(reviewerFlags).toEqual([]);
  });

  it('exempts ONLY the shared token — other firm surnames stay live (Practice §1.2 token-scoped)', () => {
    // Genuine client "Petrov Logistics", CEO "Ivan Petrov" — shares the firm surname "petrov".
    // A stray firm surname "Montin" in the same deliverable must still flag; "petrov" must not.
    const clientDossier = '<!-- INTAKE_FACTS\nCLIENT_NAME=Petrov Logistics EOOD\nCEO_NAME=Ivan Petrov\n-->';
    const deliverable = 'CEO Ivan Petrov leads the firm. The plan was reviewed by Montin last week.';
    const { reviewerFlags } = validateFirmSurnameBleed(deliverable, clientDossier);
    // Match the flagged-surname phrasing (`contains "<surname>"`), not the explanatory text —
    // montin's message references the "Petrov failure mode" but that is not a petrov flag.
    expect(reviewerFlags.some(f => /contains "montin"/i.test(f))).toBe(true);
    expect(reviewerFlags.some(f => /contains "petrov"/i.test(f))).toBe(false);
  });

  it('guards the full seeded roster, not just petrov', () => {
    expect(validateFirmSurnameBleed('A note from Gumushian.').reviewerFlags.length).toBe(1);
    expect(validateFirmSurnameBleed('Reviewed by Kara.').reviewerFlags.length).toBe(1);
  });

  it('honours the FIRM_SURNAME_STOPLIST env extension', () => {
    const prev = process.env.FIRM_SURNAME_STOPLIST;
    process.env.FIRM_SURNAME_STOPLIST = 'serafimov, ivanova';
    try {
      const { reviewerFlags } = validateFirmSurnameBleed('Prepared with input from Serafimov.', dossier);
      expect(reviewerFlags.some(f => /serafimov/i.test(f))).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.FIRM_SURNAME_STOPLIST;
      else process.env.FIRM_SURNAME_STOPLIST = prev;
    }
  });
});

// ── T-27 strict-dependency phase determinism (the S-30 / H-RT-04 fork) ──────────

describe('validateStrictDependencyPhases — strict ⇒ Later, unconditionally', () => {
  const strictFields =
    'ml_heavy=no multi_source=no regulated=no large_integration=no adoption_dependent=no ' +
    'd_gate4=no compliance_deadline=none system_event_deadline=none phase_dependency=strict';
  const stage3 =
    `<!-- score: id=H-RT-04 impact=4 feasibility=3 alignment=4 product=48 class=BigBet ${strictFields} -->`;

  const phaseTable = (h04Phase: string) => [
    '| Opportunity | H-RT ID | Class | Phase | Primary placement driver |',
    '|---|---|---|---|---|',
    '| Sourcing automation | H-RT-07 | Foundation Builder | Now | system_event_deadline within M1–3 |',
    `| Predictive analytics | H-RT-04 | Big Bet | ${h04Phase} | phase_dependency=strict |`,
  ].join('\n');

  it('flags a strict dependent placed in Next — the T4/v32 fork reading (BLOCKER)', () => {
    const { reviewerFlags } = validateStrictDependencyPhases(phaseTable('Next'), stage3);
    expect(reviewerFlags.some(f => /T-27.*H-RT-04.*placed in Next/.test(f))).toBe(true);
    expect(reviewerFlags.every(f => f.startsWith('BLOCKER:'))).toBe(true);
  });

  it('passes when the strict dependent is in Later — the pinned outcome', () => {
    const { reviewerFlags } = validateStrictDependencyPhases(phaseTable('Later'), stage3);
    expect(reviewerFlags).toEqual([]);
  });

  it('does not fire for a non-strict (flexible / n/a) opportunity', () => {
    const flexible = stage3.replace('phase_dependency=strict', 'phase_dependency=flexible');
    const { reviewerFlags } = validateStrictDependencyPhases(phaseTable('Next'), flexible);
    expect(reviewerFlags).toEqual([]);
  });

  it('does not fire when the strict opportunity is absent from the Phase Summary table (GATE-4 concern)', () => {
    const tableWithoutH04 = [
      '| Opportunity | H-RT ID | Class | Phase | Primary placement driver |',
      '|---|---|---|---|---|',
      '| Sourcing automation | H-RT-07 | Foundation Builder | Now | system_event_deadline within M1–3 |',
    ].join('\n');
    const { reviewerFlags } = validateStrictDependencyPhases(tableWithoutH04, stage3);
    expect(reviewerFlags).toEqual([]);
  });

  it('does not mistake a "Now"/"Next" word in the driver column for the phase cell', () => {
    // The driver column mentions "Now", but the phase cell (Later) is authoritative.
    const table = [
      '| Opportunity | H-RT ID | Class | Phase | Primary placement driver |',
      '|---|---|---|---|---|',
      '| Predictive analytics | H-RT-04 | Big Bet | Later | strict; antecedent H-RT-07 in Now |',
    ].join('\n');
    const { reviewerFlags } = validateStrictDependencyPhases(table, stage3);
    expect(reviewerFlags).toEqual([]);
  });
});
