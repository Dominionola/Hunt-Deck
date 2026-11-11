import { NextResponse } from "next/server";
import { getJobs } from "@/services/db/jobService";
import { jobQuerySchema } from "@/lib/validations/job";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;

  // Never accept caller-supplied user identity from query parameters
  if (searchParams.has("userId")) {
    return NextResponse.json(
      { error: "Caller-supplied user identity is not permitted." },
      { status: 400 }
    );
  }

  const result = jobQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!result.success) {
    return NextResponse.json({ error: "Invalid job search parameters." }, { status: 400 });
  }

  try {
    // Authenticate user server-side from session cookies
    const user = await getAuthenticatedUser();
    const verifiedUserId = user?.id;

    const jobs = await getJobs(result.data, verifiedUserId);
    return NextResponse.json({ success: true, ...jobs });
  } catch {
    return NextResponse.json({ error: "Job listings are temporarily unavailable." }, { status: 503 });
  }
}

// Ingestion changes state and makes external requests; requires admin session
export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin authorization required." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { message: "Ingestion queue scheduled." },
    { status: 202, headers: { "Cache-Control": "no-store" } }
  );
}
