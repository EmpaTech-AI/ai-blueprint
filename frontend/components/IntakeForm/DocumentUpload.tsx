'use client';

import { useRef, useState } from 'react';
import { UPLOAD_CATEGORIES, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_MB } from '@/lib/formSchema';
import { formatFileSize, cn } from '@/lib/utils';

export interface UploadedFiles {
  [categoryId: string]: File;
}

export function allRequiredDocumentsUploaded(uploadedFiles: UploadedFiles): boolean {
  return UPLOAD_CATEGORIES.filter((c) => c.required).every((c) => !!uploadedFiles[c.id]);
}

export function missingRequiredDocumentLabels(uploadedFiles: UploadedFiles): string[] {
  return UPLOAD_CATEGORIES.filter((c) => c.required && !uploadedFiles[c.id]).map((c) => c.label);
}

interface DocumentUploadProps {
  uploadedFiles: UploadedFiles;
  onFilesChange: (files: UploadedFiles) => void;
}

export function DocumentUpload({ uploadedFiles, onFilesChange }: DocumentUploadProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFile = (categoryId: string, file: File | undefined) => {
    if (!file) return;
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrors((e) => ({ ...e, [categoryId]: `File too large. Max size is ${MAX_FILE_SIZE_MB}MB.` }));
      return;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FILE_TYPES.split(',').includes(ext)) {
      setErrors((e) => ({ ...e, [categoryId]: `Unsupported file type. Accepted: ${ACCEPTED_FILE_TYPES}` }));
      return;
    }
    setErrors((e) => { const n = { ...e }; delete n[categoryId]; return n; });
    onFilesChange({ ...uploadedFiles, [categoryId]: file });
  };

  const removeFile = (categoryId: string) => {
    const next = { ...uploadedFiles };
    delete next[categoryId];
    onFilesChange(next);
  };

  const missingRequiredDocs = UPLOAD_CATEGORIES.filter((c) => c.required && !uploadedFiles[c.id]);
  const allRequiredUploaded = missingRequiredDocs.length === 0;

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Supporting Documents</h3>
        <p className="text-sm text-gray-600">
          The 4 required documents (marked <span className="text-red-500 font-semibold">*</span>) must be uploaded before you can submit.
        </p>
        {!allRequiredUploaded && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <p className="font-semibold mb-1">Still required:</p>
            <ul className="space-y-0.5">
              {missingRequiredDocs.map((c) => (
                <li key={c.id}>• {c.label}</li>
              ))}
            </ul>
          </div>
        )}
        {allRequiredUploaded && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-semibold">
            ✓ All required documents uploaded — you can now submit.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {UPLOAD_CATEGORIES.map((cat) => (
          <UploadZone
            key={cat.id}
            category={cat}
            file={uploadedFiles[cat.id]}
            error={errors[cat.id]}
            onFile={(f) => handleFile(cat.id, f)}
            onRemove={() => removeFile(cat.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface UploadZoneProps {
  category: typeof UPLOAD_CATEGORIES[number];
  file?: File;
  error?: string;
  onFile: (file: File) => void;
  onRemove: () => void;
}

function UploadZone({ category, file, error, onFile, onRemove }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      className={cn(
        'relative border-2 rounded-xl p-4 transition-all duration-200',
        dragging ? 'border-brand-blue bg-brand-blue-light' : 'border-dashed border-gray-300 bg-white hover:border-brand-blue',
        file && 'border-solid border-green-400 bg-green-50',
        error && 'border-red-300 bg-red-50'
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      <div className="flex items-start gap-3">
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg',
          file ? 'bg-green-100' : 'bg-gray-100'
        )}>
          {file ? '✓' : category.required ? '📄' : '📎'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">
            {category.label}
            {category.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>

          {file ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-green-700 font-medium truncate max-w-[160px]">{file.name}</span>
              <span className="text-xs text-gray-400">({formatFileSize(file.size)})</span>
              <button
                type="button"
                onClick={onRemove}
                className="text-xs text-red-500 hover:text-red-700 underline ml-auto"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 text-xs text-brand-blue font-medium hover:underline"
            >
              Click to upload or drag & drop
            </button>
          )}

          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
