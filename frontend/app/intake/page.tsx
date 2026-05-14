'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { FORM_SECTIONS } from '@/lib/formSchema';
import { ProgressBar } from '@/components/IntakeForm/ProgressBar';
import { FormSection } from '@/components/IntakeForm/FormSection';
import { DocumentUpload, UploadedFiles } from '@/components/IntakeForm/DocumentUpload';
import Link from 'next/link';

const STORAGE_KEY = 'blueprint-intake-draft';
const TOTAL_STEPS = FORM_SECTIONS.length + 1;

type FormValues = Record<string, string | string[]>;

export default function IntakePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, getValues, setValue, formState: { errors }, trigger, reset } = useForm<FormValues>({
    mode: 'onBlur',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as { step: number; values: FormValues };
        reset(draft.values);
        setCurrentStep(draft.step);
      }
    } catch {
      // ignore corrupt draft
    }
  }, [reset]);

  const saveDraft = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: currentStep, values: getValues() }));
    } catch {
      // ignore
    }
  };

  const isDocumentStep = currentStep === TOTAL_STEPS;
  const currentSection = !isDocumentStep ? FORM_SECTIONS[currentStep - 1] : null;
  const stepTitle = isDocumentStep ? 'Supporting Documents' : (currentSection?.title || '');

  const handleNext = async () => {
    if (!isDocumentStep && currentSection) {
      const fieldIds = currentSection.questions.map((q) => q.id);
      const valid = await trigger(fieldIds as (keyof FormValues)[]);
      if (!valid) return;
    }
    setSubmitError(null);
    saveDraft();
    setCurrentStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setSubmitError(null);
    saveDraft();
    setCurrentStep((s) => s - 1);
    window.scrollTo(0, 0);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('clientName', String(data.clientName || 'Unknown Client'));
      formData.append('clientEmail', String(data.clientEmail || ''));
      formData.append('formAnswers', JSON.stringify(data));

      for (const [categoryId, file] of Object.entries(uploadedFiles)) {
        formData.append(categoryId, file);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      let response: Response;

      try {
        response = await fetch(`${apiUrl}/api/intake`, {
          method: 'POST',
          body: formData,
        });
      } catch {
        throw new Error(
          'Could not reach the server. The backend may not be running yet. ' +
          'Please contact us directly at viktor.serafimov@aiassist.bg'
        );
      }

      if (!response.ok) {
        // Backend may return HTML error pages — handle gracefully
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const err = await response.json() as { error?: string };
          throw new Error(err.error || `Server error (${response.status})`);
        } else {
          throw new Error(`Server error (${response.status}). Please try again or contact support.`);
        }
      }

      const result = await response.json() as { jobId: string };
      localStorage.removeItem(STORAGE_KEY);
      router.push(`/confirmation?jobId=${result.jobId}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">AI</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">AI Value Blueprint</span>
          </Link>
          <span className="text-xs text-gray-500">Your progress is saved automatically</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {currentStep === 1 && (
          <div className="section-card mb-0">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Start Your AI Value Blueprint</h1>
            <p className="text-gray-600 text-sm mb-6">
              This intake form takes 20–30 minutes. Your answers are saved as you go — you can return anytime.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-2">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Maria Petrova"
                  {...register('clientName', { required: 'Please enter your name' })}
                />
                {errors.clientName && <p className="text-red-500 text-xs mt-1">{String(errors.clientName.message)}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Your email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="e.g., maria@company.com"
                  {...register('clientEmail', {
                    required: 'Please enter your email',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Please enter a valid email address' },
                  })}
                />
                {errors.clientEmail && <p className="text-red-500 text-xs mt-1">{String(errors.clientEmail.message)}</p>}
              </div>
            </div>
          </div>
        )}

        <div className="section-card">
          <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} stepTitle={stepTitle} />

          <form onSubmit={handleSubmit(onSubmit)}>
            {!isDocumentStep && currentSection ? (
              <FormSection
                section={currentSection}
                register={register}
                errors={errors}
                getValues={getValues}
                setValue={setValue}
              />
            ) : (
              <DocumentUpload uploadedFiles={uploadedFiles} onFilesChange={setUploadedFiles} />
            )}

            {submitError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <p className="font-semibold mb-1">Submission failed</p>
                <p>{submitError}</p>
              </div>
            )}

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
              {currentStep > 1 ? (
                <button type="button" onClick={handleBack} className="btn-secondary">
                  ← Back
                </button>
              ) : (
                <div />
              )}

              {!isDocumentStep ? (
                <button type="button" onClick={handleNext} className="btn-primary">
                  Save & Continue →
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting} className="btn-primary min-w-[180px]">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Submitting...
                    </span>
                  ) : 'Submit My Intake'}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
