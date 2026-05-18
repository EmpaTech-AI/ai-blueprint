'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ShieldIcon,
  RefreshIcon,
  EyeIcon,
  DownloadIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  TerminalIcon,
  LogOutIcon,
  SpinnerIcon,
} from '@/components/ui/icons';

interface JobSummary {
  jobId: string;
  clientName: string;
  clientEmail: string;
  status: 'pending' | 'running' | 'review_ready' | 'approved' | 'failed';
  currentStep: string;
  startedAt: string;
  completedAt?: string;
  confidenceScores: Record<string, number>;
  reviewerFlags: string[];
  errorLog: string[];
  progress: number;
}

const STEP_INFO: Record<string, { label: string; description: string }> = {
  B:  { label: 'Intake Analysis',      description: 'Compresses form responses & documents into an internal client dossier' },
  C:  { label: 'Maturity Assessment',  description: 'Scores AI readiness across 6 dimensions: Strategy, Data, Technology, People, Processes, Governance' },
  D:  { label: 'Opportunity Mapping',  description: 'Identifies and ranks the top 5–7 AI use cases by impact, feasibility, and strategic alignment' },
  D2: { label: 'Action Roadmap',       description: 'Sequences opportunities into a Now / Next / Later 12-month implementation plan' },
  E:  { label: 'Document Assembly',    description: 'Compiles all outputs into the final 12–18 page client-facing AI Value Blueprint DOCX' },
};

const STATUS_BADGE: Record<string, string> = {
  pending:      'badge-pending',
  running:      'badge-running',
  review_ready: 'badge-review',
  approved:     'badge-approved',
  failed:       'badge-failed',
};

const STATUS_LABELS: Record<string, string> = {
  pending:      'Pending',
  running:      'Running',
  review_ready: 'Ready for Review',
  approved:     'Approved',
  failed:       'Failed',
};

function ConfidenceBadge({ score }: { score: number }) {
  const cls = score >= 80 ? 'badge-confidence-green'
            : score >= 60 ? 'badge-confidence-amber'
            : 'badge-confidence-red';
  return <span className={cls}>{score}%</span>;
}

// ── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="skeleton h-5 w-24 rounded-full" />
      </div>
      <div className="skeleton h-4 w-52 rounded" />
      <div className="skeleton h-2 w-full rounded-full" />
    </div>
  );
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password,      setPassword]      = useState('');
  const [token,         setToken]         = useState('');
  const [jobs,          setJobs]          = useState<JobSummary[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [approvingId,   setApprovingId]   = useState<string | null>(null);
  const [retryingId,    setRetryingId]    = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchJobs = useCallback(async (reviewerToken: string) => {
    setLoading(true);
    try {
      let res: Response;
      try {
        res = await fetch(`${apiUrl}/api/status`, {
          headers: { 'x-reviewer-token': reviewerToken },
        });
      } catch {
        setError(`Cannot reach the backend at ${apiUrl}. Check Railway is deployed and NEXT_PUBLIC_API_URL is set.`);
        return;
      }
      if (res.status === 401) {
        setError('Token rejected. Ensure REVIEWER_SECRET_TOKEN on Railway matches the password entered.');
        return;
      }
      if (!res.ok) {
        setError(`Backend error (${res.status}). Check Railway logs.`);
        return;
      }
      const data = await res.json() as JobSummary[];
      setJobs(data);
      setError('');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const envPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    if (!envPass || password === envPass) {
      setAuthenticated(true);
      setToken(password);
      fetchJobs(password);
    } else {
      setError('Invalid password');
    }
  };

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}/retry`, {
        method: 'POST',
        headers: { 'x-reviewer-token': token },
      });
      if (!res.ok) throw new Error('Failed to retry');
      await fetchJobs(token);
    } catch {
      setError('Failed to retry job');
    } finally {
      setRetryingId(null);
    }
  };

  const handleApprove = async (jobId: string) => {
    setApprovingId(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}/approve`, {
        method: 'POST',
        headers: { 'x-reviewer-token': token },
      });
      if (!res.ok) throw new Error('Failed to approve');
      await fetchJobs(token);
    } catch {
      setError('Failed to approve job');
    } finally {
      setApprovingId(null);
    }
  };

  const downloadUrl  = (jobId: string) => `${apiUrl}/api/download/${jobId}?token=${encodeURIComponent(token)}`;
  const previewUrl   = (jobId: string) => `${apiUrl}/api/download/${jobId}/preview?token=${encodeURIComponent(token)}`;
  const logsUrl      = (jobId: string) => `${apiUrl}/api/download/${jobId}/logs?token=${encodeURIComponent(token)}`;
  const stepDownloadUrl = (jobId: string, step: string) =>
    `${apiUrl}/api/download/${jobId}/step/${step}?token=${encodeURIComponent(token)}`;

  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => fetchJobs(token), 30000);
    return () => clearInterval(interval);
  }, [authenticated, token, fetchJobs]);

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
          aria-hidden="true"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }}
        />

        <div className="relative w-full max-w-sm">
          <div
            className="p-px rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.45) 0%, rgba(6,182,212,0.3) 100%)' }}
          >
            <div
              className="rounded-2xl p-8"
              style={{
                background: 'rgba(13,13,25,0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}
                >
                  <ShieldIcon className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-bold text-white text-lg leading-none">Blueprint Admin</h1>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Internal reviewer access only
                  </p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Reviewer token / password
                  </label>
                  <input
                    type="password"
                    className="input-glass"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter reviewer token"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
                )}
                <button type="submit" className="btn-primary w-full">
                  Sign In
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">

      {/* Navbar */}
      <div className="sticky top-4 z-50 px-4">
        <header
          className="glass-card max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)' }}
        >
          <div>
            <p className="font-bold text-white text-[15px]">Blueprint Admin Dashboard</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Auto-refreshes every 30 seconds
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchJobs(token)}
              className="btn-secondary"
              style={{ padding: '8px 18px', fontSize: '0.875rem' }}
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={() => setAuthenticated(false)}
              className="btn-ghost"
              style={{ padding: '8px 14px', fontSize: '0.875rem' }}
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </header>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Error banner */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl text-sm"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.28)',
              color: '#fca5a5',
            }}
          >
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && jobs.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && jobs.length === 0 && (
          <div
            className="glass-card p-16 text-center"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            No jobs found yet.
          </div>
        )}

        {/* Job cards */}
        {jobs.length > 0 && (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.jobId} className="glass-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glass-hover">

                {/* Header row */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h2 className="font-bold text-white text-lg">{job.clientName}</h2>
                      <span className={STATUS_BADGE[job.status]}>
                        {STATUS_LABELS[job.status]}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{job.clientEmail}</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Started: {new Date(job.startedAt).toLocaleString()}
                      {job.completedAt && ` · Completed: ${new Date(job.completedAt).toLocaleString()}`}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2.5 flex-wrap items-center">
                    {(job.status === 'review_ready' || job.status === 'approved') && (
                      <>
                        <a
                          href={previewUrl(job.jobId)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full cursor-pointer transition-all duration-200 hover:-translate-y-px"
                          style={{
                            padding: '8px 18px',
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            color: 'rgba(255,255,255,0.85)',
                            textDecoration: 'none',
                          }}
                        >
                          <EyeIcon className="w-3.5 h-3.5" />
                          Preview
                        </a>
                        <a
                          href={downloadUrl(job.jobId)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full cursor-pointer transition-all duration-200 hover:-translate-y-px"
                          style={{
                            padding: '8px 18px',
                            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            color: '#fff',
                            textDecoration: 'none',
                            boxShadow: '0 0 16px rgba(99,102,241,0.3)',
                          }}
                        >
                          <DownloadIcon className="w-3.5 h-3.5" />
                          Download DOCX
                        </a>
                      </>
                    )}

                    {job.status === 'review_ready' && (
                      <button
                        onClick={() => handleApprove(job.jobId)}
                        disabled={approvingId === job.jobId}
                        className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full cursor-pointer transition-all duration-200 hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          padding: '8px 18px',
                          background: 'rgba(34,197,94,0.18)',
                          border: '1px solid rgba(34,197,94,0.35)',
                          color: '#86efac',
                        }}
                      >
                        {approvingId === job.jobId
                          ? <><SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Approving…</>
                          : <><CheckCircleIcon className="w-3.5 h-3.5" /> Approve for Delivery</>
                        }
                      </button>
                    )}

                    {job.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(job.jobId)}
                        disabled={retryingId === job.jobId}
                        className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full cursor-pointer transition-all duration-200 hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          padding: '8px 18px',
                          background: 'rgba(245,158,11,0.18)',
                          border: '1px solid rgba(245,158,11,0.35)',
                          color: '#fcd34d',
                        }}
                      >
                        {retryingId === job.jobId
                          ? <><SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Retrying…</>
                          : <><RefreshIcon className="w-3.5 h-3.5" /> Retry Pipeline</>
                        }
                      </button>
                    )}

                    <a
                      href={logsUrl(job.jobId)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full cursor-pointer transition-all duration-200 hover:-translate-y-px"
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.13)',
                        color: 'rgba(255,255,255,0.55)',
                        textDecoration: 'none',
                      }}
                    >
                      <TerminalIcon className="w-3.5 h-3.5" />
                      Logs
                    </a>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    <span>
                      {STEP_INFO[job.currentStep]
                        ? <>{STEP_INFO[job.currentStep].label} <span style={{ color: 'rgba(255,255,255,0.28)' }}>· Step {job.currentStep}</span></>
                        : `Step ${job.currentStep}`}
                    </span>
                    <span>{job.progress}%</span>
                  </div>
                  <div
                    className="w-full rounded-full overflow-hidden"
                    style={{ height: '4px', background: 'rgba(255,255,255,0.08)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${job.progress}%`,
                        background: job.status === 'failed'
                          ? 'linear-gradient(90deg, #ef4444, #fca5a5)'
                          : job.status === 'approved'
                          ? 'linear-gradient(90deg, #22c55e, #86efac)'
                          : 'linear-gradient(90deg, #6366F1, #818CF8)',
                        boxShadow: job.status === 'failed'
                          ? '0 0 8px rgba(239,68,68,0.5)'
                          : '0 0 8px rgba(99,102,241,0.5)',
                      }}
                    />
                  </div>
                </div>

                {/* Confidence scores */}
                {Object.keys(job.confidenceScores).length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Confidence Scores
                    </p>
                    <div className="flex gap-3 flex-wrap">
                      {Object.entries(job.confidenceScores).map(([step, score]) => (
                        <div key={step} className="flex items-center gap-1.5">
                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>{step}:</span>
                          <ConfidenceBadge score={score} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviewer flags */}
                {job.reviewerFlags.length > 0 && (
                  <div
                    className="mt-4 p-3.5 rounded-xl"
                    style={{
                      background: 'rgba(245,158,11,0.09)',
                      border: '1px solid rgba(245,158,11,0.22)',
                    }}
                  >
                    <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5" style={{ color: '#fcd34d' }}>
                      <AlertTriangleIcon className="w-3.5 h-3.5" />
                      Reviewer Flags
                    </p>
                    <ul className="space-y-1">
                      {job.reviewerFlags.map((flag, i) => (
                        <li key={i} className="text-xs" style={{ color: 'rgba(252,211,77,0.8)' }}>
                          · {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Error log */}
                {job.status === 'failed' && (
                  <div
                    className="mt-4 p-3.5 rounded-xl"
                    style={{
                      background: 'rgba(239,68,68,0.09)',
                      border: '1px solid rgba(239,68,68,0.22)',
                    }}
                  >
                    <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5" style={{ color: '#fca5a5' }}>
                      <TerminalIcon className="w-3.5 h-3.5" />
                      Pipeline Error — Failed at Step {job.currentStep}
                    </p>
                    {job.errorLog.length > 0 ? (
                      <ul className="space-y-1">
                        {job.errorLog.map((entry, i) => (
                          <li key={i} className="text-xs font-mono break-all" style={{ color: 'rgba(252,165,165,0.8)' }}>
                            {entry}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs" style={{ color: 'rgba(252,165,165,0.7)' }}>
                        No error details stored. Check Railway logs.
                      </p>
                    )}
                  </div>
                )}

                {/* Intermediate output downloads */}
                {(job.status === 'review_ready' || job.status === 'approved') && (
                  <div
                    className="mt-5 pt-5"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Pipeline outputs — download each step&apos;s raw output for review
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(['B', 'C', 'D', 'D2', 'E'] as const).map((step) => {
                        const info = STEP_INFO[step];
                        return (
                          <a
                            key={step}
                            href={stepDownloadUrl(job.jobId, step)}
                            target="_blank"
                            rel="noreferrer"
                            title={info.description}
                            className="inline-flex flex-col transition-all duration-150 hover:-translate-y-px"
                            style={{
                              padding: '8px 14px',
                              background: 'rgba(99,102,241,0.10)',
                              border: '1px solid rgba(99,102,241,0.22)',
                              borderRadius: '10px',
                              textDecoration: 'none',
                              minWidth: '120px',
                            }}
                          >
                            <span
                              className="text-xs font-bold leading-none mb-1"
                              style={{ color: '#a5b4fc' }}
                            >
                              {info.label}
                            </span>
                            <span
                              className="text-xs"
                              style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem' }}
                            >
                              Step {step}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
