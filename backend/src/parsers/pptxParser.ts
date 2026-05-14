import * as XLSX from 'xlsx';
import path from 'path';
import { ParsedDocument } from '../types/pipeline';

export function parsePPTX(filePath: string, category: string): ParsedDocument {
  const filename = path.basename(filePath);
  try {
    const workbook = XLSX.readFile(filePath);
    const slides: string[] = [];

    workbook.SheetNames.forEach((name, i) => {
      const sheet = workbook.Sheets[name];

      // Iterate cell values directly — sheet_to_json returns empty arrays for PPTX slides
      const cellTexts: string[] = [];
      for (const key of Object.keys(sheet)) {
        if (key.startsWith('!')) continue; // skip metadata keys
        const cell = sheet[key] as XLSX.CellObject;
        if (cell && cell.v != null) {
          const val = String(cell.v).trim();
          if (val) cellTexts.push(val);
        }
      }

      if (cellTexts.length > 0) {
        slides.push(`[Slide ${i + 1} — ${name}]\n${cellTexts.join(' ')}`);
      }
    });

    const text = slides.join('\n\n');
    return {
      category,
      filename,
      text: text || '[No text content found in presentation]',
      status: text ? 'ok' : 'empty',
      confidence: text ? 'medium' : 'low',
      wordCount: text ? text.split(/\s+/).length : 0,
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
