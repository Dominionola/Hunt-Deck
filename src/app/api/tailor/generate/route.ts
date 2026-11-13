import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { getPrimaryResume, getUserResumes } from "@/services/db/resumeService";
import { db } from "@/lib/db";
import {
  decomposeJobDescription,
  rewriteBulletThreePass,
  type TailoredRoleExperience,
  type RewrittenBullet,
} from "@/services/ai/bulletRewriter";
import { generateTailoredCoverLetter, type CoverLetterTone } from "@/services/ai/coverLetterGenerator";
import { auditAtsFormatting } from "@/services/parsing/formattingValidator";
import type { ResumeParsedData } from "@/lib/validations/resume";
import { z } from "zod";

const generateTailorSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  jobDescription: z.string().min(10, "Job description is required"),
  tone: z.enum(["executive", "warm", "modern_tech"]).default("modern_tech"),
  applicationId: z.string().optional(),
  candidateProfile: z.custom<ResumeParsedData>().optional(),
});

const DEFAULT_FALLBACK_PROFILE: ResumeParsedData = {
  fullName: "Candidate",
  email: "candidate@example.com",
  summary: "Experienced software engineer specializing in scalable distributed web systems.",
  skills: ["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "AWS"],
  experience: [
    {
      company: "Technology Corp",
      title: "Senior Software Engineer",
      startDate: "2021",
      isCurrent: true,
      bullets: [
        "Architected high-throughput cloud microservices handling 10,000+ requests per second with 99.99% availability.",
        "Refactored relational database queries and introduced Redis caching, slashing p99 latency by 45%.",
        "Streamlined automated CI/CD deployment pipelines using Docker, reducing release cycle time from 1 hour to 12 minutes.",
      ],
    },
  ],
  education: [],
  projects: [],
};

export async function POST(request: Request) {
  // 1. Authenticate user
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const json = await request.json();
    const parsed = generateTailorSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid tailoring parameters.", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { jobTitle, company, jobDescription, tone, applicationId } = parsed.data;

    // 2. Resolve Candidate Master Profile
    let candidate: ResumeParsedData = parsed.data.candidateProfile as ResumeParsedData;
    let resumeId: string | undefined;

    if (!candidate || !candidate.experience || candidate.experience.length === 0) {
      let resumeRecord = await getPrimaryResume(user.id);
      if (!resumeRecord) {
        const all = await getUserResumes(user.id);
        resumeRecord = all[0];
      }

      if (resumeRecord && resumeRecord.parsedData) {
        candidate = resumeRecord.parsedData as unknown as ResumeParsedData;
        resumeId = resumeRecord.id;
      } else {
        candidate = {
          ...DEFAULT_FALLBACK_PROFILE,
          fullName: user.name || "Candidate",
          email: user.email,
        };
      }
    }

    // 3. Decompose Job Description (Pass 1 of ATS Engine)
    const decomposedJD = decomposeJobDescription(jobDescription);

    // 4. Run 3-Pass Bullet Point Rewriting Pipeline
    const tailoredRoles: TailoredRoleExperience[] = [];
    const candidateSkillsLower = (candidate.skills || []).map((s) => s.toLowerCase());

    for (const exp of candidate.experience || []) {
      const rewrittenBullets: RewrittenBullet[] = [];
      for (const bullet of exp.bullets || []) {
        const rewritten = rewriteBulletThreePass(bullet, decomposedJD);
        rewrittenBullets.push(rewritten);
      }
      // Sort highest relevance first, keep top 5
      rewrittenBullets.sort((a, b) => b.relevanceScore - a.relevanceScore);
      tailoredRoles.push({
        company: exp.company,
        title: exp.title,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isCurrent: exp.isCurrent ?? false,
        bullets: rewrittenBullets.slice(0, 5),
      });
    }

    // Identify genuine missing skill gaps
    const gapSkillsDetected = decomposedJD.mustHaveSkills.filter(
      (skill) => !candidateSkillsLower.includes(skill.toLowerCase())
    );

    // 5. Generate Bespoke 4-Paragraph Cover Letter (Claude 3.5 Sonnet Engine)
    const coverLetter = await generateTailoredCoverLetter(
      candidate,
      company,
      jobTitle,
      jobDescription,
      tone as CoverLetterTone
    );

    // 6. Run Hard ATS Format & Pre-Flight Audit
    const sampleResumeText = [
      candidate.fullName,
      candidate.summary || "",
      tailoredRoles.map((r) => `${r.title} ${r.company} ${r.bullets.map((b) => b.rewrittenBullet).join(" ")}`).join(" "),
      (candidate.skills || []).join(" "),
    ].join("\n");

    const atsAudit = auditAtsFormatting(sampleResumeText, candidate, decomposedJD.mustHaveSkills);

    // 7. Associate with Application Record if applicationId was provided
    if (applicationId) {
      const existingApp = await db.application.findFirst({
        where: { id: applicationId, userId: user.id },
      });

      if (existingApp) {
        let meta: Record<string, any> = {};
        if (existingApp.interviewNotes) {
          try {
            meta = JSON.parse(existingApp.interviewNotes);
          } catch {
            meta = { notes: [existingApp.interviewNotes] };
          }
        }

        meta.stage = "tailored";
        meta.tailoredPack = {
          jobTitle,
          company,
          atsScore: atsAudit.overallScore,
          generatedAt: new Date().toISOString(),
        };

        await db.application.update({
          where: { id: applicationId },
          data: {
            coverLetterText: coverLetter.fullText,
            interviewNotes: JSON.stringify(meta),
            resumeId: resumeId || existingApp.resumeId,
          },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          decomposedJD,
          tailoredRoles,
          coverLetter,
          atsAudit,
          gapSkillsDetected,
          candidateUsed: {
            fullName: candidate.fullName,
            skillsCount: candidate.skills?.length || 0,
            experienceCount: tailoredRoles.length,
          },
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate tailored application pack.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

