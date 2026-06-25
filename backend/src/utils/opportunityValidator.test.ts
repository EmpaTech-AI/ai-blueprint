import {
  validateOpportunityScores,
  validateRelayFields,
  validateRoleNames,
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

  it('does not fire when no INTAKE_FACTS CEO_NAME is present', () => {
    const { reviewerFlags } = validateRoleNames('CEO Petrov said hello.', 'no facts block here');
    expect(reviewerFlags).toEqual([]);
  });
});
