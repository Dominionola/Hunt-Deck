import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    // Ask Auth to validate the user; cookie contents alone are not an identity.
    const client = createClient(await cookies());
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers });
    }
    return NextResponse.json({ user: { id: data.user.id } }, { headers });
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503, headers });
  }
}
