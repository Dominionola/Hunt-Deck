import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  try {
    const [profile, companies, titles] = await Promise.all([
      db.profile.findUnique({
        where: { userId: user.id },
        select: { targetTitles: true },
      }),
      db.jobPosting.findMany({
        where: q ? { company: { contains: q, mode: "insensitive" } } : undefined,
        distinct: ["company"],
        select: { company: true },
        orderBy: { company: "asc" },
        take: 6,
      }),
      db.jobPosting.findMany({
        where: q ? { title: { contains: q, mode: "insensitive" } } : undefined,
        distinct: ["title"],
        select: { title: true },
        orderBy: { postedAt: "desc" },
        take: 6,
      }),
    ]);

    const matchingTargetTitles = (profile?.targetTitles ?? []).filter((t) =>
      q ? t.toLowerCase().includes(q.toLowerCase()) : true
    );

    return NextResponse.json(
      {
        targetTitles: matchingTargetTitles.slice(0, 6),
        companies: companies.map((c) => c.company),
        roles: titles.map((t) => t.title),
      },
      { headers }
    );
  } catch {
    return NextResponse.json({ targetTitles: [], companies: [], roles: [] }, { headers });
  }
}
