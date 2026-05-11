import path from 'path';
import { ParsedDocument, DocumentCorpus } from '../types/pipeline';
import { parsePDF } from './pdfParser';
import { parseDOCX } from './docxParser';
import { parseXLSX, parseCSV } from './xlsxParser';
import { parsePPTX } from './pptxParser';

const REQUIRED_CATEGORIES = ['financial_summary', 'org_chart', 'sales_pipeline', 'process_docs'];

export async function parseDocument(filePath: string, category: string): Promise<ParsedDocument> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return parsePDF(filePath, category);
    case '.docx':
      return parseDOCX(filePath, category);
    case '.xlsx':
      return parseXLSX(filePath, category);
    case '.csv':
      return parseCSV(filePath, category);
    case '.pptx':
      return parsePPTX(filePath, category);
    default:
      return {
        category,
        filename: path.basename(filePath),
        text: '',
        status: 'unsupported',
        confidence: 'low',
        error: `Unsupported file type: ${ext}`,
      };
  }
}

export async function buildDocumentCorpus(
  uploadedFiles: { [categoryId: string]: { storagePath: string; filename: string } }
): Promise<DocumentCorpus> {
  const documents: ParsedDocument[] = [];
  const failedDocuments: ParsedDocument[] = [];

  for (const [category, fileInfo] of Object.entries(uploadedFiles)) {
    const doc = await parseDocument(fileInfo.storagePath, category);
    if (doc.status === 'ok' || doc.status === 'likely_scanned') {
      documents.push(doc);
    } else {
      failedDocuments.push(doc);
    }
  }

  const uploadedCategories = new Set(Object.keys(uploadedFiles));
  const missingRequiredCategories = REQUIRED_CATEGORIES.filter((cat) => !uploadedCategories.has(cat));

  return {
    parsedAt: new Date().toISOString(),
    documents,
    failedDocuments,
    missingRequiredCategories,
  };
}
