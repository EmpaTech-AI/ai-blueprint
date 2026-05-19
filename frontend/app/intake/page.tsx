'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { FORM_SECTIONS } from '@/lib/formSchema';
import { ProgressBar } from '@/components/IntakeForm/ProgressBar';
import { FormSection } from '@/components/IntakeForm/FormSection';
import {
  DocumentUpload,
  UploadedFiles,
  allRequiredDocumentsUploaded,
  missingRequiredDocumentLabels,
} from '@/components/IntakeForm/DocumentUpload';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  SpinnerIcon,
} from '@/components/ui/icons';
import Link from 'next/link';
import Image from 'next/image';

const STORAGE_KEY  = 'blueprint-intake-draft';
const TOTAL_STEPS  = FORM_SECTIONS.length + 1;
type FormValues    = Record<string, string | string[]>;

export default function IntakePage() {
  const router = useRouter();
  const [currentStep,      setCurrentStep]      = useState(1);
  const [uploadedFiles,    setUploadedFiles]     = useState<UploadedFiles>({});
  const [isSubmitting,     setIsSubmitting]      = useState(false);
  const [submitError,      setSubmitError]       = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm]  = useState(false);

  const { register, handleSubmit, getValues, setValue, formState: { errors }, trigger, reset } =
    useForm<FormValues>({ mode: 'onBlur' });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as { step: number; values: FormValues };
        reset(draft.values);
        const hasContactInfo = draft.values.clientName && draft.values.clientEmail;
        setCurrentStep(hasContactInfo ? draft.step : 1);
      }
    } catch { /* ignore corrupt draft */ }
  }, [reset]);

  const saveDraft = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: currentStep, values: getValues() }));
    } catch { /* ignore */ }
  };

  const isDocumentStep  = currentStep === TOTAL_STEPS;
  const currentSection  = !isDocumentStep ? FORM_SECTIONS[currentStep - 1] : null;
  const stepTitle       = isDocumentStep ? 'Supporting Documents' : (currentSection?.title || '');

  const handleNext = async () => {
    if (!isDocumentStep && currentSection) {
      const fieldIds = currentSection.questions.map((q) => q.id);
      const valid    = await trigger(fieldIds as (keyof FormValues)[]);
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

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    reset({});
    setUploadedFiles({});
    setCurrentStep(1);
    setSubmitError(null);
    setShowResetConfirm(false);
    window.scrollTo(0, 0);
  };

  const onSubmit = async (data: FormValues) => {
    if (!data.clientName || !data.clientEmail) {
      setSubmitError('Your name and email are required. Please go back to step 1 and fill them in.');
      return;
    }
    const missingDocs = missingRequiredDocumentLabels(uploadedFiles);
    if (missingDocs.length > 0) {
      setSubmitError(`Please upload all required documents: ${missingDocs.join(', ')}.`);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('clientName',   String(data.clientName));
      formData.append('clientEmail',  String(data.clientEmail));
      formData.append('formAnswers',  JSON.stringify(data));
      for (const [categoryId, file] of Object.entries(uploadedFiles)) {
        formData.append(categoryId, file);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      let response: Response;
      try {
        response = await fetch(`${apiUrl}/api/intake`, { method: 'POST', body: formData });
      } catch {
        throw new Error(
          'Could not reach the server. Please contact us directly at viktor.serafimov@aiassist.bg'
        );
      }

      if (!response.ok) {
        const ct = response.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
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
    <div className="min-h-screen">

      {/* ── Floating Navbar ─────────────────────────────────────────────── */}
      <div className="sticky top-4 z-50 px-4">
        <header
          className="glass-card max-w-3xl mx-auto px-5 py-3 flex items-center justify-between"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)' }}
        >
          <Link href="/" className="flex items-center gap-2 group" aria-label="Back to home">
            <Image
              src="/logo.png"
              alt="AI Assist BG"
              width={36}
              height={36}
              className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs hidden sm:block" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Progress saved automatically
            </span>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="btn-ghost text-xs"
              style={{ padding: '6px 14px' }}
            >
              Start Over
            </button>
          </div>
        </header>
      </div>

      {/* ── Reset confirm modal ──────────────────────────────────────────── */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div
            className="w-full max-w-sm rounded-2xl p-7"
            style={{
              background: 'rgba(18,18,32,0.96)',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
            }}
          >
            <h2 id="reset-dialog-title" className="text-lg font-bold text-white mb-2">
              Start over?
            </h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
              This will clear all your answers and uploaded files. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="btn-secondary flex-1"
                style={{ padding: '10px 20px', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 inline-flex items-center justify-center font-semibold text-sm rounded-full cursor-pointer transition-all duration-200 hover:-translate-y-px"
                style={{
                  padding: '10px 20px',
                  background: 'rgba(239,68,68,0.18)',
                  border: '1px solid rgba(239,68,68,0.38)',
                  color: '#fca5a5',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.28)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.18)')}
              >
                Yes, start over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* Contact info card (step 1 only) */}
        {currentStep === 1 && (
          <div className="glass-card p-6 mb-4">
            <h1 className="text-2xl font-bold text-white mb-1.5">
              Start Your AI Value Blueprint
            </h1>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
              This intake form takes 20–30 minutes. Your answers are saved as you go — you can return anytime.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Your name <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  className={`input-glass${errors.clientName ? ' error' : ''}`}
                  placeholder="e.g., Maria Petrova"
                  {...register('clientName', { required: 'Please enter your name' })}
                />
                {errors.clientName && (
                  <p className="text-xs mt-1.5" style={{ color: '#fca5a5' }}>
                    {String(errors.clientName.message)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Your email <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="email"
                  className={`input-glass${errors.clientEmail ? ' error' : ''}`}
                  placeholder="e.g., maria@company.com"
                  {...register('clientEmail', {
                    required: 'Please enter your email',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Please enter a valid email' },
                  })}
                />
                {errors.clientEmail && (
                  <p className="text-xs mt-1.5" style={{ color: '#fca5a5' }}>
                    {String(errors.clientEmail.message)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress + form card */}
        <div className="glass-card p-6">
          <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} stepTitle={stepTitle} />

          <div>
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

            {/* Submit error */}
            {submitError && (
              <div
                className="mt-4 p-4 rounded-xl text-sm"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.28)',
                  color: '#fca5a5',
                }}
              >
                <p className="font-semibold mb-1">Submission failed</p>
                <p style={{ color: 'rgba(252,165,165,0.85)' }}>{submitError}</p>
              </div>
            )}

            {/* Navigation */}
            <div
              className="flex justify-between items-center mt-8 pt-6"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn-secondary"
                  style={{ padding: '10px 22px', fontSize: '0.9rem' }}
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {!isDocumentStep ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary"
                  style={{ padding: '10px 26px', fontSize: '0.9rem' }}
                >
                  Save &amp; Continue
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting || !allRequiredDocumentsUploaded(uploadedFiles)}
                  className="btn-primary min-w-[180px]"
                  style={{ padding: '10px 26px', fontSize: '0.9rem' }}
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerIcon className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Submit My Intake
                      <ArrowRightIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
