'use client';

import { useState } from 'react';
import { EXAMPLE_ANSWERS, EXAMPLE_SOURCE_LABEL } from '@/lib/exampleAnswers';
import { CheckIcon, ChevronDownIcon, ClipboardListIcon } from '@/components/ui/icons';

// Click-to-toggle golden-case example under a form question. Deliberately NOT a hover
// tooltip: the panel stays open until toggled closed so users can select and copy the text.
interface ExampleAnswerProps {
  questionId: string;
  // true for select/multiselect/number questions, where the example is a chosen option
  // rather than text to paste.
  isSelection?: boolean;
}

export function ExampleAnswer({ questionId, isSelection = false }: ExampleAnswerProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = EXAMPLE_ANSWERS[questionId];

  if (!text) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API needs a secure context; fall back for plain-http deployments.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: '6px' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors duration-150 focus-visible:outline-none"
        style={{ color: open ? '#a5b4fc' : 'rgba(165,180,252,0.7)', background: 'none', border: 'none', padding: 0 }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#a5b4fc')}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(165,180,252,0.7)';
        }}
      >
        <span
          className="inline-flex items-center justify-center flex-shrink-0"
          style={{
            width: '15px',
            height: '15px',
            borderRadius: '50%',
            border: '1px solid currentColor',
            fontSize: '0.65rem',
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
          }}
        >
          i
        </span>
        {open ? 'Hide example answer' : 'See example answer'}
        <ChevronDownIcon
          className="w-3 h-3 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'none' } as React.CSSProperties}
        />
      </button>

      {open && (
        <div
          className="mt-2 rounded-xl p-3.5"
          style={{
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.3)',
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <span
              className="text-[0.68rem] font-semibold uppercase tracking-wide"
              style={{ color: 'rgba(165,180,252,0.8)' }}
            >
              {isSelection ? `${EXAMPLE_SOURCE_LABEL} — selected option` : EXAMPLE_SOURCE_LABEL}
            </span>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 text-xs font-semibold cursor-pointer transition-colors duration-150 px-2 py-1 rounded-lg focus-visible:outline-none"
              style={
                copied
                  ? { color: '#86efac', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)' }
                  : { color: '#a5b4fc', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)' }
              }
            >
              {copied ? <CheckIcon className="w-3 h-3" /> : <ClipboardListIcon className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div
            className="text-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', userSelect: 'text' }}
          >
            {text}
          </div>
        </div>
      )}
    </div>
  );
}
