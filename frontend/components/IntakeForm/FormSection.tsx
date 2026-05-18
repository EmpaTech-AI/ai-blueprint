'use client';

import { UseFormRegister, FieldErrors, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { FormSection as FormSectionType } from '@/lib/formSchema';
import { QuestionField } from './QuestionField';

interface FormSectionProps {
  section: FormSectionType;
  register: UseFormRegister<Record<string, string | string[]>>;
  errors: FieldErrors<Record<string, string | string[]>>;
  getValues: UseFormGetValues<Record<string, string | string[]>>;
  setValue: UseFormSetValue<Record<string, string | string[]>>;
}

export function FormSection({ section, register, errors, getValues, setValue }: FormSectionProps) {
  return (
    <div>
      <div className="mb-7">
        <h2 className="text-xl font-bold mb-1.5" style={{ color: '#fff' }}>
          {section.title}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {section.description}
        </p>
      </div>

      {section.questions.map((q) => (
        <QuestionField
          key={q.id}
          question={q}
          register={register}
          errors={errors}
          getValues={getValues}
          setValue={setValue}
        />
      ))}
    </div>
  );
}
