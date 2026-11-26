"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "@phosphor-icons/react";
import styles from "./onboarding.module.css";
import {
  OnboardingProgress,
  type OnboardingStep,
} from "./components/OnboardingProgress";
import { Step1Import } from "./components/Step1Import";
import { Step2Skills } from "./components/Step2Skills";
import { Step3Targets } from "./components/Step3Targets";
import { Step4Reveal } from "./components/Step4Reveal";
import { DeckMascot } from "./components/DeckMascot";
import { extractedSkills, saveOnboarding } from "@/features/onboarding/importResume";
import type { ResumeParsedData } from "@/lib/validations/resume";
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
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const currentStep = stepOrder.indexOf(initialStep) <= maxReachedIndex ? initialStep : "import";

  // Wizard state in memory
  const [importData, setImportData] = useState<Step1ImportInput | undefined>();
  const [skillsData, setSkillsData] = useState<Step2SkillsInput | undefined>();
  const [targetsData, setTargetsData] = useState<Step3TargetsInput | undefined>();
  const [parsedResume, setParsedResume] = useState<ResumeParsedData | undefined>();

  const goToStep = (step: OnboardingStep) => {
    const idx = stepOrder.indexOf(step);
    setMaxReachedIndex((prev) => Math.max(prev, idx));
    router.push(`/onboarding?step=${step}`, { scroll: false });
  };

  const handleStep1Complete = (data: Step1ImportInput, parsedData?: ResumeParsedData) => {
    const changed = data.isScratchMode || data.resumeFileId !== importData?.resumeFileId;
    if (changed || parsedData) {
      setParsedResume(parsedData);
      setSkillsData({ skills: extractedSkills(parsedData?.skills || []) });
      setTargetsData(undefined);
      setMaxReachedIndex(1);
    }
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleEnterDashboard = async () => {
    if (!importData || !skillsData || !targetsData) {
      setSubmitError("Complete each onboarding step before saving your profile.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await saveOnboarding({ importData, skillsData, targetsData });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Your profile could not be saved. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Progress Track */}
      <OnboardingProgress
        currentStep={currentStep}
        maxReachedStepIndex={Math.max(maxReachedIndex, stepOrder.indexOf(currentStep))}
        onStepClick={(step) => { if (stepOrder.indexOf(step) <= maxReachedIndex && !isSubmitting) goToStep(step); }}
      />

      <div className="mb-6 flex items-end gap-3 sm:gap-4">
        <DeckMascot step={currentStep} />
        <div className="pb-1">
          <p className="mb-1.5 text-xs font-semibold text-[#5B6478]">Deck, your guide</p>
          <div aria-live="polite" aria-atomic="true" className="rounded-2xl rounded-bl-sm border border-[#E5E1D8] bg-white px-4 py-3 text-sm font-medium leading-relaxed text-[#16213A] shadow-sm">
            <span key={currentStep} className={styles.message}>{GUIDE_MESSAGES[currentStep]}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-xl border border-[#E5E1D8] bg-white/90 backdrop-blur-xs px-4 py-2.5 text-xs text-[#5B6478] shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} weight="bold" className="text-[#2D5F8A] shrink-0" />
          <span>Private & Encrypted: Your resume and preferences are stored securely in your private workspace.</span>
        </div>
        <span className="hidden sm:inline-block text-[11px] font-semibold text-[#2D5F8A] bg-[#2D5F8A]/8 px-2 py-0.5 rounded-full">
          Review before saving
        </span>
      </div>

      {/* Dynamic Step View */}
      {submitError && <p role="alert" className="mb-4 text-body-regular text-text-error-primary">{submitError}</p>}
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
            parsedResume={parsedResume}
            onBack={() => goToStep("import")}
            onComplete={handleStep2Complete}
          />
        )}

        {currentStep === "targets" && (
          <Step3Targets
            initialData={targetsData}
            parsedResume={parsedResume}
            verifiedSkills={skillsData?.skills.filter((skill) => skill.isVerified).map((skill) => skill.name)}
            onBack={() => goToStep("skills")}
            onComplete={handleStep3Complete}
          />
        )}

        {currentStep === "reveal" && (
          <Step4Reveal
            candidateSkills={skillsData?.skills}
            parsedResume={parsedResume}
            targetTitles={targetsData?.targetTitles}
            minSalary={targetsData?.minSalary}
            workArrangement={targetsData?.workArrangement}
            onBack={() => goToStep("targets")}
            onEnterDashboard={handleEnterDashboard}
            isSubmitting={isSubmitting}
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
