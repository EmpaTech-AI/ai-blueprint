'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
}

export function ProgressBar({ currentStep, totalSteps, stepTitle }: ProgressBarProps) {
  const pct = Math.round(((currentStep - 1) / totalSteps) * 100);

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-3">
        <div>
          <span
            className="text-sm font-semibold"
            style={{ color: '#a5b4fc' }}
          >
            Step {currentStep} of {totalSteps}
          </span>
          <span
            className="text-sm ml-2"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            — {stepTitle}
          </span>
        </div>
        <span
          className="text-xs font-semibold tabular-nums"
          style={{ color: 'rgba(255,255,255,0.45)' }}
        >
          {pct}%
        </span>
      </div>

      {/* Track */}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{
          height: '4px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Form progress: ${pct}%`}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #6366F1 0%, #818CF8 100%)',
            boxShadow: '0 0 10px rgba(99,102,241,0.5)',
          }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between mt-2 px-0.5">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const done    = stepNum < currentStep;
          const active  = stepNum === currentStep;
          return (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{
                background: done
                  ? '#6366F1'
                  : active
                  ? '#818CF8'
                  : 'rgba(255,255,255,0.15)',
                boxShadow: active ? '0 0 6px rgba(99,102,241,0.7)' : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
