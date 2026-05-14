import pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { ParsedDocument } from '../types/pipeline';

const MAX_CHARS = 15000;

export async function parsePDF(filePath: string, category: string): Promise<ParsedDocument> {
  const filename = path.basename(filePath);
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    let text = data.text?.trim() || '';

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
