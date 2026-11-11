import React from "react";
import type { Metadata } from "next";
import { ChartLineUp, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { CareerIntelligencePane } from "@/features/analytics/components/CareerIntelligencePane";

export const metadata: Metadata = {
  title: "Career Intelligence & Salary Benchmarks | Hunt Deck",
  description:
    "Real-time market compensation percentile curves, 4-year equity vesting scenario simulator, and candidate search funnel conversion diagnostics.",
};

export default function CareerIntelligencePage() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header section compliant with design.md and Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E5E1D8]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 uppercase tracking-wider flex items-center gap-1">
              <Sparkle size={12} weight="fill" />
              <span>Macro Intelligence</span>
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#5B6478] font-medium">
              <ChartLineUp size={15} weight="duotone" className="text-[#2D5F8A]" />
              <span>Compensation Curves & Funnel Analytics</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#16213A] tracking-tight">
            Career Intelligence{" "}
            <span className="font-serif italic font-normal text-[#2D5F8A]">
              for market power
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5B6478] mt-1 max-w-2xl">
            Leverage verified market compensation bands to anchor salary negotiations, model 4-year equity vesting scenarios, and diagnose pipeline drop-offs with empirical funnel benchmarks.
          </p>
        </div>
      </div>

      {/* Main Workspace Pane */}
      <section aria-label="Career Intelligence and Benchmarking Studio">
        <CareerIntelligencePane />
      </section>
    </div>
  );
}

