import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { completeOnboardingSchema } from "@/lib/validations/onboarding";
import { persistOnboarding, OnboardingResumeUnavailable } from "@/services/onboarding/onboardingService";

export async function POST(request: Request) {
  // Prevent cross-origin submissions
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = completeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid onboarding payload", details: parsed.error.format() },
      { status: 400 }
    );
  }

  try {
    const result = await persistOnboarding(user, parsed.data);

    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof OnboardingResumeUnavailable) {
      return NextResponse.json({ error: "Resume not found. Please complete your upload again." },
        { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    const candidate = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const code = typeof candidate === "string" && ["P1001", "P1002", "P1017", "P2022", "P2024", "P2028", "P2034"].includes(candidate) ? candidate : "ONBOARDING_FAILED";
    console.error(JSON.stringify({ event: "onboarding_save_failed", code }));
    return NextResponse.json(
      { error: "Failed to persist onboarding profile." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

