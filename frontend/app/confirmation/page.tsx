'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { CheckIcon, ArrowLeftIcon, ArrowRightIcon } from '@/components/ui/icons';

function ConfirmationContent() {
  const params = useSearchParams();
  const jobId  = params.get('jobId');

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: 'transparent' }}
    >
      {/* Background orb */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        aria-hidden="true"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)' }}
      />

      <div className="relative w-full max-w-lg">
        {/* Gradient border wrapper */}
        <div
          className="p-px rounded-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(6,182,212,0.35) 100%)' }}
        >
          <div
            className="rounded-2xl p-8 md:p-10"
            style={{
              background: 'rgba(13,13,25,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {/* Check icon */}
            <div className="flex justify-center mb-7">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(99,102,241,0.15)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  boxShadow: '0 0 32px rgba(99,102,241,0.3)',
                  color: '#a5b4fc',
                }}
              >
                <CheckIcon className="w-10 h-10" strokeWidth={2.5 as never} />
              </div>
            </div>

            <h1
              className="text-2xl md:text-3xl font-bold text-center mb-3"
              style={{ color: '#fff' }}
            >
              Your intake has been submitted
            </h1>

            <p
              className="text-center leading-relaxed mb-7"
              style={{ color: 'rgba(255,255,255,0.58)' }}
            >
              Thank you! We&apos;ve received your AI Value Blueprint intake. Our team and AI
              pipeline will now analyse your data across 5 strategic dimensions.
            </p>

            {/* What happens next */}
            <div
              className="rounded-xl p-5 mb-7"
              style={{
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.22)',
              }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: '#a5b4fc' }}>
                What happens next
              </p>
              <ol className="space-y-2.5">
                {[
                  'Our pipeline begins processing your documents and form responses immediately.',
                  'A senior consultant reviews and refines the analysis before delivery.',
                  <>You&apos;ll receive your personalised Blueprint within <strong style={{ color: '#fff' }}>10–14 business days</strong>.</>,
                  "We'll reach out if we need any clarifications.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                      style={{
                        background: 'rgba(99,102,241,0.22)',
                        color: '#818CF8',
                        border: '1px solid rgba(99,102,241,0.35)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Dashboard access prompt */}
            <div
              className="rounded-xl p-5 mb-7"
              style={{
                background: 'rgba(34,197,94,0.07)',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: '#86efac' }}>
                Track your Blueprint status
              </p>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: 'rgba(134,239,172,0.75)' }}>
                Log in at any time using the email and password you just set to check your audit progress and download your Blueprint once it&apos;s ready.
              </p>
              <Link
                href="/login"
                className="btn-primary inline-flex"
                style={{ padding: '9px 20px', fontSize: '0.85rem' }}
              >
                Go to My Dashboard
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Reference ID */}
            {jobId && (
              <p
                className="text-center text-xs mb-7"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Reference ID:{' '}
                <code
                  className="font-mono px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  {jobId}
                </code>
              </p>
            )}

            <div className="flex justify-center">
              <Link href="/" className="btn-secondary">
                <ArrowLeftIcon className="w-4 h-4" />
                Back to homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(99,102,241,0.5)', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
