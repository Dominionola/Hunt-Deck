"use client";

import React, { useState } from "react";
import {
  X,
  Plus,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import type {
  Step2SkillsInput,
  SkillItem,
  SkillCategory,
} from "@/lib/validations/onboarding";

interface Step2SkillsProps {
  initialData?: Partial<Step2SkillsInput>;
  onBack: () => void;
  onComplete: (data: Step2SkillsInput) => void;
}

const DEFAULT_EXTRACTED_SKILLS: SkillItem[] = [
  { name: "TypeScript", category: "Languages", isVerified: true },
  { name: "Python", category: "Languages", isVerified: true },
  { name: "SQL", category: "Languages", isVerified: true },
  { name: "Go", category: "Languages", isVerified: false },

  { name: "React", category: "Frameworks", isVerified: true },
  { name: "Next.js", category: "Frameworks", isVerified: true },
  { name: "Node.js", category: "Frameworks", isVerified: true },
  { name: "PostgreSQL", category: "Frameworks", isVerified: true },

  { name: "AWS", category: "Cloud", isVerified: true },
  { name: "Docker", category: "Cloud", isVerified: true },
  { name: "Kubernetes", category: "Cloud", isVerified: false },
  { name: "Redis", category: "Cloud", isVerified: true },

  { name: "CI/CD Pipelines", category: "Methodologies", isVerified: true },
  { name: "System Architecture", category: "Methodologies", isVerified: true },
  { name: "Distributed Systems", category: "Methodologies", isVerified: true },
  { name: "Team Mentorship", category: "Methodologies", isVerified: true },
];

const CATEGORIES: SkillCategory[] = [
  "Languages",
  "Frameworks",
  "Cloud",
  "Methodologies",
];

export function Step2Skills({ initialData, onBack, onComplete }: Step2SkillsProps) {
  const [skills, setSkills] = useState<SkillItem[]>(
    initialData?.skills && initialData.skills.length > 0
      ? initialData.skills
      : DEFAULT_EXTRACTED_SKILLS
  );
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>("Languages");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const verifiedSkillsCount = skills.filter((s) => s.isVerified).length;

  const handleToggleVerify = (name: string) => {
    setErrorMessage(null);
    setSkills((prev) =>
      prev.map((s) => (s.name === name ? { ...s, isVerified: !s.isVerified } : s))
    );
  };

  const handleRemoveSkill = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setErrorMessage(null);
    setSkills((prev) => prev.filter((s) => s.name !== name));
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) return;

    if (skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage(`"${trimmed}" is already in your skills list.`);
      return;
    }

    setSkills((prev) => [
      ...prev,
      {
        name: trimmed,
        category: newSkillCategory,
        isVerified: true,
      },
    ]);
    setNewSkillName("");
    setErrorMessage(null);
  };

  const handleNext = () => {
    const verified = skills.filter((s) => s.isVerified);
    if (verified.length < 3) {
      setErrorMessage("Please keep at least 3 verified skills active to tune job matching.");
      return;
    }

    onComplete({
      skills,
      atsReadabilityScore: initialData?.atsReadabilityScore || 88,
    });
  };

  return (
    <div className="w-full">
      {/* Editorial Headline */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#16213A] tracking-tight mb-2">
          Review your skills,{" "}
          <span className="font-serif italic font-normal text-[#16213A]">
            make them yours.
          </span>
        </h1>
        <p className="text-sm text-[#5B6478] max-w-lg mx-auto">
          These are example skills. Toggle or remove them, and add the skills that fit you.
        </p>
      </div>

      {/* Main Elevated Card */}
      <div className="bg-white border border-[#E5E1D8] rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        {/* ATS Health Gauge Banner */}
        <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#2D5F8A]/10 border border-[#2D5F8A]/20 flex items-center justify-center text-[#2D5F8A] font-bold text-lg font-mono">
              88%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#16213A]">
                  ATS Readability & Keyword Match Score
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Optimal Structure
                </span>
              </div>
              <p className="text-xs text-[#5B6478] mt-0.5">
                Standard terminology formatted for high-ranking automated ATS parsing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-[#2D5F8A] bg-white px-3.5 py-2 rounded-lg border border-[#E5E1D8] shadow-2xs">
            <ShieldCheck size={16} weight="fill" />
            <span>{verifiedSkillsCount} Active Verified Skills</span>
          </div>
        </div>

        {/* Categorized Skills Cloud */}
        <div className="space-y-6">
          {CATEGORIES.map((cat) => {
            const catSkills = skills.filter((s) => s.category === cat);
            if (catSkills.length === 0) return null;

            return (
              <div key={cat} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5B6478]">
                    {cat}
                  </h3>
                  <span className="text-[11px] text-[#5B6478]">
                    {catSkills.filter((s) => s.isVerified).length} active
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {catSkills.map((skill) => (
                    <button
                      key={skill.name}
                      type="button"
                      onClick={() => handleToggleVerify(skill.name)}
                      className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        skill.isVerified
                          ? "bg-[#16213A] text-white shadow-xs"
                          : "bg-[#FFFFFF] border border-[#E5E1D8] text-[#5B6478] hover:border-[#2D5F8A]/40 opacity-60"
                      }`}
                    >
                      <span>{skill.name}</span>
                      <span
                        onClick={(e) => handleRemoveSkill(skill.name, e)}
                        className={`p-0.5 rounded-full transition-colors ${
                          skill.isVerified
                            ? "hover:bg-white/20 text-white/70 hover:text-white"
                            : "hover:bg-[#E5E1D8] text-[#5B6478]"
                        }`}
                        title="Remove skill"
                      >
                        <X size={12} weight="bold" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Add Skill Form */}
        <div className="pt-2 border-t border-[#E5E1D8]">
          <form
            onSubmit={handleAddSkill}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
          >
            <input
              type="text"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              placeholder="Add another competency (e.g. GraphQL, Terraform)..."
              className="flex-1 px-3.5 py-2 text-xs bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl text-[#16213A] placeholder-[#5B6478]/50 focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]/20 focus:border-[#2D5F8A]"
            />
            <select
              value={newSkillCategory}
              onChange={(e) => setNewSkillCategory(e.target.value as SkillCategory)}
              className="px-3 py-2 text-xs bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl text-[#16213A] focus:outline-none focus:border-[#2D5F8A]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!newSkillName.trim()}
              className="px-4 py-2 bg-[#2D5F8A] hover:bg-[#234b6e] disabled:opacity-40 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus size={14} weight="bold" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <WarningCircle size={16} weight="fill" className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 flex items-center justify-between gap-4 border-t border-[#E5E1D8]">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] px-5 py-2.5 rounded-full border border-[#E5E1D8] bg-[#FFFFFF] text-xs font-semibold text-[#16213A] hover:bg-[#FAF7F0] active:scale-[0.98] flex items-center gap-1.5 transition-all"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="min-h-[46px] px-7 py-3 rounded-full bg-[#16213A] hover:bg-[#0D1527] active:scale-[0.98] text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <span>Confirm Skills &amp; Set Targets</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
