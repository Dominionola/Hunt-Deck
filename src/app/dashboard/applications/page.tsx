import React from "react";
import type { Metadata } from "next";
import { Kanban } from "@phosphor-icons/react/dist/ssr";
import { PipelineKanbanBoard } from "@/features/applications/components/PipelineKanbanBoard";

export const metadata: Metadata = {
  title: "Application Pipeline CRM | Hunt Deck",
  description: "Manage high-signal job applications across 5 stages from radar discovery to signed offer.",
};

export default function ApplicationsPage() {
  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Header section compliant with design.md */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E5E1D8]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDF3F7] text-[#2D5F8A] border border-[#2D5F8A]/20 uppercase tracking-wider">
              High-Conviction CRM
            </span>
            <div className="flex items-center gap-1.5 text-xs text-[#5B6478] font-medium">
              <Kanban size={15} className="text-[#2D5F8A]" />
              <span>5 Active Stages</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#16213A] tracking-tight">
            Application Pipeline <span className="font-serif italic font-normal text-[#2D5F8A]">in steady motion</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5B6478] mt-1">
            Drag opportunities across stages to trigger automated follow-up cadences, tailored packs, and interview loops.
          </p>
        </div>
      </div>

      {/* Main Kanban Board */}
      <section aria-label="Kanban CRM Pipeline">
        <PipelineKanbanBoard />
      </section>
    </div>
  );
}

