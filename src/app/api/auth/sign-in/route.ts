import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signInSchema } from "@/lib/validations/auth";
import { createClient } from "@/utils/supabase/server";
import { getUserByAuthSubject } from "@/services/db/userService";

export async function POST(request: Request) {
  // Prevent another site from initiating a login in this browser.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
  }
  try {
    const client = createClient(await cookies());
    const { data: authData, error } = await client.auth.signInWithPassword(parsed.data);
    if (error || !authData.user) {
      const msg = error?.message || "";
      const emailNotConfirmed = /email not confirmed|confirm your email/i.test(msg);
      return NextResponse.json({
        error: emailNotConfirmed
          ? "Please confirm your email address before signing in. Check your inbox or resend the verification link below."
          : msg || "Unable to sign in. Check your email and password, and confirm your email address first.",
        emailNotConfirmed,
      }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    // Determine onboarding completion status
    let onboardingCompleted = false;
    try {
      const user = await getUserByAuthSubject(authData.user.id);
      if (user) {
        onboardingCompleted = Boolean(
          (user.profile && user.profile.targetTitles && user.profile.targetTitles.length > 0)
        );
      }
    } catch {
      // In case database lookup fails gracefully, default to false so user is guided to onboarding
      onboardingCompleted = false;
    }

    return NextResponse.json({
      success: true,
      onboardingCompleted,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
