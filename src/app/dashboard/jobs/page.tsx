import { JobDiscoveryTabs } from "@/features/jobs/components/JobDiscoveryTabs";

export const metadata = {
  title: "Job Discovery | Hunt Deck",
  description: "Browse verified ATS feeds and stealth Hacker News hiring threads with direct founder contacts.",
};

export default function JobsDashboardPage() {
  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8">
      <header>
        <h1 className="text-title-1-medium">Job Discovery</h1>
        <p className="mt-3 text-body-regular text-text-secondary">
          Explore real listings from primary ATS endpoints and stealth Hacker News founder posts before they reach LinkedIn.
        </p>
      </header>

      <JobDiscoveryTabs />
    </div>
  );
}
