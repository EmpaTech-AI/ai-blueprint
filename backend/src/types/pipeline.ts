export interface ParsedDocument {
  category: string;
  filename: string;
  text: string;
  status: 'ok' | 'unsupported' | 'likely_scanned' | 'parse_error' | 'empty';
  confidence: 'high' | 'medium' | 'low';
  pageCount?: number;
  wordCount?: number;
  error?: string;
}

export interface DocumentCorpus {
  parsedAt: string;
  documents: ParsedDocument[];
  failedDocuments: ParsedDocument[];
  missingRequiredCategories: string[];
}

export interface FormAnswers {
  [questionId: string]: string | string[];
}

export interface UploadedFileInfo {
  filename: string;
  size: number;
  mimeType: string;
  storagePath: string;
}

export interface IntakeSubmission {
  clientName: string;
  clientEmail: string;
  formAnswers: FormAnswers;
  uploadedFiles: {
    [categoryId: string]: UploadedFileInfo;
  };
}

export interface ConfidenceBreakdown {
  documentBacked: number;
  formStated: number;
  inferred: number;
  assumption: number;
  total: number;
}

export interface ConfidenceResult {
  score: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  needsReview: boolean;
  breakdown: ConfidenceBreakdown;
  inferredSnippets?: string[];
  assumptionSnippets?: string[];
  noTagsReason?: string;
}

export interface PipelineJob {
  jobId: string;
  clientName: string;
  clientEmail: string;
  status: 'pending' | 'running' | 'review_ready' | 'approved' | 'failed';
  currentStep: 'A' | 'B' | 'C' | 'D' | 'D2' | 'E' | 'complete';
  startedAt: string;
  completedAt?: string;
  formAnswers: FormAnswers;
  uploadedFiles: { [categoryId: string]: UploadedFileInfo };
  stepA_corpus?: string;
  stepB_dossier?: string;
  stepC_maturity?: string;
  stepD_opportunities?: string;
  stepD2_roadmap?: string;
  stepE_assembly?: string;
  confidenceScores?: Record<string, ConfidenceResult>;
  reviewerFlags?: string[];
  outputDocxPath?: string;
  outputDocxData?: string;
  outputPdfData?: string;
  outputTxtData?: string;
  errorLog?: string[];
}
