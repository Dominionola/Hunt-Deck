"use client";

export type OnboardingStep = "import" | "skills" | "targets" | "reveal";

const STEPS: { id: OnboardingStep; label: string }[] = [
  { id: "import", label: "Resume" },
  { id: "skills", label: "Skills" },
  { id: "targets", label: "Goals" },
  { id: "reveal", label: "Preview" },
];

export function OnboardingProgress({ currentStep, onStepClick, maxReachedStepIndex }: {
  currentStep: OnboardingStep;
  onStepClick?: (step: OnboardingStep) => void;
  maxReachedStepIndex: number;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
  return (
    <nav aria-label="Onboarding progress" className="mb-7 sm:mb-9">
      <div className="mb-3 flex items-center justify-between text-xs text-[#5B6478]">
        <span className="font-semibold text-[#16213A]">Your setup</span>
        <span>Step {currentIndex + 1} of {STEPS.length}</span>
      </div>
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((step, index) => (
          <li key={step.id}>
            <button type="button" onClick={() => onStepClick?.(step.id)} disabled={index > maxReachedStepIndex} aria-current={index === currentIndex ? "step" : undefined} className="w-full text-left disabled:cursor-default">
              <span className={`block h-1 rounded-full transition-colors ${index <= currentIndex ? "bg-[#2D5F8A]" : "bg-[#E5E1D8]"}`} />
              <span className={`mt-2 block text-[11px] sm:text-xs ${index === currentIndex ? "font-semibold text-[#16213A]" : "text-[#5B6478]"}`}>{step.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
