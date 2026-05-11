import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { ParsedDocument } from '../types/pipeline';

export function parsePPTX(filePath: string, category: string): ParsedDocument {
  const filename = path.basename(filePath);
  try {
    // xlsx library can read PPTX text content
    const workbook = XLSX.readFile(filePath);
    const slides: string[] = [];

    workbook.SheetNames.forEach((name, i) => {
      const sheet = workbook.Sheets[name];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const text = rows
        .flat()
        .map(String)
        .filter((s) => s.trim())
        .join(' ');
      if (text) slides.push(`Slide ${i + 1}: ${text}`);
    });

    const text = slides.join('\n\n');
    return {
      category,
      filename,
      text: text || '[No text content found in presentation]',
      status: text ? 'ok' : 'empty',
      confidence: text ? 'medium' : 'low',
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
