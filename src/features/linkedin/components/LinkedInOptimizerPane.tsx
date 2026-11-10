"use client";

import React, { useState } from "react";
import {
  Sparkle,
  Copy,
  Check,
  ShieldCheck,
  User,
  MagnifyingGlass,
  Sliders,
  ChatCircleText,
  Lightbulb,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import {
  auditLinkedInProfile,
  type RawLinkedInProfile,
  type LinkedInReadinessAudit,
} from "@/services/linkedin/profileScorer";
import {
  generateOptimizedHeadlines,
  generateValueFirstAbout,
  type HeadlineVariant,
  type AboutSectionGenerationResult,
} from "@/services/linkedin/headlineAboutGenerator";
import {
  analyzeSkillsGap,
  type SkillsStrategyReport,
} from "@/services/linkedin/skillsEndorsementAnalyzer";

const SAMPLE_PROFILE: RawLinkedInProfile = {
  headline: "Software Engineer at Acme | Python & Javascript",
  about: "I am a passionate software engineer with 6 years of experience building web apps. Results-driven team player who enjoys coding.",
  location: "New York, NY",
  industry: "Software Development",
  openToWork: true,
  skills: [
    { name: "TypeScript", endorsementsCount: 12 },
    { name: "React", endorsementsCount: 9 },
    { name: "Node.js", endorsementsCount: 5 },
    { name: "Python", endorsementsCount: 8 },
    { name: "PostgreSQL", endorsementsCount: 4 },
  ],
  experience: [
    {
      title: "Senior Engineer",
      company: "Acme Corp",
      bullets: [
        "Responsible for writing backend APIs and maintaining databases.",
        "Built customer dashboard features with React.",
      ],
    },
    {
      title: "Software Engineer",
      company: "Startup Co",
      bullets: [
        "Worked on full stack features and resolved customer bugs.",
      ],
    },
  ],
  education: [{ school: "NYU", degree: "B.S. Computer Science" }],
};

export function LinkedInOptimizerPane() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedHeadlineId, setSelectedHeadlineId] = useState<string>("hl_variant_1");
  const [selectedTone, setSelectedTone] = useState<"modern_tech" | "executive" | "warm">("modern_tech");

  const audit: LinkedInReadinessAudit = React.useMemo(() => {
    return auditLinkedInProfile(SAMPLE_PROFILE);
  }, []);

  const headlineVariants: HeadlineVariant[] = React.useMemo(() => {
    return generateOptimizedHeadlines({
      fullName: "Alex Rivera",
      targetRole: "Senior Full-Stack Engineer",
      yearsOfExperience: 6,
      coreSkills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Distributed Systems"],
      remotePreference: "REMOTE",
      targetIndustry: "High-Growth SaaS & Developer Tools",
      tone: selectedTone,
    });
  }, [selectedTone]);

  const activeHeadline = headlineVariants.find((h) => h.id === selectedHeadlineId) || headlineVariants[0];

  const aboutResult: AboutSectionGenerationResult = React.useMemo(() => {
    return generateValueFirstAbout(
      {
        fullName: "Alex Rivera",
        targetRole: "Senior Full-Stack Engineer",
        yearsOfExperience: 6,
        coreSkills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Distributed Systems"],
      },
      selectedTone
    );
  }, [selectedTone]);

  const skillsReport: SkillsStrategyReport = React.useMemo(() => {
    return analyzeSkillsGap(
      (SAMPLE_PROFILE.skills || []).map((s) => s.name),
      ["TypeScript", "React", "Node.js", "PostgreSQL", "Distributed Systems", "AWS", "Docker", "Go"]
    );
  }, []);

  const handleCopy = (key: string, text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard", {
      description: `${label} ready to paste directly into LinkedIn profile editor.`,
    });
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  return (
    <div className="space-y-8">
      {/* 1. Readiness Audit Banner */}
      <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-3 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 text-xs font-semibold uppercase tracking-wider">
            <Sparkle size={13} weight="fill" />
            <span>Recruiter Algorithmic Readiness</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#16213A] tracking-tight">
            Readiness Score: <span className="font-mono text-[#2D5F8A]">{audit.overallScore}/100</span>
          </h2>
          <p className="text-sm text-[#5B6478] leading-relaxed max-w-2xl">
            {audit.summary}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {audit.quickWins.slice(0, 2).map((win, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 text-xs text-[#16213A] bg-white px-3 py-1 rounded-lg border border-[#E5E1D8]"
              >
                <Lightbulb size={14} className="text-[#2D5F8A] shrink-0" />
                <span>{win}</span>
              </span>
            ))}
          </div>
        </div>

        {/* 6 Dimension Mini Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0 bg-white p-4 rounded-xl border border-[#E5E1D8]">
          {Object.entries(audit.dimensions).map(([key, dim]) => (
            <div key={key} className="p-2.5 rounded-lg bg-[#FAF7F0] border border-[#E5E1D8]/60 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#5B6478]">
                {dim.name.split(" ")[0]}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold font-mono text-[#16213A]">{dim.score}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    dim.grade === "STRONG"
                      ? "bg-emerald-100 text-emerald-800"
                      : dim.grade === "FAIR"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {dim.grade === "STRONG" ? "Pass" : "Revise"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Recruiter Search Live Preview (Apple HIG) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MagnifyingGlass size={18} className="text-[#2D5F8A]" />
            <h3 className="text-base font-bold text-[#16213A]">
              Live Recruiter Search Snippet Preview
            </h3>
          </div>
          <span className="text-xs text-[#5B6478]">
            Simulating LinkedIn Recruiter search appearance
          </span>
        </div>

        <div className="bg-white border-2 border-[#2D5F8A]/30 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-[#2D5F8A] transition-all">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#16213A] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-inner">
              AR
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-[#16213A] hover:underline cursor-pointer">
                  Alex Rivera
                </h4>
                <span className="text-xs text-[#5B6478]">&bull; 1st</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Open to Work
                </span>
              </div>

              {/* Dynamic Headline */}
              <p className="text-sm text-[#16213A] font-medium leading-snug">
                {activeHeadline.headline}
              </p>

              <div className="text-xs text-[#5B6478] flex items-center gap-1.5">
                <span>New York, New York, United States</span>
                <span>&bull;</span>
                <span className="text-[#2D5F8A] font-semibold">500+ connections</span>
              </div>

              {/* Snippet Preview */}
              <p className="text-xs text-[#5B6478] line-clamp-2 pt-1 border-t border-[#E5E1D8]/60 mt-2 font-serif italic">
                &ldquo;{aboutResult.aboutText.split("\n\n")[0]}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section Optimization & 1-Click Copy Pack */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Headline Rewriter */}
        <div className="bg-white border border-[#E5E1D8] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
            <div className="flex items-center gap-2">
              <Sliders size={18} className="text-[#2D5F8A]" />
              <h3 className="text-base font-bold text-[#16213A]">
                Recruiter-Optimized Headlines
              </h3>
            </div>
            <span className="text-xs font-mono text-[#5B6478]">
              {headlineVariants.length} Ranked Variants
            </span>
          </div>

          <div className="space-y-3">
            {headlineVariants.map((hl) => {
              const isSelected = selectedHeadlineId === hl.id;
              const isCopied = copiedKey === `hl_${hl.id}`;

              return (
                <div
                  key={hl.id}
                  onClick={() => setSelectedHeadlineId(hl.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#FAF7F0] border-[#2D5F8A] ring-1 ring-[#2D5F8A]"
                      : "bg-white border-[#E5E1D8] hover:border-[#2D5F8A]/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#2D5F8A] uppercase tracking-wide">
                      Rank #{hl.searchRank} &bull; {hl.style.replace("_", " ")}
                    </span>
                    <span className="text-xs font-mono text-[#5B6478]">
                      {hl.characterCount}/220 chars
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-[#16213A] mb-3 leading-snug">
                    {hl.headline}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#E5E1D8]/60">
                    <span className="text-[11px] text-[#5B6478]">
                      Search SEO Score: <strong className="text-[#16213A] font-mono">{hl.predictedSearchScore}%</strong>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(`hl_${hl.id}`, hl.headline, "Headline");
                      }}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#2D5F8A] text-xs font-semibold text-[#16213A] flex items-center gap-1.5 transition-all active:scale-[0.98]"
                    >
                      {isCopied ? (
                        <>
                          <Check size={14} className="text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy Headline</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Value-First About Generator */}
        <div className="bg-white border border-[#E5E1D8] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
            <div className="flex items-center gap-2">
              <User size={18} className="text-[#2D5F8A]" />
              <h3 className="text-base font-bold text-[#16213A]">
                Value-First About Narrative
              </h3>
            </div>

            {/* Tone Selector */}
            <div className="flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-lg border border-[#E5E1D8]">
              {(["modern_tech", "executive", "warm"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTone(t)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition-all ${
                    selectedTone === t
                      ? "bg-[#16213A] text-white shadow-xs"
                      : "text-[#5B6478] hover:text-[#16213A]"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Generated Text */}
          <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl p-4 font-sans text-xs text-[#16213A] leading-relaxed whitespace-pre-wrap max-h-[380px] overflow-y-auto">
            {aboutResult.aboutText}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[#5B6478]">
              {aboutResult.wordCount} words &bull; {aboutResult.characterCount} characters
            </span>

            <button
              type="button"
              onClick={() => handleCopy("about_text", aboutResult.aboutText, "About Narrative")}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-all active:scale-[0.98]"
            >
              {copiedKey === "about_text" ? (
                <>
                  <Check size={15} />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy size={15} />
                  <span>Copy Complete About Section</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Skills Gap & Endorsement Strategy */}
      <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E1D8]">
          <div>
            <h3 className="text-lg font-bold text-[#16213A]">
              Skills Strategy & Endorsement Acceleration
            </h3>
            <p className="text-xs text-[#5B6478] mt-0.5">
              Top 20 high-frequency recruiter search competencies for target Senior Full-Stack roles.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-[#5B6478]">
              Target Coverage: <strong className="text-[#16213A] font-mono">{skillsReport.overallCoveragePercent}%</strong>
            </span>
            <div className="px-3 py-1 rounded-full bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 text-xs font-bold">
              {skillsReport.matchedSkillsCount} of {skillsReport.skillsList.length} In Place
            </div>
          </div>
        </div>

        {/* Top 3 Pinned Recommendation */}
        <div className="bg-[#FAF7F0] border border-[#2D5F8A]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} className="text-[#2D5F8A] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[#16213A]">
                Recommended Top 3 Pinned Skills (Algorithmic Anchor)
              </div>
              <div className="text-xs text-[#5B6478]">
                Pin these in your LinkedIn profile header for maximum recruiter search weighting:
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {skillsReport.top3RecommendedPinned.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 rounded-lg bg-white border border-[#2D5F8A]/30 text-[#16213A] text-xs font-bold shadow-xs"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Peer Endorsement Message Outreach Templates */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ChatCircleText size={18} className="text-[#2D5F8A]" />
            <h4 className="text-sm font-bold text-[#16213A]">
              1-Click Colleague Endorsement Request Templates
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {skillsReport.endorsementTemplates.map((template, idx) => {
              const isCopied = copiedKey === `end_${idx}`;

              return (
                <div
                  key={idx}
                  className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl p-4 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#2D5F8A] uppercase tracking-wider">
                        {template.relationship.replace("_", " ")}
                      </span>
                      <span className="text-[11px] text-[#5B6478]">
                        ~{template.characterCount} chars
                      </span>
                    </div>
                    <p className="text-xs text-[#16213A] leading-relaxed italic">
                      &ldquo;{template.message}&rdquo;
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(`end_${idx}`, template.message, "Endorsement Request")}
                    className="min-h-[44px] px-3 py-1.5 rounded-lg bg-white border border-[#E5E1D8] hover:border-[#2D5F8A] text-xs font-semibold text-[#16213A] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

