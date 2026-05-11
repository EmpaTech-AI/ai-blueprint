import mammoth from 'mammoth';
import path from 'path';
import { ParsedDocument } from '../types/pipeline';

export async function parseDOCX(filePath: string, category: string): Promise<ParsedDocument> {
  const filename = path.basename(filePath);
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value?.trim() || '';

    if (text.length === 0) {
      return { category, filename, text: '', status: 'empty', confidence: 'low' };
    }

    return {
      category,
      filename,
      text,
      status: 'ok',
      confidence: 'high',
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
