import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { resumeJobIdSchema } from "@/lib/validations/resumeJob";
import { getOwnedResumeJob } from "@/services/queue/resumeQueue";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const parsed = resumeJobIdSchema.safeParse(new URL(request.url).searchParams.get("jobId"));
  if (!parsed.success) return NextResponse.json({ error: "Invalid job ID." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    const job = await getOwnedResumeJob(parsed.data, user.id);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const status = await job.getState();
    if (status === "completed") {
      if (job.returnvalue?.resumeId !== `resume_${parsed.data}`) throw new Error("Result unavailable.");
      const resume = await db.resume.findFirst({ where: { id: job.returnvalue.resumeId, userId: user.id }, select: { id: true, parsedData: true } });
      if (!resume) throw new Error("Result unavailable.");
      return NextResponse.json({ status, progress: 100, resumeId: resume.id, parsedData: resume.parsedData }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ status, progress: typeof job.progress === "number" ? job.progress : 0, error: status === "failed" ? "Resume processing failed. Please try again later." : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "Forbidden" ? "Access denied." : "Unable to retrieve processing status." }, { status: error instanceof Error && error.message === "Forbidden" ? 403 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
