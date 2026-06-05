'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface CompareData {
  field: string;
  originalLength: number;
  truncatedLength: number;
  original: string;
  truncated: string;
}

function CompareContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  const token = searchParams.get('token');

  const [data, setData]       = useState<CompareData | null>(null);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!jobId || !token) {
      setError('Missing jobId or token in URL parameters.');
      setLoading(false);
      return;
    }

    fetch(`${apiUrl}/api/status/${jobId}/compare-truncation?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          throw new Error(d.error ?? `Request failed (${res.status})`);
        }
        return res.json() as Promise<CompareData>;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [jobId, token, apiUrl]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0d0d19', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
        Loading comparison…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0d0d19' }}>
        <div style={{ maxWidth: '500px', padding: '24px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.9rem' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const removedChars = data.originalLength - data.truncatedLength;
  const pctRemoved   = ((removedChars / data.originalLength) * 100).toFixed(1);

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d19', color: 'rgba(255,255,255,0.85)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'white' }}>
            Step E Input — Truncation Comparison
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            Job: {jobId} · Field: Opportunity Map (Stage 3 output)
          </p>
        </div>
        <div style={{ padding: '8px 16px', borderRadius: '20px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.8rem', color: '#fcd34d', fontWeight: 600 }}>
          ⚠ {removedChars.toLocaleString()} chars removed ({pctRemoved}%)
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ padding: '12px 24px', background: 'rgba(245,158,11,0.06)', borderBottom: '1px solid rgba(245,158,11,0.15)', fontSize: '0.78rem', color: 'rgba(252,211,77,0.8)' }}>
        The original Opportunity Map was <strong style={{ color: '#fcd34d' }}>{data.originalLength.toLocaleString()} chars</strong>.
        Step E received <strong style={{ color: '#fcd34d' }}>{data.truncatedLength.toLocaleString()} chars</strong> ({pctRemoved}% removed)
        to stay within the assembly model&apos;s context window.
        Review the right panel to see what detail was dropped from the final blueprint.
      </div>

      {/* Side-by-side panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 120px)', gap: 0 }}>

        {/* Left — Untruncated (full) */}
        <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ padding: '12px 20px', background: 'rgba(34,197,94,0.07)', borderBottom: '1px solid rgba(34,197,94,0.15)', flexShrink: 0 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#86efac' }}>
              Full Version (untruncated)
            </span>
            <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'rgba(134,239,172,0.55)' }}>
              {data.originalLength.toLocaleString()} chars — what Stage 3 produced
            </span>
          </div>
          <pre style={{
            flex: 1, margin: 0, padding: '20px', overflowY: 'auto', overflowX: 'hidden',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontSize: '0.74rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.75)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            background: 'transparent',
          }}>
            {data.original || '(no original text stored)'}
          </pre>
        </div>

        {/* Right — Truncated (what Step E received) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 20px', background: 'rgba(245,158,11,0.07)', borderBottom: '1px solid rgba(245,158,11,0.15)', flexShrink: 0 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fcd34d' }}>
              Truncated Version (sent to assembly)
            </span>
            <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'rgba(252,211,77,0.5)' }}>
              {data.truncatedLength.toLocaleString()} chars — what Step E actually received
            </span>
          </div>
          <pre style={{
            flex: 1, margin: 0, padding: '20px', overflowY: 'auto', overflowX: 'hidden',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontSize: '0.74rem', lineHeight: 1.65, color: 'rgba(255,255,255,0.75)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            background: 'transparent',
          }}>
            {data.truncated || '(no truncated text stored)'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0d0d19', color: 'rgba(255,255,255,0.5)' }}>
        Loading…
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
