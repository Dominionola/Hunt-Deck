import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import {
  createCloudflareQueueRestSender,
  drainCloudflareResumeOutbox,
  isCloudflareResumeQueueEnabled,
} from "@/services/queue/cloudflareQueueClient";

const publishRequestSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
}).strict();

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  if (!isCloudflareResumeQueueEnabled()) {
    return NextResponse.json({ error: "Cloudflare resume queue is not enabled." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const rawBody = await request.text();
    const parsedBody = rawBody.trim() ? publishRequestSchema.safeParse(JSON.parse(rawBody)) : { success: true as const, data: {} };
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid publish request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const sender = createCloudflareQueueRestSender();
    const result = await drainCloudflareResumeOutbox(sender, { limit: parsedBody.data.limit ?? 10 });
    return NextResponse.json(result, { status: result.failed ? 502 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to publish pending resume jobs." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
