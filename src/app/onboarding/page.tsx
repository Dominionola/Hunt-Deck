"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./onboarding.module.css";
import {
  OnboardingProgress,
  type OnboardingStep,
} from "./components/OnboardingProgress";
import { Step1Import } from "./components/Step1Import";
import { Step2Skills } from "./components/Step2Skills";
import { Step3Targets } from "./components/Step3Targets";
import { Step4Reveal } from "./components/Step4Reveal";
import type {
  Step1ImportInput,
  Step2SkillsInput,
  Step3TargetsInput,
} from "@/lib/validations/onboarding";

const GUIDE_MESSAGES: Record<OnboardingStep, string> = {
  import: "Hi, I’m Deck. Let’s start with your resume.",
  skills: "Now make the skills list your own.",
  targets: "What would you like your next role to look like?",
  reveal: "Here’s a preview of what your matches could look like.",
};

function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL step sync
  const stepParam = searchParams.get("step") as OnboardingStep | null;
  const initialStep: OnboardingStep =
    stepParam && ["import", "skills", "targets", "reveal"].includes(stepParam)
      ? stepParam
      : "import";

  const stepOrder: OnboardingStep[] = ["import", "skills", "targets", "reveal"];
  const currentStep = initialStep;
  const [maxReachedIndex, setMaxReachedIndex] = useState<number>(() => stepOrder.indexOf(initialStep));

  // Wizard state in memory
  const [importData, setImportData] = useState<Step1ImportInput | undefined>();
  const [skillsData, setSkillsData] = useState<Step2SkillsInput | undefined>();
  const [targetsData, setTargetsData] = useState<Step3TargetsInput | undefined>();

  const goToStep = (step: OnboardingStep) => {
    const idx = stepOrder.indexOf(step);
    setMaxReachedIndex((prev) => Math.max(prev, idx));
    router.push(`/onboarding?step=${step}`, { scroll: false });
  };

  const handleStep1Complete = (data: Step1ImportInput) => {
    setImportData(data);
    goToStep("skills");
  };

  const handleStep2Complete = (data: Step2SkillsInput) => {
    setSkillsData(data);
    goToStep("targets");
  };

  const handleStep3Complete = (data: Step3TargetsInput) => {
    setTargetsData(data);
    goToStep("reveal");
  };

  const handleEnterDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="w-full">
      {/* Progress Track */}
      <OnboardingProgress
        currentStep={currentStep}
        maxReachedStepIndex={Math.max(maxReachedIndex, stepOrder.indexOf(currentStep))}
        onStepClick={(step) => goToStep(step)}
      />

      <div className="mb-6 flex items-end gap-3 sm:gap-4">
        <div className={`${styles.mascot} relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#FAF7F0] sm:h-24 sm:w-24`} aria-hidden="true">
          <div key={currentStep} className={`${styles.mascotPose} ${currentStep === "reveal" ? styles.celebrating : ""}`}>
            <Image src="/assets/huntdeck-mascot-concept.png" alt="" width={1230} height={1278} priority className={`${styles.mascotImage} ${styles[currentStep]}`} />
          </div>
        </div>
        <div className="pb-1">
          <p className="mb-1.5 text-xs font-semibold text-[#5B6478]">Deck, your guide</p>
          <div aria-live="polite" aria-atomic="true" className="rounded-2xl rounded-bl-sm border border-[#E5E1D8] bg-white px-4 py-3 text-sm font-medium leading-relaxed text-[#16213A] shadow-sm">
            <span key={currentStep} className={styles.message}>{GUIDE_MESSAGES[currentStep]}</span>
          </div>
        </div>
      </div>

      <p className="mb-5 rounded-xl border border-[#E5E1D8] bg-white px-4 py-3 text-xs leading-relaxed text-[#5B6478]">
        Preview mode: resume analysis, suggested skills and job matches are examples and are not saved.
      </p>

      {/* Dynamic Step View */}
      <div key={currentStep} className={`w-full ${styles.step}`}>
        {currentStep === "import" && (
          <Step1Import
            initialData={importData}
            onComplete={handleStep1Complete}
          />
        )}

        {currentStep === "skills" && (
          <Step2Skills
            initialData={skillsData}
            onBack={() => goToStep("import")}
            onComplete={handleStep2Complete}
          />
        )}

        {currentStep === "targets" && (
          <Step3Targets
            initialData={targetsData}
            onBack={() => goToStep("skills")}
            onComplete={handleStep3Complete}
          />
        )}

        {currentStep === "reveal" && (
          <Step4Reveal
            minSalary={targetsData?.minSalary}
            workArrangement={targetsData?.workArrangement}
            onBack={() => goToStep("targets")}
            onEnterDashboard={handleEnterDashboard}
          />
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex items-center justify-center text-sm text-[#5B6478]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-[#2D5F8A] border-t-transparent animate-spin" />
            <span>Loading Onboarding Wizard...</span>
          </div>
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}
