import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signInSchema } from "@/lib/validations/auth";
import { createClient } from "@/utils/supabase/server";

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
    const { error } = await client.auth.signInWithPassword(parsed.data);
    if (error) {
      return NextResponse.json({ error: "Unable to sign in." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
