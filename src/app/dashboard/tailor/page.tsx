import React from "react";
import { TailorClient } from "@/features/tailor/components/TailorClient";

export const metadata = {
  title: "ATS Application Pack Generator | Hunt Deck",
  description: "3-pass ATS bullet rewriter, bespoke 4-paragraph cover letter engine, and live pre-flight audit.",
};

export default function TailorPage() {
  return <TailorClient />;
}

