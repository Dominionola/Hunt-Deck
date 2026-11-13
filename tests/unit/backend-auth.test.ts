import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signInSchema, signUpSchema } from "../../src/lib/validations/auth";
import { GET as getSession } from "../../src/app/api/auth/session/route";
import { POST as uploadResume } from "../../src/app/api/resumes/upload/route";
import { GET as getJobs } from "../../src/app/api/jobs/route";
import { GET as getDashboardMetrics } from "../../src/app/api/dashboard/metrics/route";
import { POST as saveOnboarding } from "../../src/app/api/onboarding/route";
import { completeOnboardingSchema } from "../../src/lib/validations/onboarding";
import {
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
} from "../../src/services/storage/r2Service";

describe("Backend Infrastructure & Authentication (TASK-BE-001 - TASK-BE-008)", () => {
  describe("1. Input Validation Schemas (signInSchema & signUpSchema)", () => {
    it("validates valid sign-in credentials and rejects malformed emails", () => {
      const valid = signInSchema.safeParse({
        email: "alex.rivera@example.com",
        password: "securePassword123!",
      });
      assert.equal(valid.success, true);

      const invalidEmail = signInSchema.safeParse({
        email: "not-an-email",
        password: "securePassword123!",
      });
      assert.equal(invalidEmail.success, false);

      const emptyPassword = signInSchema.safeParse({
        email: "alex@example.com",
        password: "",
      });
      assert.equal(emptyPassword.success, false);
    });

    it("enforces minimum 8 characters password for sign-up", () => {
      const tooShort = signUpSchema.safeParse({
        fullName: "Alex Rivera",
        email: "alex@example.com",
        password: "short",
      });
      assert.equal(tooShort.success, false);

      const validSignUp = signUpSchema.safeParse({
        fullName: "Alex Rivera",
        email: "alex@example.com",
        password: "validPassword123",
      });
      assert.equal(validSignUp.success, true);
    });
  });

  describe("2. Server-Side Authentication Enforcement & Protected Endpoints", () => {
    it("rejects unauthenticated session requests with 401 Unauthorized", async () => {
      const response = await getSession();
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.equal(data.error, "Not authenticated.");
    });

    it("rejects unauthenticated resume upload with 401 and clean error message", async () => {
      const req = new Request("http://localhost:3000/api/resumes/upload", {
        method: "POST",
      });
      const response = await uploadResume(req);
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.ok(data.error.includes("sign in"));
    });

    it("strictly rejects caller-supplied userId in /api/jobs query parameters", async () => {
      const req = new Request("http://localhost:3000/api/jobs?userId=injected_attacker_id", {
        method: "GET",
      });
      const response = await getJobs(req);
      assert.equal(response.status, 400);
      const data = await response.json();
      assert.ok(data.error.includes("Caller-supplied user identity is not permitted"));
    });

    it("rejects unauthenticated dashboard metrics request with 401", async () => {
      const response = await getDashboardMetrics();
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.equal(data.error, "Not authenticated.");
    });
  });

  describe("3. Private R2 Presigned Access & Ownership Validation (TASK-BE-004)", () => {
    it("generates presigned upload URL scoped to user ID", async () => {
      const { uploadUrl, storageKey, expiresInSeconds } =
        await generatePresignedUploadUrl("user_alex_123");

      assert.ok(uploadUrl.length > 0);
      assert.ok(storageKey.startsWith("resumes/user_alex_123/"));
      assert.equal(expiresInSeconds, 900);
    });

    it("permits presigned download URL generation when user owns the key", async () => {
      const { downloadUrl, expiresInSeconds } =
        await generatePresignedDownloadUrl("user_alex_123", "resumes/user_alex_123/doc1.pdf");

      assert.ok(downloadUrl.length > 0);
      assert.equal(expiresInSeconds, 300);
    });

    it("strictly REJECTS cross-user download attempt with Access Denied", async () => {
      await assert.rejects(
        async () => {
          await generatePresignedDownloadUrl(
            "user_alex_123",
            "resumes/different_user_victim/confidential_resume.pdf"
          );
        },
        {
          name: "Error",
          message: "Access denied: You do not have permission to access this document.",
        }
      );
    });
  });

  describe("4. Onboarding Gate & Persistence Endpoint", () => {
    it("rejects unauthenticated onboarding submission with 401 Unauthorized", async () => {
      const request = new Request("http://localhost:3000/api/onboarding", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const response = await saveOnboarding(request);
      assert.equal(response.status, 401);
      const data = await response.json();
      assert.equal(data.error, "Unauthorized");
    });

    it("validates complete onboarding payload with valid career targets and skills", () => {
      const payload = {
        importData: {
          resumeFileId: "res_abc_123",
          fileName: "Alex_Rivera_Resume.pdf",
          fileSizeBytes: 104200,
          linkedinUrl: "https://linkedin.com/in/alexrivera",
          isScratchMode: false,
        },
        skillsData: {
          skills: [
            { name: "TypeScript", category: "Languages", isVerified: true },
            { name: "React", category: "Frameworks", isVerified: true },
            { name: "PostgreSQL", category: "Frameworks", isVerified: true },
          ],
          atsReadabilityScore: 92,
        },
        targetsData: {
          targetTitles: ["Staff Software Engineer", "Tech Lead"],
          workArrangement: "REMOTE",
          preferredLocations: ["Remote US"],
          seniorityLevel: "LEAD",
          minSalary: 185000,
        },
      };

      const result = completeOnboardingSchema.safeParse(payload);
      assert.equal(result.success, true);
    });
  });
});

