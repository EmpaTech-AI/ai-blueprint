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
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-brand-blue">
          Step {currentStep} of {totalSteps}: {stepTitle}
        </span>
        <span className="text-sm text-gray-500">{pct}% complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-brand-blue h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
