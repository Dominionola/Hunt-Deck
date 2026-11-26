import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { resumeJobIdSchema } from "@/lib/validations/resumeJob";
import { getOwnedResumeJob, getResumeQueue } from "@/services/queue/resumeQueue";
import { getCloudflareResumeJobForOwner } from "@/services/queue/cloudflareResumeJobs";
import { isCloudflareResumeQueueEnabled } from "@/services/queue/cloudflareQueueClient";
import { db } from "@/lib/db";
import { decodeResumeFailure, decodeResumeDiagnostic, resumeFailureMessage } from "@/lib/resumeFailure";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const parsed = resumeJobIdSchema.safeParse(new URL(request.url).searchParams.get("jobId"));
  if (!parsed.success) return NextResponse.json({ error: "Invalid job ID." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    if (isCloudflareResumeQueueEnabled()) {
      const job = await getCloudflareResumeJobForOwner(parsed.data, user.id);
      if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
      if (job.state === "completed") {
        if (job.resume_id !== `resume_${parsed.data}`) throw new Error("Result unavailable.");
        const resume = await db.resume.findFirst({ where: { id: job.resume_id, userId: user.id }, select: { id: true, parsedData: true } });
        if (!resume) throw new Error("Result unavailable.");
        return NextResponse.json({ status: "completed", progress: 100, resumeId: resume.id, parsedData: resume.parsedData }, { headers: { "Cache-Control": "no-store" } });
      }
      const status = job.state === "processing" ? "active" : job.state === "failed" ? "failed" : "waiting";
      const errorCode = job.state === "failed" ? (job.failure_code ?? "UNKNOWN") : undefined;
      return NextResponse.json({
        status,
        progress: job.progress,
        errorCode,
        error: errorCode ? resumeFailureMessage(errorCode) : undefined,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const job = await getOwnedResumeJob(parsed.data, user.id);
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    const status = await job.getState();
    if (status === "completed") {
      if (job.returnvalue?.resumeId !== `resume_${parsed.data}`) throw new Error("Result unavailable.");
      const resume = await db.resume.findFirst({ where: { id: job.returnvalue.resumeId, userId: user.id }, select: { id: true, parsedData: true } });
      if (!resume) throw new Error("Result unavailable.");
      return NextResponse.json({ status, progress: 100, resumeId: resume.id, parsedData: resume.parsedData }, { headers: { "Cache-Control": "no-store" } });
    }
    let errorCode = status === "failed" ? decodeResumeFailure(job.failedReason) : undefined;
    if (errorCode === "TEMPORARILY_UNAVAILABLE") {
      try {
        const { logs } = await getResumeQueue().getJobLogs(parsed.data, -5, -1);
        const diagnostic = logs.map(decodeResumeDiagnostic).filter((code) => code !== "UNKNOWN").at(-1);
        if (diagnostic) errorCode = diagnostic;
      } catch { /* Safe fallback still explains the temporary failure. */ }
    }
    return NextResponse.json({ status, progress: typeof job.progress === "number" ? job.progress : 0, errorCode, error: errorCode ? resumeFailureMessage(errorCode) : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "Forbidden" ? "Access denied." : "Unable to retrieve processing status." }, { status: error instanceof Error && error.message === "Forbidden" ? 403 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
