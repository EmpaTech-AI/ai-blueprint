import { DocumentCorpus, UploadedFileInfo } from '../types/pipeline';
import { buildDocumentCorpus } from '../parsers';
import { log } from '../utils/logger';
import path from 'path';
import fs from 'fs';

export async function runStepA(uploadedFiles: { [categoryId: string]: UploadedFileInfo }): Promise<DocumentCorpus> {
  log('info', 'Step A: Starting document parsing', { fileCount: Object.keys(uploadedFiles).length });

  // Restore files that were wiped from the container filesystem (e.g. after a Railway restart/redeploy)
  for (const fileInfo of Object.values(uploadedFiles)) {
    if (!fs.existsSync(fileInfo.storagePath) && fileInfo.fileData) {
      fs.mkdirSync(path.dirname(fileInfo.storagePath), { recursive: true });
      fs.writeFileSync(fileInfo.storagePath, Buffer.from(fileInfo.fileData, 'base64'));
      log('info', `Step A: Restored file from database: ${fileInfo.filename}`);
    }
  }

  const corpus = await buildDocumentCorpus(uploadedFiles);
  log('info', 'Step A: Document parsing complete', {
    parsed: corpus.documents.length,
    failed: corpus.failedDocuments.length,
    missingRequired: corpus.missingRequiredCategories,
  });
  return corpus;
}
