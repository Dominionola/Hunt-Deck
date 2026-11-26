import { ResumeReviewDashboard } from "@/features/resume/components/ResumeReviewDashboard";

export const metadata = {
  title: "Master Profile & Resume Review | Hunt Deck",
  description: "Ingest and verify your master resume profile for ATS matching.",
};

export default function ResumeDashboardPage() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8">
      <header className="border-b border-separator-border pb-4">
        <h1 className="text-title-1-medium">Master Profile</h1>
        <p className="mt-2 max-w-2xl text-body-regular text-text-secondary">
          Verify your extracted skills, work history, and baseline entities powering personalized job matching.
        </p>
      </header>

      <section aria-label="Resume ingestion and review interface" className="min-w-0">
        <ResumeReviewDashboard />
      </section>
    </div>
  );
}
