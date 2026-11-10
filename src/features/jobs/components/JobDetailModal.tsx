"use client";

import React from "react";
import type { JobCardData } from "./JobCard";
import {
  X,
  Sparkle,
  ArrowSquareOut,
  CheckCircle,
  WarningCircle,
  Buildings,
  MapPin,
  PencilSimple,
} from "@phosphor-icons/react";
import { CompanyContactsCard } from "./CompanyContactsCard";

interface JobDetailModalProps {
  job: JobCardData | null;
  onClose: () => void;
  onTailor: (job: JobCardData) => void;
}

export function JobDetailModal({ job, onClose, onTailor }: JobDetailModalProps) {
  if (!job) return null;

  const score = job.fitScore ?? 84;
  const matchingSkills = job.matchingSkills || ["TypeScript", "React", "PostgreSQL", "Next.js"];
  const missingSkills = job.missingSkills || ["Kubernetes", "Kafka", "GraphQL"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1117]/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white border border-[#E5E1D8] rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#E5E1D8] flex items-start justify-between bg-[#FAF7F0]/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A]">
              <Buildings size={22} weight="duotone" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5B6478]">{job.company}</p>
              <h2 className="text-lg font-bold text-[#16213A]">{job.title}</h2>
              <div className="flex items-center space-x-2 text-xs text-[#5B6478] mt-0.5">
                <span className="flex items-center space-x-1">
                  <MapPin size={12} />
                  <span>{job.location || "Remote"}</span>
                </span>
                <span>•</span>
                <span className="font-medium text-[#16213A]">{job.atsPlatform} Board</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#5B6478] hover:text-[#16213A] hover:bg-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Fit Score & Dimension Breakdown */}
          <div className="p-4 bg-[#FAF7F0]/60 border border-[#E5E1D8] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkle size={18} className="text-[#2D5F8A]" weight="fill" />
                <h3 className="text-xs font-bold text-[#16213A] uppercase tracking-wider">
                  ATS Match Analysis: {score}% Overall Fit
                </h3>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Strong First Mover Role
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-white rounded-lg border border-[#E5E1D8]">
                <p className="text-[11px] text-[#5B6478]">Skills (40%)</p>
                <p className="font-bold text-[#16213A] text-sm">88%</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E5E1D8]">
                <p className="text-[11px] text-[#5B6478]">Experience (30%)</p>
                <p className="font-bold text-[#16213A] text-sm">85%</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E5E1D8]">
                <p className="text-[11px] text-[#5B6478]">Title (20%)</p>
                <p className="font-bold text-[#16213A] text-sm">90%</p>
              </div>
              <div className="p-2 bg-white rounded-lg border border-[#E5E1D8]">
                <p className="text-[11px] text-[#5B6478]">Location (10%)</p>
                <p className="font-bold text-[#16213A] text-sm">100%</p>
              </div>
            </div>
          </div>

          {/* Keyword Gap Analysis */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#16213A] uppercase tracking-wider">
              Keyword Gap Analysis (ATS Rank Optimization)
            </h3>

            {/* Matched Keywords */}
            <div>
              <p className="text-xs font-semibold text-emerald-800 flex items-center space-x-1.5 mb-2">
                <CheckCircle size={14} weight="fill" />
                <span>Found in your resume ({matchingSkills.length})</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matchingSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium rounded-md"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Keywords */}
            <div>
              <p className="text-xs font-semibold text-amber-800 flex items-center space-x-1.5 mb-2">
                <WarningCircle size={14} weight="fill" />
                <span>Missing keywords to insert ({missingSkills.length})</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingSkills.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium rounded-md"
                  >
                    + {s}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-[#5B6478] mt-1.5">
                Tip: Hunt Deck will automatically place missing keywords in your Skills block (×2.5 uplift) and recent bullet points (×2.0 uplift) without altering your factual achievements.
              </p>
            </div>
          </div>

          {/* Key Contacts & Contact Intelligence Layer (Phase 4) */}
          <CompanyContactsCard
            companyName={job.company}
            roleTitle={job.title}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#FAF7F0]/40 border-t border-[#E5E1D8] flex items-center justify-between">
          <a
            href={job.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs text-[#5B6478] hover:text-[#16213A] font-medium"
          >
            <span>View Original Posting</span>
            <ArrowSquareOut size={14} />
          </a>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#5B6478] hover:text-[#16213A] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                onTailor(job);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <PencilSimple size={14} weight="bold" />
              <span>Tailor Application</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
