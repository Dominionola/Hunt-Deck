import React from "react";
import type { Metadata } from "next";
import { LinkedinLogo, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { LinkedInOptimizerPane } from "@/features/linkedin/components/LinkedInOptimizerPane";

export const metadata: Metadata = {
  title: "LinkedIn Profile Intelligence Optimizer | Hunt Deck",
  description:
    "Transform your LinkedIn profile into a recruiter-search-optimized professional asset with high-conversion headlines, value-first narratives, and endorsement strategies.",
};

export default function LinkedInOptimizerPage() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header section compliant with design.md and Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E5E1D8]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 uppercase tracking-wider flex items-center gap-1">
              <Sparkle size={12} weight="fill" />
              <span>Inbound Magnet</span>
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#5B6478] font-medium">
              <LinkedinLogo size={15} weight="fill" className="text-[#0A66C2]" />
              <span>Algorithmic SEO & Inbound Leads</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#16213A] tracking-tight">
            LinkedIn Profile Optimizer{" "}
            <span className="font-serif italic font-normal text-[#2D5F8A]">
              for inbound recruiter magnet
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5B6478] mt-1 max-w-2xl">
            Recruiters source passive candidates via LinkedIn Recruiter search algorithms. Audit your profile readiness, deploy search-ranked headlines, and export formatted copy packs.
          </p>
        </div>
      </div>

      {/* Main Workspace Pane */}
      <section aria-label="LinkedIn Profile Optimizer Studio">
        <LinkedInOptimizerPane />
      </section>
    </div>
  );
}

