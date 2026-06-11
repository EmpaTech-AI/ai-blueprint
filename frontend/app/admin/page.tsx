'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ShieldIcon, RefreshIcon, EyeIcon, DownloadIcon, CheckCircleIcon,
  AlertTriangleIcon, TerminalIcon, LogOutIcon, SpinnerIcon, TrashIcon,
  ChevronDownIcon, SearchIcon, UsersIcon, UserIcon, PlusIcon, KeyIcon,
  LockIcon, UploadCloudIcon, FolderOpenIcon, ClipboardListIcon,
} from '@/components/ui/icons';
import { setAdminToken, getAdminToken, clearAdminToken, validateToken } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface ConfidenceBreakdown { documentBacked: number; formStated: number; inferred: number; assumption: number; total: number }
interface JustificationEntry { index: number; tag: 'Inferred' | 'Assumption'; label: string; claim: string; whyTagged: string; missingData: string; consultantAction: string }
interface StepConfidence { score: number; highConfidenceCount: number; lowConfidenceCount: number; needsReview: boolean; breakdown: ConfidenceBreakdown; confidenceOverview?: string; justificationEntries?: JustificationEntry[]; inferredSnippets?: string[]; assumptionSnippets?: string[]; noTagsReason?: string; scoreContext?: string }
interface TruncationSummary { field: string; originalLength: number; truncatedLength: number }

interface JobSummary {
  jobId: string; clientName: string; clientEmail: string;
  status: 'pending' | 'running' | 'review_ready' | 'approved' | 'failed';
  currentStep: string; startedAt: string; completedAt?: string;
  confidenceScores: Record<string, StepConfidence | number>;
  reviewerFlags: string[]; errorLog: string[]; progress: number;
  truncationMeta?: TruncationSummary;
  approvedByName?: string | null;
  reuploadAllowed: boolean;
  clientUploadCount: number;
  clientVisibleStatus?: 'received' | 'in_progress' | 'under_review' | 'ready' | null;
}

interface UserSummary { id: string; email: string; role: 'admin' | 'client'; name: string; createdAt: string }

interface IntakeData {
  formAnswers: Record<string, string | string[]>;
  uploadedFiles: Record<string, { filename: string; size: number; mimeType: string }>;
  clientUploads: Array<{ id: string; filename: string; size: number; mimeType: string; uploadedAt: string }>;
}

interface StageNote { id: string; text: string; authorName: string; authorEmail: string; createdAt: string; }

// ── Constants ──────────────────────────────────────────────────────────────────

const STEP_INFO: Record<string, { stage: string; label: string; description: string }> = {
  A:  { stage: 'Pre-Processing', label: 'Document Parsing',    description: 'Parses all uploaded files into a searchable text corpus' },
  B:  { stage: 'Stage 1',        label: 'Intake Analysis',     description: 'Compresses form responses & documents into an internal client dossier' },
  C:  { stage: 'Stage 2',        label: 'Maturity Scoring',    description: 'Scores AI readiness across 6 dimensions' },
  D:  { stage: 'Stage 3',        label: 'Opportunity Mapping', description: 'Identifies and ranks the top 5–7 AI use cases' },
  D2: { stage: 'Stage 4',        label: 'Action Roadmap',      description: 'Sequences opportunities into a 12-month implementation plan' },
  E:  { stage: 'Stage 5',        label: 'Document Assembly',   description: 'Compiles all outputs into the final AI Value Blueprint' },
};
const SCORE_KEY_TO_STEP: Record<string, string> = { stepB: 'B', stepC: 'C', stepD: 'D', stepD2: 'D2', stepE: 'E' };
const STATUS_BADGE: Record<string, string> = { pending: 'badge-pending', running: 'badge-running', review_ready: 'badge-review', approved: 'badge-approved', failed: 'badge-failed' };
const STATUS_LABELS: Record<string, string> = { pending: 'Pending', running: 'Running', review_ready: 'Ready for Review', approved: 'Approved', failed: 'Failed' };

function scoreColor(score: number) {
  if (score >= 90) return { badge: 'badge-confidence-green', bar: '#22c55e', barGlow: 'rgba(34,197,94,0.4)',  text: '#86efac', band: 'Green',  action: 'Quick scan (5 min) — output is solid.' };
  if (score >= 76) return { badge: 'badge-confidence-amber', bar: '#f59e0b', barGlow: 'rgba(245,158,11,0.4)', text: '#fcd34d', band: 'Amber',  action: 'Review flagged items (15–30 min). Fix specific issues before proceeding.' };
  if (score >= 60) return { badge: 'badge-confidence-blue',  bar: '#3b82f6', barGlow: 'rgba(59,130,246,0.4)', text: '#93c5fd', band: 'Blue',   action: 'Detailed review required (30–60 min). Fill gaps from source documents.' };
  return           { badge: 'badge-confidence-red',          bar: '#ef4444', barGlow: 'rgba(239,68,68,0.4)',  text: '#fca5a5', band: 'Red',    action: 'Critical concern — stop and assess root cause before proceeding.' };
}

function SummaryLine({ line }: { line: string }) {
  const t = line.trim();
  if (!t) return <div style={{ height: '6px' }} />;
  if (t.startsWith('## ')) return <p className="text-xs font-bold mt-3 mb-1" style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>{t.slice(3)}</p>;
  if (t.startsWith('### ')) return <p className="text-xs font-semibold mt-2 mb-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{t.slice(4)}</p>;
  if (t.startsWith('- ') || t.startsWith('• ')) return <p className="text-xs leading-relaxed pl-3" style={{ color: 'rgba(255,255,255,0.75)' }}>{'• '}{t.slice(2).replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
  if (/^\d+\.\s/.test(t)) return <p className="text-xs leading-relaxed pl-3" style={{ color: 'rgba(255,255,255,0.75)' }}>{t.replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
  return <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{t.replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
}

function ConfidenceCard({ stepKey, data, riskSummary, isSummaryLoading, onRequestSummary }: {
  stepKey: string; data: StepConfidence | number; riskSummary?: string; isSummaryLoading?: boolean; onRequestSummary?: () => void;
}) {
  const [showSnippets, setShowSnippets] = useState(false);
  const [showSummary, setShowSummary]   = useState(false);
  useEffect(() => { if (riskSummary) setShowSummary(true); }, [riskSummary]);

  const stepId   = SCORE_KEY_TO_STEP[stepKey] ?? stepKey;
  const stepMeta = STEP_INFO[stepId];
  const score    = typeof data === 'number' ? data : data.score;
  const colors   = scoreColor(score);
  const full     = typeof data === 'object' ? data : null;
  const snippetCount = (full?.inferredSnippets?.length ?? 0) + (full?.assumptionSnippets?.length ?? 0);

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>{stepMeta?.stage ?? stepKey}</span>
          <p className="text-sm font-semibold leading-tight" style={{ color: 'rgba(255,255,255,0.85)' }}>{stepMeta?.label ?? stepKey}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={colors.badge}>{colors.band}</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: colors.text }}>{score}%</span>
        </div>
      </div>
      <div className="w-full rounded-full mb-2 mt-2" style={{ height: '4px', background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: colors.bar, boxShadow: `0 0 6px ${colors.barGlow}` }} />
      </div>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: colors.text }}>{colors.action}</p>
      {full && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Citation breakdown — {full.breakdown.total} total tags</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            {[['Document-Backed', full.breakdown.documentBacked, '#86efac'], ['Form-Stated', full.breakdown.formStated, '#86efac'], ['Inferred', full.breakdown.inferred, '#fcd34d'], ['Assumption', full.breakdown.assumption, '#fca5a5']].map(([lbl, val, clr]) => (
              <div key={String(lbl)} className="flex items-center justify-between">
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{lbl}</span>
                <span className="font-semibold tabular-nums" style={{ color: String(clr) }}>{val}</span>
              </div>
            ))}
          </div>
          {full.breakdown.total > 0 && <p className="text-xs mt-2 pt-2" style={{ color: 'rgba(255,255,255,0.35)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>{full.highConfidenceCount} high-confidence ÷ {full.breakdown.total} total = {score}% grounded</p>}
          {full.breakdown.total === 0 && <p className="text-xs mt-1" style={{ color: '#fcd34d' }}>No confidence tags found in output — scored 0% (Red). Check that the skill prompt is generating citation tags.</p>}
        </div>
      )}
      {full?.confidenceOverview && <p className="text-xs mt-2 pt-2 leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>{full.confidenceOverview}</p>}
      {full?.noTagsReason && <p className="text-xs mt-2 pt-2 leading-relaxed" style={{ color: '#fcd34d', borderTop: '1px solid rgba(255,255,255,0.07)' }}>{full.noTagsReason}</p>}
      {full?.scoreContext && !full.noTagsReason && <p className="text-xs mt-2 pt-2 leading-relaxed" style={{ color: score >= 76 ? 'rgba(255,255,255,0.45)' : '#fcd34d', borderTop: '1px solid rgba(255,255,255,0.07)' }}>{full.scoreContext}</p>}
      {(full?.justificationEntries?.length ?? 0) > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setShowSnippets(!showSnippets)} className="text-xs font-semibold flex items-center gap-1 w-full" style={{ color: showSnippets ? '#fcd34d' : 'rgba(252,211,77,0.65)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            {showSnippets ? '▾' : '▸'}&nbsp;{showSnippets ? 'Hide' : 'Show'} justification report ({full!.lowConfidenceCount} low-confidence tag{full!.lowConfidenceCount !== 1 ? 's' : ''})
          </button>
          {full!.justificationEntries!.length < full!.lowConfidenceCount && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>{full!.justificationEntries!.length} of {full!.lowConfidenceCount} items have full justification detail.</p>}
          {showSnippets && <div className="mt-3 space-y-3">{full!.justificationEntries!.map((entry) => {
            const isInferred = entry.tag === 'Inferred';
            const tagColor = isInferred ? '#fcd34d' : '#fca5a5';
            const bgColor  = isInferred ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)';
            const bc       = isInferred ? 'rgba(245,158,11,0.22)' : 'rgba(239,68,68,0.22)';
            return (
              <div key={entry.index} className="rounded-xl text-xs leading-relaxed" style={{ background: bgColor, border: `1px solid ${bc}`, padding: '10px 12px' }}>
                <div className="flex items-center gap-2 mb-2"><span className="font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ fontSize: '0.58rem', color: tagColor, background: isInferred ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)' }}>{entry.tag}</span><span className="font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>{entry.label}</span></div>
                {entry.claim && <div className="mb-2"><span className="font-semibold" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claim</span><p className="mt-0.5 italic" style={{ color: 'rgba(255,255,255,0.65)' }}>&ldquo;{entry.claim}&rdquo;</p></div>}
                {entry.whyTagged && <div className="mb-2"><span className="font-semibold" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Why {entry.tag === 'Inferred' ? 'inferred' : 'assumed'}</span><p className="mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{entry.whyTagged}</p></div>}
                {entry.missingData && <div className="mb-2"><span className="font-semibold" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Missing data</span><p className="mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>{entry.missingData}</p></div>}
                {entry.consultantAction && <div className="mt-2 pt-2 rounded-lg px-2.5 py-2" style={{ borderTop: `1px solid ${bc}`, background: isInferred ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)' }}><span className="font-bold" style={{ color: tagColor, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>→ Consultant action</span><p className="mt-0.5 font-medium" style={{ color: tagColor }}>{entry.consultantAction}</p></div>}
              </div>
            );
          })}</div>}
        </div>
      )}
      {!full?.justificationEntries?.length && snippetCount > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setShowSnippets(!showSnippets)} className="text-xs font-semibold flex items-center gap-1" style={{ color: showSnippets ? '#fcd34d' : 'rgba(252,211,77,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {showSnippets ? '▾' : '▸'} {showSnippets ? 'Hide' : 'Show'} low-confidence tags ({full?.lowConfidenceCount ?? snippetCount})
          </button>
          {showSnippets && <div className="mt-2 space-y-2">
            {full?.inferredSnippets?.map((s, i) => <div key={`inf-${i}`} className="rounded-lg p-2.5 text-xs" style={{ background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.2)' }}><span className="font-bold uppercase" style={{ fontSize: '0.6rem', color: '#fcd34d', display: 'block', marginBottom: '2px' }}>Inferred</span><p style={{ color: 'rgba(255,255,255,0.75)' }}>{s}</p></div>)}
            {full?.assumptionSnippets?.map((s, i) => <div key={`ass-${i}`} className="rounded-lg p-2.5 text-xs" style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.2)' }}><span className="font-bold uppercase" style={{ fontSize: '0.6rem', color: '#fca5a5', display: 'block', marginBottom: '2px' }}>Assumption</span><p style={{ color: 'rgba(255,255,255,0.75)' }}>{s}</p></div>)}
          </div>}
        </div>
      )}
      {!full && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Run the pipeline again to see the full citation breakdown.</p>}
      {onRequestSummary && full && full.lowConfidenceCount > 0 && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            {!riskSummary && <button onClick={onRequestSummary} disabled={isSummaryLoading} className="text-xs font-semibold flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }}>{isSummaryLoading ? <><SpinnerIcon className="w-3 h-3 animate-spin" /> Generating AI summary…</> : <>✦ Generate AI Risk Summary</>}</button>}
            {riskSummary && <button onClick={() => setShowSummary(s => !s)} className="text-xs font-semibold flex items-center gap-1 w-full" style={{ color: showSummary ? '#a5b4fc' : 'rgba(165,180,252,0.65)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>{showSummary ? '▾' : '▸'}&nbsp;{showSummary ? 'Hide' : 'Show'} AI Risk Summary<span onClick={(e) => { e.stopPropagation(); onRequestSummary(); }} className="ml-auto text-xs" style={{ color: 'rgba(165,180,252,0.45)', cursor: 'pointer', fontWeight: 400 }} title="Regenerate">{isSummaryLoading ? <SpinnerIcon className="w-3 h-3 animate-spin inline" /> : '↺ regenerate'}</span></button>}
          </div>
          {showSummary && riskSummary && <div className="mt-3 rounded-xl p-4 space-y-0.5" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}><p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#a5b4fc' }}>✦ AI Risk Summary — {full.lowConfidenceCount} low-confidence items</p>{riskSummary.split('\n').map((line, i) => <SummaryLine key={i} line={line} />)}</div>}
        </div>
      )}
    </div>
  );
}

function StageNotes({ jobId, step, currentUser }: { jobId: string; step: string; currentUser: AuthUser | null }) {
  const storageKey = `admin-notes-${jobId}-${step}`;
  const [notes, setNotes] = useState<StageNote[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setNotes(JSON.parse(raw) as StageNote[]);
    } catch { /* noop */ }
  }, [storageKey]);

  function post() {
    const text = draft.trim();
    if (!text || !currentUser) return;
    const note: StageNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      createdAt: new Date().toISOString(),
    };
    const updated = [note, ...notes];
    setNotes(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch { /* noop */ }
    setDraft('');
    setAdding(false);
  }

  function removeNote(id: string) {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch { /* noop */ }
  }

  return (
    <div style={{ marginBottom: notes.length > 0 || adding ? '10px' : '6px' }}>
      {notes.length > 0 && (
        <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {notes.map(note => (
            <div key={note.id} style={{ background: 'rgba(99,102,241,0.09)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: '7px', padding: '7px 9px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px', marginBottom: '3px' }}>
                <div>
                  <span style={{ color: '#a5b4fc', fontSize: '0.65rem', fontWeight: 700 }}>{note.authorName} </span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem' }}>
                    {new Date(note.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button onClick={() => removeNote(note.id)} style={{ color: 'rgba(252,165,165,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.58rem', lineHeight: 1, padding: '1px 3px', flexShrink: 0 }} title="Delete note">✕</button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.7rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{note.text}</p>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', padding: '7px 8px' }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) post(); }}
            placeholder="Leave a note for this stage…"
            rows={2}
            autoFocus
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.88)', fontSize: '0.7rem', lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit', padding: 0 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '5px' }}>
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '0.6rem' }}>as {currentUser?.name} · Ctrl+Enter</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => { setAdding(false); setDraft(''); }} style={{ padding: '2px 7px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '4px', color: 'rgba(255,255,255,0.45)', fontSize: '0.62rem', cursor: 'pointer' }}>Cancel</button>
              <button onClick={post} disabled={!draft.trim()} style={{ padding: '2px 9px', background: draft.trim() ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.38)', borderRadius: '4px', color: draft.trim() ? '#a5b4fc' : 'rgba(165,180,252,0.4)', fontSize: '0.62rem', fontWeight: 700, cursor: draft.trim() ? 'pointer' : 'default' }}>Post</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', color: 'rgba(255,255,255,0.30)', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer' }}>
          + note
        </button>
      )}
    </div>
  );
}

function SkeletonCard() {
  return <div className="glass-card p-6 space-y-4"><div className="flex items-center gap-3"><div className="skeleton h-5 w-40 rounded" /><div className="skeleton h-5 w-24 rounded-full" /></div><div className="skeleton h-4 w-52 rounded" /><div className="skeleton h-2 w-full rounded-full" /></div>;
}

function formatAnswerKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).replace(/_/g, ' ').trim();
}
function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

const PAGE_SIZE = 20;

export default function AdminPage() {
  const [authenticated,    setAuthenticated]    = useState(false);
  const [authToken,        setAuthToken]        = useState('');
  const [currentUser,      setCurrentUser]      = useState<AuthUser | null>(null);
  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [activeTab,        setActiveTab]        = useState<'jobs' | 'users'>('jobs');
  const [jobs,             setJobs]             = useState<JobSummary[]>([]);
  const [users,            setUsers]            = useState<UserSummary[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [loadingUsers,     setLoadingUsers]     = useState(false);
  const [error,            setError]            = useState('');
  const [approvingId,      setApprovingId]      = useState<string | null>(null);
  const [retryingId,       setRetryingId]       = useState<string | null>(null);
  const [downloadingKey,   setDownloadingKey]   = useState<string | null>(null);
  const [deletingId,       setDeletingId]       = useState<string | null>(null);
  const [confirmDeleteId,  setConfirmDeleteId]  = useState<string | null>(null);
  const [openDropdownKey,  setOpenDropdownKey]  = useState<string | null>(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [currentPage,      setCurrentPage]      = useState(1);
  const [expandedJobIds,   setExpandedJobIds]   = useState<Set<string>>(new Set());
  const [riskSummaries,    setRiskSummaries]    = useState<Record<string, string>>({});
  const [summaryLoadingId, setSummaryLoadingId] = useState<string | null>(null);
  const [reuploadTogglingId, setReuploadTogglingId] = useState<string | null>(null);
  const [updatingClientStatus, setUpdatingClientStatus] = useState<string | null>(null);
  const [formAnswersOpenIds, setFormAnswersOpenIds] = useState<Set<string>>(new Set());
  const [uploadedFilesOpenIds, setUploadedFilesOpenIds] = useState<Set<string>>(new Set());
  const [intakeDataMap,    setIntakeDataMap]    = useState<Record<string, IntakeData>>({});
  const [loadingIntakeId,  setLoadingIntakeId]  = useState<string | null>(null);
  // Users management
  const [showCreateUser,   setShowCreateUser]   = useState(false);
  const [createForm,       setCreateForm]       = useState({ email: '', name: '', password: '', role: 'client' as 'admin' | 'client' });
  const [createError,      setCreateError]      = useState('');
  const [creatingUser,     setCreatingUser]     = useState(false);
  const [changePwdUserId,  setChangePwdUserId]  = useState<string | null>(null);
  const [changePwdValue,   setChangePwdValue]   = useState('');
  const [changePwdError,   setChangePwdError]   = useState('');
  const [savingPwd,        setSavingPwd]        = useState(false);
  const [deletingUserId,   setDeletingUserId]   = useState<string | null>(null);
  const [confirmDeleteUid, setConfirmDeleteUid] = useState<string | null>(null);
  const [userSearchQuery,  setUserSearchQuery]  = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // ── Auth helpers ─────────────────────────────────────────────────────────────

  const authHeaders = useCallback((token?: string) => ({
    Authorization: `Bearer ${token ?? authToken}`,
    'Content-Type': 'application/json',
  }), [authToken]);

  // ── Restore session on mount ─────────────────────────────────────────────────

  useEffect(() => {
    const stored = getAdminToken();
    if (!stored) return;
    validateToken(apiUrl, stored).then((user) => {
      if (user?.role === 'admin') {
        setAuthToken(stored);
        setCurrentUser(user);
        setAuthenticated(true);
        fetchJobs(stored);
      } else {
        clearAdminToken();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data fetchers ─────────────────────────────────────────────────────────────

  const fetchJobs = useCallback(async (token: string) => {
    setLoading(true);
    try {
      let res: Response;
      try {
        res = await fetch(`${apiUrl}/api/status`, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        setError(`Cannot reach the backend at ${apiUrl}. Check Railway is deployed and NEXT_PUBLIC_API_URL is set.`);
        return;
      }
      if (res.status === 401) { setError('Session expired or invalid. Please sign in again.'); setAuthenticated(false); clearAdminToken(); return; }
      if (!res.ok) { setError(`Backend error (${res.status}). Check Railway logs.`); return; }
      const data = await res.json() as JobSummary[];
      setJobs(data);
      setError('');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const fetchUsers = useCallback(async (token: string) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setError('Failed to load users.'); return; }
      setUsers(await res.json() as UserSummary[]);
    } finally {
      setLoadingUsers(false);
    }
  }, [apiUrl]);

  const fetchIntakeData = useCallback(async (jobId: string) => {
    if (intakeDataMap[jobId] || loadingIntakeId === jobId) return;
    setLoadingIntakeId(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}/intake-data`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) return;
      const data = await res.json() as IntakeData;
      setIntakeDataMap(prev => ({ ...prev, [jobId]: data }));
    } finally {
      setLoadingIntakeId(null);
    }
  }, [apiUrl, authToken, intakeDataMap, loadingIntakeId]);

  // ── Login ─────────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error || 'Login failed.');
        return;
      }
      const data = await res.json() as { token: string; user: AuthUser };
      if (data.user.role !== 'admin') {
        setError('This account does not have admin access. Use /login for client access.');
        return;
      }
      setAdminToken(data.token);
      setAuthToken(data.token);
      setCurrentUser(data.user);
      setAuthenticated(true);
      fetchJobs(data.token);
    } catch {
      setError('Could not reach the server. Please try again.');
    }
  };

  // ── Job actions ───────────────────────────────────────────────────────────────

  const handleRetry = async (jobId: string) => {
    setRetryingId(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}/retry`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) throw new Error('Failed to retry');
      await fetchJobs(authToken);
    } catch { setError('Failed to retry job'); } finally { setRetryingId(null); }
  };

  const handleApprove = async (jobId: string) => {
    setApprovingId(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) throw new Error('Failed to approve');
      await fetchJobs(authToken);
    } catch { setError('Failed to approve job'); } finally { setApprovingId(null); }
  };

  const handleClientStatusUpdate = async (jobId: string, status: string) => {
    setUpdatingClientStatus(jobId);
    // Optimistic update
    setJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, clientVisibleStatus: status as JobSummary['clientVisibleStatus'] } : j));
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}/client-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update');
    } catch { setError('Failed to update client status'); await fetchJobs(authToken); } finally { setUpdatingClientStatus(null); }
  };

  const handleToggleReupload = async (jobId: string, currentlyAllowed: boolean) => {
    setReuploadTogglingId(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}/request-reupload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentlyAllowed }),
      });
      if (!res.ok) throw new Error('Failed to toggle re-upload');
      await fetchJobs(authToken);
    } catch { setError('Failed to update re-upload setting'); } finally { setReuploadTogglingId(null); }
  };

  const handleDelete = useCallback(async (jobId: string) => {
    if (confirmDeleteId !== jobId) { setConfirmDeleteId(jobId); return; }
    setConfirmDeleteId(null);
    setDeletingId(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) throw new Error('Delete failed');
      await fetchJobs(authToken);
    } catch { setError('Failed to delete job'); } finally { setDeletingId(null); }
  }, [apiUrl, authToken, confirmDeleteId, fetchJobs]);

  const handleDownload = useCallback(async (jobId: string, format: 'docx' | 'pdf' | 'txt', clientName: string) => {
    const key  = `${jobId}-${format}`;
    const p    = format === 'docx' ? '' : `/${format}`;
    setDownloadingKey(key);
    try {
      const res = await fetch(`${apiUrl}/api/download/${jobId}${p}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) { let msg = `Download failed (${res.status})`; try { const d = await res.json() as { error?: string }; msg = d.error ?? msg; } catch { /* ignore */ } setError(msg); return; }
      const blob = await res.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `AI Value Blueprint - ${clientName}.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
      setError('');
    } catch { setError('Download failed — check your connection and try again.'); } finally { setDownloadingKey(null); }
  }, [apiUrl, authToken]);

  const handleDownloadLcTags = useCallback(async (jobId: string, clientName: string) => {
    const key = `${jobId}-lc`;
    setDownloadingKey(key);
    try {
      const res = await fetch(`${apiUrl}/api/download/${jobId}/lc-tags`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) { let msg = `Download failed (${res.status})`; try { const d = await res.json() as { error?: string }; msg = d.error ?? msg; } catch { /* ignore */ } setError(msg); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `LC Tags - ${clientName}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      setError('');
    } catch { setError('Download failed — check your connection and try again.'); } finally { setDownloadingKey(null); }
  }, [apiUrl, authToken]);

  const handleRequestSummary = useCallback(async (jobId: string) => {
    if (summaryLoadingId === jobId) return;
    setSummaryLoadingId(jobId);
    try {
      const res = await fetch(`${apiUrl}/api/status/${jobId}/risk-summary`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) { const d = await res.json() as { error?: string }; setError(d.error ?? `Risk summary failed (${res.status})`); return; }
      const d = await res.json() as { summary: string };
      setRiskSummaries(prev => ({ ...prev, [jobId]: d.summary }));
    } catch { setError('Failed to generate risk summary.'); } finally { setSummaryLoadingId(null); }
  }, [apiUrl, authToken, summaryLoadingId]);

  // ── User actions ──────────────────────────────────────────────────────────────

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.email || !createForm.name || !createForm.password) { setCreateError('All fields are required.'); return; }
    if (createForm.password.length < 8) { setCreateError('Password must be at least 8 characters.'); return; }
    setCreatingUser(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/users`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(createForm),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; setCreateError(d.error || 'Failed to create user.'); return; }
      setShowCreateUser(false);
      setCreateForm({ email: '', name: '', password: '', role: 'client' });
      await fetchUsers(authToken);
    } catch { setCreateError('Failed to create user.'); } finally { setCreatingUser(false); }
  };

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (confirmDeleteUid !== userId) { setConfirmDeleteUid(userId); return; }
    setConfirmDeleteUid(null);
    setDeletingUserId(userId);
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } });
      if (!res.ok) throw new Error('Delete failed');
      await fetchUsers(authToken);
    } catch { setError('Failed to delete user.'); } finally { setDeletingUserId(null); }
  }, [apiUrl, authToken, confirmDeleteUid, fetchUsers]);

  const handleChangePassword = async (userId: string) => {
    if (!changePwdValue || changePwdValue.length < 8) { setChangePwdError('Password must be at least 8 characters.'); return; }
    setSavingPwd(true);
    setChangePwdError('');
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${userId}/change-password`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ newPassword: changePwdValue }),
      });
      if (!res.ok) { const d = await res.json() as { error?: string }; setChangePwdError(d.error || 'Failed.'); return; }
      setChangePwdUserId(null);
      setChangePwdValue('');
    } catch { setChangePwdError('Failed to change password.'); } finally { setSavingPwd(false); }
  };

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => { if (!authenticated) return; const iv = setInterval(() => fetchJobs(authToken), 30000); return () => clearInterval(iv); }, [authenticated, authToken, fetchJobs]);
  useEffect(() => { if (!confirmDeleteId) return; const t = setTimeout(() => setConfirmDeleteId(null), 4000); return () => clearTimeout(t); }, [confirmDeleteId]);
  useEffect(() => { if (!confirmDeleteUid) return; const t = setTimeout(() => setConfirmDeleteUid(null), 4000); return () => clearTimeout(t); }, [confirmDeleteUid]);
  useEffect(() => { if (!openDropdownKey) return; const close = () => setOpenDropdownKey(null); document.addEventListener('click', close); return () => document.removeEventListener('click', close); }, [openDropdownKey]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);
  useEffect(() => { if (activeTab === 'users' && authenticated) fetchUsers(authToken); }, [activeTab, authenticated, authToken, fetchUsers]);
  useEffect(() => {
    if (expandedJobIds.size === 0) return;
    expandedJobIds.forEach(jobId => { if (!intakeDataMap[jobId]) fetchIntakeData(jobId); });
  }, [expandedJobIds, intakeDataMap, fetchIntakeData]);

  // ── URL helpers ───────────────────────────────────────────────────────────────

  const t = encodeURIComponent(authToken);
  const previewUrl      = (jobId: string) => `${apiUrl}/api/download/${jobId}/preview?token=${t}`;
  const logsUrl         = (jobId: string) => `${apiUrl}/api/download/${jobId}/logs?token=${t}`;
  const stepPreviewUrl  = (jobId: string, step: string) => `${apiUrl}/api/download/${jobId}/step/${step}/preview?token=${t}`;
  const stepFormatUrl   = (jobId: string, step: string, fmt: 'pdf' | 'docx' | 'txt') =>
    fmt === 'txt' ? `${apiUrl}/api/download/${jobId}/step/${step}?token=${t}` : `${apiUrl}/api/download/${jobId}/step/${step}/${fmt}?token=${t}`;
  const fileDownloadUrl = (jobId: string, fileKey: string) => `${apiUrl}/api/download/${jobId}/files/${encodeURIComponent(fileKey)}?token=${t}`;
  const clientUploadUrl = (jobId: string, uploadId: string) => `${apiUrl}/api/download/${jobId}/client-uploads/${encodeURIComponent(uploadId)}?token=${t}`;

  const toggleExpanded = (jobId: string) => {
    setExpandedJobIds(prev => { const next = new Set(prev); if (next.has(jobId)) next.delete(jobId); else next.add(jobId); return next; });
  };

  // ── Filtered/paginated jobs ────────────────────────────────────────────────

  const filteredJobs  = jobs.filter(j => j.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || j.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalPages    = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const paginatedJobs = filteredJobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.email.toLowerCase().includes(userSearchQuery.toLowerCase()));

  // ── Login screen ──────────────────────────────────────────────────────────────

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" aria-hidden="true"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
        <div className="relative w-full max-w-sm">
          <div className="p-px rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.45) 0%, rgba(6,182,212,0.3) 100%)' }}>
            <div className="rounded-2xl p-8" style={{ background: 'rgba(13,13,25,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                  <ShieldIcon className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-bold text-white text-lg leading-none">Blueprint Admin</h1>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Internal reviewer access only</p>
                </div>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>Email address</label>
                  <input type="email" className="input-glass w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@aiassist.bg" autoFocus required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>Password</label>
                  <input type="password" className="input-glass w-full" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your admin password" required />
                </div>
                {error && <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>}
                <button type="submit" className="btn-primary w-full">Sign In</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">

      {/* Navbar */}
      <div className="sticky top-4 z-50 px-4">
        <header className="glass-card max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
          <div>
            <p className="font-bold text-white text-[15px]">Blueprint Admin Dashboard</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{currentUser ? `Signed in as ${currentUser.name}` : 'Auto-refreshes every 30 seconds'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchJobs(authToken)} className="btn-secondary" style={{ padding: '8px 18px', fontSize: '0.875rem' }}>
              <RefreshIcon className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={() => { clearAdminToken(); setAuthenticated(false); setAuthToken(''); setCurrentUser(null); }} className="btn-ghost" style={{ padding: '8px 14px', fontSize: '0.875rem' }}>
              <LogOutIcon className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </header>
      </div>

      {/* Tab bar */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(5,12,30,0.68)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)' }}>
          {(['jobs', 'users'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn('flex items-center gap-2 font-semibold text-sm rounded-lg px-4 py-2 transition-all duration-150')}
              style={activeTab === tab
                ? { background: 'rgba(99,102,241,0.30)', border: '1px solid rgba(99,102,241,0.40)', borderTopColor: 'rgba(129,140,248,0.55)', color: '#c7d2fe', boxShadow: '0 2px 10px rgba(99,102,241,0.22), inset 0 1px 0 rgba(255,255,255,0.12)' }
                : { color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }}
            >
              {tab === 'jobs' ? <><ClipboardListIcon className="w-4 h-4" /> Jobs</> : <><UsersIcon className="w-4 h-4" /> Users</>}
              {tab === 'jobs' && jobs.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>{jobs.length}</span>}
              {tab === 'users' && users.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>{users.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pb-8">

        {error && <div className="mb-6 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', color: '#fca5a5' }}>{error}</div>}

        {/* ── JOBS TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'jobs' && (
          <>
            {jobs.length > 0 && (
              <div className="mb-5 relative max-w-sm">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input type="text" className="input-glass w-full" style={{ paddingLeft: '2.25rem' }} placeholder="Search by name or email…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            )}

            {loading && jobs.length === 0 && <div className="space-y-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>}
            {!loading && jobs.length === 0 && <div className="glass-card p-16 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>No jobs found yet.</div>}
            {!loading && jobs.length > 0 && filteredJobs.length === 0 && <div className="glass-card p-8 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>No clients match &ldquo;{searchQuery}&rdquo;.</div>}

            {paginatedJobs.length > 0 && (
              <div className="space-y-3">
                {paginatedJobs.map((job) => {
                  const isExpanded  = expandedJobIds.has(job.jobId);
                  const intakeData  = intakeDataMap[job.jobId];
                  const isLoadingID = loadingIntakeId === job.jobId;
                  return (
                    <div key={job.jobId} className="glass-card overflow-hidden transition-all duration-200 hover:shadow-glass-hover">
                      {/* Client-visible status control */}
                      <div className="flex items-center gap-3 px-5 py-2.5" style={{ background: 'rgba(0,0,0,0.18)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>Client sees:</span>
                        <select
                          value={job.clientVisibleStatus || ''}
                          onChange={e => handleClientStatusUpdate(job.jobId, e.target.value)}
                          disabled={updatingClientStatus === job.jobId}
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '6px', color: 'rgba(255,255,255,0.78)', fontSize: '0.78rem', padding: '4px 28px 4px 9px', cursor: 'pointer', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(255,255,255,0.3)'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                        >
                          <option value="" disabled style={{ background: '#13131f', color: 'rgba(255,255,255,0.4)' }}>— not set —</option>
                          <option value="received"     style={{ background: '#13131f' }}>Received</option>
                          <option value="in_progress"  style={{ background: '#13131f' }}>In Progress</option>
                          <option value="under_review" style={{ background: '#13131f' }}>Under Review</option>
                          <option value="ready"        style={{ background: '#13131f' }}>Ready</option>
                        </select>
                        {updatingClientStatus === job.jobId && <SpinnerIcon className="w-3 h-3 animate-spin" style={{ color: '#a5b4fc' } as React.CSSProperties} />}
                        {job.clientVisibleStatus && (
                          <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.22)' }}>
                            · client sees &ldquo;{
                              { received: 'We have received your submission', in_progress: 'Our consultants are working on your Blueprint', under_review: 'Your Blueprint is in final review', ready: 'Your Blueprint is ready to download' }[job.clientVisibleStatus] ?? job.clientVisibleStatus
                            }&rdquo;
                          </span>
                        )}
                      </div>
                      {/* Header */}
                      <div className="flex items-start justify-between flex-wrap gap-4 p-5 cursor-pointer select-none" onClick={() => toggleExpanded(job.jobId)}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h2 className="font-bold text-white text-base">{job.clientName}</h2>
                            <span className={STATUS_BADGE[job.status]}>{STATUS_LABELS[job.status]}</span>
                            {job.status === 'approved' && job.approvedByName && (
                              <span className="text-xs" style={{ color: 'rgba(134,239,172,0.6)' }}>✓ by {job.approvedByName}</span>
                            )}
                            {job.reuploadAllowed && (
                              <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                                <UploadCloudIcon className="w-3 h-3" /> {job.clientUploadCount} re-upload{job.clientUploadCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{job.clientEmail}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {new Date(job.startedAt).toLocaleString()}{job.completedAt && ` · ${new Date(job.completedAt).toLocaleString()}`}
                          </p>
                        </div>

                        <div className="flex gap-2 flex-wrap items-center" onClick={e => e.stopPropagation()}>
                          {(job.status === 'review_ready' || job.status === 'approved') && (
                            <a href={previewUrl(job.jobId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px" style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
                              <EyeIcon className="w-3.5 h-3.5" /> Preview
                            </a>
                          )}
                          {job.status === 'review_ready' && (
                            <button onClick={() => handleApprove(job.jobId)} disabled={approvingId === job.jobId} className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed" style={{ padding: '7px 16px', background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.35)', color: '#86efac' }}>
                              {approvingId === job.jobId ? <><SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Approving…</> : <><CheckCircleIcon className="w-3.5 h-3.5" /> Approve</>}
                            </button>
                          )}
                          {job.status === 'failed' && (
                            <button onClick={() => handleRetry(job.jobId)} disabled={retryingId === job.jobId} className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px disabled:opacity-40" style={{ padding: '7px 16px', background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.35)', color: '#fcd34d' }}>
                              {retryingId === job.jobId ? <><SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Retrying…</> : <><RefreshIcon className="w-3.5 h-3.5" /> Retry</>}
                            </button>
                          )}
                          {(job.status === 'review_ready' || job.status === 'approved') && (
                            <button onClick={() => handleRetry(job.jobId)} disabled={retryingId === job.jobId} className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px disabled:opacity-40" style={{ padding: '7px 16px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.32)', color: '#a5b4fc' }}>
                              {retryingId === job.jobId ? <><SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Re-running…</> : <><RefreshIcon className="w-3.5 h-3.5" /> Re-run</>}
                            </button>
                          )}
                          <a href={logsUrl(job.jobId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px" style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>
                            <TerminalIcon className="w-3.5 h-3.5" /> Logs
                          </a>
                          <button onClick={() => handleDelete(job.jobId)} disabled={deletingId === job.jobId} className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px disabled:opacity-40"
                            style={confirmDeleteId === job.jobId ? { padding: '7px 14px', background: 'rgba(239,68,68,0.22)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' } : { padding: '7px 14px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.6)' }}>
                            {deletingId === job.jobId ? <><SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : confirmDeleteId === job.jobId ? <><TrashIcon className="w-3.5 h-3.5" /> Confirm</> : <><TrashIcon className="w-3.5 h-3.5" /> Delete</>}
                          </button>
                          <button onClick={e => { e.stopPropagation(); toggleExpanded(job.jobId); }} className="inline-flex items-center justify-center rounded-full transition-all duration-200" style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}>
                            <ChevronDownIcon className="w-4 h-4 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                          </button>
                        </div>
                      </div>

                      {/* Collapsible content */}
                      {isExpanded && (
                        <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                          {/* Download format buttons */}
                          {(job.status === 'review_ready' || job.status === 'approved') && (
                            <div className="flex gap-2 mt-4 flex-wrap items-center">
                              <span className="text-xs mr-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Download as:</span>
                              {(['pdf', 'docx', 'txt'] as const).map((fmt) => {
                                const key = `${job.jobId}-${fmt}`;
                                const fc = { pdf: { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', color: '#93c5fd' }, docx: { bg: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }, txt: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.55)' } }[fmt];
                                return (
                                  <button key={fmt} onClick={() => handleDownload(job.jobId, fmt, job.clientName)} disabled={downloadingKey === key} className="inline-flex items-center gap-1.5 font-semibold text-sm rounded-full transition-all duration-200 hover:-translate-y-px disabled:opacity-40" style={{ padding: '6px 14px', background: fc.bg, border: `1px solid ${fc.border}`, color: fc.color }}>
                                    {downloadingKey === key ? <><SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> Downloading…</> : <><DownloadIcon className="w-3.5 h-3.5" /> {fmt.toUpperCase()}</>}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Progress */}
                          <div className="mt-4">
                            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                              <span>{STEP_INFO[job.currentStep] ? `${STEP_INFO[job.currentStep].stage}: ${STEP_INFO[job.currentStep].label}` : job.currentStep}</span>
                              <span>{job.progress}%</span>
                            </div>
                            <div className="w-full rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(255,255,255,0.08)' }}>
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${job.progress}%`, background: job.status === 'failed' ? 'linear-gradient(90deg, #ef4444, #fca5a5)' : job.status === 'approved' ? 'linear-gradient(90deg, #22c55e, #86efac)' : 'linear-gradient(90deg, #6366F1, #818CF8)', boxShadow: job.status === 'failed' ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 8px rgba(99,102,241,0.5)' }} />
                            </div>
                          </div>

                          {/* Request re-upload button */}
                          <div className="mt-4 flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => handleToggleReupload(job.jobId, job.reuploadAllowed)}
                              disabled={reuploadTogglingId === job.jobId}
                              className="inline-flex items-center gap-1.5 font-semibold text-xs rounded-full transition-all duration-200 hover:-translate-y-px disabled:opacity-40"
                              style={job.reuploadAllowed
                                ? { padding: '6px 14px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fcd34d' }
                                : { padding: '6px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}
                            >
                              {reuploadTogglingId === job.jobId ? <SpinnerIcon className="w-3 h-3 animate-spin" /> : <UploadCloudIcon className="w-3 h-3" />}
                              {job.reuploadAllowed ? 'Disable File Re-uploads' : 'Request Additional Files'}
                            </button>
                            {job.clientUploadCount > 0 && (
                              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                {job.clientUploadCount} file{job.clientUploadCount !== 1 ? 's' : ''} uploaded by client
                              </span>
                            )}
                          </div>

                          {/* Confidence scores */}
                          {Object.keys(job.confidenceScores).length > 0 && (
                            <div className="mt-5">
                              <div className="flex items-center justify-between mb-3 gap-2">
                                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>AI Output Quality — Confidence Scores</p>
                                {Object.values(job.confidenceScores).some(d => typeof d === 'object' && (d.lowConfidenceCount ?? 0) > 0) && (
                                  <button
                                    onClick={() => handleDownloadLcTags(job.jobId, job.clientName)}
                                    disabled={downloadingKey === `${job.jobId}-lc`}
                                    className="inline-flex items-center gap-1.5 font-semibold text-xs rounded-full transition-all duration-200 hover:-translate-y-px disabled:opacity-40 flex-shrink-0"
                                    style={{ padding: '4px 11px', background: 'rgba(245,158,11,0.11)', border: '1px solid rgba(245,158,11,0.27)', color: '#fcd34d' }}
                                  >
                                    {downloadingKey === `${job.jobId}-lc` ? <><SpinnerIcon className="w-3 h-3 animate-spin" /> Downloading…</> : <><DownloadIcon className="w-3 h-3" /> LC Tags CSV</>}
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                {Object.entries(job.confidenceScores).map(([stepKey, data]) => (
                                  <ConfidenceCard key={stepKey} stepKey={stepKey} data={data}
                                    riskSummary={stepKey === 'stepE' ? riskSummaries[job.jobId] : undefined}
                                    isSummaryLoading={stepKey === 'stepE' && summaryLoadingId === job.jobId}
                                    onRequestSummary={stepKey === 'stepE' ? () => handleRequestSummary(job.jobId) : undefined}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reviewer flags */}
                          {job.reviewerFlags.length > 0 && (
                            <div className="mt-4 p-3.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.09)', border: '1px solid rgba(245,158,11,0.22)' }}>
                              <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5" style={{ color: '#fcd34d' }}><AlertTriangleIcon className="w-3.5 h-3.5" /> Reviewer Flags</p>
                              <ul className="space-y-1">{job.reviewerFlags.map((flag, i) => <li key={i} className="text-xs" style={{ color: 'rgba(252,211,77,0.8)' }}>· {flag}</li>)}</ul>
                            </div>
                          )}

                          {/* Truncation warning */}
                          {job.truncationMeta && (
                            <div className="mt-3 p-3.5 rounded-xl flex items-start justify-between gap-3 flex-wrap" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)' }}>
                              <div>
                                <p className="text-xs font-semibold flex items-center gap-1.5 mb-0.5" style={{ color: '#fcd34d' }}><AlertTriangleIcon className="w-3.5 h-3.5" /> Stage 5 Input Truncated</p>
                                <p className="text-xs" style={{ color: 'rgba(252,211,77,0.7)' }}>Opportunity Map trimmed from <span style={{ fontWeight: 700, color: '#fcd34d' }}>{job.truncationMeta.originalLength.toLocaleString()}</span> to <span style={{ fontWeight: 700, color: '#fcd34d' }}>{job.truncationMeta.truncatedLength.toLocaleString()}</span> chars.</p>
                              </div>
                              <button onClick={() => window.open(`/admin/compare?jobId=${encodeURIComponent(job.jobId)}&token=${encodeURIComponent(authToken)}`, '_blank', 'width=1400,height=900,scrollbars=yes')} className="inline-flex items-center gap-1.5 font-semibold text-xs rounded-full flex-shrink-0 transition-all duration-200 hover:-translate-y-px" style={{ padding: '7px 14px', background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)', color: '#fcd34d', whiteSpace: 'nowrap' }}>
                                Compare truncated &amp; untruncated versions
                              </button>
                            </div>
                          )}

                          {/* Error log */}
                          {job.status === 'failed' && (
                            <div className="mt-4 p-3.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.22)' }}>
                              <p className="text-xs font-semibold flex items-center gap-1.5 mb-1.5" style={{ color: '#fca5a5' }}><TerminalIcon className="w-3.5 h-3.5" /> Pipeline Error — Failed at {STEP_INFO[job.currentStep] ? `${STEP_INFO[job.currentStep].stage}: ${STEP_INFO[job.currentStep].label}` : job.currentStep}</p>
                              {job.errorLog.length > 0 ? <ul className="space-y-1">{job.errorLog.map((e, i) => <li key={i} className="text-xs font-mono break-all" style={{ color: 'rgba(252,165,165,0.8)' }}>{e}</li>)}</ul> : <p className="text-xs" style={{ color: 'rgba(252,165,165,0.7)' }}>No error details stored. Check Railway logs.</p>}
                            </div>
                          )}

                          {/* Client Data section */}
                          <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              <FolderOpenIcon className="w-3.5 h-3.5" /> Client Submissions
                            </p>

                            {isLoadingID && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading client data…</p>}

                            {intakeData && (
                              <div className="space-y-3">
                                {/* Form answers */}
                                {Object.keys(intakeData.formAnswers).length > 0 && (
                                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                                    <button
                                      className="w-full px-3 py-2 flex items-center justify-between transition-colors"
                                      style={{ background: 'rgba(255,255,255,0.04)' }}
                                      onClick={() => setFormAnswersOpenIds(prev => {
                                        const next = new Set(prev);
                                        next.has(job.jobId) ? next.delete(job.jobId) : next.add(job.jobId);
                                        return next;
                                      })}
                                    >
                                      <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Form Answers</p>
                                      <span className="text-xs transition-transform" style={{ color: 'rgba(255,255,255,0.3)', transform: formAnswersOpenIds.has(job.jobId) ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
                                    </button>
                                    {formAnswersOpenIds.has(job.jobId) && (
                                      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                        {Object.entries(intakeData.formAnswers)
                                          .filter(([k]) => !['clientName', 'clientEmail'].includes(k))
                                          .map(([key, value]) => (
                                            <div key={key} className="px-3 py-2 flex gap-3">
                                              <span className="text-xs font-medium flex-shrink-0 w-36" style={{ color: 'rgba(255,255,255,0.4)' }}>{formatAnswerKey(key)}</span>
                                              <span className="text-xs break-words" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                                {Array.isArray(value) ? value.join(', ') : String(value) || '—'}
                                              </span>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Original uploaded files */}
                                {Object.keys(intakeData.uploadedFiles).length > 0 && (
                                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                                    <button
                                      className="w-full px-3 py-2 flex items-center justify-between transition-colors"
                                      style={{ background: 'rgba(255,255,255,0.04)' }}
                                      onClick={() => setUploadedFilesOpenIds(prev => {
                                        const next = new Set(prev);
                                        next.has(job.jobId) ? next.delete(job.jobId) : next.add(job.jobId);
                                        return next;
                                      })}
                                    >
                                      <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>Uploaded Files</p>
                                      <span className="text-xs transition-transform" style={{ color: 'rgba(255,255,255,0.3)', transform: uploadedFilesOpenIds.has(job.jobId) ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
                                    </button>
                                    {uploadedFilesOpenIds.has(job.jobId) && (
                                      <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                        {Object.entries(intakeData.uploadedFiles).map(([fileKey, info]) => (
                                          <div key={fileKey} className="px-3 py-2 flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{info.filename}</p>
                                              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatAnswerKey(fileKey)} · {formatBytes(info.size)}</p>
                                            </div>
                                            <a href={fileDownloadUrl(job.jobId, fileKey)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-xs rounded-full flex-shrink-0 transition-all hover:-translate-y-px" style={{ padding: '4px 12px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', textDecoration: 'none' }}>
                                              <DownloadIcon className="w-3 h-3" /> Download
                                            </a>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Client re-uploads */}
                                {intakeData.clientUploads.length > 0 && (
                                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.18)' }}>
                                    <div className="px-3 py-2" style={{ background: 'rgba(99,102,241,0.07)' }}>
                                      <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#a5b4fc' }}>
                                        <UploadCloudIcon className="w-3 h-3" /> Client Re-uploads ({intakeData.clientUploads.length})
                                      </p>
                                    </div>
                                    <div className="divide-y" style={{ borderColor: 'rgba(99,102,241,0.1)' }}>
                                      {intakeData.clientUploads.map((u) => (
                                        <div key={u.id} className="px-3 py-2 flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{u.filename}</p>
                                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatBytes(u.size)} · {new Date(u.uploadedAt).toLocaleString()}</p>
                                          </div>
                                          <a href={clientUploadUrl(job.jobId, u.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-xs rounded-full flex-shrink-0 transition-all hover:-translate-y-px" style={{ padding: '4px 12px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc', textDecoration: 'none' }}>
                                            <DownloadIcon className="w-3 h-3" /> Download
                                          </a>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Raw pipeline outputs */}
                          {(job.status === 'review_ready' || job.status === 'approved') && (
                            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                              <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>Raw pipeline outputs — preview or download each stage&apos;s AI output</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {(['B', 'C', 'D', 'D2', 'E'] as const).map((step) => {
                                  const info = STEP_INFO[step];
                                  const dropKey = `${job.jobId}-${step}`;
                                  const isOpen  = openDropdownKey === dropKey;
                                  return (
                                    <div key={step} title={info.description} style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', padding: '10px 12px' }}>
                                      <StageNotes jobId={job.jobId} step={step} currentUser={currentUser} />
                                      <span style={{ color: 'rgba(165,180,252,0.6)', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '2px' }}>{info.stage}</span>
                                      <span style={{ color: '#a5b4fc', fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '8px', lineHeight: 1.3 }}>{info.label}</span>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        <a href={stepPreviewUrl(job.jobId, step)} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px', padding: '4px 6px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '0.68rem', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                          <EyeIcon className="w-3 h-3" /> Preview
                                        </a>
                                        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                          <button onClick={() => setOpenDropdownKey(isOpen ? null : dropKey)} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '4px 8px', background: isOpen ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: '6px', color: '#a5b4fc', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                            <DownloadIcon className="w-3 h-3" /> {isOpen ? '▴' : '▾'}
                                          </button>
                                          {isOpen && (
                                            <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', right: 0, background: '#13131f', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', padding: '4px', zIndex: 50, minWidth: '80px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                              {(['pdf', 'docx', 'txt'] as const).map((fmt) => (
                                                <a key={fmt} href={stepFormatUrl(job.jobId, step, fmt)} target="_blank" rel="noreferrer" onClick={() => setOpenDropdownKey(null)}
                                                  style={{ display: 'block', padding: '5px 10px', borderRadius: '5px', color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}
                                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.25)')}
                                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                  {fmt}
                                                </a>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed" style={{ padding: '7px 16px', fontSize: '0.8rem' }}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button key={pg} onClick={() => setCurrentPage(pg)} className={cn('font-semibold rounded-full transition-all duration-150', pg === currentPage ? 'btn-primary' : 'btn-ghost')} style={{ padding: '7px 13px', fontSize: '0.8rem', minWidth: '36px' }}>{pg}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed" style={{ padding: '7px 16px', fontSize: '0.8rem' }}>Next →</button>
              </div>
            )}
            {filteredJobs.length > 0 && <p className="text-center text-xs mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>{filteredJobs.length} client{filteredJobs.length !== 1 ? 's' : ''}{searchQuery && ` matching "${searchQuery}"`}{totalPages > 1 && ` · Page ${currentPage} of ${totalPages}`}</p>}
          </>
        )}

        {/* ── USERS TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="relative max-w-xs flex-1">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.3)' }} />
                <input type="text" className="input-glass w-full" style={{ paddingLeft: '2.25rem' }} placeholder="Search by name or email…" value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} />
              </div>
              <button onClick={() => { setShowCreateUser(true); setCreateError(''); }} className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.875rem' }}>
                <PlusIcon className="w-3.5 h-3.5" /> Create User
              </button>
            </div>

            {loadingUsers && <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>}
            {!loadingUsers && users.length === 0 && <div className="glass-card p-12 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>No user accounts yet. Create your first user above.</div>}

            {filteredUsers.length > 0 && (
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="glass-card p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: u.role === 'admin' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)', border: u.role === 'admin' ? '1px solid rgba(99,102,241,0.35)' : '1px solid rgba(255,255,255,0.1)', color: u.role === 'admin' ? '#a5b4fc' : 'rgba(255,255,255,0.45)' }}>
                        {u.role === 'admin' ? <ShieldIcon className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={u.role === 'admin' ? { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' } : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>
                            {u.role}
                          </span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{u.email}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Joined {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {changePwdUserId === u.id ? (
                        <div className="flex items-center gap-2">
                          <input type="password" className="input-glass text-xs" style={{ padding: '6px 10px', width: '160px' }} placeholder="New password (8+ chars)" value={changePwdValue} onChange={e => { setChangePwdValue(e.target.value); setChangePwdError(''); }} />
                          <button onClick={() => handleChangePassword(u.id)} disabled={savingPwd} className="inline-flex items-center gap-1 font-semibold text-xs rounded-full disabled:opacity-40" style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.35)', color: '#86efac' }}>
                            {savingPwd ? <SpinnerIcon className="w-3 h-3 animate-spin" /> : 'Save'}
                          </button>
                          <button onClick={() => { setChangePwdUserId(null); setChangePwdValue(''); setChangePwdError(''); }} className="inline-flex items-center font-semibold text-xs rounded-full" style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)' }}>Cancel</button>
                          {changePwdError && <p className="text-xs" style={{ color: '#fca5a5' }}>{changePwdError}</p>}
                        </div>
                      ) : (
                        <button onClick={() => { setChangePwdUserId(u.id); setChangePwdValue(''); setChangePwdError(''); }} className="inline-flex items-center gap-1.5 font-semibold text-xs rounded-full transition-all hover:-translate-y-px" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                          <KeyIcon className="w-3 h-3" /> Change Password
                        </button>
                      )}
                      {u.id !== currentUser?.id && (
                        <button onClick={() => handleDeleteUser(u.id)} disabled={deletingUserId === u.id}
                          className="inline-flex items-center gap-1.5 font-semibold text-xs rounded-full transition-all hover:-translate-y-px disabled:opacity-40"
                          style={confirmDeleteUid === u.id ? { padding: '6px 12px', background: 'rgba(239,68,68,0.22)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' } : { padding: '6px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.6)' }}>
                          {deletingUserId === u.id ? <SpinnerIcon className="w-3 h-3 animate-spin" /> : <TrashIcon className="w-3 h-3" />}
                          {confirmDeleteUid === u.id ? 'Confirm' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Create User Modal */}
            {showCreateUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}>
                <div className="w-full max-w-sm rounded-2xl p-7" style={{ background: 'rgba(18,18,32,0.98)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
                  <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2"><PlusIcon className="w-5 h-5" style={{ color: '#a5b4fc' } as React.CSSProperties} /> Create Account</h2>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Full name</label>
                      <input type="text" className="input-glass w-full" placeholder="Maria Petrova" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Email</label>
                      <input type="email" className="input-glass w-full" placeholder="maria@company.com" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Password</label>
                      <input type="password" className="input-glass w-full" placeholder="Minimum 8 characters" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Role</label>
                      <select className="input-glass w-full" value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as 'admin' | 'client' }))}>
                        <option value="client">Client</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    {createError && <p className="text-xs" style={{ color: '#fca5a5' }}>{createError}</p>}
                    <div className="flex gap-3 mt-2">
                      <button type="button" onClick={() => setShowCreateUser(false)} className="btn-secondary flex-1" style={{ padding: '10px 0', fontSize: '0.875rem' }}>Cancel</button>
                      <button type="submit" disabled={creatingUser} className="btn-primary flex-1 disabled:opacity-50" style={{ padding: '10px 0', fontSize: '0.875rem' }}>
                        {creatingUser ? <><SpinnerIcon className="w-4 h-4 animate-spin" /> Creating…</> : 'Create Account'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
