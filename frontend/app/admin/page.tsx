'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

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

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  running: 'bg-blue-100 text-blue-700',
  review_ready: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  running: 'Running',
  review_ready: 'Ready for Review',
  approved: 'Approved',
  failed: 'Failed',
};

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', color)}>{score}%</span>;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

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
        setError(`Cannot reach the backend at ${apiUrl}. Make sure Railway is deployed and NEXT_PUBLIC_API_URL is set correctly on Vercel.`);
        return;
      }
      if (res.status === 401) {
        setError('Token rejected by the backend. Make sure REVIEWER_SECRET_TOKEN on Railway matches the password you entered.');
        return;
      }
      if (!res.ok) {
        setError(`Backend returned an error (${res.status}). Check Railway logs.`);
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

  const downloadUrl = (jobId: string) =>
    `${apiUrl}/api/download/${jobId}?token=${encodeURIComponent(token)}`;

  const previewUrl = (jobId: string) =>
    `${apiUrl}/api/download/${jobId}/preview?token=${encodeURIComponent(token)}`;

  const logsUrl = (jobId: string) =>
    `${apiUrl}/api/download/${jobId}/logs?token=${encodeURIComponent(token)}`;

  const stepDownloadUrl = (jobId: string, step: string) =>
    `${apiUrl}/api/download/${jobId}/step/${step}?token=${encodeURIComponent(token)}`;

  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => fetchJobs(token), 30000);
    return () => clearInterval(interval);
  }, [authenticated, token, fetchJobs]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Blueprint Admin</h1>
          <p className="text-gray-500 text-sm mb-6">Internal reviewer access only</p>
          <form onSubmit={handleLogin}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reviewer token / password</label>
            <input
              type="password"
              className="input-field mb-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter reviewer token"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button type="submit" className="btn-primary w-full">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">Blueprint Admin Dashboard</h1>
            <p className="text-xs text-gray-500">Auto-refreshes every 30 seconds</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => fetchJobs(token)} className="btn-secondary text-sm py-2">
              Refresh
            </button>
            <button onClick={() => setAuthenticated(false)} className="text-sm text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {loading && jobs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No jobs found yet.</div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.jobId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="font-bold text-gray-900 text-lg">{job.clientName}</h2>
                      <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[job.status])}>
                        {STATUS_LABELS[job.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{job.clientEmail}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Started: {new Date(job.startedAt).toLocaleString()}
                      {job.completedAt && ` · Completed: ${new Date(job.completedAt).toLocaleString()}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 flex-wrap">
                    {(job.status === 'review_ready' || job.status === 'approved') && (
                      <>
                        <a
                          href={previewUrl(job.jobId)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-sm py-2"
                        >
                          Preview
                        </a>
                        <a
                          href={downloadUrl(job.jobId)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary text-sm py-2"
                        >
                          Download DOCX
                        </a>
                      </>
                    )}
                    {job.status === 'review_ready' && (
                      <button
                        onClick={() => handleApprove(job.jobId)}
                        disabled={approvingId === job.jobId}
                        className="bg-green-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {approvingId === job.jobId ? 'Approving...' : 'Approve for Delivery'}
                      </button>
                    )}
                    {job.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(job.jobId)}
                        disabled={retryingId === job.jobId}
                        className="bg-orange-600 text-white font-semibold text-sm px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      >
                        {retryingId === job.jobId ? 'Retrying...' : '↻ Retry Pipeline'}
                      </button>
                    )}
                    <a
                      href={logsUrl(job.jobId)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-gray-500 font-semibold px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      Logs
                    </a>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Pipeline: Step {job.currentStep}</span>
                    <span>{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={cn('h-1.5 rounded-full transition-all', job.status === 'failed' ? 'bg-red-400' : 'bg-brand-blue')}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>

                {/* Confidence scores */}
                {Object.keys(job.confidenceScores).length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Confidence Scores</p>
                    <div className="flex gap-3 flex-wrap">
                      {Object.entries(job.confidenceScores).map(([step, score]) => (
                        <div key={step} className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">{step}:</span>
                          <ConfidenceBadge score={score} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviewer flags */}
                {job.reviewerFlags.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-800 mb-1">Reviewer Flags</p>
                    <ul className="text-xs text-amber-700 space-y-0.5">
                      {job.reviewerFlags.map((flag, i) => <li key={i}>• {flag}</li>)}
                    </ul>
                  </div>
                )}

                {/* Error log (failed jobs only) */}
                {job.status === 'failed' && job.errorLog.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-800 mb-1">Pipeline Error — Failed at Step {job.currentStep}</p>
                    <ul className="text-xs text-red-700 space-y-1 font-mono">
                      {job.errorLog.map((entry, i) => <li key={i} className="break-all">{entry}</li>)}
                    </ul>
                  </div>
                )}
                {job.status === 'failed' && job.errorLog.length === 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-800">Pipeline failed at Step {job.currentStep} — no error details stored. Check Railway logs.</p>
                  </div>
                )}

                {/* Intermediate output downloads */}
                {(job.status === 'review_ready' || job.status === 'approved') && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Intermediate Outputs</p>
                    <div className="flex gap-3 flex-wrap">
                      {['B', 'C', 'D', 'D2', 'E'].map((step) => (
                        <a
                          key={step}
                          href={stepDownloadUrl(job.jobId, step)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-blue hover:underline border border-brand-blue-light px-3 py-1.5 rounded-lg"
                        >
                          Step {step}
                        </a>
                      ))}
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
