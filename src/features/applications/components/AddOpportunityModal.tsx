"use client";

import React, { useState } from "react";
import { X, Briefcase, Plus } from "@phosphor-icons/react";
import { PipelineApplication, PipelineStage, STAGES } from "../types";
import { toast } from "@/components/base/toast/toast";

interface AddOpportunityModalProps {
  isOpen: boolean;
  initialStage?: PipelineStage;
  onClose: () => void;
  onAdd: (app: PipelineApplication) => void;
}

export function AddOpportunityModal({
  isOpen,
  initialStage = "saved",
  onClose,
  onAdd,
}: AddOpportunityModalProps) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("San Francisco, CA");
  const [workArrangement, setWorkArrangement] = useState<"remote" | "hybrid" | "onsite">("remote");
  const [salary, setSalary] = useState("$180,000 - $220,000");
  const [fitScore, setFitScore] = useState(90);
  const [stage, setStage] = useState<PipelineStage>(initialStage);
  const [initialNote, setInitialNote] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) {
      toast.error("Missing required fields", {
        description: "Please specify both the company name and role title.",
      });
      return;
    }

    const newApp: PipelineApplication = {
      id: `app-custom-${Date.now()}`,
      company: company.trim(),
      role: role.trim(),
      location: location.trim(),
      workArrangement,
      salary: salary.trim(),
      fitScore,
      stage,
      notes: initialNote.trim() ? [initialNote.trim()] : ["Manually added to pipeline."],
      tags: ["Target Opportunity", "Custom Entry"],
      source: "direct",
      appliedDate: stage === "applied" ? "Just now" : undefined,
    };

    onAdd(newApp);
    toast.success("Opportunity Added", {
      description: `${role} at ${company} logged to ${STAGES.find((s) => s.id === stage)?.label}.`,
    });

    // Reset and close
    setCompany("");
    setRole("");
    setInitialNote("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16213A]/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-[#E5E1D8] shadow-2xl p-6 z-10 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E1D8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2D5F8A]/10 text-[#2D5F8A] flex items-center justify-center font-bold">
              <Briefcase size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#16213A]">
                Add Opportunity to Pipeline
              </h2>
              <p className="text-[11px] text-[#5B6478]">
                Log a target role, direct lead, or external job posting.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#16213A] uppercase tracking-wider">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Stripe, Linear"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E1D8] bg-[#FAF7F0] text-[#16213A] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#16213A] uppercase tracking-wider">
                Role Title *
              </label>
              <input
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Staff Systems Engineer"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E1D8] bg-[#FAF7F0] text-[#16213A] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              />
            </div>
          </div>

          {/* Stage Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#16213A] uppercase tracking-wider">
              Initial Pipeline Stage
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(s.id)}
                  className={`px-2 py-1.5 rounded-xl text-[11px] font-semibold text-center border transition-all truncate ${
                    stage === s.id
                      ? "bg-[#16213A] text-white border-[#16213A] shadow-xs"
                      : "bg-[#FAF7F0] text-[#5B6478] border-[#E5E1D8] hover:text-[#16213A]"
                  }`}
                >
                  {s.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Location & Work Arrangement */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#16213A] uppercase tracking-wider">
                Work Arrangement
              </label>
              <select
                value={workArrangement}
                onChange={(e) =>
                  setWorkArrangement(e.target.value as "remote" | "hybrid" | "onsite")
                }
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E1D8] bg-[#FAF7F0] text-[#16213A] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#16213A] uppercase tracking-wider">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E1D8] bg-[#FAF7F0] text-[#16213A] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              />
            </div>
          </div>

          {/* Salary & Match Score */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#16213A] uppercase tracking-wider">
                Comp Band
              </label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="$180,000 - $220,000"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E1D8] bg-[#FAF7F0] text-[#16213A] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#16213A] uppercase tracking-wider">
                Est. Fit Score ({fitScore}%)
              </label>
              <input
                type="range"
                min={70}
                max={99}
                value={fitScore}
                onChange={(e) => setFitScore(Number(e.target.value))}
                className="w-full h-8 accent-[#2D5F8A]"
              />
            </div>
          </div>

          {/* Initial Note */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[#16213A] uppercase tracking-wider">
              Initial Note / Job URL
            </label>
            <textarea
              rows={2}
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="Paste job link, referral info, or recruiter notes…"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E1D8] bg-[#FAF7F0] text-[#16213A] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A] resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E1D8]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5B6478] hover:text-[#16213A] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#16213A] hover:bg-[#0D1527] rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Plus size={14} weight="bold" />
              <span>Log Opportunity</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
