'use client';

import { useState } from 'react';
import { UseFormRegister, FieldErrors, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { Question } from '@/lib/formSchema';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@/components/ui/icons';

interface QuestionFieldProps {
  question: Question;
  register: UseFormRegister<Record<string, string | string[]>>;
  errors: FieldErrors<Record<string, string | string[]>>;
  getValues: UseFormGetValues<Record<string, string | string[]>>;
  setValue: UseFormSetValue<Record<string, string | string[]>>;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.8)',
  marginBottom: '8px',
};

const errorStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#fca5a5',
  marginTop: '5px',
};

export function QuestionField({ question, register, errors, getValues, setValue }: QuestionFieldProps) {
  const error = errors[question.id];
  const inputClass = cn('input-glass', error && 'error');

  const label = (
    <label htmlFor={question.id} style={labelStyle}>
      {question.label}
      {question.required && (
        <span style={{ color: '#f87171', marginLeft: '4px' }}>*</span>
      )}
    </label>
  );

  const errorMsg = error && (
    <p style={errorStyle}>{String(error.message || 'This field is required')}</p>
  );

  if (question.type === 'multiselect') {
    return (
      <MultiSelectField
        question={question}
        initialValues={(getValues(question.id) as string[]) || []}
        onChange={(next) => setValue(question.id, next, { shouldDirty: true, shouldValidate: true })}
        error={!!error}
      />
    );
  }

  if (question.type === 'textarea') {
    return (
      <div className="mb-5">
        {label}
        <textarea
          id={question.id}
          placeholder={question.placeholder}
          rows={4}
          className={cn(inputClass, 'resize-y min-h-[100px]')}
          style={{ lineHeight: 1.6 }}
          {...register(question.id, { required: question.required ? 'This field is required' : false })}
        />
        {errorMsg}
      </div>
    );
  }

  if (question.type === 'select') {
    return (
      <div className="mb-5">
        {label}
        <select
          id={question.id}
          className={inputClass}
          {...register(question.id, { required: question.required ? 'Please select an option' : false })}
        >
          <option value="">— Select an option —</option>
          {question.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {errorMsg}
      </div>
    );
  }

  if (question.type === 'number') {
    return (
      <div className="mb-5">
        {label}
        <input
          id={question.id}
          type="number"
          min={1}
          placeholder={question.placeholder}
          className={inputClass}
          {...register(question.id, {
            required: question.required ? 'This field is required' : false,
            min: { value: 1, message: 'Must be at least 1' },
          })}
        />
        {errorMsg}
      </div>
    );
  }

  return (
    <div className="mb-5">
      {label}
      <input
        id={question.id}
        type="text"
        placeholder={question.placeholder}
        className={inputClass}
        {...register(question.id, { required: question.required ? 'This field is required' : false })}
      />
      {errorMsg}
    </div>
  );
}

// ── MultiSelectField ────────────────────────────────────────────────────────
function MultiSelectField({
  question,
  initialValues,
  onChange,
  error,
}: {
  question: Question;
  initialValues: string[];
  onChange: (values: string[]) => void;
  error: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(initialValues);

  const toggle = (opt: string) => {
    const next = selected.includes(opt)
      ? selected.filter((v) => v !== opt)
      : [...selected, opt];
    setSelected(next);
    onChange(next);
  };

  return (
    <div className="mb-5">
      <label style={labelStyle}>
        {question.label}
        {question.required && (
          <span style={{ color: '#f87171', marginLeft: '4px' }}>*</span>
        )}
      </label>

      <div className="flex gap-2.5 flex-wrap">
        {question.options?.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 select-none cursor-pointer focus-visible:outline-none"
              style={
                isSelected
                  ? {
                      background: 'rgba(99,102,241,0.22)',
                      border: '1px solid rgba(99,102,241,0.55)',
                      color: '#a5b4fc',
                      boxShadow: '0 0 12px rgba(99,102,241,0.2)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.65)',
                    }
              }
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#a5b4fc';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)';
                }
              }}
            >
              {isSelected && (
                <CheckIcon
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: '#818CF8' } as React.CSSProperties}
                />
              )}
              {opt}
            </button>
          );
        })}
      </div>

      {selected.length === 0 && error && (
        <p style={errorStyle}>Please select at least one option</p>
      )}
      {selected.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
          {selected.length} selected
        </p>
      )}
    </div>
  );
}
