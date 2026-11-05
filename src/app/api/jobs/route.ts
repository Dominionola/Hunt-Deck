import { NextResponse } from "next/server";
import { getJobs } from "@/services/db/jobService";
import { jobQuerySchema } from "@/lib/validations/job";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  // Fit scores are user-specific and cannot be authorized until sessions exist.
  if (searchParams.has("userId") || searchParams.has("minFitScore")) {
    return NextResponse.json({ error: "Personalized job data is not available." }, { status: 400 });
  }

  const result = jobQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!result.success) {
    return NextResponse.json({ error: "Invalid job search parameters." }, { status: 400 });
  }

  try {
    // Never pass a caller-controlled user ID to the service.
    const jobs = await getJobs(result.data);
    return NextResponse.json({ success: true, ...jobs });
  } catch {
    return NextResponse.json({ error: "Job listings are temporarily unavailable." }, { status: 503 });
  }
}

// Ingestion changes state and makes external requests; no verified admin session
// exists yet, so do not read the body or execute any ingestion.
export async function POST() {
  return NextResponse.json(
    { error: "Job ingestion is temporarily unavailable." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
