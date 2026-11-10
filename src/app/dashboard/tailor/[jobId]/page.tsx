import React from "react";
import { TailorClient } from "@/features/tailor/components/TailorClient";

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
  const resolved = await params;
  return <TailorClient initialJobId={resolved.jobId} />;
}

