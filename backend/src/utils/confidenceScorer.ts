import { ConfidenceResult, JustificationEntry, BLOCKER_PREFIX } from '../types/pipeline';

// ─── Stage-keyed composition thresholds (mirrors frontend COMPOSITION_THRESHOLDS) ──
// Both must remain in sync until Step-5 calibration can unify them into a shared config.
// P0: exported so download.ts and freeze-guard tests share a single source of truth.
export const BACKEND_COMPOSITION_THRESHOLDS: Record<string, { green: number; amber: number }> = {
  stepB:  { green: 70, amber: 45 },
  stepC:  { green: 75, amber: 50 },
  stepD:  { green: 75, amber: 50 },
  stepD2: { green: 75, amber: 50 },
  stepE:  { green: 80, amber: 50 },
};

// P0: exported so download.ts badge logic and freeze-guard tests share this constant.
// Do NOT recalibrate this threshold — see Dev_Team_Action_Note_v16 §P0.
export const GROUNDING_GREEN = 88;

// ─── Tag patterns ─────────────────────────────────────────────────────────────
// Each pattern handles:
//   • Bare form:     [Document-Backed]
//   • Space variant: [Document Backed]
//   • Extended form: [Document-Backed — source info here]
//   • Any case:      [document-backed], [INFERRED], etc.
//   • [Assumed] is accepted as a synonym for [Assumption]

const TAG_PATTERNS = {
  documentBacked:   /\[Document[- ]?Backed[^\]]*\]/gi,
  formStated:       /\[Form[- ]?Stated[^\]]*\]/gi,
  // S-23: a score component drawn verbatim from the archetype Hypothesis Library Typical
  // values. Reproducible by construction, so it counts as a grounded basis (high-confidence
  // pool for the blended score) — NOT as an [Assumption]. It is excluded from the
  // documentary-vs-form composition split because it is not client evidence.
  archetypeAnchored: /\[Archetype[- ]?Anchored[^\]]*\]/gi,
  inferred:         /\[Inferred[^\]]*\]/gi,
  assumption:       /\[(Assumption|Assumed)[^\]]*\]/gi,
} as const;

// ─── Public strip helpers ─────────────────────────────────────────────────────

// v37.4 (LunaCart TC1, item 4): the JUSTIFICATION strip was the last all-or-nothing strip in the
// file. The old pattern was `/\n*## \[JUSTIFICATION\][\s\S]*?\[END JUSTIFICATION\]\n*/gi` — it
// required the heading at EXACTLY level 2, with brackets, AND the `[END JUSTIFICATION]` terminator.
// Any one of those drifting meant the ENTIRE block passed through untouched, which is exactly the
// intermittent 2-of-4 · ~25-occurrence leak observed on LunaCart Stage 5.
//
// This is the same failure mode, and now the same fix, as stripCheckpointScaffold (T-15, v32):
// "any drift in the assembled output slipped through, which is why the leak was intermittent rather
// than constant." That one was hardened three eras ago; this one never was.
//
// Tolerance: heading level 1–4, optional leading horizontal rule, optional bold, optional brackets,
// optional trailing colon. The heading is ANCHORED to end-of-line so a heading that merely CONTAINS
// the word — the skills' own "## Confidence Justification Report" — can never match.
//
// Termination, in priority order:
//   1. `[END JUSTIFICATION]` (inclusive) — the contract form; byte-equivalent to the old behaviour.
//   2. the first heading at the JUSTIFICATION heading's own level OR HIGHER (exclusive). The block
//      legitimately contains `### Confidence Overview` and `#### N. [Tag] Label` sub-headings, so
//      terminating at "any heading" would under-strip and leave every numbered entry behind. The
//      sibling-or-higher rule is what bounds over-consumption: it also stops at a following
//      `## [CONFIDENCE_PROPAGATION]`, which the Stage-2→Stage-4 handoff copy needs intact (§3.3 R3).
//   3. a line carrying the Final marker (exclusive) — kept so the Stage-5 position envelope and the
//      orchestrator's marker assertion still see it.
//   4. EOF.
const JUSTIFICATION_HEADING_SRC =
  String.raw`^[ \t]*(#{1,4})[ \t]*\*{0,2}[ \t]*\[?[ \t]*JUSTIFICATION[ \t]*\]?[ \t]*\*{0,2}[ \t]*:?[ \t]*$`;

export function stripJustification(text: string): string {
  let out = text;
  // Bounded loop: each pass removes one block, so it always terminates; the cap is a backstop only.
  for (let guard = 0; guard < 20; guard++) {
    const heading = new RegExp(JUSTIFICATION_HEADING_SRC, 'im').exec(out);
    if (!heading) break;
    const level = heading[1].length;
    const bodyStart = heading.index + heading[0].length;
    const rest = out.slice(bodyStart);

    const terminator = /\[END[ \t]+JUSTIFICATION\][ \t]*/i.exec(rest);
    let endOffset: number;
    if (terminator) {
      endOffset = terminator.index + terminator[0].length;
    } else {
      const stop = new RegExp(
        String.raw`^[ \t]*(?:#{1,${level}}(?!#)[ \t]|[^\n]*End of AI Value Blueprint)`, 'im',
      ).exec(rest);
      endOffset = stop ? stop.index : rest.length;
    }

    // Also swallow a horizontal rule sitting immediately above the heading (it belonged to the block).
    let cut = heading.index;
    const rule = /(?:\n[ \t]*-{3,}[ \t]*)+\n*[ \t]*$/.exec(out.slice(0, cut));
    if (rule) cut = rule.index;

    out = `${out.slice(0, cut)}\n${out.slice(bodyStart + endOffset)}`;
  }
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

export function stripConfidenceTags(text: string): string {
  return text.replace(
    /\s*\[(Document[- ]?Backed|Form[- ]?Stated|Archetype[- ]?Anchored|Inferred|Assumption|Assumed)[^\]]*\]/gi,
    '',
  );
}

export function stripBuildStamp(text: string): string {
  // Matches both legacy `<!-- pipeline-build: ... -->` and v28 `<!-- build: ... -->` format
  return text.replace(/<!--\s*(?:pipeline-build|build):.*?-->\n?/gm, '');
}

// T-15: Remove CHECKPOINT scaffold blocks emitted by blueprint-assembly chunking.
//
// These are internal handoff markers ("## CHECKPOINT 1 — Foundation Complete" + metadata
// lines) that must never reach a client document. The earlier regex required an exact
// `---\n\n## CHECKPOINT` prefix with rigid spacing and case; any drift in the assembled
// output (single newline, missing rule, lowercase, H1/H3 instead of H2, tab whitespace)
// slipped through, which is why the leak was intermittent rather than constant.
//
// This version is position- and format-tolerant: it matches a CHECKPOINT heading at any
// heading level, with or without a leading horizontal rule, in any case, and consumes the
// block up to the next heading, the next horizontal rule, the justification block, or EOF.
// The block itself contains no headings or rules, so this cannot over-consume real sections.
export function stripCheckpointScaffold(text: string): string {
  return text
    .replace(
      /\n*(?:-{3,}[ \t]*\n+)?#{1,4}[ \t]*CHECKPOINT[ \t]+\d+[^\n]*\n[\s\S]*?(?=\n[ \t]*#{1,4}[ \t]|\n[ \t]*-{3,}[ \t]*\n|\[END JUSTIFICATION\]|$)/gi,
      '',
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Remove leading operator receipt/acknowledgement and pre-flight status blocks emitted before
// the document title. The assembly skill's Pre-Flight Sanitization rule handles this on the model
// side; this is a backend safety net. Catches "I have...", "I've...", and the bullet-style
// pre-flight checklist ("• Step 1 — ...") that sometimes leaks before the first `# ` heading.
// v37.4: every alternative used to require a trailing `\n`, so a preamble line that ended up LAST in
// the text (no trailing newline — which is what any earlier strip's `.trim()` leaves behind) was not
// removed. `(?:\n|$)` closes that. The bullet forms deliberately still require the newline: they match
// any `•`/`*` line, and letting them run to EOF would widen an already-broad pattern.
export function stripOperatorPreamble(text: string): string {
  // Strip leading "I have/I've" acknowledgement lines
  let result = text.replace(/^(?:I (?:have|'ve)[^\n]*(?:\n|$))+\n*/m, '').trimStart();
  // Strip pre-flight status block if it appears before any `# ` heading
  // Pattern: bullet-list status lines ending with "Proceeding to Chunk N."
  result = result.replace(/^(?:•[^\n]*\n|\*[^\n]*\n|[Nn]o missing[^\n]*(?:\n|$)|[Pp]roceeding to[^\n]*(?:\n|$))+\n*/m, '').trimStart();
  return result;
}

// T-26 (S-29): Remove ALL HTML comments before delivery. The pipeline embeds internal
// machine-readable markers as HTML comments — `<!-- score: id=H-RT-XX ... -->`,
// `<!-- pp-id: PP-RT-XX -->`, `<!-- INTAKE_FACTS ... -->`, and the build stamp. None are
// client-facing, yet the markdown renderers emit a stray comment as visible literal text.
// stripBuildStamp only caught the `build:` form, so the v32 batch leaked a literal
// `<!-- score: id=H-RT-XX ... -->` placeholder stub (3/4 runs) and a doubled marker (1/4).
// Stripping every comment form here closes the whole class at the single delivery chokepoint.
// (Scoring and inter-stage parsing read the RAW step output, never the delivery-stripped text,
// so removing the markers here does not affect the confidence score or downstream handoffs.)
export function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->[ \t]*\n?/g, '').replace(/\n{3,}/g, '\n\n');
}

// T-23 (S-28): Remove the step-by-step process-narration scaffold. The v32 leak fix made the
// CHECKPOINT strip tolerant, and the defect relocated to a different scaffold FORM — a
// "Step 1 (Intake): … Step 2 (Maturity): …" process recap that leaked into all four Stage-5
// deliverables (and forked its own content, "Sections A–D" vs "A–H"). Per WL-11, integrity
// strips must enumerate scaffold forms, not a single known marker. No client-facing section
// ever begins "Step N (Name):" / "Stage N — Name:" — those headings are "# 1. Executive
// Summary", "## Now — Months 1–3", etc. — so removing such lines cannot touch real content.
// Markdown headings (lines starting with `#`) are never matched, so genuine sections survive.
export function stripProcessNarration(text: string): string {
  return text
    .split('\n')
    .filter(line => !/^\s*(?:[-*•]\s*)?\*{0,2}(?:Step|Stage)\s+\d+\s*[—:(]/i.test(line))
    // S-31: the "Step 4 of 5" pipeline-position breadcrumb (the SKILL's own stage label echoed as a
    // subtitle; leaked into 1/4 Stage-4 outputs in the v33 T-10⁵ run). Distinct from the "Step N (…)"
    // form above — here the number is followed by "of M". Allowed leading `#`/`*` so the heading and
    // bold-subtitle variants are caught; no real Blueprint section is titled "Step N of M", so this
    // cannot eat genuine content. Anchored to the line start, so mid-sentence prose is never matched.
    .filter(line => !/^\s*#{0,4}\s*\*{0,2}(?:Step|Stage)\s+\d+\s+of\s+\d+\b/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

// T-25 (S-25): Remove the roadmap GATE-4 self-check block if it reaches a deliverable. The
// self-check is an internal pre-output validation checklist (like CHECKPOINT), not client
// content; in v32 it leaked into 1/4 deliverables, forking Stage-4 structure. Same
// position/format-tolerant shape as stripCheckpointScaffold: consume from the heading to the
// next heading, horizontal rule, justification block, or EOF.
export function stripGate4SelfCheck(text: string): string {
  return text
    // Heading match tolerant of the capacity-self-check variant (S-35): "GATE-4 self-check",
    // "GATE-4 capacity self-check", "Capacity self-check" — consume to next heading/HR/justification/EOF.
    .replace(
      /\n*(?:-{3,}[ \t]*\n+)?#{1,4}[ \t]*\*{0,2}(?:GATE-?\s*4[^\n]{0,30}self-check|Capacity self-check)[^\n]*\n[\s\S]*?(?=\n[ \t]*#{1,4}[ \t]|\n[ \t]*-{3,}[ \t]*\n|\[END JUSTIFICATION\]|$)/gi,
      '',
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// T-23 enumeration defense (mid-body forms the position envelope cannot reach): whole-line status
// markers ("Coverage: A–H", "Confidence: high", "Sections: …") and inline parenthetical meta-asides
// ("(Internal: 8 pain points mapped)"). These are the relocation forms the Practice review named as
// the next places the model narrates its process/grounding inside a section body. Whole-line filters
// require the label to be immediately followed by a colon/dash, so ordinary prose ("Confidence in
// these estimates …") is never matched. Markdown headings (`#`) are never matched.
export function stripStatusAndMetaAsides(text: string): string {
  return text
    .split('\n')
    .filter(line => !/^\s*(?:[-*•]\s*)?\*{0,2}(?:Coverage|Confidence|Sections?|Status|Internal)\s*[:—-]/i.test(line))
    .join('\n')
    .replace(/\s*\((?:Internal|Confidence|Coverage)\s*[:：][^)]*\)/gi, '')
    .replace(/\n{3,}/g, '\n\n');
}

// T-23 (answer to §8 — the next relocation forms past the envelope): bracketed editorial
// self-instructions the model leaves mid-body — `[Consultant: verify X]`, `[TODO: …]`,
// `[NOTE: …]`, `[DRAFT]`, `[INSERT …]`, `[TBD]`, `[PLACEHOLDER]`. Scoped to these known editorial
// keywords so real bracketed content (numeric citations, "[see appendix]") is untouched.
export function stripEditorialBrackets(text: string): string {
  return text
    .replace(/\s*\[(?:Consultant|TODO|NOTE|DRAFT|INSERT|TBD|PLACEHOLDER)\b[^\]]*\]/gi, '')
    .replace(/[ \t]+$/gm, '');
}

// T-28 (REG-14 / WL-13): leak forms that surfaced at Stage 1 once the Stage-5 envelope was the only
// guarantee — the "Operator Assembly Instructions" scaffold block and the generation-run narration
// ("…did not stop at the Checkpoint N boundary…"). Stripped on every stage's delivery path, not
// just Stage 5, so the whack-a-mole relocation (Stage-5 pinned → Stage-1 leaked) is closed.
export function stripOperatorAssembly(text: string): string {
  // Remove the "Operator Assembly Instructions" block from its heading/label line to the next
  // heading, horizontal rule, justification terminator, or EOF (mirrors stripCheckpointScaffold).
  let t = text.replace(
    /(?:^|\n)[ \t]*#{0,4}[ \t]*\*{0,2}Operator Assembly Instructions[^\n]*[\s\S]*?(?=\n[ \t]*#{1,4}[ \t]|\n[ \t]*-{3,}[ \t]*(?:\n|$)|\[END JUSTIFICATION\]|$)/gi,
    '\n',
  );
  // Remove generation-run narration lines that reference a checkpoint boundary.
  t = t.split('\n')
    .filter(line => !/(?:generation run|did not stop)[^\n]*checkpoint\s+\d+\s+boundary/i.test(line))
    .join('\n');
  return t.replace(/\n{3,}/g, '\n\n').trim();
}

// §3.3 (R3): [CONFIDENCE_PROPAGATION] is a Stage-2 → Stage-4 HANDOFF channel that leaked into the
// Stage-2 delivery copy (4/4 in the ground-truth ×4). Strip it from the DELIVERY copy only — the
// handoff copy uses stripJustification (NOT stripForDelivery), so the channel stays intact for Stage 4.
export function stripConfidencePropagation(text: string): string {
  return text
    .replace(/\[CONFIDENCE_PROPAGATION\][\s\S]*?\[END CONFIDENCE_PROPAGATION\]/gi, '')           // paired markers
    .replace(/\n*#{1,4}[ \t]*\[?CONFIDENCE_PROPAGATION\]?[^\n]*\n[\s\S]*?(?=\n[ \t]*#{1,4}[ \t]|$)/gi, '\n') // heading-led block
    .replace(/^.*\[(?:END )?CONFIDENCE_PROPAGATION\].*$/gim, '')                                  // stray marker line
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Strips build stamp, justification, CHECKPOINT/operator-assembly scaffold, GATE-4 self-check,
// process narration, status/meta-asides, editorial brackets, HTML comments, operator preamble,
// inline confidence tags, and the [CONFIDENCE_PROPAGATION] handoff block — use before generating ANY
// staged deliverable. Central, so every emission path and stage is covered (T-15/23/25/26/28; §3.3).
// Pipe form (not nested calls) so adding/reordering a stripper can't drift a paren.
// S-48 / S-41 (v37.3 Class C): remove internal score-field tokens (ml_heavy=yes, d_gate4=no, …)
// that leak into client-facing prose when the model restates the D6 flag syntax verbatim instead of
// in plain language. Scoped to the finite set of internal field NAMES, so no legitimate client
// "X = Y" text is affected (a field name never appears in real client prose). Runs after
// stripHtmlComments, so it only touches VISIBLE prose, never the machine markers. Empty
// parentheses/brackets left behind are tidied. This is a delivery strip — the raw graded output
// keeps the tokens, so the model's emission rate stays observable to the grader.
const DELIVERY_FIELD_TOKEN_RE = /`?\b(?:ml_heavy|multi_source|regulated|large_integration|adoption_dependent|d_gate4|phase_dependency|compliance_deadline|system_event_deadline)\s*=\s*[^\s`)\]]+`?/gi;
export function stripFieldTokens(text: string): string {
  return text
    .replace(DELIVERY_FIELD_TOKEN_RE, '')
    .replace(/\(\s*[;,]?\s*\)/g, '')     // empty parens left by removed tokens
    .replace(/\[\s*\]/g, '')             // empty brackets
    .replace(/[ \t]{2,}/g, ' ')          // collapse doubled spaces
    .replace(/[ \t]+([.,;)])/g, '$1');   // tidy space before punctuation
}

// v37.4 (F13a/F13b): the Stage-1 [DATA_INVENTORY] block is a machine channel — the counted root that
// the PP-CORE-00 severity gate and the Data dimension gate both read (A11–A15). It is internal
// working-out, never client content. The stepB section allowlist already removes it (it is not a
// permitted section), but per the codebase's chokepoint+enumeration doctrine it also gets an explicit
// strip: the allowlist can no-op on a malformed document, and this must not survive that fail-safe.
// Same heading-tolerant shape as the [CONFIDENCE_PROPAGATION] strip it sits beside.
export function stripDataInventory(text: string): string {
  return text
    .replace(/\n*(?:-{3,}[ \t]*\n+)?#{1,4}[ \t]*\*{0,2}\[?DATA_INVENTORY\]?[^\n]*\n[\s\S]*?(?=\n[ \t]*#{1,2}[ \t]+(?!\[?DATA_INVENTORY)|\[END JUSTIFICATION\]|$)/gi, '\n')
    .replace(/<!--\s*inventory:[\s\S]*?-->[ \t]*\n?/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── B3 (v37.5): route the self-audit, do not scrub the prose ─────────────────────────────────────
//
// B3 has failed six consecutive batches: internal engineering identifiers (REG-21, T-19, S-47, WL-14)
// reach the Stage-3 client surface ×4 every batch. The cause is not carelessness — the opportunities
// SKILL instructs the model using those identifiers ("Membership-equality check (REG-21 — mandatory,
// run before emitting output)"), and the model reproduces them when it confirms it ran the checks.
//
// The fix is ROUTING, not scrubbing. The self-audit is legitimate, useful content that belongs in the
// run record; it simply has no channel of its own, so it lands in the deliverable. Giving it a
// `[SELF_AUDIT]` block means the identifiers have a home that is stripped for delivery — the same move
// that fixed `[CONFIDENCE_PROPAGATION]` and `[JUSTIFICATION]`.
//
// The `engineering-id` detector stays as the backstop for anything that leaks OUTSIDE the block, and it
// now quotes the token it found so a residual is adjudicable rather than mysterious.
export function stripSelfAudit(text: string): string {
  return text
    // Paired-marker form, and the heading-led form at any level (mirrors stripConfidencePropagation).
    .replace(/\[SELF_AUDIT\][\s\S]*?\[END SELF_AUDIT\]/gi, '')
    .replace(/\n*#{1,4}[ \t]*\*{0,2}\[?SELF[_ ]AUDIT\]?[^\n]*\n[\s\S]*?(?=\n[ \t]*#{1,4}[ \t]|\[END JUSTIFICATION\]|$)/gi, '\n')
    .replace(/^.*\[(?:END )?SELF_AUDIT\].*$/gim, '')
    // Parenthetical rule citations the model sprinkles into prose when narrating a check it ran:
    // "(REG-21)", "(per T-19)", "(REG-22 / WL-14)", "(REG-21 pin)". Closed form — one or more
    // identifiers inside parentheses, with an optional short trailing gloss.
    //
    // v37.5a (I5): the trailing gloss is new. The batch produced "(REG-21 pin)" ×4 on both cases, which
    // the previous form missed because it required the closing paren immediately after the identifier —
    // the RECURRENT instance of the very class B3 was rebuilt to fix. The gloss is bounded to 24
    // characters with no sentence terminator, so it cannot swallow a clause.
    // A bare token in running prose is still deliberately NOT touched: that is a real leak and the
    // detector's job, and a blanket strip could eat a client's own reference.
    .replace(/\s*\((?:per\s+|see\s+)?(?:[TSD]|WL|REG)-\d{1,3}(?:\s*[/,;]\s*(?:[TSD]|WL|REG)-\d{1,3})*(?:[ \t]+[^().!?;]{1,24})?\)/g, '')
    .replace(/[ \t]+([.,;)])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function stripForDelivery(text: string): string {
  const steps = [
    stripBuildStamp, stripJustification, stripCheckpointScaffold, stripConfidenceTags,
    stripGate4SelfCheck, stripHtmlComments, stripProcessNarration, stripStatusAndMetaAsides,
    stripEditorialBrackets, stripOperatorPreamble, stripOperatorAssembly, stripConfidencePropagation,
    stripDataInventory, stripSelfAudit, stripFieldTokens,
  ];
  return steps.reduce((t, fn) => fn(t), text);
}

// T-23 GUARANTEE (the credited KR5 chokepoint): the position envelope. The Stage-5 deliverable
// must begin at its first top-level section header and end at (and including) the Final marker.
// Everything OUTSIDE that envelope — leading preamble/narration, trailing status confirmations —
// is removed wholesale. This is form-AGNOSTIC: unlike enumerating known scaffold strings, it
// catches the NEXT relocation form at the margins too, because anything outside the section body
// simply does not survive. (Mid-body novel forms remain the residual risk; the eventual fix is a
// positive section-schema allowlist — on the roadmap, not v33.) Applied ONLY on the Stage-5 path,
// where the document is known to start with a `# ` header — never on intermediate-stage previews.
export function stripToDeliveryEnvelope(text: string): string {
  let t = text;
  const firstHeader = t.search(/^#[ \t]+\S/m);
  if (firstHeader > 0) t = t.slice(firstHeader);
  const marker = t.match(/^.*End of AI Value Blueprint.*$/im);
  if (marker && marker.index != null) t = t.slice(0, marker.index + marker[0].length);
  return t.trim();
}

// Stage-5 client-deliverable strip: the shared delivery strips PLUS the position-envelope guarantee.
// Use this (not bare stripForDelivery) wherever the final client document is rendered.
export function stripForDeliveryStage5(text: string): string {
  return stripToDeliveryEnvelope(stripForDelivery(text));
}

// T-23 DETECTOR (the scan): after stripping, assert nothing scaffold-shaped survived. Returns a
// reviewer flag per residual form found. The envelope is what we credit; this scan is the
// observability net that proves it — enumerating every known form (Practice's complete list).
// T-28: takes a stageLabel so it can run on EVERY staged deliverable (S1–S5), not only Stage 5 —
// the Era-K leak relocated to Stage 1 because this scan had only ever run on the assembled output.
// v37.4: the form list is no longer maintained here. It is SCAFFOLD_FORMS — the single registry that
// also declares which chokepoint removes each form, so this scan can never again be narrower than
// the strips it is auditing (see the registry comment for the two forms that audit surfaced).
export function detectResidualScaffold(text: string, stageLabel = 'Stage 5'): string[] {
  const flags: string[] = [];
  for (const form of SCAFFOLD_FORMS) {
    const hit = form.detect.exec(text);
    if (hit) {
      // v37.5 (B3): quote the MATCH and its surrounding line. For six batches this flag said only
      // "internal engineering identifier" with no indication of which token or where, so B3 could not
      // be adjudicated — the reviewer had a defect report with no locus. A detector that cannot be
      // acted on is barely better than no detector.
      const line = lineAround(text, hit.index);
      flags.push(
        `${BLOCKER_PREFIX} ${stageLabel} residual scaffold (${form.label}) survived delivery strip — ` +
        `found "${hit[0].trim().slice(0, 60)}" in: "${line}". Do not release.`,
      );
    }
  }
  return flags;
}

// The line containing `index`, trimmed and bounded — enough context to locate the leak in the artifact.
function lineAround(text: string, index: number): string {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? undefined : end).trim().slice(0, 160);
}

// ─── T-29: permit-only section allowlist (Approach 2 — the durable KR5 fix) ──────
//
// Closes the leak-FORM relocation by construction: instead of enumerating bad forms (a denylist
// that invites the next form every era), permit only the known deliverable sections and strip any
// other top-level section wholesale. A novel scaffold *section* (e.g. a stray "Operator Assembly"
// or "Capacity self-check" heading) is removed because it isn't permitted — no enumeration needed.
//
// Permit-lists reconciled against the ground-truth ×4 deliverables (Practice WS-A1 reconciliation §2).
// V1: each entry is an ANCHORED prefix of the normalised heading (leading "A)"/"1."/bold stripped),
// matched by startsWith — so a permitted phrase appearing mid-heading does NOT permit the section,
// minimising reliance on the scaffold backstop. Authored as the actual ×4 heading prefixes.
export interface SectionAllowlist { level: number; permit: string[]; }

export const SECTION_ALLOWLISTS: Record<string, SectionAllowlist> = {
  stepB:  { level: 2, permit: ['executive summary', 'key data', 'detected pain', 'opportunities and hypoth', 'org and process', 'document index', 'open question', 'reviewer checklist', 'document receipt'] },
  // v1.1 re-key (Era-N S-44): the Mandatory Heading Contracts pin S2/S4 sections at LEVEL 2
  // (see blueprint-maturity/blueprint-roadmap SKILL.md and harness/permit_manifest_intake_v1_1.json —
  // regenerate these lists from that manifest at every version event; hand-tuned lists drift, WL-18).
  // v37.3 Class C: '[band_assignment]'/'band assignment' added so the mandatory band block (## [BAND_ASSIGNMENT])
  // survives delivery — it was generated then stripped as non-permitted in 12/12 runs (the aria-spec input contract).
  stepC:  { level: 2, permit: ['readiness scorecard', 'dimension rationale', 'overall pattern', 'key constraint', '[band_assignment]', 'band assignment'] },
  stepD:  { level: 3, permit: ['executive opportunity', 'opportunity cards', 'opportunity #', 'portfolio view', 'additional opportunit'] },
  stepD2: { level: 2, permit: ['sequencing rationale', 'phase summary', 'phase 1', 'phase 2', 'phase 3', 'bridge'] },
  // §2: 8 stable Stage-5 sections (anchored prefixes; "ai readiness"/"ai opportunity" carry the "AI " prefix).
  stepE:  { level: 1, permit: ['executive summary', 'ai readiness', 'readiness gaps', 'key findings', 'where value', 'ai opportunity', 'recommended action', 'recommended next', 'gaps and recommendations', 'appendix'] },
};

// Normalise a heading for anchored matching: drop leading bold and any list enumerator ("A)", "1.").
function normalizeHeading(h: string): string {
  return h
    .replace(/^\*{0,2}\s*/, '')
    .replace(/^(?:\d+[.)]|[A-Za-z][.)])\s*/, '')
    .trim()
    .toLowerCase();
}

// §3 (ground-truth): known-scaffold section headings that must be stripped REGARDLESS of permit —
// a lenient permit substring would otherwise falsely keep them ("Step 2 — Opportunity…" contains
// "opportunity"; "Pain Point Selection — Working Log" contains "pain point"). S-37 (Stage-3 step
// narration), S-38 (Stage-1 selection working-logs), and the existing scaffold families.
// B2 (contract v1.3 §3.1): closed vocabulary of the pipeline's OWN step titles. The S-37 detector
// matches "Step N" ONLY when followed by one of these (set membership, not intent-guessing), so a
// legitimate client roadmap line ("Step 1: Migrate the CRM") is never caught. Maintained alongside
// the skills' operating procedures and versioned with this detector.
const INTERNAL_STEP_TITLES = [
  'confirm the baseline', 'load the schema', 'review the dossier', 'load the selection',
  'route to the industry archetype', 'extract opportunity signals', 'score each dimension',
  'score each opportunity', 'fix the portfolio', 'classify (d6b', 'apply the readiness adjustment',
  'identify the key takeaways', 'weave in readiness', 'anchor on the golden', 'lock to intake',
  'validate the sequence', 'assign each opportunity to a phase',
];
const STEP_TITLE_ALT = INTERNAL_STEP_TITLES.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
// "Step N [sep] <internal title>" — one closed vocabulary shared by the section strip and the
// residual detector, so both stay in sync.
const STEP_N_INTERNAL_SECTION = new RegExp(`^(?:step|stage)\\s+\\d+[a-z]?\\s*[—:.)\\-]?\\s*(?:${STEP_TITLE_ALT})`, 'i');
const STEP_N_INTERNAL_LINE = new RegExp(`^\\s*#{0,4}\\s*(?:[-*•]\\s*)?\\*{0,2}(?:step|stage)\\s+\\d+[a-z]?\\s*[—:.)\\-]?\\s*(?:${STEP_TITLE_ALT})`, 'im');

// ─── v37.4 (LunaCart TC1, item 5): one scaffold-form registry ────────────────────────────────────
//
// The residual detector's form list and the delivery strips were two independently hand-maintained
// lists. That is the same failure the Practice hit from the other side: their grading token list did
// not contain `JUSTIFICATION`, so they reported "0 leaks ×4" against a pipeline that was leaking —
// "I keep testing for what has failed before rather than for what the contract specifies."
//
// Auditing the two lists against each other found the identical asymmetry inside the pipeline:
// `stripConfidencePropagation` and `stripOperatorPreamble` both run on every delivery path and
// NEITHER had a detector entry, so those two forms could leak and the scan would report clean.
//
// The registry makes the relationship explicit and testable. Each form declares the regex that
// detects it, which chokepoint is responsible for removing it, and a canonical sample. The paired
// test (confidenceScorer.scaffold.test.ts) then asserts, mechanically:
//   • every form's `detect` matches its own `sample`                    — the detector is honest
//   • every 'delivery-strip' sample is gone after stripForDelivery      — detector ⊇ pipeline
//   • every strip in the stripForDelivery pipe alters ≥1 sample         — pipeline ⊆ detector
// so a strip can never again be added without a detector, nor a detector drift narrower than the
// strip it is supposed to be watching.
//
// `removedBy` is the honest part: 'author-discipline' forms (internal engineering IDs, literal
// H-RT-XX placeholders, quality-check self-grading) have NO strip by design — enumerating them here
// records that the detector is the only thing standing between them and a client, which is a
// different risk posture from a form that is mechanically removed.
// v37.5a (I6 — the only instrument item in the batch that failed toward NOT SEEING, and therefore the
// one weighted as if model-side). `SELF_AUDIT` was named in LunaCart client prose and nothing flagged it:
// the registry knew the bracketed block form `[SELF_AUDIT]` and the heading form, but not the BARE NAME
// in running text. Every machine-channel block has the same exposure, and hand-listing them is what
// produced the gap — so the vocabulary is DERIVED from one declaration that the strips also key off.
//
// This is the registry's own blind spot: it was built to stop a strip existing without a detector, and it
// did. It did not stop a detector knowing one SURFACE FORM of a token and not another.
export const MACHINE_BLOCK_NAMES = [
  'SELF_AUDIT', 'DATA_INVENTORY', 'JUSTIFICATION', 'CONFIDENCE_PROPAGATION',
  'BAND_ASSIGNMENT', 'INTAKE_FACTS', 'CHECKPOINT',
] as const;

// A bare block name in prose — no brackets. The two lookbehinds exclude `[SELF_AUDIT]` and
// `[END SELF_AUDIT]`, which have their own registry forms; without them a single leaked block would
// raise two BLOCKERs for one defect and inflate the release-axis count the Practice is measuring.
export const BARE_BLOCK_NAME_RE = new RegExp(
  `(?<!\\[)(?<!\\[END )\\b(?:${MACHINE_BLOCK_NAMES.join('|')})\\b(?!\\])`,
);

export type ScaffoldRemovedBy = 'delivery-strip' | 'section-allowlist' | 'author-discipline';

export interface ScaffoldForm {
  id: string;
  label: string;              // reproduced verbatim in the reviewer flag
  detect: RegExp;             // must be stateless — never carry the `g` flag
  removedBy: ScaffoldRemovedBy;
  sample: string;
}

export const SCAFFOLD_FORMS: ScaffoldForm[] = [
  { id: 'checkpoint', label: 'CHECKPOINT block', removedBy: 'delivery-strip',
    detect: /CHECKPOINT\s+\d+/i,
    sample: '## CHECKPOINT 1 — Foundation Complete\nSections A–D emitted.\n' },
  { id: 'operator-assembly', label: 'operator-assembly scaffold block (T-28)', removedBy: 'delivery-strip',
    detect: /Operator Assembly Instructions/i,
    sample: '**Operator Assembly Instructions**\nConcatenate the three chunks before conversion.\n' },
  { id: 'step-n-internal', label: 'process-narration "Step N — <internal step title>" (S-37, closed vocabulary)',
    removedBy: 'delivery-strip', detect: STEP_N_INTERNAL_LINE,
    sample: 'Step 3 — Score each opportunity against the rubric.\n' },
  { id: 'working-log', label: 'selection working-log heading (S-38)', removedBy: 'section-allowlist',
    detect: /^\s*#{0,4}\s*\*{0,2}[^\n]*working log/im,
    sample: '## Pain Point Selection — Working Log\nCandidate scoring below.\n' },
  { id: 'step-n-of-m', label: 'pipeline-position "Step N of M" breadcrumb (S-31)', removedBy: 'delivery-strip',
    detect: /^\s*#{0,4}\s*\*{0,2}(?:Step|Stage)\s+\d+\s+of\s+\d+\b/im,
    sample: 'Step 4 of 5\n' },
  { id: 'gate4-self-check', label: 'GATE-4 / capacity self-check (S-35)', removedBy: 'delivery-strip',
    detect: /GATE-?\s*4[^\n]{0,30}self-check|Capacity self-check/i,
    sample: '## GATE-4 self-check\n- Phase 1 populated: yes\n' },
  { id: 'engineering-id', label: 'internal engineering identifier (S-36 / WL-14)', removedBy: 'author-discipline',
    detect: /\b(?:T|S|WL|REG)-\d{1,3}\b/,
    sample: 'Placement follows T-27 and REG-25.' },
  { id: 'field-token', label: 'internal score-field token (S-41/S-48) — e.g. ml_heavy=yes', removedBy: 'delivery-strip',
    detect: /\b(?:ml_heavy|multi_source|large_integration|adoption_dependent|d_gate4|phase_dependency|compliance_deadline|system_event_deadline|regulated)\s*=/i,
    sample: 'Scored with ml_heavy=yes and d_gate4=no.' },
  { id: 'html-comment', label: 'HTML comment / machine marker', removedBy: 'delivery-strip',
    detect: /<!--/,
    sample: '<!-- score: id=H-RT-01 impact=5 feasibility=3 -->\n' },
  // Declared separately from the generic comment form so stripBuildStamp has its own coverage anchor.
  { id: 'build-stamp', label: 'build stamp (T-07)', removedBy: 'delivery-strip',
    detect: /<!--\s*(?:pipeline-build|build):/i,
    sample: '<!-- build: date=2026-07-31 pipeline=v37.3 sha=f6ede60 -->\n' },
  { id: 'confidence-tag', label: 'inline confidence tag', removedBy: 'delivery-strip',
    detect: /\[(?:Document[- ]?Backed|Form[- ]?Stated|Archetype[- ]?Anchored|Inferred|Assumption|Assumed)\b/i,
    sample: 'The team has 12 recruiters [Document-Backed — org chart p.2].' },
  // Widened in v37.4 to the same tolerance as stripJustification. The old detector was
  // /\[JUSTIFICATION\]/i — brackets REQUIRED — so it shared the strip's exact blind spot: an
  // unbracketed `## JUSTIFICATION` heading was neither stripped nor detected. The sample is the
  // observed LunaCart leak form (unbracketed, no terminator), so it is a live regression test.
  { id: 'justification', label: 'JUSTIFICATION block', removedBy: 'delivery-strip',
    detect: new RegExp(`${JUSTIFICATION_HEADING_SRC}|\\[(?:END )?JUSTIFICATION\\]`, 'im'),
    sample: '## JUSTIFICATION\n\n### Confidence Overview\nGrounded: 1 of 2 tagged claims.\n' },
  // NEW in v37.4 — stripConfidencePropagation ran on every delivery path with no detector entry.
  { id: 'confidence-propagation', label: '[CONFIDENCE_PROPAGATION] handoff channel (§3.3 R3)',
    removedBy: 'delivery-strip',
    detect: /\[(?:END )?CONFIDENCE_PROPAGATION\]|^[ \t]*#{1,4}[ \t]*\[?CONFIDENCE_PROPAGATION\b/im,
    sample: '[CONFIDENCE_PROPAGATION]\nData: Inferred\n[END CONFIDENCE_PROPAGATION]\n' },
  // NEW in v37.4 — stripOperatorPreamble likewise had no detector entry. Closed verb vocabulary
  // (the S-37 principle: set membership, not intent-guessing) so a client sentence beginning "I have
  // …" cannot false-fire a never-ship BLOCKER.
  { id: 'operator-preamble', label: 'operator receipt / pre-flight preamble', removedBy: 'delivery-strip',
    detect: /^[ \t]*(?:I(?:'ve| have) (?:received|completed|reviewed|generated|produced)\b|No missing\b|Proceeding to\b)/im,
    sample: 'I have received the three input documents.\n' },
  // NEW in v37.4 — the [DATA_INVENTORY] machine channel (F13a/F13b). Registered at the same time as
  // its strip, which is the whole point of the registry: a new strip cannot ship without a detector.
  { id: 'data-inventory', label: '[DATA_INVENTORY] machine channel (F13a/F13b)', removedBy: 'delivery-strip',
    detect: /^[ \t]*#{1,4}[ \t]*\*{0,2}\[?DATA_INVENTORY\b|<!--\s*inventory:/im,
    sample: '## [DATA_INVENTORY]\n\n### Core Systems\n| System | Record classes held | Core? | Core because (stated priority) | Confidence |\n|---|---|---|---|---|\n| shopify | orders, products | yes | Priority 1 | [Document-Backed] |\n\n<!-- inventory: n_core=1 active_integrations=0 integration_coverage=0.00 data_grade=Early -->\n' },
  // NEW in v37.5 — the B3 routing channel. The self-audit is legitimate run-record content; it just
  // needed somewhere to live that is not the client surface.
  { id: 'self-audit', label: '[SELF_AUDIT] mandatory-check narration (B3 routing)', removedBy: 'delivery-strip',
    detect: /\[(?:END )?SELF_AUDIT\]|^[ \t]*#{1,4}[ \t]*\*{0,2}\[?SELF[_ ]AUDIT\b/im,
    sample: '## [SELF_AUDIT]\nMembership-equality (REG-21): 8 of 8 IDs match Stage 1.\n[END SELF_AUDIT]\n' },
  { id: 'coverage-status-line', label: 'Coverage/Confidence status line', removedBy: 'delivery-strip',
    detect: /^\s*(?:Coverage|Confidence|Sections?|Status)\s*[:—-]/im,
    sample: 'Coverage: Sections A–H\n' },
  { id: 'meta-aside', label: 'mid-body meta-aside', removedBy: 'delivery-strip',
    detect: /\((?:Internal|Confidence|Coverage)\s*[:：]/i,
    sample: 'The register is complete (Internal: 8 pain points mapped).' },
  { id: 'editorial-bracket', label: 'editorial self-note bracket', removedBy: 'delivery-strip',
    detect: /\[(?:Consultant|TODO|NOTE|DRAFT|INSERT|TBD|PLACEHOLDER)\b/i,
    sample: 'Revenue grew 14% [TODO: confirm figure].' },
  { id: 'quality-check', label: 'Quality-check self-grading line', removedBy: 'author-discipline',
    detect: /^\s*\*{0,2}Quality check/im,
    sample: '**Quality check** — all sections present.\n' },
  { id: 'h-rt-placeholder', label: 'literal H-RT-XX placeholder', removedBy: 'author-discipline',
    detect: /H-RT-X{2,}/i,
    sample: 'See hypothesis H-RT-XX for detail.' },
  // NEW in v37.5a — I6, the false-clean gap. Author-discipline because a machine-channel NAME written
  // into client prose is a content defect, not a stray marker: there is no correct way to strip it
  // without editing the sentence, so the detector is deliberately the only guard.
  { id: 'bare-block-name', label: 'machine-channel block name in prose (I6 — derived vocabulary)',
    removedBy: 'author-discipline',
    detect: BARE_BLOCK_NAME_RE,
    sample: 'The SELF_AUDIT confirms every check passed.' },
];

const SCAFFOLD_SECTION_STRIP: RegExp[] = [
  STEP_N_INTERNAL_SECTION,                                         // S-37 (closed vocabulary — internal step titles only)
  /working log/i,                                                  // S-38 "… Selection — Working Log"
  /applying the selection|candidate scoring|selection algorithm/i, // S-38
  /producing chunk|proceeding to chunk|intake received/i,          // S-38 operator log
  /checkpoint\s+\d+/i,                                             // CHECKPOINT
  /operator assembly/i,                                            // operator-assembly
  /self-check/i,                                                   // GATE-4 / capacity self-check
  /confidence overview|low-confidence items/i,                     // LC internals leaked as headings
];
function isScaffoldSection(h: string): boolean {
  return SCAFFOLD_SECTION_STRIP.some(re => re.test(h));
}

// status distinguishes the WL-10 fail-safe no-ops (which would otherwise be a SILENT fail-open, V2)
// from a genuinely-clean result: 'no-sections' / 'all-would-strip' are no-ops the orchestrator must
// flag; 'clean' means sections were found and all permitted; 'stripped' means it ran and removed some.
type AllowlistStatus = 'no-sections' | 'all-would-strip' | 'clean' | 'stripped' | 'scaffold-fallback';

function applyAllowlist(text: string, cfg: SectionAllowlist): { kept: string; removed: string[]; status: AllowlistStatus } {
  const headingRe = new RegExp(`^#{${cfg.level}}(?!#)[ \\t]+(.+?)\\s*$`);
  const blocks: Array<{ heading: string | null; lines: string[] }> = [{ heading: null, lines: [] }];
  for (const line of text.split('\n')) {
    const m = line.match(headingRe);
    if (m) blocks.push({ heading: m[1], lines: [line] });
    else blocks[blocks.length - 1].lines.push(line);
  }
  const sections = blocks.filter(b => b.heading !== null);
  if (sections.length === 0) return { kept: text, removed: [], status: 'no-sections' }; // fail safe (V2: flagged)

  const permitMatch = (h: string) => cfg.permit.some(p => normalizeHeading(h).startsWith(p));
  const permitted = sections.filter(b => permitMatch(b.heading as string) && !isScaffoldSection(b.heading as string));

  // Class-E instrument fix (v37.3): decouple known-scaffold removal from the permit fail-safe.
  //
  // The old fail-safe (removed === all sections → strip nothing) meant that when heading paraphrase
  // made the permit list match NO sections, the whole strip self-disarmed — leaving KNOWN scaffold
  // (Step-N narration, working logs, self-checks) in the delivered artifact. That is why the S3
  // strip "never ran" for three batches: a permit-recognition miss suppressed even the denylist.
  //
  // New behaviour: known scaffold (isScaffoldSection — an explicit, conservative denylist) is ALWAYS
  // removed. The fail-safe now protects only the permit-KEEP decision for UNRECOGNISED (non-scaffold,
  // non-permitted) sections — those are kept rather than nuked when we cannot confirm the structure.
  let keep: (h: string) => boolean;
  let baseStatus: AllowlistStatus;
  if (permitted.length > 0) {
    // Normal operation: keep only permitted sections (removes scaffold + unrecognised).
    keep = (h: string) => permitMatch(h) && !isScaffoldSection(h);
    baseStatus = 'stripped';
  } else if (sections.some(b => isScaffoldSection(b.heading as string))) {
    // Permit matched nothing, but there is known scaffold: keep everything EXCEPT the scaffold, so a
    // permit-recognition miss can never let known scaffold survive. Permit remains UNVERIFIED (flag).
    keep = (h: string) => !isScaffoldSection(h);
    baseStatus = 'scaffold-fallback';
  } else {
    // Permit matched nothing and there is no known scaffold: genuinely unrecognised structure —
    // fail safe, strip nothing, flag as UNVERIFIED.
    return { kept: text, removed: [], status: 'all-would-strip' };
  }

  const removed = sections.filter(b => !keep(b.heading as string)).map(b => b.heading as string);
  if (removed.length === 0) return { kept: text, removed: [], status: baseStatus === 'stripped' ? 'clean' : baseStatus };
  const kept = [blocks[0].lines.join('\n'), ...sections.filter(b => keep(b.heading as string)).map(b => b.lines.join('\n'))]
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { kept, removed, status: baseStatus };
}

export function stripToAllowlistedSections(text: string, stepKey: string): string {
  const cfg = SECTION_ALLOWLISTS[stepKey];
  return cfg ? applyAllowlist(text, cfg).kept : text;
}

export function findNonPermittedSections(text: string, stepKey: string): string[] {
  const cfg = SECTION_ALLOWLISTS[stepKey];
  return cfg ? applyAllowlist(text, cfg).removed : [];
}

// V2 (WL-15 — fail-open-silent): returns a reason when the allowlist did NOT run (a no-op that
// would otherwise be indistinguishable from a clean deliverable), else null. The orchestrator emits
// a distinct reviewer flag on a non-null reason so an unverified stage can never read as clean.
export function allowlistNoopReason(text: string, stepKey: string): string | null {
  const cfg = SECTION_ALLOWLISTS[stepKey];
  if (!cfg) return null;
  const { status } = applyAllowlist(text, cfg);
  if (status === 'no-sections') return `no headings at level ${cfg.level} — section allowlist did NOT run`;
  if (status === 'all-would-strip') return 'every section was non-permitted and none matched known scaffold — permit UNVERIFIED (fail-safe)';
  if (status === 'scaffold-fallback') return 'no section matched the permit list — known scaffold was removed under fail-safe, but the remaining sections are permit-UNVERIFIED (likely heading paraphrase)';
  return null;
}

// Practice §2 (WL-15 evidence): an AFFIRMATIVE per-stage run-status for the reviewer-metadata bundle,
// emitted for EVERY stage — incl. clean — so the Practice verifies "the allowlist ran" from evidence
// rather than inferring it from the absence of a flag. `ran=false` is a fail-open no-op (must be flagged).
export function allowlistStatus(text: string, stepKey: string): { ran: boolean; detail: string } {
  const cfg = SECTION_ALLOWLISTS[stepKey];
  if (!cfg) return { ran: false, detail: 'NO-OP — no allowlist config for this stage' };
  const { removed, status } = applyAllowlist(text, cfg);
  switch (status) {
    case 'stripped':        return { ran: true,  detail: `ran — stripped ${removed.length} non-permitted section(s): ${removed.join('; ')}` };
    case 'clean':           return { ran: true,  detail: 'ran — clean (all sections permitted)' };
    case 'scaffold-fallback': return { ran: true, detail: `ran (fail-safe) — removed ${removed.length} known-scaffold section(s) but NO section matched the permit list; permit UNVERIFIED (review — likely heading paraphrase): ${removed.join('; ')}` };
    case 'no-sections':     return { ran: false, detail: `NO-OP — no headings at level ${cfg.level}; allowlist did NOT run` };
    case 'all-would-strip': return { ran: false, detail: 'NO-OP — every section non-permitted and no known scaffold; permit UNVERIFIED (fail-safe)' };
  }
}

// ─── Justification block parser ───────────────────────────────────────────────

function parseJustificationBlock(text: string): { overview: string; entries: JustificationEntry[] } {
  // Primary: canonical terminator. Fallback: match to end of text — v24+ intake outputs
  // omit [END JUSTIFICATION] and close with the "End of Compressed Client Dossier" footer.
  const blockMatch =
    text.match(/## \[JUSTIFICATION\]([\s\S]*?)\[END JUSTIFICATION\]/i) ??
    text.match(/## \[JUSTIFICATION\]([\s\S]*?)$/i);
  if (!blockMatch) return { overview: '', entries: [] };

  const block = blockMatch[1];

  const overview = block.match(/### Confidence Overview\s*([\s\S]*?)(?=###|$)/i)?.[1]?.trim() ?? '';

  const entries: JustificationEntry[] = [];

  // Canonical format: #### N. [Inferred|Assumption|Assumed] Label
  // Accepts [Inferred], [Assumption], [Assumed] in any case
  const canonicalEntryRegex = /#### (\d+)\.\s*\[(Inferred|Assumption|Assumed)\]\s*(.+?)\n([\s\S]*?)(?=#### \d+\.|### |\[END JUSTIFICATION\]|$)/gi;

  // Floor format (v24+ intake): #### N. Label [floor]
  // Tag is derived from the body field: "Why assumed" → Assumption, otherwise → Inferred.
  const floorEntryRegex = /#### (\d+)\.\s*(.+?)\s*\[floor\]\s*\n([\s\S]*?)(?=#### \d+\.|### |\[END JUSTIFICATION\]|\*End of|$)/gi;

  let m: RegExpExecArray | null;

  while ((m = canonicalEntryRegex.exec(block)) !== null) {
    const body   = m[4];
    const rawTag = m[2];
    // Push every entry whose #### N. [Tag] header matched — the header is the authoritative
    // signal that a genuine LC item was enumerated. Do NOT gate on claim/whyTagged: if the
    // LLM uses non-canonical field names the extractField calls return '', both are falsy,
    // and the entry would be silently dropped — leaving entries.length = 0 and falling
    // through to body counting every run. (Root cause of P3a not firing in v17/v18/v18.1.)
    entries.push({
      index: parseInt(m[1], 10),
      // Normalise [Assumed] → 'Assumption' so the frontend type is satisfied
      tag:   rawTag.toLowerCase() === 'inferred' ? 'Inferred' : 'Assumption',
      label: m[3].trim(),
      element:          extractField(body, ['Element']),
      claim:            extractField(body, ['Claim']),
      whyTagged:        extractField(body, ['Why inferred', 'Why assumed', 'Why infer', 'Why assum']),
      missingData:      extractField(body, ['Missing data']),
      consultantAction: extractField(body, ['Consultant action']),
    });
  }

  // If canonical format produced no entries, try the floor format.
  if (entries.length === 0) {
    while ((m = floorEntryRegex.exec(block)) !== null) {
      const body = m[3];
      // Derive tag from the body's field label — "Why assumed" signals Assumption.
      const tag: 'Inferred' | 'Assumption' = /\*\*Why assumed/i.test(body) ? 'Assumption' : 'Inferred';
      entries.push({
        index: parseInt(m[1], 10),
        tag,
        label:            m[2].trim(),
        element:          extractField(body, ['Element']),
        claim:            extractField(body, ['Claim']),
        whyTagged:        extractField(body, ['Why inferred', 'Why assumed', 'Why infer', 'Why assum']),
        missingData:      extractField(body, ['Missing data']),
        consultantAction: extractField(body, ['Consultant action']),
      });
    }
  }

  return { overview, entries };
}

function extractField(body: string, keys: string[]): string {
  for (const key of keys) {
    // Lookahead accepts both - and • list bullets (v24+ intake uses •).
    const pattern = new RegExp(`\\*\\*${key}[^*]*\\*\\*:?\\s*"?([\\s\\S]*?)"?(?=\\n[•\\-]\\s*\\*\\*|\\n####|$)`, 'i');
    const match = body.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/^"/, '').replace(/"$/, '');
  }
  return '';
}

// ─── Tag snippet extractor (fallback when no structured block present) ────────
//
// Returns ONE snippet per tag OCCURRENCE (not per line). This ensures
// snippets.length === the count produced by TAG_PATTERNS.xxx.match() in
// calculateConfidence, so the breakdown numbers and the expanded list are
// always consistent.
//
// For each regex match we extract the surrounding sentence (bounded by
// newlines, full-stops, or list markers) as human-readable context.

function extractTaggedSnippets(text: string, tagPattern: RegExp): string[] {
  const clean   = stripJustification(text);
  const snippets: string[] = [];

  // Always create a fresh /gi copy so lastIndex resets and we don't mutate the global pattern
  const re = new RegExp(tagPattern.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = re.exec(clean)) !== null) {
    const tagStart = match.index;

    // Walk back to the nearest sentence / list boundary
    let sentenceStart = tagStart;
    while (sentenceStart > 0) {
      const ch = clean[sentenceStart - 1];
      if (/[\n.!?]/.test(ch)) break;
      sentenceStart--;
    }

    // Walk forward to end-of-line
    let lineEnd = clean.indexOf('\n', tagStart + match[0].length);
    if (lineEnd === -1) lineEnd = clean.length;

    const fragment = clean.slice(sentenceStart, lineEnd).trim();

    const cleaned = stripConfidenceTags(fragment)
      .replace(/^[#\-•*>\s|:]+/, '')
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
      .trim();

    if (cleaned.length > 0) snippets.push(cleaned);
  }

  return snippets;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateConfidence(stepOutput: string, stepKey?: string): ConfidenceResult {
  // Count tags on the content portion only (ignore the justification block itself)
  const contentOnly = stripJustification(stepOutput);

  // High-confidence tags: counted from the body for all steps.
  // No structural spans exist among DB/FS tags, so body counting is reliable here.
  const documentBacked = (contentOnly.match(TAG_PATTERNS.documentBacked) || []).length;
  const formStated     = (contentOnly.match(TAG_PATTERNS.formStated)     || []).length;
  // S-23: archetype-anchored score basis — a high-confidence basis, not a low-confidence claim,
  // so it is NOT enumerated in the JUSTIFICATION block.
  //
  // T-24 / D-9 (PINNED COUNT): the raw tag occurrences forked 7/13/9/18 across the v32 runs
  // because the model sprinkles `[Archetype-Anchored]` a variable number of times. The score
  // basis is conceptually ONE per scored opportunity, so when score-comment markers are present
  // the canonical, run-stable count is the number of UNIQUE scored hypothesis IDs. Deduping the
  // IDs also neutralises a doubled marker (S-29) and the literal `H-RT-XX` placeholder stub is
  // excluded (an unsubstituted template, not a real opportunity). Stages without score markers
  // (e.g. Stage 5 assembly prose) fall back to the raw tag count.
  const rawArchetypeAnchored = (contentOnly.match(TAG_PATTERNS.archetypeAnchored) || []).length;
  const scoredHypothesisIds = new Set(
    [...contentOnly.matchAll(/<!--\s*score:\s*id=(H-RT-[A-Za-z0-9]+)/gi)]
      .map(m => m[1].toUpperCase())
      .filter(id => !/X{2,}/i.test(id)),
  );
  const archetypeAnchored = rawArchetypeAnchored > 0 && scoredHypothesisIds.size > 0
    ? scoredHypothesisIds.size
    : rawArchetypeAnchored;

  // Parse the justification block early — it is the authoritative LC source for stepB.
  const { overview, entries } = parseJustificationBlock(stepOutput);
  const hasStructured = entries.length > 0 || overview.length > 0;

  let inferred: number;
  let assumption: number;

  // P3c: Positive LC counting for stepB, stepC, and stepD.
  //
  // Body-section [Inferred] and [Assumption] tags include structural scaffolding:
  // overview-enumeration items (e.g. "H-RT-02 ([Inferred] — …)"), appendix cross-references
  // ("[Inferred — derivation per appendix item N]"), and text-mention false-positives —
  // all present in sections A–G at positions that vary run-to-run, making any negative
  // (strip-based) approach position-keyed and non-deterministic.
  //
  // The justification block enumerates only genuine LC claims in a stable #### N. [Tag]
  // format. Using entry count is format-keyed and run-stable (measured: 8 across all 4 v16
  // runs for stepB; extended to stepC/stepD to fix Stage-2/Stage-3 duplicate-count inflation
  // visible in the v24 batch: one Stage-2 element counted 3× in T3 vs 1× in T4).
  //
  // Dedup by normalised label prevents the same logical claim from being counted N times
  // when the LLM emits duplicate entries in the JUSTIFICATION block (Stage-2 T3 defect).
  // Fall back to body counting only when no structured block is present.
  // stepD2 and stepE added (D-LC cross-stage contract):
  // All pipeline stages use the same JUSTIFICATION block protocol. Body-counting inflates LC
  // at Stages 4–5 because upstream inherited claims (score mentions, phase labels, H-RT-XX
  // references) hit [Inferred] patterns in the body even though they were already justified
  // upstream. JUSTIFICATION entry counting is format-keyed and counts only genuinely new
  // claims. Dedup by label prevents double-counting when the same item is referenced twice.
  const POSITIVE_COUNT_STEPS = new Set(['stepB', 'stepC', 'stepD', 'stepD2', 'stepE']);

  if (POSITIVE_COUNT_STEPS.has(stepKey ?? '') && entries.length > 0) {
    // T-04: dedup WITHIN category, keyed on the stable element ID when present.
    // Element IDs (H-RT-XX, dimension names) are pinned cross-run; free-text labels are not.
    // Keying on element+tag pins the LC count run-to-run and fixes the v24 defect where the
    // same element was enumerated 3× in one run and 1× in another. The tag is part of the key
    // so an [Inferred] and an [Assumption] scoping the same element are not collapsed into one
    // (they are distinct concerns). Falls back to the normalised label when no Element is given.
    const seen = new Set<string>();
    const dedupedEntries = entries.filter(e => {
      const elementKey = e.element ? e.element.toLowerCase().replace(/\s+/g, ' ').trim() : '';
      const baseKey = elementKey || e.label.toLowerCase().replace(/\s+/g, ' ').trim();
      const key = `${e.tag}|${baseKey}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    inferred  = dedupedEntries.filter(e => e.tag === 'Inferred').length;
    assumption = dedupedEntries.filter(e => e.tag === 'Assumption').length;
  } else {
    inferred  = (contentOnly.match(TAG_PATTERNS.inferred)  || []).length;
    assumption = (contentOnly.match(TAG_PATTERNS.assumption) || []).length;
  }

  // evidenceHigh = client-evidence claims (DB + FS) — this IS the grounding numerator.
  const evidenceHigh = documentBacked + formStated;
  const low   = inferred + assumption;
  // total counts every tag, archetype-anchored included, so it sits in the denominator.
  const total = evidenceHigh + archetypeAnchored + low;
  // D-9 / B′ (de-conflated metric): GROUNDING is the client-evidence share, (DB+FS)/total.
  // Archetype-anchored basis is NOT summed into this numerator — it measures *reproducibility*,
  // not *grounding* (an archetype-typical value is byte-identical across runs but carries zero
  // client-specific evidence). Folding it in is exactly what bought v32 a green "grounding" badge
  // off an invisible, forking remainder. AA stays in the denominator so grounding reads honestly,
  // and is surfaced on its own axis (breakdown.archetypeAnchored) + the delivery-readiness composite.
  // Zero tags means the skill prompt was not followed at all — treat as Red (0), not a neutral 50.
  const score = total === 0 ? 0 : Math.round((evidenceHigh / total) * 100);
  // Delivery-readiness: the explicitly-named composite that also credits the reproducible archetype
  // basis. Reported under its own name — never as "grounding"/"documentary" (the blocked conflation).
  const deliveryReadiness = total === 0 ? 0 : Math.round(((evidenceHigh + archetypeAnchored) / total) * 100);

  // Fall back to raw snippet extraction if no structured block was produced
  const inferredSnippets   = !hasStructured && inferred   > 0 ? extractTaggedSnippets(contentOnly, TAG_PATTERNS.inferred)   : undefined;
  const assumptionSnippets = !hasStructured && assumption > 0 ? extractTaggedSnippets(contentOnly, TAG_PATTERNS.assumption) : undefined;

  let noTagsReason: string | undefined;
  if (total === 0) {
    const words = contentOnly.trim().split(/\s+/).length;
    noTagsReason = words < 50
      ? 'Output is too short — the AI may not have generated content for this step.'
      : 'No citation tags found in AI output. The skill prompt for this step may not be applying confidence tags correctly.';
  }

  const scoreContext = deriveScoreContext({ score, total, high: evidenceHigh, low, documentBacked, formStated, inferred, assumption, hasStructuredBlock: hasStructured });

  // Scenario C — compute split within the client-evidence pool (DB+FS), NOT against the
  // full grounded pool. Archetype-anchored basis is excluded here: it is not client
  // evidence, so it must not dilute the documentary-vs-form composition reading (S-23).
  const documentVerifiedPercent = evidenceHigh > 0 ? Math.round((documentBacked / evidenceHigh) * 100) : 0;
  const formStatedSharePercent  = evidenceHigh > 0 ? Math.round((formStated  / evidenceHigh) * 100) : 0;
  const compositionDescriptor   = deriveCompositionDescriptor(documentVerifiedPercent, evidenceHigh, total, stepKey, score);

  return {
    score,
    deliveryReadiness,
    highConfidenceCount: evidenceHigh,
    lowConfidenceCount: low,
    needsReview: score < 76,
    breakdown: { documentBacked, formStated, archetypeAnchored, inferred, assumption, total },
    documentVerifiedPercent,
    formStatedSharePercent,
    compositionDescriptor,
    confidenceOverview:   overview || undefined,
    justificationEntries: entries.length > 0 ? entries : undefined,
    // legacy fallback fields — present only when no structured block was found
    ...(inferredSnippets   ? { inferredSnippets }   : {}),
    ...(assumptionSnippets ? { assumptionSnippets } : {}),
    noTagsReason,
    scoreContext,
  };
}

function deriveCompositionDescriptor(documentVerifiedPercent: number, high: number, total: number, stepKey?: string, blendedScore?: number): string {
  if (total === 0) return '';
  if (high === 0)  return 'No high-confidence claims — all tags are low-confidence';

  const t = BACKEND_COMPOSITION_THRESHOLDS[stepKey ?? 'stepE'] ?? BACKEND_COMPOSITION_THRESHOLDS.stepE;
  const compositionGreen = documentVerifiedPercent >= t.green;
  const compositionAmber = !compositionGreen && documentVerifiedPercent >= t.amber;

  let base: string;
  if (compositionGreen) {
    // Stage 1 green means "within expected range for intake", not an absolute "strongly documentary" verdict.
    if (stepKey === 'stepB') base = 'Documentary share within expected range for intake — suitable for pipeline use';
    else base = 'Strongly documentary — suitable for client delivery';
  } else if (compositionAmber) {
    if (stepKey === 'stepB') base = 'Form-stated proportion elevated for intake — review client-stated claims before proceeding';
    else base = 'Mixed grounding — review form-stated items before delivery';
  } else {
    if (stepKey === 'stepB') base = 'Predominantly form-stated — verify all client assertions before high-stakes use';
    else base = 'Predominantly form-stated — verify before high-stakes use';
  }

  // P3 factor-attribution: when composition quality is green but LC volume degrades the blended score,
  // make clear which factor is responsible so the consultant knows composition itself is not the issue.
  if (compositionGreen && blendedScore !== undefined && blendedScore < GROUNDING_GREEN) {
    base += ` — overall badge degraded by LC volume (grounding ${blendedScore}%), not composition quality`;
  }

  return base;
}

function deriveScoreContext(p: {
  score: number; total: number; high: number; low: number;
  documentBacked: number; formStated: number; inferred: number; assumption: number;
  hasStructuredBlock: boolean;
}): string | undefined {
  if (p.total === 0) return undefined; // noTagsReason already handles this case

  if (p.high === 0) {
    const breakdown: string[] = [];
    if (p.inferred > 0)   breakdown.push(`${p.inferred} Inferred`);
    if (p.assumption > 0) breakdown.push(`${p.assumption} Assumption`);
    return `All ${p.total} tags are low-confidence (${breakdown.join(', ')}). Zero document-backed or form-stated citations found. `
      + `This step is reasoning entirely from judgment without anchoring claims to source facts. `
      + `Check that phase placements and sequencing rationales reference specific client facts (e.g. confirmed dates, stated priorities, documents on file).`;
  }

  if (p.assumption > 0 && p.inferred === 0) {
    const tail = p.hasStructuredBlock
      ? `Review the low-confidence items below; each has a consultant action that could replace the assumption with a confirmed fact.`
      : `Review the low-confidence items below and replace each assumption with a confirmed fact from the client's documents or a direct question to the client.`;
    return `Score driven down by ${p.assumption} Assumption tag${p.assumption > 1 ? 's' : ''} — claims with no client evidence at all, based on general knowledge or industry norms. ` + tail;
  }

  if (p.inferred > 0 && p.assumption === 0) {
    const tail = p.hasStructuredBlock
      ? `Inferences are more defensible than assumptions but should be validated. Each has a missing-data note below.`
      : `Inferences are more defensible than assumptions but should be validated against source documents or confirmed with the client.`;
    return `Score driven down by ${p.inferred} Inferred tag${p.inferred > 1 ? 's' : ''} — conclusions drawn from partial evidence rather than explicit statements. ` + tail;
  }

  if (p.inferred > 0 && p.assumption > 0) {
    const tail = p.hasStructuredBlock
      ? `Assumptions (no evidence) are the higher priority to address — see consultant actions below.`
      : `Assumptions (no evidence) are the higher priority to address — validate each against source documents before delivery.`;
    return `Score driven down by ${p.inferred} Inferred and ${p.assumption} Assumption item${p.low > 1 ? 's' : ''}. ` + tail;
  }

  if (p.score === 100) {
    return `All ${p.total} tags are document-backed or form-stated. Every claim in this output is directly traceable to uploaded documents or form responses.`;
  }

  return undefined;
}
