import React from "react";
import { JobFeed } from "@/features/jobs/components/JobFeed";
import { Sparkle } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Job Discovery & ATS Matching | Hunt Deck",
  description: "Real-time ATS aggregated job listings matched directly to your verified skills cloud.",
};

export default function JobsDashboardPage() {
  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header section compliant with design.md */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E5E1D8]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 uppercase tracking-wider">
              Vector Ingestion Feed
            </span>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span>Crawling Active</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#16213A] tracking-tight">
            Job Discovery <span className="font-serif italic font-normal text-[#2D5F8A]">matched to you</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5B6478] mt-1">
            Real-time ATS opportunities ranked by 1536-dimensional vector similarity against your Master Profile.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs text-[#2D5F8A] font-semibold bg-white px-3 py-1.5 rounded-xl border border-[#E5E1D8] shadow-2xs">
            <Sparkle size={14} weight="fill" className="text-[#2D5F8A]" />
            <span>Stage 02 Engine</span>
          </div>
        </div>
      </div>

      {/* Main Job Discovery Feed */}
      <section aria-label="Job Discovery Feed" className="min-w-0">
        <JobFeed />
      </section>
    </div>
  );
}
