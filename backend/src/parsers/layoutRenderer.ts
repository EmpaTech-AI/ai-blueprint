// ─── E1 durable fix: position-aware page rendering (v37.8, Sequence item 1 — BLOCKING) ────────────
//
// The register carried "table-aware extractor" as a dependency change. It is not one. `pdf-parse`
// already accepts a `pagerender` hook, and its DEFAULT renderer is the root cause:
//
//     for (let item of textContent.items) {
//       if (lastY == item.transform[5] || !lastY) { text += item.str; }   // ← no separator
//       else                                      { text += '\n' + item.str; }
//       lastY = item.transform[5];
//     }
//
// It uses the Y coordinate (`transform[5]`) to break lines and then concatenates every item on the same
// line with NOTHING between them. So `84,000 | 78,000 | HQ only` arrives as `84,00078,000HQ only`, and
// that single line of upstream code is responsible for:
//
//   • the phantom €2.0B / €421B / €1.16T figures (register instance 19)
//   • every remaining F12 false fire on both cases
//   • the corrupted corpus the MODEL reads — plausibly upstream of R1' (45% of Luna's harm) and R4
//
// The fix uses the X coordinate (`transform[4]`) and each item's width, which pdf.js already provides:
// a horizontal GAP between the end of one item and the start of the next is a cell boundary. That is
// genuine position-aware extraction with no new dependency, and it removes the corrupted-input floor
// rather than repairing its symptoms — `textRepair` stays as a second net for whatever this misses.
//
// SEPARATOR CHOICE. A tab, not ` | `. Both make the boundary unambiguous to the parsers, but the corpus
// is also read by the MODEL, and injecting pipe characters would make every extracted page look like a
// malformed markdown table. A tab reads as whitespace to the model while remaining a character the
// numeric parser treats as a hard boundary (see NUM_CORE — plain whitespace is no longer a thousands
// separator, register instance 19).

// pdf.js text item shape, narrowed to what we use. `width` is present on text items; `transform` is the
// 6-element matrix [a, b, c, d, x, y].
interface TextItem {
  str: string;
  width?: number;
  transform: number[];
}

interface TextContent { items: TextItem[] }
interface PageData { getTextContent(options: unknown): Promise<TextContent> }

// A gap wider than this fraction of the item's own average glyph width is a cell boundary rather than an
// inter-word space. Deliberately conservative: a normal word space in most PDFs is ~0.25–0.35 em, so 1.2
// em only fires on a genuine column gap. Under-separating leaves work for `textRepair`; over-separating
// would split words, which is unrecoverable.
const GAP_EM_THRESHOLD = 1.2;
// Y values are floats; two items on the same visual line can differ by a hair.
const SAME_LINE_TOLERANCE = 1.5;

function glyphWidth(item: TextItem): number {
  const chars = item.str.length || 1;
  const w = item.width ?? 0;
  return w > 0 ? w / chars : 0;
}

export function renderPageWithLayout(pageData: PageData): Promise<string> {
  return pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
    .then((textContent: TextContent) => {
      let text = '';
      let lastY: number | null = null;
      let lastRight: number | null = null;
      let lastGlyph = 0;

      for (const item of textContent.items) {
        const x = item.transform[4];
        const y = item.transform[5];
        const sameLine = lastY !== null && Math.abs(y - lastY) <= SAME_LINE_TOLERANCE;

        if (!sameLine) {
          if (lastY !== null) text += '\n';
        } else if (lastRight !== null) {
          // Same line: insert a hard boundary when the horizontal gap exceeds the threshold, and only
          // when the text does not already carry its own separating whitespace.
          const gap = x - lastRight;
          const reference = lastGlyph || glyphWidth(item);
          const endsOpen = /\s$/.test(text);
          const startsOpen = /^\s/.test(item.str);
          if (reference > 0 && gap > reference * GAP_EM_THRESHOLD && !endsOpen && !startsOpen) {
            text += '\t';
          }
        }

        text += item.str;
        lastY = y;
        lastRight = x + (item.width ?? 0);
        lastGlyph = glyphWidth(item) || lastGlyph;
      }
      return text;
    });
}

// Exported for test: does this pair of items warrant a boundary? Keeps the decision rule assertable
// without constructing a PDF.
export function needsBoundary(
  prevRight: number, prevGlyphWidth: number, nextX: number,
): boolean {
  if (prevGlyphWidth <= 0) return false;
  return (nextX - prevRight) > prevGlyphWidth * GAP_EM_THRESHOLD;
}
