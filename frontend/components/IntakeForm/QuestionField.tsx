'use client';

import { useState } from 'react';
import { UseFormRegister, FieldErrors, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { Question } from '@/lib/formSchema';
import { cn } from '@/lib/utils';

interface QuestionFieldProps {
  question: Question;
  register: UseFormRegister<Record<string, string | string[]>>;
  errors: FieldErrors<Record<string, string | string[]>>;
  getValues: UseFormGetValues<Record<string, string | string[]>>;
  setValue: UseFormSetValue<Record<string, string | string[]>>;
}

export function QuestionField({ question, register, errors, getValues, setValue }: QuestionFieldProps) {
  const error = errors[question.id];
  const baseInputClass = cn(
    'input-field',
    error && 'border-red-400 ring-red-200'
  );

  const label = (
    <label htmlFor={question.id} className="block text-sm font-semibold text-gray-800 mb-1.5">
      {question.label}
      {question.required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  const errorMsg = error && (
    <p className="text-red-500 text-xs mt-1">{String(error.message || 'This field is required')}</p>
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
          className={cn(baseInputClass, 'resize-y min-h-[100px]')}
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
          className={baseInputClass}
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
          className={baseInputClass}
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
        className={baseInputClass}
        {...register(question.id, { required: question.required ? 'This field is required' : false })}
      />
      {errorMsg}
    </div>
  );
}

// Separate component so it owns its own state — re-renders correctly on selection
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
      <label className="block text-sm font-semibold text-gray-800 mb-1.5">
        {question.label}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-3 flex-wrap">
        {question.options?.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                'px-5 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all duration-150 select-none',
                isSelected
                  ? 'bg-brand-blue text-white border-brand-blue shadow-sm'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-brand-blue hover:text-brand-blue'
              )}
            >
              {isSelected && <span className="mr-1.5">✓</span>}
              {opt}
            </button>
          );
        })}
      </div>
      {selected.length === 0 && error && (
        <p className="text-red-500 text-xs mt-1">Please select at least one option</p>
      )}
      {selected.length > 0 && (
        <p className="text-xs text-gray-400 mt-1.5">{selected.length} selected</p>
      )}
    </div>
  );
}
