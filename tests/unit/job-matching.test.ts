import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateCandidateFit,
  extractKeywordsFromText,
} from "../../src/services/matching/fitScoreEngine";
import { computeJobHash } from "../../src/services/jobs/jobAggregator";
import type { ResumeParsedData } from "../../src/lib/validations/resume";

describe("Job Matching & Multi-Dimensional Fit Engine — Unit Tests", () => {
  const mockResume: ResumeParsedData = {
    fullName: "Jane Developer",
    email: "jane@example.com",
    phone: "555-0100",
    location: "San Francisco, CA",
    summary: "Senior Full-Stack Engineer with extensive experience in React, TypeScript, and distributed systems.",
    skills: ["TypeScript", "React", "PostgreSQL", "Next.js", "Redis", "Docker", "Node.js"],
    experience: [
      {
        company: "Tech Corp",
        title: "Senior Software Engineer",
        startDate: "2020",
        endDate: "Present",
        isCurrent: true,
        bullets: ["Architected microservices handling 25k requests per second"],
      },
      {
        company: "Startup Co",
        title: "Full Stack Developer",
        startDate: "2018",
        endDate: "2020",
        isCurrent: false,
        bullets: ["Built customer-facing React and Node.js dashboards"],
      },
    ],
    education: [
      {
        institution: "Stanford University",
        degree: "BS Computer Science",
        graduationYear: "2018",
      },
    ],
    projects: [],
  };

  it("should extract known technical keywords from job descriptions", () => {
    const jdText = "We are looking for a Senior Engineer with proficiency in TypeScript, React, and PostgreSQL to build CI/CD pipelines with Docker and Kubernetes.";
    const keywords = extractKeywordsFromText(jdText);

    assert.ok(keywords.includes("TypeScript"));
    assert.ok(keywords.includes("React"));
    assert.ok(keywords.includes("PostgreSQL"));
    assert.ok(keywords.includes("Docker"));
    assert.ok(keywords.includes("Kubernetes"));
    assert.ok(!keywords.includes("Solidity")); // Not in JD
  });

  it("should calculate multi-factor fit score with accurate 40/30/20/10 weighting", () => {
    const matchedJob = {
      title: "Senior Software Engineer",
      description: "Seeking a Senior Software Engineer skilled in TypeScript, React, PostgreSQL, and Redis.",
      location: "San Francisco, CA",
      remoteType: "REMOTE_ONLY",
    };

    const fit = calculateCandidateFit(mockResume, matchedJob);

    // Candidate possesses all 4 required skills -> 100% skills score
    assert.equal(fit.skillsScore, 100);
    // Exact title match -> 100% title score
    assert.equal(fit.titleScore, 100);
    // Remote job -> 100% location score
    assert.equal(fit.locationScore, 100);
    // Senior candidate with 2+ roles -> high experience score
    assert.ok(fit.experienceScore >= 75);
    // Overall weighted score must be >= 85 and marked STRONG_MATCH
    assert.ok(fit.overallScore >= 85);
    assert.equal(fit.recommendation, "STRONG_MATCH");
  });

  it("should identify missing keywords in gap analysis", () => {
    const jobWithGaps = {
      title: "Backend Engineer",
      description: "Requires deep experience in Rust, Kafka, and Kubernetes alongside TypeScript.",
      location: "New York, NY",
    };

    const fit = calculateCandidateFit(mockResume, jobWithGaps);

    assert.ok(fit.matchingKeywords.includes("TypeScript"));
    assert.ok(fit.missingKeywords.includes("Rust"));
    assert.ok(fit.missingKeywords.includes("Kafka"));
    assert.ok(fit.missingKeywords.includes("Kubernetes"));
  });

  it("should generate deterministic SHA-256 job fingerprints for deduplication", () => {
    const hash1 = computeJobHash("Stripe", "Senior Backend Engineer", "https://stripe.com/jobs/1");
    const hash2 = computeJobHash("STRIPE ", "senior backend engineer", "https://stripe.com/jobs/1");
    const hash3 = computeJobHash("Figma", "Senior Backend Engineer", "https://figma.com/jobs/2");

    assert.equal(hash1, hash2); // Case and whitespace normalized
    assert.notEqual(hash1, hash3); // Different company and url
  });
});
