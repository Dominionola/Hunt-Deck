import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { getJobIngestionQueue } from "@/services/queue/jobIngestionQueue";
import { ingestionCheckpointSchema, ingestionCountsSchema, ingestionStatusQuerySchema } from "@/lib/validations/jobIngestion";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin authorization required." }, { status: 403, headers });
  const parsed = ingestionStatusQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid job identifier." }, { status: 400, headers });
  try {
    const job = await getJobIngestionQueue().getJob(parsed.data.jobId);
    if (!job || job.data.userId !== user.id) return NextResponse.json({ error: "Job not found." }, { status: 404, headers });
    const state = await job.getState();
    let value: unknown = job.returnvalue;
    if (state === "failed") {
      const logs = await getJobIngestionQueue().getJobLogs(parsed.data.jobId, 0, 0, false);
      try { value = JSON.parse(logs.logs[0] ?? "null"); } catch { value = null; }
    }
    const result = state === "completed" || state === "failed" ? ingestionCountsSchema.safeParse(value) : null;
    const checkpoint = ingestionCheckpointSchema.safeParse(job.progress);
    return NextResponse.json({ status: state, progress: typeof job.progress === "number" ? job.progress : checkpoint.success ? checkpoint.data.progress : 0,
      ...(result?.success ? { result: result.data } : {}),
      ...(state === "failed" ? { error: "Job ingestion failed. Review the source configuration and retry later." } : {}) }, { headers });
  } catch { return NextResponse.json({ error: "Job status unavailable." }, { status: 503, headers }); }
}
