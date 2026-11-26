import { notFound } from "next/navigation";
import { SourceManagement } from "@/features/jobs/components/SourceManagement";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";

export const metadata = { title: "Job Sources | Hunt Deck" };

export default async function JobSourcesPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "ADMIN") notFound();
  return <div className="mx-auto max-w-screen-2xl space-y-6 p-4 text-text-primary sm:p-6 lg:p-8">
    <header><h1 className="text-title-1-medium">Job sources</h1><p className="mt-3 text-body-regular text-text-secondary">Review and manage employer sources for Hunt Deck.</p></header>
    <SourceManagement />
  </div>;
}
