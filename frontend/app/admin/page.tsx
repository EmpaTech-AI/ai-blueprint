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
  TrashIcon,
} from '@/components/ui/icons';

interface ConfidenceBreakdown {
  documentBacked: number;
  formStated: number;
  inferred: number;
  assumption: number;
  total: number;
}

interface StepConfidence {
  score: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  needsReview: boolean;
  breakdown: ConfidenceBreakdown;
}

interface JobSummary {
  jobId: string;
  clientName: string;
  clientEmail: string;
  status: 'pending' | 'running' | 'review_ready' | 'approved' | 'failed';
  currentStep: string;
  startedAt: string;
  completedAt?: string;
  confidenceScores: Record<string, StepConfidence | number>;
  reviewerFlags: string[];
  errorLog: string[];
  progress: number;
}

const STEP_INFO: Record<string, { stage: string; label: string; description: string }> = {
  A:  { stage: 'Pre-Processing', label: 'Document Parsing',    description: 'Parses all uploaded files (PDF, DOCX, XLSX, PPTX) into a searchable text corpus for the AI pipeline' },
  B:  { stage: 'Stage 1',        label: 'Intake Analysis',     description: 'Compresses form responses & documents into an internal client dossier (3–4 pages)' },
  C:  { stage: 'Stage 2',        label: 'Maturity Scoring',    description: 'Scores AI readiness across 6 dimensions: Strategy, Data, Technology, People, Processes, Governance' },
  D:  { stage: 'Stage 3',        label: 'Opportunity Mapping', description: 'Identifies and ranks the top 5–7 AI use cases by impact, feasibility, and strategic alignment' },
  D2: { stage: 'Stage 4',        label: 'Action Roadmap',      description: 'Sequences opportunities into a Now / Next / Later 12-month implementation plan' },
  E:  { stage: 'Stage 5',        label: 'Document Assembly',   description: 'Compiles all outputs into the final 12–18 page client-facing AI Value Blueprint' },
};

// Maps the confidenceScores key (e.g. "stepB") to the STEP_INFO key (e.g. "B")
const SCORE_KEY_TO_STEP: Record<string, string> = {
  stepB: 'B', stepC: 'C', stepD: 'D', stepD2: 'D2', stepE: 'E',
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

// 4-band system per EmpaTech quality gate spec:
// 🟢 Green 90–100  🟡 Amber 76–89  🔵 Blue 60–75  🔴 Red <60
function scoreColor(score: number) {
  if (score >= 90) return { badge: 'badge-confidence-green', bar: '#22c55e', barGlow: 'rgba(34,197,94,0.4)',  text: '#86efac', band: 'Green',  action: 'Quick scan (5 min) — output is solid.' };
  if (score >= 76) return { badge: 'badge-confidence-amber', bar: '#f59e0b', barGlow: 'rgba(245,158,11,0.4)', text: '#fcd34d', band: 'Amber',  action: 'Review flagged items (15–30 min). Fix specific issues before proceeding.' };
  if (score >= 60) return { badge: 'badge-confidence-blue',  bar: '#3b82f6', barGlow: 'rgba(59,130,246,0.4)', text: '#93c5fd', band: 'Blue',   action: 'Detailed review required (30–60 min). Fill gaps from source documents.' };
  return           { badge: 'badge-confidence-red',          bar: '#ef4444', barGlow: 'rgba(239,68,68,0.4)',  text: '#fca5a5', band: 'Red',    action: 'Critical concern — stop and assess root cause before proceeding.' };
}

function ConfidenceCard({ stepKey, data }: { stepKey: string; data: StepConfidence | number }) {
  const stepId   = SCORE_KEY_TO_STEP[stepKey] ?? stepKey;
  const stepMeta = STEP_INFO[stepId];
  const stage    = stepMeta?.stage ?? stepKey;
  const label    = stepMeta?.label ?? stepKey;

  // Support both old format (plain number) and new format (full object)
  const score    = typeof data === 'number' ? data : data.score;
  const colors   = scoreColor(score);
  const full     = typeof data === 'object' ? data : null;

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {stage}
          </span>
          <p className="text-sm font-semibold leading-tight" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {label}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={colors.badge}>{colors.band}</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: colors.text }}>{score}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full rounded-full mb-2 mt-2"
        style={{ height: '4px', background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: colors.bar, boxShadow: `0 0 6px ${colors.barGlow}` }}
        />
      </div>

      {/* Verdict / action */}
      <p className="text-xs mb-3 leading-relaxed" style={{ color: colors.text }}>
        {colors.action}
      </p>

      {/* Detailed breakdown (new format only) */}
      {full && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Citation breakdown — {full.breakdown.total} total tags
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Document-Backed</span>
              <span className="font-semibold tabular-nums" style={{ color: '#86efac' }}>
                {full.breakdown.documentBacked}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Form-Stated</span>
              <span className="font-semibold tabular-nums" style={{ color: '#86efac' }}>
                {full.breakdown.formStated}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Inferred</span>
              <span className="font-semibold tabular-nums" style={{ color: '#fcd34d' }}>
                {full.breakdown.inferred}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Assumption</span>
              <span className="font-semibold tabular-nums" style={{ color: '#fca5a5' }}>
                {full.breakdown.assumption}
              </span>
            </div>
          </div>

          {full.breakdown.total > 0 && (
            <p className="text-xs mt-2 pt-2" style={{
              color: 'rgba(255,255,255,0.35)',
              borderTop: '1px solid rgba(255,255,255,0.07)',
            }}>
              {full.highConfidenceCount} high-confidence ÷ {full.breakdown.total} total
              {' '}= {score}% grounded
              {full.breakdown.total === 0 && ' (no tags found — defaulting to 50%)'}
            </p>
          )}

          {full.breakdown.total === 0 && (
            <p className="text-xs mt-1" style={{ color: '#fcd34d' }}>
              No confidence tags found in output — score defaulted to 50%.
            </p>
          )}
        </div>
      )}

      {/* Fallback: old format with no breakdown */}
      {!full && (
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Run the pipeline again to see the full citation breakdown.
        </p>
      )}
    </div>
  );
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
  const [authenticated,  setAuthenticated]  = useState(false);
  const [password,       setPassword]       = useState('');
  const [token,          setToken]          = useState('');
  const [jobs,           setJobs]           = useState<JobSummary[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [approvingId,    setApprovingId]    = useState<string | null>(null);
  const [retryingId,     setRetryingId]     = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [confirmDeleteId,setConfirmDeleteId]= useState<string | null>(null);

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

  const previewUrl      = (jobId: string) => `${apiUrl}/api/download/${jobId}/preview?token=${encodeURIComponent(token)}`;
  const logsUrl         = (jobId: string) => `${apiUrl}/api/download/${jobId}/logs?token=${encodeURIComponent(token)}`;
  const stepDownloadUrl = (jobId: string, step: string) =>
    `${apiUrl}/api/download/${jobId}/step/${step}?token=${encodeURIComponent(token)}`;

  const handleDownload = useCallback(async (
    jobId: string,
    format: 'docx' | 'pdf' | 'txt',
    clientName: string,
  ) => {
    const key  = `${jobId}-${format}`;
    const path = format === 'docx' ? '' : `/${format}`;
    setDownloadingKey(key);
    try {
      const res = await fetch(`${apiUrl}/api/download/${jobId}${path}?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        let msg = `Download failed (${res.status})`;
        try { const d = await res.json() as { error?: string }; msg = d.error ?? msg; } catch { /* ignore */ }
        setError(msg);
        return;
      }
      const blob = await res.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `AI Value Blueprint - ${clientName}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
      setError('');
    } catch {
      setError('Download failed — check your connection and try again.');
    } finally {
      setDownloadingKey(null);
    }
  }, [apiUrl, token]);

  const handleDelete = useCallback(async (jobId: string) => {
    if (confirmDeleteId !== jobId) {
      setConfirmDeleteId(jobId);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}`, {
        method: 'DELETE',
        headers: { 'x-reviewer-token': token },
      });
      if (!res.ok) throw new Error('Delete failed');
      await fetchJobs(token);
    } catch {
      setError('Failed to delete job');
    } finally {
      setDeletingId(null);
    }
  }, [apiUrl, token, confirmDeleteId, fetchJobs]);

  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => fetchJobs(token), 30000);
    return () => clearInterval(interval);
  }, [authenticated, token, fetchJobs]);

  // Auto-cancel delete confirmation after 4 seconds of no action
  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

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

                    {/* Delete — two-click confirm */}
                    <button
                      onClick={() => handleDelete(job.jobId)}
                      disabled={deletingId === job.jobId}
                      className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full cursor-pointer transition-all duration-200 hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
                      style={confirmDeleteId === job.jobId ? {
                        padding: '8px 16px',
                        background: 'rgba(239,68,68,0.22)',
                        border: '1px solid rgba(239,68,68,0.5)',
                        color: '#fca5a5',
                      } : {
                        padding: '8px 16px',
                        background: 'rgba(239,68,68,0.07)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: 'rgba(252,165,165,0.6)',
                      }}
                    >
                      {deletingId === job.jobId
                        ? <><SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
                        : confirmDeleteId === job.jobId
                        ? <><TrashIcon className="w-3.5 h-3.5" /> Confirm Delete</>
                        : <><TrashIcon className="w-3.5 h-3.5" /> Delete</>
                      }
                    </button>
                  </div>
                </div>

                {/* Download format buttons */}
                {(job.status === 'review_ready' || job.status === 'approved') && (
                  <div className="flex gap-2 mt-3 flex-wrap items-center">
                    <span className="text-xs mr-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Download as:</span>
                    {(['pdf', 'docx', 'txt'] as const).map((fmt) => {
                      const key = `${job.jobId}-${fmt}`;
                      const colors = {
                        pdf:  { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  color: '#93c5fd' },
                        docx: { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.3)',  color: '#a5b4fc' },
                        txt:  { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)' },
                      }[fmt];
                      return (
                        <button
                          key={fmt}
                          onClick={() => handleDownload(job.jobId, fmt, job.clientName)}
                          disabled={downloadingKey === key}
                          className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ padding: '7px 16px', background: colors.bg, border: `1px solid ${colors.border}`, color: colors.color }}
                        >
                          {downloadingKey === key
                            ? <><SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Downloading…</>
                            : <><DownloadIcon className="w-3.5 h-3.5" /> {fmt.toUpperCase()}</>
                          }
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-5">
                  <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    <span>
                      {STEP_INFO[job.currentStep]
                        ? `${STEP_INFO[job.currentStep].stage}: ${STEP_INFO[job.currentStep].label}`
                        : job.currentStep}
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
                  <div className="mt-5">
                    <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      AI Output Quality — Confidence Scores
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {Object.entries(job.confidenceScores).map(([stepKey, data]) => (
                        <ConfidenceCard key={stepKey} stepKey={stepKey} data={data} />
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
                      Pipeline Error — Failed at {STEP_INFO[job.currentStep]
                        ? `${STEP_INFO[job.currentStep].stage}: ${STEP_INFO[job.currentStep].label}`
                        : job.currentStep}
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
                      Raw pipeline outputs — download each stage&apos;s AI output for detailed review
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(['A', 'B', 'C', 'D', 'D2', 'E'] as const).map((step) => {
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
                              className="text-xs font-semibold uppercase tracking-wide leading-none mb-0.5"
                              style={{ color: 'rgba(165,180,252,0.7)', fontSize: '0.65rem' }}
                            >
                              {info.stage}
                            </span>
                            <span
                              className="text-xs font-bold leading-tight"
                              style={{ color: '#a5b4fc' }}
                            >
                              {info.label}
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
