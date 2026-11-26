import type { Metadata } from "next";
import { Chip } from "@/components/base/badges/chip";
import { InterviewPrepPane } from "@/features/interview/components/InterviewPrepPane";

export const metadata: Metadata = {
  title: "Interview Preparation Copilot | Hunt Deck",
  description:
    "Convert senior technical and behavioral interviews into signed offers with role-specific question banks, STAR framework synthesis, and 4-axis AI diagnostic critiques.",
};

export default function InterviewPrepPage() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-separator-border pb-4">
        <div>
          <h1 className="text-title-1-medium">Interview Preparation</h1>
          <p className="mt-2 max-w-2xl text-body-regular text-text-secondary">
            Practice role-specific STAR responses with instant 4-axis diagnostic feedback on example scenarios.
          </p>
        </div>
        <Chip variant="caption" color="soft">
          Example data preview
        </Chip>
      </header>

      <section aria-label="Interview Preparation Studio">
        <InterviewPrepPane />
      </section>
    </div>
  );
}
