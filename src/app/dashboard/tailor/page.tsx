import React from "react";
import { redirect } from "next/navigation";
import { TailorClient } from "@/features/tailor/components/TailorClient";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { loadTailorWorkspaceData } from "@/services/tailor/loadTailorContext";

export const metadata = {
  title: "ATS Application Pack Generator | Hunt Deck",
  description: "3-pass ATS bullet rewriter, bespoke 4-paragraph cover letter engine, and live pre-flight audit.",
};

export default async function TailorPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  const context = await loadTailorWorkspaceData(user.id);

  return (
    <TailorClient
      initialJobId={context.targetJob?.id}
      initialTargetJob={context.targetJob}
      initialAvailableJobs={context.availableJobs}
      initialCandidateProfile={context.candidateProfile}
      initialPipelineApp={context.existingPipelineApp}
    />
  );
}
