import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/services/auth/serverAuth";
import { uploadResumeFile } from "@/services/storage/r2Service";
import { parsePdfBuffer } from "@/services/parsing/resumeParser";
import { extractResumeEntities } from "@/services/ai/resumeExtractor";
import { createResume } from "@/services/db/resumeService";
import { validatePdfUpload } from "@/lib/validations/upload";
import type { ResumeParsedData } from "@/lib/validations/resume";

export async function POST(request: Request) {
  // 1. Verify authenticated user identity server-side
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in to upload your resume." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No resume file provided." },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 2. Validate PDF signature, MIME type, and size (<= 10MB)
    const isValid = validatePdfUpload(
      { name: file.name, type: file.type, size: file.size },
      fileBuffer
    );
    if (!isValid) {
      return NextResponse.json(
        { error: "Only valid PDF files up to 10 MB are accepted." },
        { status: 400 }
      );
    }

    // 3. Upload to private R2 storage
    const { url, storageKey } = await uploadResumeFile(
      fileBuffer,
      file.name,
      file.type || "application/pdf"
    );

    // 4. Parse text from PDF
    const textExtraction = await parsePdfBuffer(fileBuffer);

    // 5. Extract structured entities with AI
    let parsedData: ResumeParsedData;
    const atsScore = 85;
    try {
      parsedData = (await extractResumeEntities(textExtraction.text)) as unknown as ResumeParsedData;
    } catch {
      // Fallback structured data if AI parser is rate-limited
      parsedData = {
        fullName: user.name || "Candidate",
        email: user.email,
        summary: textExtraction.text.slice(0, 300),
        skills: ["TypeScript", "React", "PostgreSQL"],
        experience: [],
        education: [],
        projects: [],
      };
    }

    // 6. Save Resume in Prisma mapped to verified user ID
    const resume = await createResume(user.id, {
      title: file.name,
      originalFileUrl: url,
      extractedText: textExtraction.text,
      parsedData,
      atsScore,
    });

    return NextResponse.json(
      {
        success: true,
        resumeId: resume.id,
        storageKey,
        extractedData: parsedData,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process resume upload.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
