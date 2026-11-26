import React from "react";
import { redirect } from "next/navigation";
import { TailorClient } from "@/features/tailor/components/TailorClient";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { loadTailorWorkspaceData } from "@/services/tailor/loadTailorContext";

interface TailorJobPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export async function generateMetadata({ params }: TailorJobPageProps) {
  const resolved = await params;
  return {
    title: `Tailored Application Pack — ${resolved.jobId} | Hunt Deck`,
    description: "Bespoke ATS resume and cover letter customizer with live gap analysis.",
  };
}

export default async function TailorJobPage({ params }: TailorJobPageProps) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const resolved = await params;
  const context = await loadTailorWorkspaceData(user.id, resolved.jobId);

  return (
    <TailorClient
      initialJobId={resolved.jobId}
      initialTargetJob={context.targetJob}
      notFoundRequested={context.notFoundRequested}
      initialAvailableJobs={context.availableJobs}
      initialCandidateProfile={context.candidateProfile}
      initialPipelineApp={context.existingPipelineApp}
    />
  );
}
