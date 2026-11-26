import type { Metadata } from "next";
import { PipelineKanbanBoard } from "@/features/applications/components/PipelineKanbanBoard";

export const metadata: Metadata = {
  title: "Application Pipeline CRM | Hunt Deck",
  description: "Manage high-signal job applications across 5 stages from radar discovery to signed offer.",
};

export default function ApplicationsPage() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8">
      <header className="border-b border-separator-border pb-4">
        <h1 className="text-title-1-medium">Application Pipeline</h1>
        <p className="mt-2 max-w-2xl text-body-regular text-text-secondary">
          Track opportunities across 5 stages and trigger follow-up cadences, tailored packs, and interview prep.
        </p>
      </header>

      <section aria-label="Kanban CRM Pipeline">
        <PipelineKanbanBoard />
      </section>
    </div>
  );
}
