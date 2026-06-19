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
