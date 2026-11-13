import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import {
  getUserPipelineApplications,
  createOrUpsertPipelineOpportunity,
} from "@/services/db/applicationService";
import { z } from "zod";

const createOpportunitySchema = z.object({
  company: z.string().min(1, "Company name is required"),
  role: z.string().min(1, "Role title is required"),
  location: z.string().optional(),
  workArrangement: z.enum(["remote", "hybrid", "onsite"]).optional(),
  salary: z.string().optional(),
  fitScore: z.number().min(0).max(100).optional(),
  stage: z.enum(["saved", "tailored", "applied", "interviewing", "offer"]).optional(),
  notes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  contact: z
    .object({
      name: z.string(),
      role: z.string(),
      email: z.string().optional(),
      linkedInUrl: z.string().optional(),
    })
    .optional(),
  portalUrl: z.string().optional(),
  source: z.enum(["greenhouse", "lever", "ashby", "social", "direct"]).optional(),
});

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const applications = await getUserPipelineApplications(user.id);
    return NextResponse.json(
      {
        success: true,
        applications,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load applications.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const json = await request.json();
    const parsed = createOpportunitySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid opportunity data.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const application = await createOrUpsertPipelineOpportunity(user.id, parsed.data);

    return NextResponse.json(
      {
        success: true,
        application,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create application.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

