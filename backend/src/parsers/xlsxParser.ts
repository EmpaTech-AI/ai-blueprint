import * as XLSX from 'xlsx';
import path from 'path';
import { ParsedDocument } from '../types/pipeline';

const MAX_ROWS_PER_SHEET = 200;
const MAX_CHARS_PER_SHEET = 8000;

export function parseXLSX(filePath: string, category: string): ParsedDocument {
  const filename = path.basename(filePath);
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetTexts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      // Use sheet_to_csv to extract ALL cell values (text and numeric)
      const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      if (!csv.trim()) continue;

      // Clean up: split into rows, strip trailing commas, drop fully empty rows
      let lines = csv
        .split('\n')
        .map((l) => l.replace(/,+$/, '').trim())
        .filter((l) => l.replace(/,/g, '').trim());

      let truncated = false;
      if (lines.length > MAX_ROWS_PER_SHEET) {
        lines = lines.slice(0, MAX_ROWS_PER_SHEET);
        truncated = true;
      }

      let sheetText = `--- Sheet: ${sheetName} ---\n${lines.join('\n')}`;
      if (truncated) sheetText += `\n[... truncated at ${MAX_ROWS_PER_SHEET} rows]`;
      if (sheetText.length > MAX_CHARS_PER_SHEET) {
        sheetText = sheetText.slice(0, MAX_CHARS_PER_SHEET) + '\n[... truncated]';
      }

      sheetTexts.push(sheetText);
    }

    const text = sheetTexts.join('\n\n');
    return {
      category,
      filename,
      text: text || '[No data found in spreadsheet]',
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

export function parseCSV(filePath: string, category: string): ParsedDocument {
  return parseXLSX(filePath, category);
}
