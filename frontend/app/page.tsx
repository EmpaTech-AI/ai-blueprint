import Link from 'next/link';
import Image from 'next/image';
import { CheckIcon, ArrowRightIcon } from '@/components/ui/icons';

const DELIVERABLES = [
  'Company profile and strategic context analysis',
  'AI readiness score across 5 dimensions (0–100)',
  '5–8 prioritised AI use cases specific to your business',
  'A phased 12-month implementation roadmap',
  'Investment estimates and ROI indicators',
  'Implementation guidance and risk factors',
  'A polished, boardroom-ready DOCX document (12–18 pages)',
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Complete the intake form',
    desc: 'Answer 30–40 questions about your business. Takes 20–30 minutes. Save your progress and return anytime.',
  },
  {
    step: '02',
    title: 'Upload supporting documents',
    desc: 'Share your P&L, org chart, process docs, and sales data. The more you share, the more specific your Blueprint.',
  },
  {
    step: '03',
    title: 'We run the analysis',
    desc: 'Our AI pipeline and senior consultants analyse your data across 5 strategic dimensions.',
  },
  {
    step: '04',
    title: 'Receive your Blueprint',
    desc: 'Within 10–14 business days, you receive a personalised, boardroom-ready AI Value Blueprint.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">

      {/* ── Floating Navbar ─────────────────────────────────────────────── */}
      <div className="sticky top-4 z-50 px-4">
        <header
          className="glass-card max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)' }}
        >
          <Link href="/" className="flex items-center gap-3 group" aria-label="AI Assist BG home">
            <Image
              src="/logo.png"
              alt="AI Assist BG"
              width={40}
              height={40}
              className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-bold text-white text-[15px] tracking-tight">AI Assist BG</span>
          </Link>

          <Link href="/intake" className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.875rem' }}>
            Start My Blueprint
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </header>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-36 px-6">
        {/* Decorative orbs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute -top-20 -left-40 w-[580px] h-[580px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', filter: 'blur(0px)' }}
          />
          <div
            className="absolute bottom-0 -right-40 w-[500px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 65%)' }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Eyebrow pill */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs font-semibold tracking-widest uppercase"
            style={{
              background: 'rgba(99,102,241,0.13)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#818CF8', boxShadow: '0 0 6px #818CF8' }}
            />
            AI Value Blueprint
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.07] tracking-tight mb-6">
            <span className="gradient-text">Discover exactly</span>
            <br />
            <span className="text-white">where AI creates value</span>
            <br />
            <span className="text-white">in your business</span>
          </h1>

          <p
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.58)' }}
          >
            A personalised, evidence-based analysis of your AI opportunities — grounded in your
            data, your processes, and your strategic priorities. Not generic advice.{' '}
            <em style={{ color: 'rgba(255,255,255,0.75)', fontStyle: 'normal', fontWeight: 500 }}>Your Blueprint.</em>
          </p>

          <Link
            href="/intake"
            className="btn-primary inline-flex"
            style={{
              padding: '15px 38px',
              fontSize: '1.0625rem',
              boxShadow: '0 0 40px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            Start Your Blueprint Intake
            <ArrowRightIcon className="w-4 h-4" />
          </Link>

          <p className="mt-5 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Takes 20–30 minutes · No commitment required · Results in 10–14 business days
          </p>
        </div>
      </section>

      {/* ── What you receive ────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.018)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">What you receive</h2>
            <p className="max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
              Your AI Value Blueprint is a comprehensive, boardroom-ready document built
              specifically for your organisation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {DELIVERABLES.map((item, i) => (
              <div
                key={i}
                className="glass-card flex items-start gap-4 px-5 py-4 transition-all duration-200 hover:-translate-y-0.5"
                style={{ cursor: 'default' }}
              >
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    background: 'rgba(99,102,241,0.18)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: '#818CF8',
                  }}
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How it works</h2>
            <p className="max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.52)' }}>
              Four straightforward steps from intake to your personalised Blueprint.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="glass-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glass-hover"
              >
                <p
                  className="text-[3rem] font-black mb-3 leading-none"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.55) 0%, rgba(99,102,241,0.18) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {item.step}
                </p>
                <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.52)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.018)' }}>
        <div className="max-w-2xl mx-auto">
          {/* Gradient border wrapper */}
          <div
            className="p-px rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.55) 0%, rgba(6,182,212,0.4) 100%)' }}
          >
            <div
              className="rounded-2xl p-10 md:p-12 text-center relative overflow-hidden"
              style={{
                background: 'rgba(13,13,28,0.9)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {/* Inner orbs */}
              <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full pointer-events-none" aria-hidden="true"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)' }} />
              <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full pointer-events-none" aria-hidden="true"
                style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)' }} />

              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold gradient-text mb-4">
                  Ready to build your AI roadmap?
                </h2>
                <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.58)' }}>
                  Start the 20-minute intake form. Save your progress and return anytime.
                </p>
                <Link
                  href="/intake"
                  className="btn-primary inline-flex"
                  style={{ padding: '14px 36px', fontSize: '1rem' }}
                >
                  Start Your Blueprint Intake
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        className="py-8 px-6 text-center text-sm"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        © {new Date().getFullYear()} AI Assist BG · All rights reserved
      </footer>
    </div>
  );
}
