import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { jobQuerySchema } from "@/lib/validations/job";
import { getPersonalizedJobs } from "@/services/jobs/personalizedJobs";
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  const params = new URL(request.url).searchParams;
  if (params.has("minFitScore")) return NextResponse.json({ error: "Use minSimilarity for semantic ranking." }, { status: 400, headers });
  if (params.has("userId") || params.has("resumeId")) return NextResponse.json({ error: "Caller-selected identity is not permitted." }, { status: 400, headers });
  const parsed = jobQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return NextResponse.json({ error: "Invalid job search parameters." }, { status: 400, headers });
  try { return NextResponse.json({ success: true, ...await getPersonalizedJobs(user.id, parsed.data) }, { headers }); }
  catch { return NextResponse.json({ error: "Personalized jobs are temporarily unavailable." }, { status: 503, headers }); }
}
