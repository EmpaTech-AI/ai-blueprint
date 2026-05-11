import * as XLSX from 'xlsx';
import path from 'path';
import { ParsedDocument } from '../types/pipeline';

export function parseXLSX(filePath: string, category: string): ParsedDocument {
  const filename = path.basename(filePath);
  try {
    const workbook = XLSX.readFile(filePath);
    const summaries: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rows.length === 0) continue;

      const headers = (rows[0] as unknown[]).map(String).filter(Boolean);
      const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell !== ''));

      const numericCols: Record<string, number[]> = {};
      for (const header of headers) {
        numericCols[header] = [];
      }

      for (const row of dataRows) {
        headers.forEach((header, i) => {
          const val = row[i];
          if (typeof val === 'number') {
            numericCols[header].push(val);
          }
        });
      }

      const stats: string[] = [];
      for (const [col, vals] of Object.entries(numericCols)) {
        if (vals.length > 0) {
          const min = Math.min(...vals);
          const max = Math.max(...vals);
          const sum = vals.reduce((a, b) => a + b, 0);
          stats.push(`${col}: range ${min.toLocaleString()}–${max.toLocaleString()}, total ${sum.toLocaleString()}`);
        }
      }

      let sheetSummary = `Sheet '${sheetName}': ${dataRows.length} rows, columns: [${headers.join(', ')}].`;
      if (stats.length > 0) {
        sheetSummary += ` Numeric columns — ${stats.join('; ')}.`;
      }
      summaries.push(sheetSummary);
    }

    const text = summaries.join('\n\n');
    return {
      category,
      filename,
      text: text || '[No data found in spreadsheet]',
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

export function parseCSV(filePath: string, category: string): ParsedDocument {
  return parseXLSX(filePath, category);
}
