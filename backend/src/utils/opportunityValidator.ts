// Validates Stage 3 (blueprint-opportunities) score comment arithmetic and classification.
//
// The LLM computes product=Impact×Feasibility×Alignment and embeds it in the score comment.
// When the LLM makes an arithmetic error (T3 anomaly: product=5 where 25 expected for
// H-RT-01/H-RT-08), the product field is wrong. The three component scores are the
// authoritative inputs — we recompute and patch the product field automatically.
//
// Also validates that each opportunity's classification is consistent with its post-adjustment
// scores per the scoring_rubric.md contract (GATE 3), and that the portfolio has at least one
// opportunity in each class bucket.

export interface OpportunityScore {
  id: string;
  impact: number;
  feasibility: number;
  alignment: number;
  product: number;
  class: string;
}

export interface OpportunityValidationResult {
  corrected: string;
  reviewerFlags: string[];
  scores: OpportunityScore[];
}

// Matches: <!-- score: id=H-RT-02 impact=5 feasibility=4 alignment=5 product=100 class=QuickWin -->
// Also matches the legacy scoring_rubric.md format without id= field.
const SCORE_COMMENT_PATTERN = /<!-- score: ([^>]*?) -->/g;

function parseScoreFields(raw: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const pairs = raw.match(/(\w+)=([^\s]+)/g) ?? [];
  for (const pair of pairs) {
    const eq = pair.indexOf('=');
    fields[pair.slice(0, eq)] = pair.slice(eq + 1);
  }
  return fields;
}

// Derives the expected classification from scores per scoring_rubric.md.
// Priority order: Quick Win (Feas ≥ 4) → Big Bet (Impact ≥ 4 AND Feas ≤ 3) → Foundation Builder.
// Returns null for genuinely ambiguous edge cases (e.g. Feas=4 and a maturity-gap rationale)
// to avoid false-positive flags — the SKILL.md allows judgment here.
function deriveExpectedClass(impact: number, feasibility: number): string | null {
  if (feasibility >= 4)                return 'QuickWin';
  if (impact >= 4 && feasibility <= 3) return 'BigBet';
  if (feasibility >= 1 && impact <= 3) return 'FoundationBuilder';
  return null;
}

export function validateOpportunityScores(output: string): OpportunityValidationResult {
  const reviewerFlags: string[] = [];
  const scores: OpportunityScore[] = [];

  // First pass: collect all matches from the original output before any mutation.
  const matches: Array<{ full: string; inner: string; index: number }> = [];
  const re = new RegExp(SCORE_COMMENT_PATTERN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(output)) !== null) {
    matches.push({ full: m[0], inner: m[1], index: m.index });
  }

  // Second pass: apply corrections right-to-left so earlier indices stay valid.
  let corrected = output;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { full, inner, index } = matches[i];
    const fields = parseScoreFields(inner);

    const impact      = parseInt(fields.impact      ?? '', 10);
    const feasibility = parseInt(fields.feasibility ?? '', 10);
    const alignment   = parseInt(fields.alignment   ?? '', 10);
    const product     = parseInt(fields.product     ?? '', 10);
    const id          = fields.id    ?? '(unknown)';
    const cls         = fields.class ?? '';

    // Skip comments that are missing the three scoring components.
    if (isNaN(impact) || isNaN(feasibility) || isNaN(alignment)) continue;

    // ── T-19 relay guard: all nine non-score phase fields must be present ──────
    const REQUIRED_PHASE_FIELDS = [
      'ml_heavy', 'multi_source', 'regulated', 'large_integration', 'adoption_dependent',
      'd_gate4', 'compliance_deadline', 'system_event_deadline', 'phase_dependency',
    ];
    const missingPhaseFields = REQUIRED_PHASE_FIELDS.filter(f => !(f in fields));
    if (missingPhaseFields.length > 0) {
      reviewerFlags.push(
        `GATE 3 FAIL T-19: ${id} score comment is missing phase fields: ` +
        `${missingPhaseFields.join(', ')} — Stage 4 will fall back to text-pattern judgment. ` +
        `T-19 relay incomplete; manual review required before delivery.`,
      );
    }

    const expectedProduct = impact * feasibility * alignment;
    // Insert at front to restore document order after right-to-left iteration.
    scores.unshift({ id, impact, feasibility, alignment, product: expectedProduct, class: cls });

    let patched = full;

    // ── Arithmetic check ───────────────────────────────────────────────────────
    if (!isNaN(product) && product !== expectedProduct) {
      reviewerFlags.push(
        `Stage 3 score arithmetic error for ${id}: ` +
        `product=${product} stated but ${impact}×${feasibility}×${alignment}=${expectedProduct} — auto-patched.`,
      );
      patched = patched.replace(`product=${product}`, `product=${expectedProduct}`);
    }

    // ── Classification check (GATE 3) ─────────────────────────────────────────
    // Only flag clear mechanical violations; skip edge cases (null from deriveExpectedClass).
    const expectedClass = deriveExpectedClass(impact, feasibility);
    if (expectedClass && cls && cls !== expectedClass) {
      reviewerFlags.push(
        `Stage 3 classification mismatch for ${id}: ` +
        `Impact=${impact}, Feasibility=${feasibility} → expected ${expectedClass}, found ${cls}. ` +
        `Manual review required before delivery.`,
      );
    }

    if (patched !== full) {
      corrected = corrected.slice(0, index) + patched + corrected.slice(index + full.length);
    }
  }

  // ── T-26 (S-29) emission-hygiene checks ───────────────────────────────────
  // Literal placeholder stub: the model copied the SKILL.md template `id=H-RT-XX` verbatim
  // instead of substituting the real hypothesis ID (leaked in 3/4 v32 runs). The comment is
  // stripped from the client document at delivery, but the marker is invisible to downstream
  // stages, so flag it for review.
  const literalStubCount = (output.match(/<!--\s*score:\s*id=H-RT-X{2,}/gi) ?? []).length;
  if (literalStubCount > 0) {
    reviewerFlags.push(
      `GATE 3 FAIL T-26: ${literalStubCount} score comment(s) carry the literal placeholder ` +
      `id=H-RT-XX — the template was not substituted with a real hypothesis ID. Downstream stages ` +
      `cannot key on this marker. Replace with the actual H-RT-NN ID before delivery.`,
    );
  }

  // Doubled marker: the same hypothesis ID emitted more than once (doubled H-RT-08 in 1/4 v32
  // runs). A duplicate inflates downstream counts and can fork phase assignment.
  const idCounts = new Map<string, number>();
  for (const s of scores) {
    if (s.id && s.id !== '(unknown)' && !/X{2,}/i.test(s.id)) {
      idCounts.set(s.id, (idCounts.get(s.id) ?? 0) + 1);
    }
  }
  const duplicateIds = [...idCounts.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} (×${n})`);
  if (duplicateIds.length > 0) {
    reviewerFlags.push(
      `GATE 3 FAIL T-26: duplicate score marker(s): ${duplicateIds.join(', ')}. ` +
      `Each hypothesis ID must carry exactly one score comment. Remove the duplicate before delivery.`,
    );
  }

  // ── Portfolio shape check (GATE 3) ────────────────────────────────────────
  if (scores.length > 0) {
    const classes = new Set(scores.map(s => s.class));
    if (!classes.has('QuickWin')) {
      reviewerFlags.push('Stage 3: portfolio has no Quick Win — GATE 3 fail. Review Feasibility scores.');
    }
    if (!classes.has('FoundationBuilder')) {
      reviewerFlags.push('Stage 3: portfolio has no Foundation Builder — GATE 3 warn. Flag as "Foundation-Heavy" in output.');
    }
    if (!classes.has('BigBet')) {
      reviewerFlags.push('Stage 3: portfolio has no Big Bet — GATE 3 warn. Verify high-impact low-feasibility opportunities were not under-scored.');
    }
    if (scores.length < 5) {
      reviewerFlags.push(`Stage 3: only ${scores.length} scored opportunit${scores.length === 1 ? 'y' : 'ies'} found (minimum 5 required).`);
    }
  }

  return { corrected, reviewerFlags, scores };
}

// ─── GATE 4: Roadmap phase-vector validator ────────────────────────────────────
//
// Checks structural completeness of the Stage 4 roadmap and cross-validates phase
// assignments against the Stage 3 opportunity classifications. Key rules enforced:
//
//   1. All three phase sections must be present (Now / Next / Later)
//   2. "Phase 1: Now" must contain at least one item
//   3. Quick Wins (Feasibility ≥ 4) must NOT appear in "Phase 3: Later"
//      — Quick Wins only belong in Now or Next (gated → Next per D-GATE4 SKILL rule)
//
// The D-GATE4 dependency-gate check (gated Quick Wins placed in Now vs Next) is
// enforced by the blueprint-roadmap SKILL.md rule. GATE 4 here catches hard structural
// violations that indicate output quality failures, not sequencing judgements.

export interface RoadmapValidationResult {
  reviewerFlags: string[];
}

export function validateRoadmapPhases(
  roadmapOutput: string,
  opportunityScores: OpportunityScore[],
): RoadmapValidationResult {
  const reviewerFlags: string[] = [];

  const hasNow   = /###\s+Phase 1[:\s]/i.test(roadmapOutput);
  const hasNext  = /###\s+Phase 2[:\s]/i.test(roadmapOutput);
  const hasLater = /###\s+Phase 3[:\s]/i.test(roadmapOutput);

  if (!hasNow)   reviewerFlags.push('GATE 4: Roadmap missing "Phase 1: Now" section — Stage 4 output is incomplete.');
  if (!hasNext)  reviewerFlags.push('GATE 4: Roadmap missing "Phase 2: Next" section — Stage 4 output is incomplete.');
  if (!hasLater) reviewerFlags.push('GATE 4: Roadmap missing "Phase 3: Later" section — Stage 4 output is incomplete.');

  // "Now" must have at least one opportunity title (bold heading)
  if (hasNow) {
    const nowSection = roadmapOutput.match(/###\s+Phase 1[^\n]*\n([\s\S]*?)(?=###\s+Phase 2|###\s+Bridge|$)/i)?.[1] ?? '';
    if (!/\*\*[^*]+\*\*/.test(nowSection)) {
      reviewerFlags.push('GATE 4: "Phase 1: Now" appears empty — every roadmap must include at least one item in Now.');
    }
  }

  // Quick Wins must not appear in "Phase 3: Later"
  if (hasLater && opportunityScores.length > 0) {
    const laterSection = roadmapOutput.match(/###\s+Phase 3[^\n]*\n([\s\S]*?)(?=###\s+Bridge|$)/i)?.[1] ?? '';
    for (const opp of opportunityScores.filter(s => s.class === 'QuickWin')) {
      if (laterSection.includes(opp.id)) {
        reviewerFlags.push(
          `GATE 4: Quick Win ${opp.id} appears in "Phase 3: Later" — ` +
          `Quick Wins (Feasibility ≥ 4) must be in Now or Next. Verify Stage 4 phase assignment.`,
        );
      }
    }
  }

  return { reviewerFlags };
}

// ─── T-26 (S-29): cross-stage relay-field validator ────────────────────────────
//
// The nine non-score phase fields (T-19 relay set) are pinned at Stage 1 and must be re-emitted
// byte-identical at Stage 3. The v32 batch showed H-RT-04 gaining a spurious
// `system_event_deadline` at Stage 3 that Stage 1 had set to `none` — a propagation failure that,
// on a client where the dated field dominates placement, becomes a phase change. This validator is
// the hard equality assertion the Practice review ordered built now: compare Stage-3 score comments
// to Stage-1 by ID and flag any drift across the nine relay fields.
const RELAY_FIELDS = [
  'ml_heavy', 'multi_source', 'regulated', 'large_integration', 'adoption_dependent',
  'd_gate4', 'compliance_deadline', 'system_event_deadline', 'phase_dependency',
] as const;

function parseScoreCommentsById(text: string): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  const re = new RegExp(SCORE_COMMENT_PATTERN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fields = parseScoreFields(m[1]);
    if (fields.id && fields.id !== '(unknown)' && !/X{2,}/i.test(fields.id)) map.set(fields.id, fields);
  }
  return map;
}

export function validateRelayFields(stage1Dossier: string, stage3Opportunities: string): { reviewerFlags: string[] } {
  const reviewerFlags: string[] = [];
  const s1 = parseScoreCommentsById(stage1Dossier);
  const s3 = parseScoreCommentsById(stage3Opportunities);

  for (const [id, f3] of s3) {
    const f1 = s1.get(id);
    if (!f1) continue; // ID absent from Stage 1 is a separate (missing-source) concern
    const drift: string[] = [];
    for (const field of RELAY_FIELDS) {
      const v1 = f1[field];
      const v3 = f3[field];
      if (v1 !== undefined && v3 !== undefined && v1 !== v3) drift.push(`${field}: Stage1=${v1} → Stage3=${v3}`);
    }
    if (drift.length > 0) {
      reviewerFlags.push(
        `GATE 3 FAIL T-26 (relay drift) for ${id}: ${drift.join('; ')}. ` +
        `Stage 3 must re-emit the nine relay fields byte-identical to Stage 1 — drift forks Stage 4 phase placement.`,
      );
    }
  }
  return { reviewerFlags };
}

// ─── S-26 (WL-8): role-attributed name validator ───────────────────────────────
//
// A wrong CEO name in a client deliverable is never-ship severity. The v32 "Petrov" bleed was a
// hallucination on the override-gate path violating the INTAKE_FACTS single-source rule. This is
// the narrow, deterministic guard the Practice review ordered (NOT a broad "any unknown surname"
// check, which false-positives on vendors): scan only role-attributed CEO mentions and flag any
// name that does not match the pinned INTAKE_FACTS CEO_NAME.
export function validateRoleNames(deliverable: string, stage1Dossier: string): { reviewerFlags: string[] } {
  const reviewerFlags: string[] = [];
  const factsBlock = stage1Dossier.match(/<!--\s*INTAKE_FACTS([\s\S]*?)-->/i)?.[1] ?? '';
  const ceoName = factsBlock.match(/CEO_NAME\s*[:=]\s*([^\n|]+)/i)?.[1]?.trim();
  if (!ceoName) return { reviewerFlags }; // no pinned name to validate against

  const ceoTokens = new Set(ceoName.toLowerCase().split(/\s+/));
  const roleRe = /\b(?:CEO|Chief Executive(?: Officer)?)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/g;
  const flagged = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = roleRe.exec(deliverable)) !== null) {
    const cited = m[1].trim();
    const citedTokens = cited.toLowerCase().split(/\s+/);
    // Accept if the cited name shares any token with the pinned CEO name (e.g. "Popov" ⊂ "Dimitar Popov").
    const matches = citedTokens.some(t => ceoTokens.has(t));
    if (!matches && !flagged.has(cited)) {
      flagged.add(cited);
      reviewerFlags.push(
        `GATE 5 FAIL S-26 (role-name): deliverable names CEO "${cited}" but INTAKE_FACTS CEO_NAME is "${ceoName}". ` +
        `A wrong leadership name is never-ship — correct before delivery.`,
      );
    }
  }
  return { reviewerFlags };
}
