import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateResumeFile,
  normalizeExtractedText,
} from "../../src/services/parsing/resumeParser";
import { resumeParsedDataSchema } from "../../src/lib/validations/resume";
import { scanForBlocklistedTokens } from "../../src/lib/ai-tokens-blocklist";
import { cosineSimilarity } from "../../src/services/ai/embeddingService";

describe("Resume Pipeline — Unit Tests", () => {
  it("should validate allowed resume file types and sizes", () => {
    const validPdf = validateResumeFile({
      name: "john_doe_resume.pdf",
      size: 1024 * 1024 * 2, // 2MB
      type: "application/pdf",
    });
    assert.equal(validPdf.valid, true);

    const oversizedFile = validateResumeFile({
      name: "huge_portfolio.pdf",
      size: 1024 * 1024 * 15, // 15MB
      type: "application/pdf",
    });
    assert.equal(oversizedFile.valid, false);
    assert.match(oversizedFile.error ?? "", /exceeds 10MB/i);

    const invalidExtension = validateResumeFile({
      name: "script.exe",
      size: 1024,
      type: "application/x-msdownload",
    });
    assert.equal(invalidExtension.valid, false);
  });

  it("should normalize extracted resume text and convert non-standard bullets", () => {
    const rawText = "Experience\r\n\u2022 Built distributed caching service   using Redis\n\u25E6 Scaled API to 50k req/s\n\n\n\nEducation";
    const normalized = normalizeExtractedText(rawText);

    assert.ok(normalized.includes("• Built distributed caching service using Redis"));
    assert.ok(normalized.includes("• Scaled API to 50k req/s"));
    assert.ok(!normalized.includes("\n\n\n")); // Normalized triple linebreaks
  });

  it("should enforce strict runtime validation on parsed resume data", () => {
    const sampleResume = {
      fullName: "Alex Rivera",
      email: "alex@example.com",
      phone: "+1-555-0199",
      location: "San Francisco, CA",
      summary: "Staff Infrastructure Engineer with 8+ years experience.",
      skills: ["Kubernetes", "Go", "PostgreSQL", "Kafka"],
      experience: [
        {
          company: "CloudScale Inc",
          title: "Senior SRE",
          startDate: "2021",
          endDate: "Present",
          isCurrent: true,
          bullets: ["Maintained 99.99% uptime across 12 EKS clusters"],
        },
      ],
      education: [
        {
          institution: "UC Berkeley",
          degree: "BS Computer Science",
          graduationYear: "2019",
        },
      ],
      projects: [],
    };

    const validated = resumeParsedDataSchema.parse(sampleResume);
    assert.equal(validated.fullName, "Alex Rivera");
    assert.equal(validated.skills.length, 4);
    assert.equal(validated.experience[0].company, "CloudScale Inc");
  });

  it("should accurately detect banned AI token watermarks", () => {
    const aiText = "In today's fast-paced digital landscape, it is crucial to delve into high-impact solutions.";
    const violations = scanForBlocklistedTokens(aiText);

    assert.ok(violations.length >= 2);
    assert.ok(violations.includes("in today's fast-paced digital landscape"));
    assert.ok(violations.includes("delve into"));

    const humanText = "Engineered sub-50ms message queue routing 1.2M transactions per day across 4 regional clusters.";
    const cleanCheck = scanForBlocklistedTokens(humanText);
    assert.equal(cleanCheck.length, 0);
  });

  it("should compute exact cosine similarity between vector embeddings", () => {
    const vecA = [1, 0, 0];
    const vecB = [1, 0, 0];
    const vecC = [0, 1, 0];

    assert.equal(Math.round(cosineSimilarity(vecA, vecB)), 1);
    assert.equal(Math.round(cosineSimilarity(vecA, vecC)), 0);
  });
});
