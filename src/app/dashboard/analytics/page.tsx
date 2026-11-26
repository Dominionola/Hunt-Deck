import type { Metadata } from "next";
import { CareerIntelligencePane } from "@/features/analytics/components/CareerIntelligencePane";

export const metadata: Metadata = {
  title: "Career Intelligence & Salary Benchmarks | Hunt Deck",
  description:
    "Real-time market compensation percentile curves, 4-year equity vesting scenario simulator, and candidate search funnel conversion diagnostics.",
};

export default function CareerIntelligencePage() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8">
      <header className="border-b border-separator-border pb-4">
        <h1 className="text-title-1-medium">Career Intelligence</h1>
        <p className="mt-2 max-w-2xl text-body-regular text-text-secondary">
          Benchmark compensation bands, model 4-year equity vesting scenarios, and diagnose search funnel conversion rates.
        </p>
      </header>

      <section aria-label="Career Intelligence and Benchmarking Studio">
        <CareerIntelligencePane />
      </section>
    </div>
  );
}
