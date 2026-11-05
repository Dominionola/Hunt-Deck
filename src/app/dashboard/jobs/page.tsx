import React from "react";
import Link from "next/link";
import { JobFeed } from "@/features/jobs/components/JobFeed";
import { ArrowLeft, Sparkle } from "@phosphor-icons/react/dist/ssr";

export const metadata = {
  title: "Job Discovery & ATS Matching | Hunt Deck",
  description: "Real-time ATS aggregated job listings matched directly to your verified skills cloud.",
};

export default function JobsDashboardPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F0]/30 py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Bar Navigation */}
      <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between border-b border-[#E5E1D8] pb-4">
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-[#5B6478] hover:text-[#16213A] transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Hunt Deck</span>
        </Link>

        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard/resume"
            className="text-xs font-medium text-[#5B6478] hover:text-[#16213A] transition-colors"
          >
            Review Resume Profile
          </Link>
          <div className="flex items-center space-x-2 text-xs text-[#2D5F8A] font-medium bg-white px-3 py-1.5 rounded-full border border-[#E5E1D8]">
            <Sparkle size={14} weight="fill" />
            <span>Stage 02 Engine Active</span>
          </div>
        </div>
      </header>

      {/* Main Feed Section */}
      <section aria-label="Job Discovery Feed">
        <JobFeed />
      </section>
    </main>
  );
}
