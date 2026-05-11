import pdfParse from 'pdf-parse';
import fs from 'fs';
import { ParsedDocument } from '../types/pipeline';

export async function parsePDF(filePath: string, category: string): Promise<ParsedDocument> {
  const filename = require('path').basename(filePath);
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const text = data.text?.trim() || '';

    if (text.length < 100) {
      return {
        category,
        filename,
        text,
        status: 'likely_scanned',
        confidence: 'low',
        pageCount: data.numpages,
        wordCount: 0,
        error: 'Extracted text is too short — document may be scanned or image-based. Manual review required.',
      };
    }

    if (text.length === 0) {
      return { category, filename, text: '', status: 'empty', confidence: 'low', pageCount: data.numpages, wordCount: 0 };
    }

    return {
      category,
      filename,
      text,
      status: 'ok',
      confidence: 'high',
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
