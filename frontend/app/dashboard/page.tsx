'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LogOutIcon, SpinnerIcon, UploadCloudIcon, DownloadIcon,
  CheckCircleIcon, AlertTriangleIcon, RefreshIcon, PaperclipIcon,
} from '@/components/ui/icons';
import { getClientToken, clearClientToken, validateToken } from '@/lib/auth';

interface ClientJob {
  jobId: string;
  status: string;
  statusLabel: string;
  startedAt: string;
  completedAt?: string;
  reuploadAllowed: boolean;
  clientUploadCount: number;
  canDownload: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  received:     { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.22)',  text: '#a5b4fc', dot: '#818CF8' },
  in_progress:  { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.22)',  text: '#93c5fd', dot: '#60a5fa' },
  under_review: { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)',  text: '#fcd34d', dot: '#f59e0b' },
  ready:        { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.22)',   text: '#86efac', dot: '#22c55e' },
};

const STEP_ORDER = ['received', 'in_progress', 'under_review', 'ready'];
const STEP_LABELS: Record<string, string> = {
  received: 'Received', in_progress: 'In Progress', under_review: 'Under Review', ready: 'Complete',
};

const PROCESS_PHASES = [
  {
    days: 'Days 1–3',
    title: 'Document & Data Review',
    desc: 'Our consultants begin with a thorough review of your completed intake form and every document you have submitted. From financial summaries and org charts to sales data and strategic plans, each piece of information is carefully read and catalogued to build a complete, accurate picture of your business — ensuring nothing is overlooked before the deeper analysis begins.',
  },
  {
    days: 'Days 3–6',
    title: 'Business Context Analysis',
    desc: 'We map your strategic context in depth — your current challenges, growth objectives, competitive environment, and the areas of your operations where friction is highest. This phase ensures the Blueprint reflects your specific business reality rather than generic industry assumptions, and forms the analytical foundation that everything else is built upon.',
  },
  {
    days: 'Days 6–9',
    title: 'AI Readiness Assessment',
    desc: 'Your organisation is evaluated across six strategic dimensions: data maturity, technology infrastructure, process standardisation, talent and culture, leadership alignment, and strategic fit. Each dimension is scored and contextualised against your unique business profile, producing a personalised AI Readiness Profile that honestly reflects where you stand today and where the meaningful gaps lie.',
  },
  {
    days: 'Days 9–11',
    title: 'Opportunity Identification & Prioritisation',
    desc: 'Using everything gathered in the preceding phases, our consultants identify and prioritise the AI opportunities most relevant to your business. Each opportunity is assessed for expected business value, implementation feasibility given your current readiness, and strategic alignment with your goals. The result is a curated shortlist of 5–7 high-impact, actionable use cases — specific to your company, not a recycled list.',
  },
  {
    days: 'Days 11–14',
    title: 'Blueprint Authoring & Quality Review',
    desc: 'Our consultants author your personalised AI Value Blueprint — a boardroom-ready document that brings all findings together into a clear 12-month action plan, complete with investment estimates, risk considerations, and a prioritised implementation sequence. Before it reaches you, every recommendation goes through an internal quality review to ensure it is grounded in your data and genuinely actionable for your organisation.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What is an AI Value Blueprint?',
    a: 'An AI Value Blueprint is a personalised, evidence-based assessment that maps exactly where AI can create measurable value in your specific business. Using your company data, operational context, and strategic goals, we produce a 12–18 page boardroom-ready document — not generic advice.',
  },
  {
    q: 'What does the Blueprint include?',
    a: 'Your Blueprint includes: a company profile and strategic context summary, an AI readiness score across 6 dimensions (0–100), 5–7 prioritised AI use cases specific to your business, a phased 12-month implementation roadmap, investment estimates and expected ROI indicators, and practical guidance on risks and implementation steps.',
  },
  {
    q: 'What documents should I upload?',
    a: 'The more context you provide, the more specific and actionable your Blueprint. We recommend uploading: a financial summary (P&L or annual report), an organisational chart, sales pipeline data, process documentation, marketing analytics, a technology inventory, strategic plans or board presentations, and any previous AI or digital transformation reports. Accepted formats: PDF, DOCX, XLSX, and CSV.',
  },
  {
    q: 'How long does the analysis take?',
    a: 'After you submit your intake form and documents, our AI pipeline completes the initial analysis within 15–30 minutes. Our senior consultants then review the output for accuracy and quality, typically within 3–5 business days. You will see real-time status updates here and receive an email when your Blueprint is ready.',
  },
  {
    q: 'What do the status labels mean?',
    a: 'Pending: your submission is queued and will begin processing shortly. Running: the AI pipeline is actively analysing your data. Ready for Review: analysis is complete and our consultants are reviewing the output. Approved: your Blueprint is ready — download it from the button on your job card. Failed: something went wrong; our team has been notified and will reach out to you.',
  },
  {
    q: 'Is my information secure and confidential?',
    a: 'Yes. All data is encrypted in transit (TLS) and at rest. Your documents are used solely to generate your Blueprint and are not shared with third parties. Access is restricted to the AI Assist BG consultants assigned to your engagement.',
  },
  {
    q: 'Can I submit additional documents after the initial submission?',
    a: 'Yes. If our team needs supplementary information to strengthen the analysis, you will see an "Additional files requested" section appear on your job card. You can upload further files at any time when this option is active.',
  },
  {
    q: 'What happens after I receive my Blueprint?',
    a: 'Your Blueprint is delivered as a downloadable DOCX file. We recommend sharing it with your leadership team as a starting point for strategic AI investment discussions. If you have questions about the findings or would like to explore implementation options, reach out to us at info@aiassist.bg.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card" style={{ padding: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}
      >
        <span style={{ color: 'rgba(255,255,255,0.87)', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 }}>{q}</span>
        <span style={{ color: 'rgba(165,180,252,0.7)', fontSize: '0.75rem', flexShrink: 0, display: 'inline-block', transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.09)' }}>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', lineHeight: 1.65, paddingTop: '12px', margin: 0 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router   = useRouter();
  const [user,   setUser]   = useState<AuthUser | null>(null);
  const [jobs,   setJobs]   = useState<ClientJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [uploadingId,  setUploadingId]  = useState<string | null>(null);
  const [uploadError,  setUploadError]  = useState<Record<string, string>>({});
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, boolean>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    async function init() {
      const token = getClientToken();
      if (!token) { router.replace('/login'); return; }
      const u = await validateToken(apiUrl, token);
      if (!u || u.role !== 'client') { clearClientToken(); router.replace('/login'); return; }
      setUser(u);
      await fetchJobs(token);
    }
    init();
  }, [apiUrl, router]);

  async function fetchJobs(token: string) {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/client/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json() as ClientJob[];
      setJobs(data);
      setError('');
    } catch {
      setError('Could not load your blueprint status. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    clearClientToken();
    router.push('/');
  }

  async function handleUpload(jobId: string, file: File) {
    const token = getClientToken();
    if (!token) return;
    setUploadingId(jobId);
    setUploadError((prev) => ({ ...prev, [jobId]: '' }));
    setUploadSuccess((prev) => ({ ...prev, [jobId]: false }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${apiUrl}/api/client/jobs/${jobId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setUploadError((prev) => ({ ...prev, [jobId]: d.error || 'Upload failed.' }));
        return;
      }
      setUploadSuccess((prev) => ({ ...prev, [jobId]: true }));
      await fetchJobs(token);
    } catch {
      setUploadError((prev) => ({ ...prev, [jobId]: 'Upload failed. Please try again.' }));
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDownload(jobId: string) {
    const token = getClientToken();
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/client/jobs/${jobId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; setError(d.error || 'Download failed.'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'AI_Value_Blueprint.docx';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setError('Download failed. Please try again.');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SpinnerIcon className="w-8 h-8 animate-spin" style={{ color: '#818CF8' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-4 z-50 px-4">
        <header
          className="glass-card max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)' }}
        >
          <Link href="/" className="flex items-center gap-3 group" aria-label="AI Assist BG home">
            <Image src="/logo.png" alt="AI Assist BG" width={36} height={36} className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105" />
            <span className="font-bold text-white text-[15px] tracking-tight">AI Assist BG</span>
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <p className="text-xs hidden sm:block" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.name}</p>
            )}
            <button onClick={handleLogout} className="btn-ghost" style={{ padding: '8px 14px', fontSize: '0.875rem' }}>
              <LogOutIcon className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </header>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-10">

        {/* ── Welcome halo ───────────────────────────────────────────────────── */}
        <div
          className="mb-8"
          style={{ background: 'rgba(5,12,30,0.45)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '16px', padding: '22px 24px', boxShadow: '0 6px 32px rgba(0,0,0,0.36)' }}
        >
          <h1 className="text-2xl font-bold text-white mb-1" style={{ textShadow: '0 1px 10px rgba(0,0,0,0.6)' }}>
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Track the progress of your AI Value Blueprint audit request.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {jobs.length === 0 && !loading && (
          <div className="glass-card p-12 text-center">
            <p className="mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>No blueprint requests found for your account.</p>
            <Link href="/intake" className="btn-primary inline-flex" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
              Submit Your Blueprint Intake
            </Link>
          </div>
        )}

        {/* ── Job cards ──────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {jobs.map((job) => {
            const colors      = STATUS_COLORS[job.status] ?? STATUS_COLORS.received;
            const currentStep = STEP_ORDER.indexOf(job.status);
            const isUploading = uploadingId === job.jobId;

            return (
              <div key={job.jobId} className="glass-card overflow-hidden">

                {/* ── Progress stepper ─────────────────────────────────────── */}
                <div className="px-6 pt-5 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-start">
                    {STEP_ORDER.flatMap((step, i) => {
                      const done   = i < currentStep;
                      const active = i === currentStep;
                      const items = [
                        <div
                          key={`node-${step}`}
                          className="flex flex-col items-center flex-shrink-0"
                          style={{ minWidth: '52px' }}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.72rem', fontWeight: 700,
                            background: done   ? 'rgba(34,197,94,0.20)'   : active ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.05)',
                            border:     `2px solid ${done ? 'rgba(34,197,94,0.48)' : active ? 'rgba(99,102,241,0.60)' : 'rgba(255,255,255,0.10)'}`,
                            color:      done   ? '#86efac'                 : active ? '#a5b4fc'               : 'rgba(255,255,255,0.20)',
                            boxShadow:  active ? '0 0 16px rgba(99,102,241,0.32)' : 'none',
                            transition: 'all 300ms ease',
                          }}>
                            {done ? '✓' : i + 1}
                          </div>
                          <span style={{
                            fontSize: '0.58rem', fontWeight: 600, marginTop: 5, textAlign: 'center', lineHeight: 1.2,
                            color: active ? '#a5b4fc' : done ? 'rgba(134,239,172,0.65)' : 'rgba(255,255,255,0.20)',
                          }}>
                            {STEP_LABELS[step]}
                          </span>
                        </div>,
                      ];
                      if (i < STEP_ORDER.length - 1) {
                        items.push(
                          <div key={`line-${i}`} style={{
                            flex: 1, height: 2, marginTop: '15px', flexShrink: 1, borderRadius: 2,
                            background: done ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.07)',
                            transition: 'background 300ms ease',
                          }} />,
                        );
                      }
                      return items;
                    })}
                  </div>
                </div>

                {/* ── Status body ──────────────────────────────────────────── */}
                <div className="p-6">

                  {/* Status headline row */}
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: colors.dot, boxShadow: `0 0 8px ${colors.dot}` }}
                        />
                        <span className="text-base font-bold" style={{ color: colors.text }}>{job.statusLabel}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
                        Submitted {new Date(job.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {job.completedAt && (
                          <> · Completed {new Date(job.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                        )}
                      </p>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.15)' }}>
                        Ref: {job.jobId.slice(0, 8)}
                      </p>
                    </div>

                    {job.canDownload && (
                      <button
                        onClick={() => handleDownload(job.jobId)}
                        className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px flex-shrink-0"
                        style={{ padding: '9px 20px', background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.38)', color: '#86efac', boxShadow: '0 0 16px rgba(34,197,94,0.18)' }}
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        Download Blueprint
                      </button>
                    )}
                  </div>

                  {/* Contextual message */}
                  {job.status === 'received' && (
                    <div className="p-3.5 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
                      <p style={{ color: 'rgba(165,180,252,0.85)' }}>
                        We have received your intake form and supporting documents. Our team has been assigned and will begin the review process shortly.
                      </p>
                    </div>
                  )}
                  {job.status === 'in_progress' && (
                    <div className="p-3.5 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
                      <p style={{ color: 'rgba(147,197,253,0.85)' }}>
                        Our consultants are actively working through your form responses and documents. This phase typically takes several business days as we build a complete picture of your business.
                      </p>
                    </div>
                  )}
                  {job.status === 'under_review' && (
                    <div className="p-3.5 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                      <p style={{ color: 'rgba(252,211,77,0.85)' }}>
                        Your AI Value Blueprint is nearing completion and is currently going through our internal quality review. We will notify you as soon as it is ready for you.
                      </p>
                    </div>
                  )}
                  {job.status === 'ready' && (
                    <div className="p-3.5 rounded-xl text-xs" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
                      <p className="flex items-center gap-1.5" style={{ color: 'rgba(134,239,172,0.9)' }}>
                        <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        Your Blueprint is complete and ready to download. Click the button above to receive your personalised AI Value Blueprint.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Re-upload section ─────────────────────────────────────── */}
                {job.reuploadAllowed && (
                  <div className="px-6 pb-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="mt-5 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)' }}>
                      <p className="text-xs font-semibold flex items-center gap-1.5 mb-1" style={{ color: '#a5b4fc' }}>
                        <UploadCloudIcon className="w-3.5 h-3.5" />
                        Additional files requested
                      </p>
                      <p className="text-xs mb-4" style={{ color: 'rgba(165,180,252,0.7)' }}>
                        Our team has requested additional supporting documents. Please upload any relevant files below.
                      </p>

                      {job.clientUploadCount > 0 && (
                        <p className="text-xs mb-3 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                          <PaperclipIcon className="w-3.5 h-3.5" />
                          {job.clientUploadCount} file{job.clientUploadCount !== 1 ? 's' : ''} already uploaded
                        </p>
                      )}

                      <input
                        type="file"
                        ref={(el) => { fileRefs.current[job.jobId] = el; }}
                        className="hidden"
                        accept=".pdf,.docx,.xlsx,.csv,.pptx,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(job.jobId, file);
                          e.target.value = '';
                        }}
                      />

                      <button
                        onClick={() => fileRefs.current[job.jobId]?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center gap-2 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ padding: '8px 18px', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }}
                      >
                        {isUploading
                          ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Uploading…</>
                          : <><UploadCloudIcon className="w-4 h-4" /> Upload File</>}
                      </button>

                      {uploadError[job.jobId] && (
                        <p className="text-xs mt-2" style={{ color: '#fca5a5' }}>{uploadError[job.jobId]}</p>
                      )}
                      {uploadSuccess[job.jobId] && (
                        <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#86efac' }}>
                          <CheckCircleIcon className="w-3.5 h-3.5" /> File uploaded successfully.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Refresh button ─────────────────────────────────────────────────── */}
        <div className="mt-6 text-center">
          <button
            onClick={() => { const t = getClientToken(); if (t) fetchJobs(t); }}
            className="inline-flex items-center gap-2 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px"
            style={{ padding: '9px 22px', background: 'rgba(5,12,30,0.58)', border: '1px solid rgba(255,255,255,0.14)', borderTopColor: 'rgba(255,255,255,0.24)', color: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px) saturate(140%)', WebkitBackdropFilter: 'blur(16px) saturate(140%)', boxShadow: '0 4px 18px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)' }}
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            Refresh status
          </button>
        </div>

        {/* ── How it works + FAQ ─────────────────────────────────────────────── */}
        <div style={{ marginTop: '64px', paddingTop: '52px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Process timeline */}
          <div className="mb-16">

            {/* Section header halo */}
            <div style={{ background: 'rgba(5,12,30,0.42)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '14px', padding: '18px 22px', marginBottom: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.30)' }}>
              <h2 className="text-lg font-bold text-white mb-1" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>How your Blueprint is created</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.62)', margin: 0 }}>
                Over 14 days, our consultants meticulously work through your intake responses and documents to produce a Blueprint that reflects your specific business — not a template.
              </p>
            </div>

            {/* Vertical timeline */}
            <div className="relative" style={{ paddingLeft: '2.5rem' }}>
              {/* Connecting line */}
              <div
                className="absolute"
                style={{ left: '13px', top: '16px', bottom: '16px', width: '2px', background: 'linear-gradient(to bottom, rgba(99,102,241,0.40) 0%, rgba(99,102,241,0.06) 100%)', borderRadius: '2px' }}
              />

              <div className="space-y-4">
                {PROCESS_PHASES.map((s, i) => (
                  <div key={i} className="relative">
                    {/* Node */}
                    <div
                      className="absolute flex items-center justify-center text-xs font-bold"
                      style={{ left: '-2.5rem', top: '14px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(5,12,30,0.75)', border: '1px solid rgba(99,102,241,0.42)', color: '#a5b4fc', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 1, boxShadow: '0 0 12px rgba(99,102,241,0.18)' }}
                    >
                      {i + 1}
                    </div>

                    {/* Card */}
                    <div className="glass-card p-5">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="text-sm font-bold text-white">{s.title}</span>
                        <span
                          className="text-xs font-semibold flex-shrink-0"
                          style={{ color: 'rgba(165,180,252,0.75)', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.28)', borderRadius: '20px', padding: '2px 10px' }}
                        >
                          {s.days}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.60)' }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div>
            {/* Section header halo */}
            <div style={{ background: 'rgba(5,12,30,0.42)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '14px', padding: '18px 22px', marginBottom: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.30)' }}>
              <h2 className="text-lg font-bold text-white mb-1" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>Frequently asked questions</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.62)', margin: 0 }}>
                Everything you need to know about the AI Value Blueprint process.
              </p>
            </div>

            <div className="space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>

            <div className="text-center mt-8">
              <p
                className="text-xs inline-block"
                style={{ color: 'rgba(255,255,255,0.62)', background: 'rgba(5,12,30,0.40)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: '24px', padding: '8px 20px', boxShadow: '0 2px 14px rgba(0,0,0,0.28)' }}
              >
                Still have questions?{' '}
                <a href="mailto:info@aiassist.bg" style={{ color: 'rgba(165,180,252,0.90)', textDecoration: 'none', fontWeight: 600 }}>
                  info@aiassist.bg
                </a>
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
