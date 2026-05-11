'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ConfirmationContent() {
  const params = useSearchParams();
  const jobId = params.get('jobId');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Your intake has been submitted
          </h1>

          <p className="text-gray-600 leading-relaxed mb-6">
            Thank you! We've received your AI Value Blueprint intake. Our team and AI pipeline
            will now analyse your data across 5 strategic dimensions.
          </p>

          <div className="bg-brand-blue-light rounded-xl p-5 text-left mb-6">
            <p className="text-sm font-semibold text-brand-blue mb-2">What happens next</p>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-brand-blue font-bold mt-0.5">1.</span>
                Our pipeline begins processing your documents and form responses immediately.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-blue font-bold mt-0.5">2.</span>
                A senior consultant reviews and refines the analysis before delivery.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-blue font-bold mt-0.5">3.</span>
                You'll receive your personalised Blueprint within <strong>10–14 business days</strong>.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-blue font-bold mt-0.5">4.</span>
                We'll reach out if we need any clarifications.
              </li>
            </ul>
          </div>

          {jobId && (
            <p className="text-xs text-gray-400 mb-6">
              Reference ID: <code className="font-mono">{jobId}</code>
            </p>
          )}

          <Link href="/" className="btn-secondary inline-block">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
