import React from "react";
import { ResumeReviewDashboard } from "@/features/resume/components/ResumeReviewDashboard";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Master Profile & Resume Review | Hunt Deck",
  description: "Ingest and verify your master resume profile for 1536-dim ATS matching.",
};

export default function ResumeDashboardPage() {
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header section compliant with design.md */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E5E1D8]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 uppercase tracking-wider">
              Golden Record
            </span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Extraction Engine Active</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#16213A] tracking-tight">
            Master Profile <span className="font-serif italic font-normal text-[#2D5F8A]">in golden focus</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5B6478] mt-1">
            Verified skills cloud, experience atomization, and baseline entities powering multi-source matching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-[#2D5F8A] font-semibold bg-white px-3 py-1.5 rounded-xl border border-[#E5E1D8] shadow-2xs">
            <Sparkle size={14} weight="fill" className="text-[#2D5F8A]" />
            <span>Stage 01 Ingestion</span>
          </div>
        </div>
      </div>

      {/* Main Review Dashboard */}
      <section aria-label="Resume ingestion and review interface" className="min-w-0">
        <ResumeReviewDashboard />
      </section>
    </div>
  );
}
