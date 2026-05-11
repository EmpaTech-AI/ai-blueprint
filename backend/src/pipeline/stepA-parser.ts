import { DocumentCorpus } from '../types/pipeline';
import { buildDocumentCorpus } from '../parsers';
import { log } from '../utils/logger';

export async function runStepA(uploadedFiles: { [categoryId: string]: { storagePath: string; filename: string } }): Promise<DocumentCorpus> {
  log('info', 'Step A: Starting document parsing', { fileCount: Object.keys(uploadedFiles).length });
  const corpus = await buildDocumentCorpus(uploadedFiles);
  log('info', 'Step A: Document parsing complete', {
    parsed: corpus.documents.length,
    failed: corpus.failedDocuments.length,
    missingRequired: corpus.missingRequiredCategories,
  });
  return corpus;
}
