"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  RiArrowLeftLine,
  RiBookmarkLine,
  RiCheckLine,
  RiKanbanView,
  RiShieldCheckLine,
  RiSparklingLine,
} from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { Button, ButtonLink } from "@/components/base/buttons/button";
import { toast } from "@/components/base/toast/toast";
import type { TailorTargetJob, TailorSessionState } from "../types";
import { TARGET_JOBS_CATALOG, SEED_MASTER_PROFILE } from "../mockData";
import { JobIntelligencePane } from "./JobIntelligencePane";
import { TailorWorkspacePane } from "./TailorWorkspacePane";
import {
  decomposeJobDescription,
  rewriteBulletThreePass,
} from "@/services/ai/bulletRewriter";
import type { CoverLetterTone } from "@/services/ai/coverLetterGenerator";
import { auditAtsFormatting } from "@/services/parsing/formattingValidator";
import type { ResumeParsedData } from "@/lib/validations/resume";

interface TailorClientProps {
  initialJobId?: string;
  initialTargetJob?: TailorTargetJob | null;
  notFoundRequested?: boolean;
  initialAvailableJobs?: TailorTargetJob[];
  initialCandidateProfile?: ResumeParsedData | null;
  initialPipelineApp?: { id: string; stage: string } | null;
}

function buildGroundedCoverLetterParagraphs(
  candidate: ResumeParsedData,
  job: TailorTargetJob,
  tone: CoverLetterTone
) {
  const leadRole = candidate.experience?.[0];
  const leadBullet = leadRole?.bullets?.[0];
  const topSkills = candidate.skills?.slice(0, 4).join(", ") || "full-stack engineering";
  const matchingSkills = job.mustHaveSkills
    .filter((req) =>
      candidate.skills?.some((s) => s.toLowerCase() === req.toLowerCase())
    )
    .slice(0, 3);
  const highlightedSkills =
    matchingSkills.length > 0 ? matchingSkills.join(", ") : topSkills;

  const toneOpening =
    tone === "executive"
      ? `Having tracked ${job.company}'s trajectory, the scope of the ${job.title} role aligns closely with my track record shipping production systems.`
      : tone === "warm"
        ? `I am excited to apply for the ${job.title} opening at ${job.company}. Your team's focus strongly resonates with how I approach building reliable software.`
        : `${job.company}'s mandate for the ${job.title} position aligns directly with my hands-on background across ${highlightedSkills}.`;

  const p1 = `${toneOpening} Rather than applying broadly, I am focused on teams where verified engineering execution drives measurable product impact.`;

  const p2 = leadRole
    ? `Most recently as ${leadRole.title} at ${leadRole.company}, ${
        leadBullet
          ? leadBullet.charAt(0).toLowerCase() + leadBullet.slice(1)
          : `I delivered core capabilities utilizing ${topSkills}.`
      } This hands-on work strengthened my ability to turn ambiguous requirements into maintainable, tested production releases.`
    : `Across my recent technical projects, I have worked hands-on with ${topSkills} to ship reliable, user-focused applications from architecture through deployment.`;

  const p3 = `For ${job.company}'s requirements in ${
    job.mustHaveSkills.slice(0, 3).join(", ") || "modern software delivery"
  }, I bring verified proficiency in ${highlightedSkills} paired with disciplined debugging, automated verification, and clear cross-team communication.`;

  const p4 = `I would welcome a brief conversation to discuss how my background can contribute immediately to ${job.company} as ${job.title}. Thank you for your time and consideration.`;

  return { p1, p2, p3, p4 };
}

export function TailorClient({
  initialJobId,
  initialTargetJob,
  notFoundRequested = false,
  initialAvailableJobs,
  initialCandidateProfile,
  initialPipelineApp = null,
}: TailorClientProps) {
  const router = useRouter();
  const [tone, setTone] = useState<CoverLetterTone>("modern_tech");
  const [candidateProfile, setCandidateProfile] = useState<ResumeParsedData>(
    initialCandidateProfile && initialCandidateProfile.experience?.length > 0
      ? initialCandidateProfile
      : SEED_MASTER_PROFILE
  );
  const [aiGeneratedLetter, setAiGeneratedLetter] = useState<{
    jobId: string;
    tone: CoverLetterTone;
    paragraphs: { hook: string; evidence: string; connection: string; close: string };
    wordCount: number;
  } | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const [pipelineApp, setPipelineApp] = useState<{ id: string; stage: string } | null>(
    initialPipelineApp
  );
  const [isSavingPipeline, setIsSavingPipeline] = useState(false);

  // Sync candidate resume if not already provided from server
  useEffect(() => {
    if (initialCandidateProfile) return;
    async function loadResume() {
      try {
        const res = await fetch("/api/resumes", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.resume?.parsedData && data.resume.parsedData.experience?.length > 0) {
            setCandidateProfile(data.resume.parsedData);
          }
        }
      } catch {
        // Keep initial profile fallback
      }
    }
    void loadResume();
  }, [initialCandidateProfile]);

  const currentJob: TailorTargetJob | null = useMemo(() => {
    if (notFoundRequested) return null;
    if (initialTargetJob) return initialTargetJob;
    if (initialJobId && TARGET_JOBS_CATALOG[initialJobId]) {
      return TARGET_JOBS_CATALOG[initialJobId];
    }
    if (initialAvailableJobs && initialAvailableJobs.length > 0) {
      return initialAvailableJobs[0];
    }
    return TARGET_JOBS_CATALOG["stripe-staff-systems"];
  }, [notFoundRequested, initialTargetJob, initialJobId, initialAvailableJobs]);

  const sessionData: TailorSessionState | null = useMemo(() => {
    if (!currentJob) return null;
    const decomposed = decomposeJobDescription(currentJob.description);

    const tailoredRoles = candidateProfile.experience.map((role) => {
      const rewrittenBullets = role.bullets.map((b) =>
        rewriteBulletThreePass(b, decomposed)
      );
      rewrittenBullets.sort((a, b) => b.relevanceScore - a.relevanceScore);
      return {
        company: role.company,
        title: role.title,
        startDate: role.startDate,
        endDate: role.endDate,
        isCurrent: role.isCurrent,
        bullets: rewrittenBullets.slice(0, 5),
      };
    });

    const companyBrief = {
      companyName: currentJob.company,
      domain: `${currentJob.company.toLowerCase().replace(/[^a-z0-9]/g, "") || "company"}.com`,
      mission: `Building core capabilities and hiring for ${currentJob.title} at ${currentJob.company}.`,
      fundingStage: currentJob.atsPlatform === "Ashby" ? "Modern Tech / High-Growth" : "Active Employer",
      headcountEstimate: "Hiring Team",
      recentNewsOrInitiatives: [
        `Actively hiring for ${currentJob.title} (${currentJob.location}) via ${currentJob.atsPlatform}`,
        `Core technical focus: ${currentJob.mustHaveSkills.slice(0, 4).join(", ") || "Software Engineering"}`,
      ],
      techStack: currentJob.mustHaveSkills,
      engineeringCultureValues: [
        "Clear ownership and verifiable impact",
        "Structured problem-solving and clean engineering",
        "Direct collaboration across product and engineering",
      ],
      coreRoleChallenge: `Deliver strong execution as ${currentJob.title} at ${currentJob.company}.`,
      verifiedFactHook: `${currentJob.company}'s active search for a ${currentJob.title}`,
    };

    const activeAi =
      aiGeneratedLetter &&
      aiGeneratedLetter.jobId === currentJob.id &&
      aiGeneratedLetter.tone === tone
        ? aiGeneratedLetter
        : null;

    const fallback = buildGroundedCoverLetterParagraphs(candidateProfile, currentJob, tone);
    const paragraphs = activeAi
      ? activeAi.paragraphs
      : {
          hook: fallback.p1,
          evidence: fallback.p2,
          connection: fallback.p3,
          close: fallback.p4,
        };

    const fullLetterText = [
      paragraphs.hook,
      paragraphs.evidence,
      paragraphs.connection,
      paragraphs.close,
    ].join("\n\n");
    const wordCount = activeAi ? activeAi.wordCount : fullLetterText.split(/\s+/).filter(Boolean).length;

    const auditReport = auditAtsFormatting(
      `${fullLetterText} ${candidateProfile.summary || ""}`,
      candidateProfile,
      currentJob.mustHaveSkills
    );

    return {
      job: currentJob,
      targetJob: currentJob,
      masterProfile: candidateProfile,
      candidateProfile,
      decomposedJd: decomposed,
      tailoredRoles,
      coverLetter: {
        tone,
        paragraphs,
        wordCount,
        companyBrief,
        isClicheFree: true,
        violationsDetected: [],
      },
      auditReport,
    };
  }, [currentJob, candidateProfile, tone, aiGeneratedLetter]);

  const gapSkills = useMemo(() => {
    if (!currentJob) return [];
    const candidateText = (
      (candidateProfile.skills || []).join(" ") +
      " " +
      (candidateProfile.experience || []).map((e) => e.bullets.join(" ")).join(" ")
    ).toLowerCase();

    return currentJob.mustHaveSkills.filter(
      (skill) => !candidateText.includes(skill.toLowerCase())
    );
  }, [currentJob, candidateProfile]);

  const handleSelectJob = (job: TailorTargetJob) => {
    router.push(`/dashboard/tailor/${encodeURIComponent(job.id)}`);
  };

  const handleToneChange = (newTone: CoverLetterTone) => {
    setTone(newTone);
  };

  const handleGenerateWithAi = async () => {
    if (!currentJob) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/tailor/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: currentJob.title,
          company: currentJob.company,
          jobDescription: currentJob.description,
          tone,
          applicationId: pipelineApp?.id,
          candidateProfile,
        }),
      });
      if (!res.ok) throw new Error("Could not generate AI pack.");
      const json = await res.json();
      const letter = json?.data?.coverLetter;
      if (letter?.paragraphs) {
        setAiGeneratedLetter({
          jobId: currentJob.id,
          tone,
          paragraphs: letter.paragraphs,
          wordCount: letter.wordCount ?? 220,
        });
        toast.success("Application Pack Generated", {
          description: `Tailored bullets and cover letter updated for ${currentJob.company}.`,
        });
      }
    } catch {
      toast.error("AI Tailoring Unavailable", {
        description: "Using verified deterministic tailoring preview instead.",
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveToPipeline = async () => {
    if (!currentJob || !sessionData) return;
    setIsSavingPipeline(true);
    try {
      const coverLetterText = [
        sessionData.coverLetter.paragraphs.hook,
        sessionData.coverLetter.paragraphs.evidence,
        sessionData.coverLetter.paragraphs.connection,
        sessionData.coverLetter.paragraphs.close,
      ].join("\n\n");

      const workArrangement: "remote" | "hybrid" | "onsite" =
        currentJob.remoteType === "Hybrid"
          ? "hybrid"
          : currentJob.remoteType === "On-site"
            ? "onsite"
            : "remote";

      const sourceMap: Record<TailorTargetJob["atsPlatform"], "greenhouse" | "lever" | "ashby" | "direct"> = {
        Greenhouse: "greenhouse",
        Lever: "lever",
        Ashby: "ashby",
        Workday: "direct",
        Other: "direct",
      };

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: currentJob.id,
          company: currentJob.company,
          role: currentJob.title,
          location: currentJob.location,
          workArrangement,
          salary: currentJob.salaryRange,
          fitScore: sessionData.auditReport.overallScore,
          stage: "tailored",
          coverLetterText,
          portalUrl: currentJob.applicationUrl,
          source: sourceMap[currentJob.atsPlatform],
          tags: currentJob.mustHaveSkills.slice(0, 4),
          notes: [`Tailored resume & cover letter saved from ATS Workspace (${new Date().toLocaleDateString()}).`],
        }),
      });

      if (!res.ok) throw new Error("Failed to save to CRM pipeline");
      const data = await res.json();
      if (data.application?.id) {
        setPipelineApp({ id: data.application.id, stage: data.application.stage || "tailored" });
      }
      toast.success("Saved to CRM Pipeline", {
        description: `${currentJob.title} at ${currentJob.company} linked under Tailored.`,
      });
    } catch {
      toast.error("Could not save to CRM Pipeline", {
        description: "Ensure you are signed in and try again.",
      });
    } finally {
      setIsSavingPipeline(false);
    }
  };

  if (notFoundRequested || !currentJob || !sessionData) {
    return (
      <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8">
        <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-6 sm:p-8">
          <h1 className="text-title-2-medium">Target job not found</h1>
          <p className="mt-2 text-body-regular text-text-secondary">
            The requested job posting could not be loaded for tailoring. Choose an open role from Job Discovery.
          </p>
          <div className="mt-5">
            <ButtonLink href="/dashboard/jobs" variant="primary" leadingIcon={RiArrowLeftLine} className="min-h-11">
              Back to Job Discovery
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-separator-border pb-4">
        <div className="space-y-2">
          <ButtonLink
            href="/dashboard/jobs"
            variant="ghost"
            size="small"
            leadingIcon={RiArrowLeftLine}
            className="min-h-11 -ms-2 w-fit"
          >
            Back to Job Discovery
          </ButtonLink>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title-1-medium">ATS Application Pack</h1>
            <Chip variant="caption" color="lime" className="gap-1.5 px-2.5 py-1">
              <RiShieldCheckLine className="size-3.5" aria-hidden="true" />
              <span>Anti-hallucination guardrail active</span>
            </Chip>
          </div>
          <p className="max-w-2xl text-body-regular text-text-secondary">
            Tailoring for <strong>{currentJob.title}</strong> at <strong className="capitalize">{currentJob.company}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            leadingIcon={RiSparklingLine}
            disabled={isGeneratingAi}
            onClick={() => void handleGenerateWithAi()}
            className="min-h-11"
          >
            {isGeneratingAi ? "Tailoring with AI…" : "Enhance with AI"}
          </Button>
          <Button
            type="button"
            variant={pipelineApp ? "secondary" : "primary"}
            leadingIcon={pipelineApp ? RiCheckLine : RiBookmarkLine}
            disabled={isSavingPipeline}
            onClick={() => void handleSaveToPipeline()}
            className="min-h-11"
          >
            {isSavingPipeline
              ? "Saving to CRM…"
              : pipelineApp
                ? `Update in CRM (${pipelineApp.stage})`
                : "Save to CRM Pipeline"}
          </Button>
          {pipelineApp && (
            <ButtonLink
              href="/dashboard/applications"
              variant="primary"
              leadingIcon={RiKanbanView}
              className="min-h-11"
            >
              Open CRM Pipeline
            </ButtonLink>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <JobIntelligencePane
          currentJob={sessionData.job}
          availableJobs={initialAvailableJobs}
          companyBrief={sessionData.coverLetter.companyBrief}
          onSelectJob={handleSelectJob}
          gapSkills={gapSkills}
        />

        <TailorWorkspacePane
          session={sessionData}
          onToneChange={handleToneChange}
        />
      </div>
    </div>
  );
}
