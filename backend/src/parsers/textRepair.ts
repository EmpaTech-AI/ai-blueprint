// ─── E1: repair separator-destroying extraction (v37.7) ───────────────────────────────────────────
//
// Ten-batch register E1, the top engineering item: PERSISTENT across three batches, both cases, and it
// has now defeated TWO guards. `pdf-parse` returns `data.text` with no cell separators, so adjacent
// table columns concatenate:
//
//     84,000 | 78,000 | HQ only     →     84,00078,000HQ only
//     Revenue | 2.0 | B | 1,486,200 →     Revenue 2.0 B 1,486,200   → phantom €2.0 BILLION
//
// Two things follow, and the second is the one that made this the top item:
//
//  1. It defeats the guards. A17's quantity-kind checking cannot help — the corrupted token is a
//     syntactically valid number. That is why E1 accounts for every remaining F12 false fire on both
//     cases, and why it "erodes trust in F12's real catches": 3–4 genuine blocker-grade divergences per
//     run sit inside the same tables as the phantoms.
//  2. **It also feeds the MODEL.** The corpus the model reads is the same corrupted text. So this is
//     plausibly upstream of R1 (the model deriving a wrong integration count) and R4 (the corrupted
//     structured field) — defects previously scored as model-side. Repairing at extraction is therefore
//     not only an instrument fix; it removes a source of model error that was being attributed elsewhere.
//
// THE DURABLE FIX IS A TABLE-AWARE EXTRACTOR (pdfjs with position data, or a layout-preserving mode).
// That is a dependency change and a larger piece of work. What is here instead repairs the boundaries
// that are STRUCTURALLY IMPOSSIBLE in well-formed text — so every repair is provably a repair, not a
// guess — and reports a count so corpus quality is visible rather than silently assumed.

export interface RepairResult {
  text: string;
  repairs: number;
  samples: string[];   // up to 3 repaired fragments, for the reviewer flag's locus
}

// Each pattern is a boundary that cannot occur inside one well-formed value.
const BOUNDARIES: Array<{ id: string; re: RegExp; insert: (m: RegExpMatchArray) => string }> = [
  // A complete thousands group followed immediately by another digit: `84,00078,000`.
  // A valid number never has a 4th digit after a `,ddd` group.
  { id: 'thousands-run-on', re: /(\d{1,3}(?:[,.]\d{3})+)(\d)/g, insert: m => `${m[1]} ${m[2]}` },
  // A digit immediately followed by a currency symbol: `84,000€78,000`.
  { id: 'digit-then-symbol', re: /(\d)([€$£])/g, insert: m => `${m[1]} ${m[2]}` },
  // A percentage immediately followed by a digit: `4.2%3.1%`.
  { id: 'percent-run-on', re: /(%)(\d)/g, insert: m => `${m[1]} ${m[2]}` },
  // A digit immediately followed by a capital plus at least one more letter: `84,000HQ only`,
  // `1,332,000Vienna`. Two letters is the real floor — the observed corruption was `84,00078,000HQ`, and
  // requiring three missed it. Legitimate attached suffixes are protected by UNIT_SUFFIX below; a single
  // trailing capital (`€5M`) cannot match at all, since the pattern needs a second letter.
  { id: 'digit-then-word', re: /(\d)([A-Z][A-Za-z]+)/g, insert: m => `${m[1]} ${m[2]}` },
];

// Legitimate attached suffixes that must NOT be split off a number.
const UNIT_SUFFIX = /^(?:M|Mn|K|Bn|B|EUR|USD|GBP|FTE|FTEs|Q[1-4]|H[12]|YoY|CAGR|VAT|PA|Pa)$/;

export function repairConcatenatedCells(input: string): RepairResult {
  let text = input;
  let repairs = 0;
  const samples: string[] = [];

  for (const boundary of BOUNDARIES) {
    text = text.replace(new RegExp(boundary.re.source, 'g'), (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpMatchArray;
      // Never split a legitimate unit suffix off its number.
      if (boundary.id === 'digit-then-word' && UNIT_SUFFIX.test(m[2])) return m[0];
      repairs++;
      if (samples.length < 3) samples.push(m[0].slice(0, 40));
      return boundary.insert(m);
    });
  }
  return { text, repairs, samples };
}

// Boundaries the repair cannot fix, which mean the figures on that line are UNRELIABLE rather than
// merely unseparated. Reported so a divergence on such a line is attributed to extraction, not to the
// client's arithmetic — the distinction E1 was destroying.
const UNREPAIRABLE = [
  // A digit run long enough that it cannot be a real currency figure in this domain (>12 digits).
  /\d{13,}/,
  // A number with two decimal points: `1.486.200.00` — locale collision the repair must not guess at.
  /\d+\.\d+\.\d+\.\d+/,
];

export function hasUnreliableFigures(line: string): boolean {
  return UNREPAIRABLE.some(re => re.test(line));
}
