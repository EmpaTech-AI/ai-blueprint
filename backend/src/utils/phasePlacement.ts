// ─── P-rules (R6): deterministic phase placement, derived not judged ──────────────────────────────
//
// R6 is the register's only regression that UN-FIXED itself: LunaCart drifted in v1, held in v1.1,
// drifted again in v1.2 and v1.3 (3/2/3 ×2, 4/2/2, 5/1/2). Ivan's stability weighting prices that
// correctly — v1.1's "pass" was a draw, not a fix, because an unpinned surface's pass is a sample.
//
// The cure follows the C4 correlation, which is now perfect across 13 fix-events: **pins persist,
// instructions decay.** So placement is derived from pinned inputs — the frozen Stage-1 scores and the
// nine relay flags — exactly as A18 derives the anchor set, rather than instructed in prose.
//
// ─── STATUS: ENFORCING as of v37.8 (Sequence item 5). ────────────────────────────────────────────
//
// The two Practice-owned constants were delivered in the twelve-batch report's standing anchors:
// **P1 `NOW_CAPACITY = 3` · P2 `GATE_DEFERS_ALONE = YES`.** The engine ran advisory for one era and the
// derived map matched the emitted roadmap with **zero divergence in 8/8 runs across both cases**, so it
// flips to enforcing on an evidence base rather than on trust.
//
// That 8/8 result also produced the era's attribution rule (I.4 rule 1): P-rules matched the emitted
// roadmap while LunaCart's phases still drifted across runs, which locates the drift in the FROZEN
// STAGE-1 INPUTS, not in placement logic. Enforcing placement therefore does not close Luna's phase
// variance by itself — the inputs have to stabilise too (N4).
//
// What is already deterministic from the existing ratified contract, and is applied:
//   • `phase_dependency=strict`            → Later, unconditionally, any class (T-27 / REG-24 preamble).
//   • a dated `compliance_deadline` or
//     `system_event_deadline`              → Now (the REG-24 precedence preamble, rule 2).
//   • Quick Win (post-adjustment F ≥ 4)    → Now, subject to P1 capacity.
//   • Foundation Builder / Big Bet         → Next / Later by class.
// The only genuinely open discretion is P1 and P2, which is what Ivan's III.3 pin 3 said.

import { FrozenElement } from './stage1Manifest';
import { isYes } from './enumNormalise';

export type Phase = 'Now' | 'Next' | 'Later';

// ─── The two Practice-owned constants, delivered 2026-08-05. `null` would restore advisory mode. ──
export const NOW_CAPACITY: number | null = 3;            // P1 — items Phase 1 may carry
export const GATE_DEFERS_ALONE: boolean | null = true;   // P2 — d_gate4=yes alone defers to Next

export const P_RULES_ENFORCING = NOW_CAPACITY !== null && GATE_DEFERS_ALONE !== null;

export interface PlacementInput {
  id: string;
  impact: number;
  feasibility: number;          // POST-adjustment — the operative score
  flags: Record<string, string>;
}

export interface PlacementDecision {
  id: string;
  phase: Phase;
  rule: string;                 // the rule that fired — clause attribution, per the I.4 reading rule
}

const hasDatedDeadline = (flags: Record<string, string>): boolean =>
  ['compliance_deadline', 'system_event_deadline']
    .some(f => /\d{4}-\d{2}-\d{2}|\b20\d{2}\b/.test(flags[f] ?? ''));

export function classOf(impact: number, feasibility: number): 'QuickWin' | 'BigBet' | 'FoundationBuilder' {
  if (feasibility >= 4) return 'QuickWin';
  if (impact >= 4 && feasibility <= 3) return 'BigBet';
  return 'FoundationBuilder';
}

// Derive the whole phase map. Ordering is by (impact × feasibility) descending so capacity, when it is
// set, displaces the LOWEST-value Quick Win rather than an arbitrary one — the roadmap contract's own
// "if you have more Quick Wins than fit in Now, the lower-impact ones move to Next".
// v37.9 — the T1 placement clause. P1's cap and P0b's deadline pull were in the same single pass, and
// the pass ran in rank order, which made the interaction between them depend on where the deadline items
// happened to sort:
//
//   • a deadline item that ranked BELOW three Quick Wins found Now already full — and, being exempt from
//     deferral, entered anyway. Now silently carried 4, and nothing said so.
//   • the displacement went the wrong way. A deadline item cannot move; a Quick Win can. So the item that
//     should have lost its slot was the lowest-value Quick Win, not "whichever arrived after the cap".
//
// The clause: **deadline-pinned items are exempt from displacement, and the cap applies to the
// remainder.** That is a two-pass shape, not a tie-break — the unconditional rules must resolve before
// anything discretionary can know how much capacity is left. If deadline items ALONE exceed the cap, no
// discretionary reordering can fix it: the roadmap is over-committed by items that cannot be moved, and
// that is reported rather than absorbed (see `deadlineOverflow`).
export function derivePlacement(elements: PlacementInput[]): PlacementDecision[] {
  const decisions: PlacementDecision[] = [];
  const ranked = [...elements].sort((a, b) => (b.impact * b.feasibility) - (a.impact * a.feasibility));

  // ── Pass 1: the unconditional rules. These consume capacity before any Quick Win competes for it.
  const unconditional = new Set<string>();
  let nowCount = 0;
  for (const e of ranked) {
    // 1. strict dependency wins over everything, any class (T-27 / REG-24 preamble rule 1).
    if (/^strict$/i.test((e.flags.phase_dependency ?? '').trim())) {
      decisions.push({ id: e.id, phase: 'Later', rule: 'P0a phase_dependency=strict → Later (unconditional)' });
      unconditional.add(e.id);
      continue;
    }
    // 2. a dated deadline pulls TOWARD Now (REG-24 preamble rule 2) — never deferred past its own date,
    //    and therefore never displaced by a higher-scoring Quick Win either.
    if (hasDatedDeadline(e.flags)) {
      decisions.push({
        id: e.id, phase: 'Now',
        rule: 'P0b dated deadline → Now (precedence preamble rule 2; exempt from P1 displacement)',
      });
      unconditional.add(e.id);
      nowCount++;
      continue;
    }
  }

  // ── Pass 2: the discretionary rules, in rank order, against the residual capacity.
  for (const e of ranked) {
    if (unconditional.has(e.id)) continue;
    const cls = classOf(e.impact, e.feasibility);
    if (cls === 'QuickWin') {
      // P2 — the dependency gate. UNSET means we do not defer on it, and we say so.
      if (GATE_DEFERS_ALONE === true && isYes(e.flags.d_gate4)) {
        decisions.push({ id: e.id, phase: 'Next', rule: 'P2 d_gate4=yes → Next (gate defers alone)' });
        continue;
      }
      // P1 — capacity. UNSET means unbounded, and we say so. `nowCount` already carries the deadline
      // items placed in pass 1, so what is tested here is the RESIDUAL capacity.
      if (NOW_CAPACITY !== null && nowCount >= NOW_CAPACITY) {
        decisions.push({
          id: e.id, phase: 'Next',
          rule: `P1 Now capacity ${NOW_CAPACITY} reached → Next (lowest-value Quick Win first; ` +
            `deadline-pinned items are exempt from displacement and reserved their slots)`,
        });
        continue;
      }
      decisions.push({ id: e.id, phase: 'Now', rule: 'P3 Quick Win (post-adjustment F ≥ 4) → Now' });
      nowCount++;
      continue;
    }
    if (cls === 'BigBet') {
      decisions.push({ id: e.id, phase: 'Later', rule: 'P4 Big Bet (I ≥ 4, F ≤ 3) → Later' });
      continue;
    }
    decisions.push({ id: e.id, phase: 'Next', rule: 'P5 Foundation Builder → Next' });
  }

  // Restore rank order. The two passes are an evaluation order, not an output order — a caller reading
  // the derived map should still see it ranked, the way the roadmap presents it.
  const byId = new Map(decisions.map(d => [d.id, d]));
  return ranked.map(e => byId.get(e.id)!).filter(Boolean);
}

// The one case the clause cannot resolve: deadline-pinned items ALONE exceeding the cap. Every one of
// them is exempt from displacement, so there is no discretionary move that brings Now back within P1 —
// the roadmap is over-committed by items that cannot be deferred. Returns the offending ids so the
// caller can report it; an empty array is the normal case.
export function deadlineOverflow(elements: PlacementInput[]): string[] {
  if (NOW_CAPACITY === null) return [];
  const pinned = elements
    .filter(e => !/^strict$/i.test((e.flags.phase_dependency ?? '').trim()) && hasDatedDeadline(e.flags))
    .map(e => e.id);
  return pinned.length > NOW_CAPACITY ? pinned : [];
}

// Build placement inputs by joining the FROZEN flags to the emitted post-adjustment feasibility. The
// flags come from the freeze (pinned) and the feasibility from Stage 3 (adjusted) — which is exactly the
// root/derived split A4 uses, so placement never reads a re-derived flag.
export function placementInputsFrom(
  frozen: FrozenElement[],
  emittedFeasibility: Map<string, { impact: number; feasibility: number }>,
): PlacementInput[] {
  return frozen.map(f => {
    const emitted = emittedFeasibility.get(f.id);
    return {
      id: f.id,
      impact: emitted?.impact ?? f.impact,
      feasibility: emitted?.feasibility ?? f.baseFeasibility,
      flags: f.flags,
    };
  });
}

export interface PlacementCheck {
  reviewerFlags: string[];
  derived: PlacementDecision[];
  divergences: Array<{ id: string; derived: Phase; emitted: Phase | null }>;
  enforcing: boolean;
}

const PHASE_OF_HEADING: Array<[RegExp, Phase]> = [
  [/#{2,3}[ \t]+\*{0,2}Phase 1\b/i, 'Now'],
  [/#{2,3}[ \t]+\*{0,2}Phase 2\b/i, 'Next'],
  [/#{2,3}[ \t]+\*{0,2}Phase 3\b/i, 'Later'],
];

// Where did the roadmap actually place each ID? Uses structural positions only, per N3 — a prose mention
// is a discussion, not a placement.
export function emittedPlacement(roadmap: string): Map<string, Phase> {
  const out = new Map<string, Phase>();
  let current: Phase | null = null;
  for (const line of roadmap.split('\n')) {
    for (const [re, phase] of PHASE_OF_HEADING) if (re.test(line)) current = phase;
    if (/#{2,3}[ \t]+\*{0,2}Bridge\b/i.test(line)) current = null;
    if (!current) continue;
    const t = line.trim();
    const structural = /^\**\s*(?:element|id|opportunity)\s*\**\s*[:—-]/i.test(t)
      || t.startsWith('|') || /^#{1,6}[ \t]/.test(t);
    if (!structural) continue;
    for (const id of t.match(/\bH-[A-Z]+-\d+\b/gi) ?? []) {
      if (!out.has(id.toLowerCase())) out.set(id.toLowerCase(), current);
    }
  }
  return out;
}

export function validatePlacement(roadmap: string, inputs: PlacementInput[]): PlacementCheck {
  const derived = derivePlacement(inputs);
  const emitted = emittedPlacement(roadmap);
  const divergences: PlacementCheck['divergences'] = [];
  const reviewerFlags: string[] = [];

  for (const d of derived) {
    const actual = emitted.get(d.id) ?? null;
    if (actual !== null && actual !== d.phase) divergences.push({ id: d.id, derived: d.phase, emitted: actual });
  }

  if (!P_RULES_ENFORCING) {
    reviewerFlags.push(
      `⚠ P-rules ADVISORY (not enforcing): ${divergences.length} placement divergence(s) between the ` +
      `derived map and the emitted roadmap` +
      (divergences.length > 0
        ? ` — ${divergences.map(d => `${d.id} derived ${d.derived}, emitted ${d.emitted}`).join('; ')}`
        : '') +
      `. Two Practice-owned constants are UNSET (P1 Now capacity, P2 whether d_gate4 defers alone), so ` +
      `placement is reported but NOT gated. R6 does not close until both are supplied — supplying them ` +
      `flips this to enforcing with no other change.`,
    );
    return { reviewerFlags, derived, divergences, enforcing: false };
  }

  // T1: over-commitment by undeferrable items. Reported before the divergences because it explains
  // them — if Now legitimately carries more than P1 allows, the emitted roadmap agreeing with the
  // derived map is not the reassurance it looks like.
  const overflow = deadlineOverflow(inputs);
  if (overflow.length > 0) {
    reviewerFlags.push(
      `${'BLOCKER:'} GATE 4 P1 (T1 placement clause): ${overflow.length} items carry a dated ` +
      `compliance or system-event deadline — ${overflow.join(', ')} — which is more than the Now capacity ` +
      `of ${NOW_CAPACITY}. Deadline-pinned items are exempt from displacement, so no reordering brings ` +
      `Phase 1 within capacity: the roadmap is over-committed by work that cannot be deferred past its ` +
      `own date. This is a scoping decision for the engagement, not a placement error — resolve it with ` +
      `the client rather than by moving a dated item.`,
    );
  }

  for (const d of divergences) {
    const rule = derived.find(x => x.id === d.id)?.rule ?? 'unknown';
    reviewerFlags.push(
      `${'BLOCKER:'} GATE 4 P-rules: ${d.id} is placed in ${d.emitted} but the pinned rules derive ` +
      `${d.derived} — ${rule}. Placement is derived from the frozen flags and the post-adjustment ` +
      `feasibility, not chosen per run.`,
    );
  }
  return { reviewerFlags, derived, divergences, enforcing: true };
}
