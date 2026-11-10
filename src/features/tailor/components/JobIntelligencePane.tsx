"use client";

import React, { useState } from "react";
import {
  Buildings,
  MapPin,
  CurrencyDollar,
  Sparkle,
  CheckCircle,
  WarningCircle,
  ArrowsClockwise,
  ArrowSquareOut,
  Newspaper,
  Compass,
  Cpu,
} from "@phosphor-icons/react";
import type { TailorTargetJob } from "../types";
import type { CompanyContextBrief } from "@/services/ai/companyResearchService";
import { TARGET_JOBS_CATALOG } from "../mockData";

interface JobIntelligencePaneProps {
  currentJob: TailorTargetJob;
  companyBrief: CompanyContextBrief;
  onSelectJob: (job: TailorTargetJob) => void;
  gapSkills: string[];
}

export function JobIntelligencePane({
  currentJob,
  companyBrief,
  onSelectJob,
  gapSkills,
}: JobIntelligencePaneProps) {
  const [activeTab, setActiveTab] = useState<"decomposition" | "intelligence">("decomposition");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  return (
    <aside className="w-full lg:w-[45%] xl:w-[42%] flex flex-col gap-4 bg-white border border-[#E5E1D8] rounded-2xl p-5 sm:p-6 shadow-2xs overflow-y-auto">
      {/* Target Job Quick Selector */}
      <div className="relative">
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E1D8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#2D5F8A]">
              Target Job Intelligence
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#16213A] bg-[#FAF7F0] hover:bg-[#FAF7F0]/80 border border-[#E5E1D8] rounded-lg transition-colors cursor-pointer"
            >
              <span>Switch Target</span>
              <ArrowsClockwise size={12} className="text-[#5B6478]" />
            </button>

            {isSelectorOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-[#E5E1D8] rounded-xl shadow-lg z-30 py-1.5">
                <div className="px-3 py-1 text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">
                  Select Opportunity
                </div>
                {Object.values(TARGET_JOBS_CATALOG).map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => {
                      onSelectJob(job);
                      setIsSelectorOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#FAF7F0] transition-colors ${
                      job.id === currentJob.id ? "font-bold text-[#2D5F8A] bg-[#FAF7F0]/60" : "text-[#16213A]"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{job.company}</div>
                      <div className="text-[11px] text-[#5B6478] truncate max-w-[170px]">{job.title}</div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700">{job.fitScore}%</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Target Job Header Card */}
      <div className="p-4 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6478]">
              <Buildings size={14} className="text-[#2D5F8A]" />
              <span>{currentJob.company}</span>
              <span>•</span>
              <span className="text-[11px] px-1.5 py-0.2 bg-white border border-[#E5E1D8] rounded text-[#2D5F8A]">
                {currentJob.atsPlatform} ATS
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#16213A] mt-0.5 leading-tight">
              {currentJob.title}
            </h2>
          </div>

          <div className="shrink-0 text-center px-3 py-1.5 bg-white border border-emerald-200 rounded-xl shadow-2xs">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Match</div>
            <div className="text-base font-extrabold text-emerald-700">{currentJob.fitScore}%</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5B6478]">
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} />
            <span>{currentJob.location}</span>
          </span>
          {currentJob.salaryRange && (
            <span className="inline-flex items-center gap-1 font-medium text-[#16213A]">
              <CurrencyDollar size={13} className="text-emerald-700" />
              <span>{currentJob.salaryRange}</span>
            </span>
          )}
          <a
            href={currentJob.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#2D5F8A] hover:underline font-medium ml-auto"
          >
            <span>Live JD</span>
            <ArrowSquareOut size={12} />
          </a>
        </div>
      </div>

      {/* Secondary Tab Switcher: JD Decomposition vs Pre-Gen Intelligence */}
      <div className="flex border-b border-[#E5E1D8] text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("decomposition")}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "decomposition"
              ? "border-[#2D5F8A] text-[#2D5F8A] font-bold"
              : "border-transparent text-[#5B6478] hover:text-[#16213A]"
          }`}
        >
          JD Decomposition & Keywords
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("intelligence")}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeTab === "intelligence"
              ? "border-[#2D5F8A] text-[#2D5F8A] font-bold"
              : "border-transparent text-[#5B6478] hover:text-[#16213A]"
          }`}
        >
          Company Context Brief
        </button>
      </div>

      {/* Tab 1: JD Decomposition & Gap Cloud */}
      {activeTab === "decomposition" && (
        <div className="flex flex-col gap-4 text-xs">
          {/* Must-Have Skills */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#16213A] flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" weight="fill" />
                Must-Have Requirements
              </span>
              <span className="text-[10px] text-[#5B6478]">Exact string matching</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentJob.mustHaveSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200/80 rounded-lg font-medium text-[11px]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Nice-to-Have Skills */}
          <div>
            <div className="font-bold text-[#16213A] mb-2 flex items-center gap-1.5">
              <Sparkle size={14} className="text-[#2D5F8A]" />
              Nice-to-Have & Bonus Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentJob.niceToHaveSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 rounded-lg font-medium text-[11px]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Keyword Gap Cloud & Anti-Hallucination Guardrail */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-1.5">
              <WarningCircle size={15} weight="fill" className="text-amber-700" />
              <span>Competitive Keyword Gap Analysis</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed mb-2.5">
              Skills identified in the job requirements not present in your Master Profile are surfaced below.
              Hunt Deck enforces strict anti-hallucination: gaps are flagged for candidate review and never silently fabricated.
            </p>

            {gapSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {gapSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 text-amber-900 rounded-lg text-[11px] font-semibold"
                  >
                    <span>Gap: {skill}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                <CheckCircle size={13} weight="fill" className="text-emerald-600" />
                <span>Zero critical skill gaps detected. Full technical coverage verified.</span>
              </div>
            )}
          </div>

          {/* Seniority & Implicit Signals */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 bg-[#FAF7F0] border border-[#E5E1D8] rounded-lg">
              <div className="font-bold text-[#16213A] text-[11px] mb-1">Seniority Signals</div>
              <div className="text-[11px] text-[#5B6478]">
                {currentJob.senioritySignals.join(" • ")}
              </div>
            </div>
            <div className="p-2.5 bg-[#FAF7F0] border border-[#E5E1D8] rounded-lg">
              <div className="font-bold text-[#16213A] text-[11px] mb-1">Implicit Signals</div>
              <div className="text-[11px] text-[#5B6478]">
                {currentJob.implicitSkills.join(" • ")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Company Intelligence Brief */}
      {activeTab === "intelligence" && (
        <div className="flex flex-col gap-3 text-xs">
          <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-[#16213A]">
              <Compass size={14} className="text-[#2D5F8A]" />
              <span>Core Mission</span>
            </div>
            <p className="text-[#5B6478] leading-relaxed text-[11px]">{companyBrief.mission}</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 bg-[#FAF7F0] border border-[#E5E1D8] rounded-lg">
              <div className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">Funding Stage</div>
              <div className="text-xs font-semibold text-[#16213A] mt-0.5">{companyBrief.fundingStage}</div>
            </div>
            <div className="p-2.5 bg-[#FAF7F0] border border-[#E5E1D8] rounded-lg">
              <div className="text-[10px] font-bold text-[#5B6478] uppercase tracking-wider">Headcount</div>
              <div className="text-xs font-semibold text-[#16213A] mt-0.5">{companyBrief.headcountEstimate}</div>
            </div>
          </div>

          {/* Verified Fact Hook for Cover Letter */}
          <div className="p-3 bg-[#EDF3F7] border border-[#2D5F8A]/20 rounded-xl">
            <div className="flex items-center gap-1.5 font-bold text-[#2D5F8A] mb-1">
              <Newspaper size={14} />
              <span>Verified Fact Hook (P1 Architecture)</span>
            </div>
            <p className="text-[11px] text-[#16213A] font-medium leading-relaxed">
              &quot;{companyBrief.verifiedFactHook}&quot;
            </p>
            <div className="text-[10px] text-[#5B6478] mt-1">
              Pre-computed from recent engineering releases & verified press milestones.
            </div>
          </div>

          {/* Recent Engineering Initiatives */}
          <div className="p-3 bg-white border border-[#E5E1D8] rounded-xl">
            <div className="flex items-center gap-1.5 font-bold text-[#16213A] mb-2">
              <Cpu size={14} className="text-[#2D5F8A]" />
              <span>Recent Technical Initiatives</span>
            </div>
            <ul className="space-y-1.5 text-[11px] text-[#5B6478] list-disc list-inside">
              {companyBrief.recentNewsOrInitiatives.map((item, idx) => (
                <li key={idx} className="leading-snug">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
}
