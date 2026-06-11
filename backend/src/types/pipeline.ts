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
  fileData?: string; // base64 — persisted in DB so files survive container restarts
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

export interface JustificationEntry {
  index: number;
  tag: 'Inferred' | 'Assumption';
  label: string;
  claim: string;
  whyTagged: string;
  missingData: string;
  consultantAction: string;
}

export interface ConfidenceResult {
  score: number;                      // blended (DB+FS)/total — retained for v14+ continuity
  highConfidenceCount: number;
  lowConfidenceCount: number;
  needsReview: boolean;
  breakdown: ConfidenceBreakdown;
  // Scenario C — observability-tiered fields (split within the high-confidence pool)
  documentVerifiedPercent?: number;   // DB ÷ (DB+FS) as % — share of high-confidence that is documentary
  formStatedSharePercent?: number;    // FS ÷ (DB+FS) as % — share of high-confidence that is form-stated
  compositionDescriptor?: string;     // human-readable observability label derived from documentVerifiedPercent
  confidenceOverview?: string;
  justificationEntries?: JustificationEntry[];
  inferredSnippets?: string[];   // legacy fallback — present only when no structured block was found
  assumptionSnippets?: string[]; // legacy fallback — present only when no structured block was found
  noTagsReason?: string;
  scoreContext?: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'client';
  name: string;
  createdAt: string;
}

export interface ClientUpload {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  storagePath: string;
  fileData?: string;
  uploadedAt: string;
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
  truncationMeta?: TruncationMeta;
  userId?: string;
  approvedByName?: string;
  reuploadAllowed?: boolean;
  clientUploads?: ClientUpload[];
  clientVisibleStatus?: 'received' | 'in_progress' | 'under_review' | 'ready';
}

export interface TruncationMeta {
  field: 'opportunities';
  originalLength: number;
  truncatedLength: number;
  truncatedText: string;
}
