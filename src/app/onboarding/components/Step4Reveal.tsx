"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Buildings,
  MapPin,
  CurrencyDollar,
  Eye,
  Check,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { TopMatchCard } from "@/lib/validations/onboarding";

interface Step4RevealProps {
  minSalary?: number;
  workArrangement?: string;
  onBack: () => void;
  onEnterDashboard: () => void;
}

const DEFAULT_MATCHES: TopMatchCard[] = [
  {
    id: "match-1",
    companyName: "Stripe",
    roleTitle: "Staff Software Engineer — Core Platform",
    fitScore: 94,
    location: "Remote US",
    compensationRange: "$205,000 – $240,000",
    atsSource: "Greenhouse",
    verifiedSkillsMetCount: 8,
    totalSkillsRequiredCount: 8,
    matchedSkillsSample: ["TypeScript", "Distributed Systems", "PostgreSQL", "Go"],
  },
  {
    id: "match-2",
    companyName: "Vercel",
    roleTitle: "Senior Infrastructure Engineer — Edge Fleet",
    fitScore: 92,
    location: "Remote US",
    compensationRange: "$190,000 – $220,000",
    atsSource: "Lever",
    verifiedSkillsMetCount: 7,
    totalSkillsRequiredCount: 8,
    matchedSkillsSample: ["Next.js", "Docker", "AWS", "CI/CD Pipelines"],
  },
  {
    id: "match-3",
    companyName: "Linear",
    roleTitle: "Senior Full-Stack Engineer — Sync Engine",
    fitScore: 89,
    location: "Remote US / SF",
    compensationRange: "$180,000 – $215,000",
    atsSource: "Ashby",
    verifiedSkillsMetCount: 6,
    totalSkillsRequiredCount: 7,
    matchedSkillsSample: ["React", "TypeScript", "Redis", "System Architecture"],
  },
];

export function Step4Reveal({
  minSalary = 140000,
  workArrangement = "REMOTE",
  onBack,
  onEnterDashboard,
}: Step4RevealProps) {
  const [matches] = useState<TopMatchCard[]>(DEFAULT_MATCHES);
  const [previewedId, setPreviewedId] = useState<string | null>(null);

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
          <span>Example matches</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-[#16213A] tracking-tight mb-2">
          See what matches could look like,{" "}
          <span className="font-serif italic font-normal text-[#16213A]">
            at a glance.
          </span>
        </h1>
        <p className="text-sm text-[#5B6478] max-w-lg mx-auto">
          These sample roles illustrate a search with your{" "}
          <strong className="text-[#16213A]">{formatCurrency(minSalary)}+</strong>{" "}
          {workArrangement.toLowerCase()} preference. They are not live or personalized matches.
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
                      {job.verifiedSkillsMetCount} of {job.totalSkillsRequiredCount} required
                      example skills matched ({job.matchedSkillsSample.join(", ")})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#5B6478]">
                    <CheckCircle size={14} weight="fill" className="text-[#2D5F8A] shrink-0" />
                    <span>Example employer listing</span>
                  </div>
                </div>
              </div>

              {/* Score & Action Column */}
              <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#E5E1D8]">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16213A] text-white text-xs font-semibold font-mono">
                  <ShieldCheck size={14} weight="fill" className="text-[#2D5F8A]" />
                  <span>{job.fitScore}% Fit Score</span>
                </div>

                <button
                  type="button"
                  onClick={() => setPreviewedId(isPreviewing ? null : job.id)}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E1D8] bg-[#FFFFFF] hover:border-[#2D5F8A] text-xs font-medium text-[#16213A] flex items-center gap-1.5 transition-colors"
                >
                  <Eye size={14} />
                  <span>{isPreviewing ? "Example selected" : "Select example"}</span>
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
            onClick={onEnterDashboard}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#16213A] hover:bg-[#0D1527] text-white text-sm font-semibold flex items-center justify-center gap-2.5 mx-auto shadow-md hover:shadow-lg transition-all"
          >
            <span>Enter My Command Center</span>
            <ArrowRight size={16} weight="bold" />
          </button>
          <p className="text-xs text-[#5B6478] mt-2.5">
            Continue to the dashboard preview.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-[#5B6478] hover:text-[#16213A] flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Recalibrate Career Targets</span>
          </button>
        </div>
      </div>
    </div>
  );
}
