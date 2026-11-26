import type { Metadata } from "next";
import { LinkedInOptimizerPane } from "@/features/linkedin/components/LinkedInOptimizerPane";

export const metadata: Metadata = {
  title: "LinkedIn Profile Intelligence Optimizer | Hunt Deck",
  description:
    "Transform your LinkedIn profile into a recruiter-search-optimized professional asset with high-conversion headlines, value-first narratives, and endorsement strategies.",
};

export default function LinkedInOptimizerPage() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8">
      <header className="border-b border-separator-border pb-4">
        <h1 className="text-title-1-medium">LinkedIn Profile Optimizer</h1>
        <p className="mt-2 max-w-2xl text-body-regular text-text-secondary">
          Audit profile readiness, craft search-ranked headlines, and export formatted copy packs for recruiter discovery.
        </p>
      </header>

      <section aria-label="LinkedIn Profile Optimizer Studio">
        <LinkedInOptimizerPane />
      </section>
    </div>
  );
}
