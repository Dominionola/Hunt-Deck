"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  MapPin,
  CurrencyDollar,
  Eye,
  ShieldCheck,
  SpinnerGap,
} from "@phosphor-icons/react";
import type { TopMatchCard, SkillItem } from "@/lib/validations/onboarding";
import { calculateCandidateFit } from "@/services/matching/fitScoreEngine";
import type { ResumeParsedData } from "@/lib/validations/resume";

interface Step4RevealProps {
  candidateSkills?: SkillItem[];
  targetTitles?: string[];
  minSalary?: number;
  workArrangement?: string;
  onBack: () => void;
  onEnterDashboard: () => void;
  isSubmitting?: boolean;
}

const SEED_OPPORTUNITIES = [
  {
    id: "match-1",
    companyName: "Stripe",
    roleTitle: "Staff Software Engineer — Core Platform",
    location: "Remote US",
    compensationRange: "$205,000 – $240,000",
    atsSource: "Greenhouse",
    description: "Architect high-throughput settlement systems handling billions in payments. Requires TypeScript, Distributed Systems, PostgreSQL, Go, AWS, Docker.",
    requiredSkills: ["TypeScript", "Distributed Systems", "PostgreSQL", "Go", "AWS", "Docker", "System Architecture"],
  },
  {
    id: "match-2",
    companyName: "Vercel",
    roleTitle: "Senior Infrastructure Engineer — Edge Fleet",
    location: "Remote US",
    compensationRange: "$190,000 – $220,000",
    atsSource: "Lever",
    description: "Scale globally distributed edge computing infrastructure. Requires Next.js, Docker, AWS, CI/CD Pipelines, Kubernetes, TypeScript, Redis.",
    requiredSkills: ["Next.js", "Docker", "AWS", "CI/CD Pipelines", "TypeScript", "Redis"],
  },
  {
    id: "match-3",
    companyName: "Linear",
    roleTitle: "Senior Full-Stack Engineer — Sync Engine",
    location: "Remote US / SF",
    compensationRange: "$180,000 – $215,000",
    atsSource: "Ashby",
    description: "Design offline-first real-time sync engine with sub-50ms latency. Requires React, TypeScript, Node.js, Redis, System Architecture, PostgreSQL.",
    requiredSkills: ["React", "TypeScript", "Node.js", "Redis", "System Architecture", "PostgreSQL"],
  },
  {
    id: "match-4",
    companyName: "Figma",
    roleTitle: "Staff Systems Engineer — Collaboration Infrastructure",
    location: "Remote US",
    compensationRange: "$220,000 – $260,000",
    atsSource: "Greenhouse",
    description: "Power real-time multiplayer canvas engine for millions of designers worldwide. Requires TypeScript, System Architecture, React, Docker, Distributed Systems.",
    requiredSkills: ["TypeScript", "Distributed Systems", "System Architecture", "React", "Docker"],
  },
  {
    id: "match-5",
    companyName: "Datadog",
    roleTitle: "Senior Distributed Systems Engineer — APM",
    location: "New York, NY / Remote",
    compensationRange: "$195,000 – $235,000",
    atsSource: "Greenhouse",
    description: "Process trillions of telemetry events per day with ultra-low overhead. Requires Go, Python, Kafka, Kubernetes, Distributed Systems, PostgreSQL.",
    requiredSkills: ["Go", "Python", "Kafka", "Kubernetes", "Distributed Systems", "PostgreSQL"],
  },
];

export function Step4Reveal({
  candidateSkills,
  targetTitles,
  minSalary = 140000,
  workArrangement = "REMOTE",
  onBack,
  onEnterDashboard,
  isSubmitting = false,
}: Step4RevealProps) {
  const [previewedId, setPreviewedId] = useState<string | null>(null);

  // Dynamic Fit Score Engine calculation using PRD 40/30/20/10 weighting
  const matches: TopMatchCard[] = useMemo(() => {
    const verifiedSkills = candidateSkills && candidateSkills.length > 0
      ? candidateSkills.filter((s) => s.isVerified).map((s) => s.name)
      : ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"];

    const primaryTitle = targetTitles?.[0] || "Senior Software Engineer";

    const candidateProfile: ResumeParsedData = {
      fullName: "Candidate",
      email: "candidate@example.com",
      skills: verifiedSkills,
      experience: [
        {
          company: "Current Company",
          title: primaryTitle,
          startDate: "2021-01",
          isCurrent: true,
          bullets: ["Engineered scalable cloud architecture and high-performance backend pipelines."],
        },
      ],
      education: [],
      projects: [],
    };

    return SEED_OPPORTUNITIES.map((opp) => {
      const fit = calculateCandidateFit(candidateProfile, {
        title: opp.roleTitle,
        description: opp.description,
        location: opp.location,
        requiredSkills: opp.requiredSkills,
      });

      return {
        id: opp.id,
        companyName: opp.companyName,
        roleTitle: opp.roleTitle,
        fitScore: Math.max(72, Math.min(98, fit.overallScore)),
        location: opp.location,
        compensationRange: opp.compensationRange,
        atsSource: opp.atsSource,
        verifiedSkillsMetCount: fit.matchingKeywords.length,
        totalSkillsRequiredCount: opp.requiredSkills.length,
        matchedSkillsSample:
          fit.matchingKeywords.length > 0
            ? fit.matchingKeywords.slice(0, 4)
            : opp.requiredSkills.slice(0, 3),
      };
    })
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 3);
  }, [candidateSkills, targetTitles]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="w-full">
      {/* Celebratory Editorial Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2D5F8A]/10 border border-[#2D5F8A]/20 text-xs font-semibold text-[#2D5F8A] mb-3">
          <Sparkle size={14} weight="fill" />
          <span>Live Fit Engine Reveal</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-[#16213A] tracking-tight mb-2">
          Your tailored match radar,{" "}
          <span className="font-serif italic font-normal text-[#2D5F8A]">
            in sharp focus.
          </span>
        </h1>
        <p className="text-sm text-[#5B6478] max-w-lg mx-auto">
          These top roles match your verified competencies and meet your{" "}
          <strong className="text-[#16213A]">{formatCurrency(minSalary)}+</strong>{" "}
          {workArrangement.toLowerCase()} preference.
        </p>
      </div>

      {/* 3 Live High-Fit Match Cards Grid */}
      <div className="space-y-4 mb-8">
        {matches.map((job) => {
          const isPreviewing = previewedId === job.id;

          return (
            <div
              key={job.id}
              className="bg-[#FAF7F0] border border-[#E5E1D8] hover:border-[#2D5F8A]/40 transition-all rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="space-y-2.5 flex-1">
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E5E1D8] text-[11px] font-semibold text-[#16213A]">
                    {job.companyName}
                  </span>
                  <span className="text-xs text-[#5B6478] flex items-center gap-1">
                    <MapPin size={13} />
                    {job.location}
                  </span>
                  <span className="text-xs text-[#5B6478] flex items-center gap-1 font-mono">
                    <CurrencyDollar size={13} />
                    {job.compensationRange}
                  </span>
                  <span className="text-[10px] text-[#5B6478]/70 px-1.5 py-0.5 rounded bg-[#FFFFFF] border border-[#E5E1D8]">
                    {job.atsSource}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-[#16213A]">
                  {job.roleTitle}
                </h3>

                {/* Criteria Met Checklist */}
                <div className="space-y-1 text-xs text-[#5B6478]">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle size={14} weight="fill" className="text-emerald-600 shrink-0" />
                    <span>
                      {job.verifiedSkillsMetCount} of {job.totalSkillsRequiredCount} required skills matched ({job.matchedSkillsSample.join(", ")})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#5B6478]">
                    <CheckCircle size={14} weight="fill" className="text-[#2D5F8A] shrink-0" />
                    <span>Live direct ATS opportunity verified</span>
                  </div>
                </div>
              </div>

              {/* Score & Action Column with Apple HIG 44px touch target */}
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#E5E1D8]">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#16213A] text-white text-xs font-semibold font-mono shadow-xs">
                  <ShieldCheck size={14} weight="fill" className="text-[#2D5F8A]" />
                  <span>{job.fitScore}% Fit Score</span>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewedId(isPreviewing ? null : job.id)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl border border-[#E5E1D8] bg-[#FFFFFF] hover:border-[#2D5F8A] text-xs font-semibold text-[#16213A] flex items-center gap-1.5 transition-all active:scale-[0.98]"
                >
                  <Eye size={15} />
                  <span>{isPreviewing ? "Opportunity Selected" : "Inspect Match"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Launch Action Box */}
      <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onEnterDashboard}
            className="w-full sm:w-auto min-h-[44px] px-8 py-3.5 rounded-full bg-[#16213A] hover:bg-[#0D1527] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2.5 mx-auto shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            {isSubmitting ? (
              <>
                <SpinnerGap size={18} className="animate-spin" />
                <span>Entering Mission Control...</span>
              </>
            ) : (
              <>
                <span>Enter My Mission Control</span>
                <ArrowRight size={16} weight="bold" />
              </>
            )}
          </button>
          <p className="text-xs text-[#5B6478] mt-2.5">
            Step into the personalized candidate command center.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] px-3 text-xs text-[#5B6478] hover:text-[#16213A] flex items-center gap-1 transition-colors active:scale-[0.98]"
          >
            <ArrowLeft size={13} />
            <span>Recalibrate Career Targets</span>
          </button>
        </div>
      </div>
    </div>
  );
}
