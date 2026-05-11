import Link from 'next/link';

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
  { step: '01', title: 'Complete the intake form', desc: 'Answer 30–40 questions about your business. Takes 20–30 minutes. Save your progress and return anytime.' },
  { step: '02', title: 'Upload supporting documents', desc: 'Share your P&L, org chart, process docs, and sales data. The more you share, the more specific your Blueprint.' },
  { step: '03', title: 'We run the analysis', desc: 'Our AI pipeline and senior consultants analyse your data across 5 strategic dimensions.' },
  { step: '04', title: 'Receive your Blueprint', desc: 'Within 10–14 business days, you receive a personalised, boardroom-ready AI Value Blueprint.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <span className="font-bold text-gray-900">AI Assist BG</span>
          </div>
          <Link href="/intake" className="btn-primary text-sm py-2">
            Start My Blueprint
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-blue to-brand-blue-dark text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-brand-blue-light text-sm font-semibold tracking-widest uppercase mb-4">AI Value Blueprint</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Discover exactly where AI can create value in your business
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            A personalised, evidence-based analysis of your AI opportunities — grounded in your data,
            your processes, and your strategic priorities. Not generic advice. Your Blueprint.
          </p>
          <Link href="/intake" className="inline-block bg-white text-brand-blue font-bold text-lg px-10 py-4 rounded-xl hover:bg-blue-50 transition-colors duration-200 shadow-lg">
            Start Your Blueprint Intake
          </Link>
          <p className="text-blue-200 text-sm mt-4">Takes 20–30 minutes · No commitment required · Results in 10–14 business days</p>
        </div>
      </section>

      {/* What you get */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">What you receive</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Your AI Value Blueprint is a comprehensive, boardroom-ready document built specifically for your organisation.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {DELIVERABLES.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="w-6 h-6 bg-brand-blue rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-800 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-4xl font-black text-brand-blue-light mb-3">{item.step}</p>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-brand-blue text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to build your AI roadmap?</h2>
          <p className="text-blue-100 mb-8">Start the 20-minute intake form. Save your progress and return anytime.</p>
          <Link href="/intake" className="inline-block bg-white text-brand-blue font-bold text-lg px-10 py-4 rounded-xl hover:bg-blue-50 transition-colors duration-200">
            Start Your Blueprint Intake
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        <p>© {new Date().getFullYear()} AI Assist BG · All rights reserved</p>
      </footer>
    </div>
  );
}
