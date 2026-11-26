import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { getDashboardMetrics } from "@/services/db/dashboardService";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers });
    return NextResponse.json(await getDashboardMetrics(user.id), { headers });
  } catch {
    return NextResponse.json({ error: "Dashboard metrics are temporarily unavailable." }, { status: 503, headers });
  }
}
