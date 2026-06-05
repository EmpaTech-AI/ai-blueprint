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
  pending:      { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.22)',  text: '#a5b4fc', dot: '#818CF8' },
  running:      { bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.22)',  text: '#93c5fd', dot: '#60a5fa' },
  review_ready: { bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.22)',  text: '#fcd34d', dot: '#f59e0b' },
  approved:     { bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.22)',   text: '#86efac', dot: '#22c55e' },
  failed:       { bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.22)',   text: '#fca5a5', dot: '#ef4444' },
};

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
        <SpinnerIcon className="w-8 h-8 animate-spin" style={{ color: '#818CF8' } as React.CSSProperties} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <div className="sticky top-4 z-50 px-4">
        <header className="glass-card max-w-3xl mx-auto px-6 py-3.5 flex items-center justify-between"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
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

        <div className="space-y-4">
          {jobs.map((job) => {
            const colors = STATUS_COLORS[job.status] ?? STATUS_COLORS.pending;
            const isUploading = uploadingId === job.jobId;
            return (
              <div key={job.jobId} className="glass-card overflow-hidden">
                {/* Status header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors.dot, boxShadow: `0 0 4px ${colors.dot}` }} />
                          {job.statusLabel}
                        </span>
                      </div>

                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Submitted {new Date(job.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {job.completedAt && (
                          <> · Completed {new Date(job.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</>
                        )}
                      </p>

                      <p className="text-xs mt-1 font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        Ref: {job.jobId.slice(0, 8)}
                      </p>
                    </div>

                    {/* Download button */}
                    {job.canDownload && (
                      <button
                        onClick={() => handleDownload(job.jobId)}
                        className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px flex-shrink-0"
                        style={{ padding: '8px 18px', background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.35)', color: '#86efac' }}
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        Download Blueprint
                      </button>
                    )}
                  </div>

                  {/* What happens next — contextual message */}
                  {job.status === 'pending' && (
                    <div className="mt-4 p-3.5 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
                      <p style={{ color: 'rgba(165,180,252,0.85)' }}>
                        Your intake has been received and is queued for processing. Our AI pipeline will start shortly.
                      </p>
                    </div>
                  )}
                  {job.status === 'running' && (
                    <div className="mt-4 p-3.5 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
                      <p style={{ color: 'rgba(147,197,253,0.85)' }}>
                        Our AI pipeline is currently analysing your data across 5 strategic dimensions. This typically takes 15–30 minutes.
                      </p>
                    </div>
                  )}
                  {job.status === 'review_ready' && (
                    <div className="mt-4 p-3.5 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)' }}>
                      <p style={{ color: 'rgba(252,211,77,0.85)' }}>
                        Your AI Value Blueprint has been generated and is currently under review by our senior consultants. We will notify you once it&apos;s ready.
                      </p>
                    </div>
                  )}
                  {job.status === 'approved' && (
                    <div className="mt-4 p-3.5 rounded-xl text-xs" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
                      <p className="flex items-center gap-1.5" style={{ color: 'rgba(134,239,172,0.9)' }}>
                        <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        Your Blueprint has been approved and is ready to download. Click the button above to get your personalised AI Value Blueprint.
                      </p>
                    </div>
                  )}
                  {job.status === 'failed' && (
                    <div className="mt-4 p-3.5 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                      <p className="flex items-center gap-1.5" style={{ color: 'rgba(252,165,165,0.9)' }}>
                        <AlertTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        There was an issue processing your request. Our team has been notified and will reach out to you shortly.
                      </p>
                    </div>
                  )}
                </div>

                {/* Client re-upload section */}
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

        <div className="mt-8 text-center">
          <button
            onClick={() => { const t = getClientToken(); if (t) fetchJobs(t); }}
            className="btn-ghost text-sm"
            style={{ padding: '8px 18px' }}
          >
            <RefreshIcon className="w-3.5 h-3.5" />
            Refresh status
          </button>
        </div>
      </main>
    </div>
  );
}
