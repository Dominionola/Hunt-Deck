import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { verifySameOrigin } from "@/lib/security/originCheck";
import { validatePdfUpload } from "@/lib/validations/upload";
import { stageResumeForWorker } from "@/services/storage/r2Service";
import { enqueueResume, enforceResumeRateLimit, getOwnedResumeJob, resumeJobId } from "@/services/queue/resumeQueue";
import {
  createCloudflareResumeJob,
  getCloudflareResumeJobForOwner,
  retryFailedCloudflareResumeJob,
} from "@/services/queue/cloudflareResumeJobs";
import {
  createCloudflareQueueRestSender,
  drainCloudflareResumeOutbox,
  enforceCloudflareResumeRateLimit,
  isCloudflareResumeQueueEnabled,
} from "@/services/queue/cloudflareQueueClient";

function mapCloudflareState(state: string): "waiting" | "active" | "completed" | "failed" {
  if (state === "processing") return "active";
  if (state === "completed") return "completed";
  if (state === "failed") return "failed";
  return "waiting";
}

export async function POST(request: Request) {
  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Please sign in to upload your resume." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Only valid PDF files up to 10 MB are accepted." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validatePdfUpload({ name: file.name, type: file.type, size: file.size }, buffer)) return NextResponse.json({ error: "Only valid PDF files up to 10 MB are accepted." }, { status: 400 });
    const id = resumeJobId(user.id, buffer);

    if (isCloudflareResumeQueueEnabled()) {
      if (!await enforceCloudflareResumeRateLimit(user.id)) {
        return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429, headers: { "Cache-Control": "no-store" } });
      }
      const existing = await getCloudflareResumeJobForOwner(id, user.id);
      if (existing && existing.state !== "failed") {
        return NextResponse.json({ jobId: id, status: mapCloudflareState(existing.state) }, { status: 202, headers: { "Cache-Control": "no-store" } });
      }
      const storageKey = await stageResumeForWorker(user.id, file.name, buffer);
      if (existing?.state === "failed") {
        await retryFailedCloudflareResumeJob(id, user.id, storageKey);
      } else {
        await createCloudflareResumeJob(id, user.id, storageKey);
      }
      try {
        const sender = createCloudflareQueueRestSender();
        await drainCloudflareResumeOutbox(sender, { limit: 1 });
      } catch {
        // Outbox row remains durably pending for recovery if queue publish is temporarily unavailable.
      }
      return NextResponse.json({ jobId: id, status: "waiting" }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }

    if (!await enforceResumeRateLimit(user.id)) return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429, headers: { "Cache-Control": "no-store" } });
    const existing = await getOwnedResumeJob(id, user.id);
    if (existing) {
      const status = await existing.getState();
      if (status === "failed") {
        await existing.retry("failed", { resetAttemptsMade: true, resetAttemptsStarted: true });
        return NextResponse.json({ jobId: id, status: "waiting" }, { status: 202, headers: { "Cache-Control": "no-store" } });
      }
      return NextResponse.json({ jobId: id, status }, { status: 202, headers: { "Cache-Control": "no-store" } });
    }
    const storageKey = await stageResumeForWorker(user.id, file.name, buffer);
    await enqueueResume({ userId: user.id, storageKey }, id);
    return NextResponse.json({ jobId: id, status: "waiting" }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to start resume processing. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
