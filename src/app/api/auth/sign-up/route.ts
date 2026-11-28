import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signUpSchema } from "@/lib/validations/auth";
import { createClient } from "@/utils/supabase/server";
import { registerAccount } from "@/services/auth/registrationService";

export async function POST(request: Request) {
  // Prevent cross-site origin submissions
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid registration details.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const requestOrigin = origin || new URL(request.url).origin;

    // Clear any previously logged-in browser session so stale cookies never trigger
    // an immediate redirect during verification polling for a newly signed-up email.
    const { data: existingSession } = await supabase.auth.getUser();
    if (existingSession?.user) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    }

    const result = await registerAccount(parsed.data, new URL("/auth/callback", requestOrigin).toString(), supabase.auth);
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      result,
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Registration is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

