import pdfParse from 'pdf-parse';
import { repairConcatenatedCells } from './textRepair';
import { renderPageWithLayout } from './layoutRenderer';
import fs from 'fs';
import path from 'path';
import { ParsedDocument } from '../types/pipeline';

const MAX_CHARS = 15000;

export async function parsePDF(filePath: string, category: string): Promise<ParsedDocument> {
  const filename = path.basename(filePath);
  try {
    const buffer = fs.readFileSync(filePath);
    // E1 durable fix (Sequence 1): supply a position-aware page renderer. pdf-parse's default joins
    // same-line items with NO separator, which is the origin of every phantom figure. See layoutRenderer.
    const data = await pdfParse(buffer, { pagerender: renderPageWithLayout } as never);
    // E1 (v37.7): pdf-parse returns no cell separators, so adjacent table columns concatenate
    // (`84,000 | 78,000 | HQ only` → `84,00078,000HQ only`). Repair the structurally-impossible
    // boundaries BEFORE anything reads the text — the model reads this corpus too, so the corruption
    // was feeding both the guards and the generation.
    const repaired = repairConcatenatedCells(data.text ?? '');
    let text = repaired.text.trim();

    if (text.length === 0) {
      return {
        category,
        filename,
        text: '',
        status: 'likely_scanned',
        confidence: 'low',
        pageCount: data.numpages,
        wordCount: 0,
        error: 'No text extracted — document is likely scanned or image-based. Manual review required.',
      };
    }

    let truncated = false;
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS);
      truncated = true;
    }

    if (truncated) {
      text += `\n[... truncated at ${MAX_CHARS.toLocaleString()} characters — full document is ${data.numpages} page(s)]`;
    }

    return {
      category,
      filename,
      text,
      status: 'ok',
      confidence: text.length < 200 ? 'low' : 'high',
      pageCount: data.numpages,
      wordCount: text.split(/\s+/).length,
      extractionRepairs: repaired.repairs,
      repairSamples: repaired.samples,
    };
  } catch (err: unknown) {
    return {
      category,
      filename,
      text: '',
      status: 'parse_error',
      confidence: 'low',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
