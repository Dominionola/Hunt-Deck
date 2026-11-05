import { NextResponse } from "next/server";

// Fail closed until a server-verified session and private, owner-authorized
// storage flow are implemented. Do not parse the request or accept user IDs.
export async function POST() {
  return NextResponse.json(
    { error: "Resume uploads are temporarily unavailable." },
    { status: 503, headers: { "Cache-Control": "no-store" } }
  );
}
