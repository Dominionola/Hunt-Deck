import React from "react";
import Link from "next/link";
import { ResumeReviewDashboard } from "@/features/resume/components/ResumeReviewDashboard";
import { ArrowLeft, Sparkle } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Resume Review & Extraction | Hunt Deck",
  description: "Ingest and verify your master resume profile for 1536-dim ATS matching.",
};

export default function ResumeDashboardPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0]/30 py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar Navigation */}
      <header className="max-w-5xl mx-auto mb-8 flex items-center justify-between border-b border-[#E5E1D8] pb-4">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-[#5B6478] hover:text-[#16213A] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Hunt Deck</span>
        </Link>

        <div className="flex items-center space-x-2 text-xs text-[#2D5F8A] font-medium bg-white px-3 py-1.5 rounded-full border border-[#E5E1D8]">
          <Sparkle size={14} weight="fill" />
          <span>Stage 01 Engine Active</span>
        </div>
      </header>

      {/* Main Review Dashboard */}
      <section aria-label="Resume ingestion and review interface">
        <ResumeReviewDashboard />
      </section>
    </main>
  );
}
