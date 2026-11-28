import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { verifySameOrigin } from "@/lib/security/originCheck";
import { enrichCompanyContacts } from "@/services/contacts/contactIntelligenceService";
import { getOrSetCached } from "@/lib/cache";

const enrichContactsSchema = z.object({
  companyName: z.string().min(1).max(200),
  roleTitle: z.string().min(1).max(300),
  jobDescription: z.string().max(150000).optional(),
});

const headers = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const originError = verifySameOrigin(request);
  if (originError) return originError;

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400, headers });
  }

  const parsed = enrichContactsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid contact enrichment input." }, { status: 400, headers });
  }

  try {
    const { data: contacts, cached } = await getOrSetCached(
      "contacts-enrich",
      {
        company: parsed.data.companyName.trim().toLowerCase(),
        role: parsed.data.roleTitle.trim().toLowerCase(),
        jd: parsed.data.jobDescription ?? "",
      },
      43_200,
      () =>
        enrichCompanyContacts(
          parsed.data.companyName,
          parsed.data.roleTitle,
          parsed.data.jobDescription
        )
    );
    return NextResponse.json({ success: true, contacts, cached }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Unable to enrich contacts right now." },
      { status: 500, headers }
    );
  }
}
