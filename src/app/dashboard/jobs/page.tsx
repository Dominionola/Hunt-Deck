import { JobFeed } from "@/features/jobs/components/JobFeed";
export const metadata = { title: "Job Discovery | Hunt Deck", description: "Browse saved ATS listings and compare them with your primary resume." };
export default function JobsDashboardPage() {
  return <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8"><header><h1 className="text-title-1-medium">Job Discovery</h1><p className="mt-3 text-body-regular text-text-secondary">Explore real listings and choose where to focus your next application.</p></header><JobFeed /></div>;
}
