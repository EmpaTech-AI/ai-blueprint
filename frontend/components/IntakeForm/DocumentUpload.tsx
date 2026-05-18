'use client';

import { useRef, useState } from 'react';
import { UPLOAD_CATEGORIES, ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_MB } from '@/lib/formSchema';
import { formatFileSize, cn } from '@/lib/utils';
import {
  FileTextIcon,
  PaperclipIcon,
  UploadIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@/components/ui/icons';

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
      setErrors((e) => ({ ...e, [categoryId]: `File too large. Max ${MAX_FILE_SIZE_MB} MB.` }));
      return;
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_FILE_TYPES.split(',').includes(ext)) {
      setErrors((e) => ({ ...e, [categoryId]: `Unsupported format. Accepted: ${ACCEPTED_FILE_TYPES}` }));
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
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-1.5" style={{ color: '#fff' }}>
          Supporting Documents
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          The 4 required documents{' '}
          <span style={{ color: '#f87171', fontWeight: 600 }}>*</span>{' '}
          must be uploaded before submitting.
        </p>

        {/* Status banner */}
        {!allRequiredUploaded && (
          <div
            className="mt-3 p-3 rounded-xl text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5',
            }}
          >
            <p className="font-semibold mb-1">Still required:</p>
            <ul className="space-y-0.5" style={{ color: 'rgba(252,165,165,0.85)' }}>
              {missingRequiredDocs.map((c) => (
                <li key={c.id} className="flex items-center gap-1.5">
                  <span style={{ opacity: 0.6 }}>·</span> {c.label}
                </li>
              ))}
            </ul>
          </div>
        )}
        {allRequiredUploaded && (
          <div
            className="mt-3 p-3 rounded-xl flex items-center gap-2 text-sm font-semibold"
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
              color: '#86efac',
            }}
          >
            <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
            All required documents uploaded — you can now submit.
          </div>
        )}
      </div>

      {/* Upload grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

// ── UploadZone ──────────────────────────────────────────────────────────────
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

  // Determine zone style based on state
  let zoneBg     = 'rgba(255,255,255,0.05)';
  let zoneBorder = 'rgba(255,255,255,0.13)';
  let borderStyle: 'dashed' | 'solid' = 'dashed';

  if (dragging) {
    zoneBg     = 'rgba(99,102,241,0.12)';
    zoneBorder = 'rgba(99,102,241,0.55)';
    borderStyle = 'solid';
  } else if (file) {
    zoneBg      = 'rgba(34,197,94,0.08)';
    zoneBorder  = 'rgba(34,197,94,0.3)';
    borderStyle = 'solid';
  } else if (error) {
    zoneBg      = 'rgba(239,68,68,0.08)';
    zoneBorder  = 'rgba(239,68,68,0.35)';
    borderStyle = 'solid';
  }

  const IconComponent = category.required ? FileTextIcon : PaperclipIcon;

  return (
    <div
      className="relative rounded-xl p-4 transition-all duration-200"
      style={{
        background: zoneBg,
        border: `2px ${borderStyle} ${zoneBorder}`,
        cursor: file ? 'default' : 'pointer',
      }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => { if (!file) inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          // Reset so re-uploading the same file triggers onChange
          e.target.value = '';
        }}
      />

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={
            file
              ? { background: 'rgba(34,197,94,0.15)', color: '#86efac' }
              : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }
          }
        >
          {file
            ? <CheckCircleIcon className="w-5 h-5" />
            : <IconComponent className="w-5 h-5" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {category.label}
            {category.required && (
              <span style={{ color: '#f87171', marginLeft: '4px' }}>*</span>
            )}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {category.description}
          </p>

          {file ? (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-medium truncate max-w-[160px]"
                style={{ color: '#86efac' }}
              >
                {file.name}
              </span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                ({formatFileSize(file.size)})
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="ml-auto flex items-center gap-1 text-xs font-medium cursor-pointer transition-colors duration-150"
                style={{ color: '#fca5a5' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#f87171')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#fca5a5')}
              >
                <XCircleIcon className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <div
              className="mt-2 flex items-center gap-1.5 text-xs font-medium"
              style={{ color: '#818CF8' }}
            >
              <UploadIcon className="w-3.5 h-3.5" />
              Click to upload or drag &amp; drop
            </div>
          )}

          {error && (
            <p className="text-xs mt-1.5" style={{ color: '#fca5a5' }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
