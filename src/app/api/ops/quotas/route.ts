import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { evaluateProviderQuotaStatus, RETENTION_AND_SLO_POLICY } from "@/services/ops/usageQuotas";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const status = evaluateProviderQuotaStatus();
  return NextResponse.json(
    {
      ok: status.ok,
      alerts: status.alerts,
      policy: RETENTION_AND_SLO_POLICY,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
