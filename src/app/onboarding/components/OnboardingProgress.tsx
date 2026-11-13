"use client";

import React from "react";
import { Check } from "@phosphor-icons/react";

export type OnboardingStep = "import" | "skills" | "targets" | "reveal";

const STEPS: { id: OnboardingStep; label: string; subtitle: string }[] = [
  { id: "import", label: "Resume", subtitle: "Upload & Parse" },
  { id: "skills", label: "Skills", subtitle: "Verify Tags" },
  { id: "targets", label: "Goals", subtitle: "Calibrate Targets" },
  { id: "reveal", label: "Matches", subtitle: "Live Preview" },
];

export function OnboardingProgress({
  currentStep,
  onStepClick,
  maxReachedStepIndex,
}: {
  currentStep: OnboardingStep;
  onStepClick?: (step: OnboardingStep) => void;
  maxReachedStepIndex: number;
}) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <nav aria-label="Onboarding progress" className="mb-8 sm:mb-10">
      <div className="mb-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-[#16213A]">
          <span className="h-2 w-2 rounded-full bg-[#2D5F8A] animate-pulse" />
          <span>Step {currentIndex + 1} of {STEPS.length}</span>
          <span className="text-[#5B6478]">·</span>
          <span className="text-[#5B6478]">{STEPS[currentIndex]?.subtitle}</span>
        </div>
        <span className="font-semibold text-[#2D5F8A] tabular-nums">
          {Math.round(((currentIndex + 1) / STEPS.length) * 100)}% Complete
        </span>
      </div>

      <ol className="grid grid-cols-4 gap-2 sm:gap-3">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isAccessible = index <= maxReachedStepIndex;

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onStepClick?.(step.id)}
                disabled={!isAccessible}
                aria-current={isCurrent ? "step" : undefined}
                className={`w-full text-left group transition-all min-h-[44px] py-1 ${
                  isAccessible ? "cursor-pointer" : "cursor-default opacity-60"
                }`}
              >
                {/* Segment track */}
                <div className="h-1.5 w-full rounded-full bg-[#E5E1D8] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      index <= currentIndex ? "bg-[#2D5F8A] w-full" : "w-0"
                    }`}
                  />
                </div>

                {/* Step labels */}
                <div className="mt-2.5 flex items-center gap-1.5">
                  {isCompleted ? (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#2D5F8A] text-white">
                      <Check size={10} weight="bold" />
                    </span>
                  ) : (
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isCurrent
                          ? "bg-[#16213A] text-white"
                          : "bg-[#FAF7F0] border border-[#E5E1D8] text-[#5B6478]"
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                  <span
                    className={`truncate text-xs font-semibold ${
                      isCurrent
                        ? "text-[#16213A]"
                        : isCompleted
                        ? "text-[#2D5F8A]"
                        : "text-[#5B6478]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
