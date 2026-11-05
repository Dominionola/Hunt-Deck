"use client";

import React, { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  Buildings,
  House,
  Globe,
  CurrencyDollar,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import type {
  Step3TargetsInput,
  WorkArrangement,
  SeniorityLevel,
} from "@/lib/validations/onboarding";

interface Step3TargetsProps {
  initialData?: Partial<Step3TargetsInput>;
  onBack: () => void;
  onComplete: (data: Step3TargetsInput) => void;
}

const DEFAULT_TITLE_SUGGESTIONS = [
  "Staff Software Engineer",
  "Senior Full-Stack Engineer",
  "Lead Backend Engineer",
  "Platform Architect",
  "Engineering Manager",
];

const SENIORITY_OPTIONS: { id: SeniorityLevel; label: string }[] = [
  { id: "ENTRY", label: "Entry" },
  { id: "MID", label: "Mid-Level" },
  { id: "SENIOR", label: "Senior" },
  { id: "LEAD", label: "Lead / Staff" },
  { id: "EXECUTIVE", label: "Executive" },
];

export function Step3Targets({ initialData, onBack, onComplete }: Step3TargetsProps) {
  const [targetTitles, setTargetTitles] = useState<string[]>(
    initialData?.targetTitles && initialData.targetTitles.length > 0
      ? initialData.targetTitles
      : ["Senior Full-Stack Engineer", "Staff Software Engineer"]
  );
  const [customTitleInput, setCustomTitleInput] = useState("");
  const [workArrangement, setWorkArrangement] = useState<WorkArrangement>(
    initialData?.workArrangement || "REMOTE"
  );
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel>(
    initialData?.seniorityLevel || "SENIOR"
  );
  const [minSalary, setMinSalary] = useState<number>(
    initialData?.minSalary !== undefined ? initialData.minSalary : 140000
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleTitle = (title: string) => {
    setErrorMessage(null);
    if (targetTitles.includes(title)) {
      if (targetTitles.length === 1) {
        setErrorMessage("Please keep at least one target title selected.");
        return;
      }
      setTargetTitles(targetTitles.filter((t) => t !== title));
    } else {
      setTargetTitles([...targetTitles, title]);
    }
  };

  const handleAddCustomTitle = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customTitleInput.trim();
    if (!trimmed) return;

    if (!targetTitles.includes(trimmed)) {
      setTargetTitles([...targetTitles, trimmed]);
    }
    setCustomTitleInput("");
    setErrorMessage(null);
  };

  const handleNext = () => {
    if (targetTitles.length === 0) {
      setErrorMessage("Please select or add at least one target role title.");
      return;
    }

    onComplete({
      targetTitles,
      workArrangement,
      preferredLocations: workArrangement === "REMOTE" ? ["Remote US"] : ["San Francisco, CA", "New York, NY"],
      seniorityLevel,
      minSalary,
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="w-full">
      {/* Editorial Headline */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#16213A] tracking-tight mb-2">
          Where would you like to go next?{" "}
          <span className="font-serif italic font-normal text-[#16213A]">
            your terms only.
          </span>
        </h1>
        <p className="text-sm text-[#5B6478] max-w-lg mx-auto">
          Calibrate our vector matching engine with your target role titles, remote
          preferences, and compensation floor.
        </p>
      </div>

      {/* Main Elevated Card */}
      <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
        {/* Target Titles Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#16213A]">
            Target Role Titles
          </label>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TITLE_SUGGESTIONS.map((title) => {
              const isSelected = targetTitles.includes(title);
              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleToggleTitle(title)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-[#16213A] text-white shadow-xs"
                      : "bg-[#FFFFFF] border border-[#E5E1D8] text-[#5B6478] hover:border-[#2D5F8A]/40"
                  }`}
                >
                  {title}
                </button>
              );
            })}

            {/* Custom titles not in defaults */}
            {targetTitles
              .filter((t) => !DEFAULT_TITLE_SUGGESTIONS.includes(t))
              .map((title) => (
                <div
                  key={title}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D5F8A] text-white text-xs font-medium"
                >
                  <span>{title}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleTitle(title)}
                    className="hover:opacity-80"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ))}
          </div>

          {/* Add custom title form */}
          <form onSubmit={handleAddCustomTitle} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={customTitleInput}
              onChange={(e) => setCustomTitleInput(e.target.value)}
              placeholder="Add another title (e.g. Solutions Architect)..."
              className="flex-1 max-w-sm px-3.5 py-2 text-xs bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl text-[#16213A] placeholder-[#5B6478]/50 focus:outline-none focus:border-[#2D5F8A]"
            />
            <button
              type="submit"
              disabled={!customTitleInput.trim()}
              className="px-3 py-2 bg-[#FAF7F0] border border-[#E5E1D8] hover:border-[#2D5F8A] disabled:opacity-40 text-xs font-medium rounded-xl text-[#16213A] flex items-center gap-1"
            >
              <Plus size={13} weight="bold" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Work Arrangement & Seniority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-[#E5E1D8]">
          {/* Work Arrangement */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#16213A]">
              Work Arrangement
            </label>
            <div className="grid grid-cols-3 gap-2 bg-[#FFFFFF] p-1.5 rounded-xl border border-[#E5E1D8]">
              <button
                type="button"
                onClick={() => setWorkArrangement("REMOTE")}
                className={`py-2 px-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition-all ${
                  workArrangement === "REMOTE"
                    ? "bg-[#16213A] text-white shadow-xs"
                    : "text-[#5B6478] hover:text-[#16213A]"
                }`}
              >
                <Globe size={16} />
                <span>Remote</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkArrangement("HYBRID")}
                className={`py-2 px-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition-all ${
                  workArrangement === "HYBRID"
                    ? "bg-[#16213A] text-white shadow-xs"
                    : "text-[#5B6478] hover:text-[#16213A]"
                }`}
              >
                <House size={16} />
                <span>Hybrid</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkArrangement("ONSITE")}
                className={`py-2 px-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition-all ${
                  workArrangement === "ONSITE"
                    ? "bg-[#16213A] text-white shadow-xs"
                    : "text-[#5B6478] hover:text-[#16213A]"
                }`}
              >
                <Buildings size={16} />
                <span>On-Site</span>
              </button>
            </div>
          </div>

          {/* Seniority Tier */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#16213A]">
              Seniority Tier
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SENIORITY_OPTIONS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSeniorityLevel(tier.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    seniorityLevel === tier.id
                      ? "bg-[#2D5F8A] text-white"
                      : "bg-[#FFFFFF] border border-[#E5E1D8] text-[#5B6478] hover:border-[#2D5F8A]/40"
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Minimum Annual Compensation Floor */}
        <div className="space-y-3 pt-2 border-t border-[#E5E1D8]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#16213A]">
              Minimum Annual Compensation Floor
            </label>
            <span className="text-base font-bold font-mono text-[#2D5F8A]">
              {formatCurrency(minSalary)} / yr
            </span>
          </div>

          <input
            type="range"
            min={80000}
            max={350000}
            step={5000}
            value={minSalary}
            onChange={(e) => setMinSalary(Number(e.target.value))}
            className="w-full h-2 bg-[#E5E1D8] rounded-lg appearance-none cursor-pointer accent-[#2D5F8A]"
          />

          <div className="flex items-center justify-between text-[11px] text-[#5B6478]">
            <span>$80k floor</span>
            <span className="italic">Hunt Deck discards roles paying below this threshold</span>
            <span>$350k+</span>
          </div>
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
            className="px-5 py-2.5 rounded-full border border-[#E5E1D8] bg-[#FFFFFF] text-xs font-semibold text-[#16213A] hover:bg-[#FAF7F0] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft size={14} weight="bold" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-full bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Sparkle size={15} weight="fill" />
            <span>Find Matching Opportunities</span>
            <ArrowRight size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
