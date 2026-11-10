import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  mapAtsFormFields,
  type UnmappedDomField,
} from "../../src/services/automation/atsFormMapper";

import {
  detectCaptchaInPage,
  auditSubmissionQualityGate,
  executeAutoApplyRun,
} from "../../src/services/automation/playwrightWorker";

import {
  canApplyToJob,
  recordApplicationAttempt,
  resetCandidateReputation,
} from "../../src/services/automation/reputationGuard";

import {
  evaluateFirstMoverCandidate,
  processScrapedJobsBatch,
  resetFirstMoverMemory,
  type AlertProfile,
  type IncomingScrapedJob,
} from "../../src/services/alerts/firstMoverQueue";

import {
  dispatchFirstMoverAlert,
  clearUserNotifications,
} from "../../src/services/alerts/notificationService";

import {
  getRecentTelemetryEvents,
  clearTelemetryEvents,
} from "../../src/lib/telemetry";

describe("Phase 5: Supervised Auto-Apply & Alert Automation", () => {
  const dummyProfile = {
    fullName: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "+1-555-0199",
    skills: ["TypeScript", "React", "Node.js"],
    experience: [
      {
        company: "Stripe",
        title: "Senior Engineer",
        startDate: "2021-01",
        isCurrent: true,
        bullets: ["Engineered payment systems handling $10M+ daily."],
      },
    ],
    education: [
      {
        institution: "UC Berkeley",
        degree: "B.S. Computer Science",
        graduationYear: "2018",
      },
    ],
    projects: [],
    linkedInUrl: "https://linkedin.com/in/alexrivera-eng",
    githubUrl: "https://github.com/alexrivera-eng",
    portfolioUrl: "https://alexrivera.dev",
    location: "New York, NY",
    workAuthorization: "US Citizen",
    requiresSponsorship: false,
    yearsOfExperience: 7,
    expectedSalary: "$180,000",
    noticePeriod: "2 weeks",
    resumeFilePath: "/storage/resumes/alex_rivera_tailored.pdf",
    coverLetterText: "Stripe's payment infrastructure has scaled remarkably...",
  };

  beforeEach(() => {
    resetCandidateReputation("user_test_123");
    resetFirstMoverMemory();
    clearUserNotifications("user_test_123");
    clearTelemetryEvents();
  });

  describe("ATS Form Mapping & Smart Answer Engine", () => {
    it("recognizes standard Greenhouse form fields", () => {
      const rawFields: UnmappedDomField[] = [
        { id: "first_name", label: "First Name", type: "text", required: true },
        { id: "last_name", label: "Last Name", type: "text", required: true },
        { id: "email", label: "Email Address", type: "email", required: true },
        { id: "phone", label: "Phone Number", type: "tel", required: false },
        { id: "resume", label: "Attach Resume / CV", type: "file", required: true },
        { id: "job_application_answers_attributes_0_boolean_value", label: "Are you legally authorized to work in the United States?", type: "select", required: true },
      ];

      const result = mapAtsFormFields("greenhouse", rawFields, dummyProfile);

      assert.equal(result.platform, "greenhouse");
      assert.equal(result.fields.length, 6);
      
      const emailField = result.fields.find((f) => f.fieldId === "email");
      assert.equal(emailField?.value, "alex.rivera@example.com");

      const authField = result.fields.find((f) => f.fieldId.includes("boolean_value"));
      assert.equal(authField?.value, "Yes");
      assert.equal(result.requiresHumanIntervention, false);
    });

    it("recognizes standard Lever form fields and attaches resume", () => {
      const rawFields: UnmappedDomField[] = [
        { id: "name", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email", type: "email", required: true },
        { id: "resume", label: "Resume/CV", type: "file", required: true },
        { id: "urls[LinkedIn]", label: "LinkedIn URL", type: "url", required: false },
        { id: "urls[GitHub]", label: "GitHub URL", type: "url", required: false },
      ];

      const result = mapAtsFormFields("lever", rawFields, dummyProfile);
      assert.equal(result.platform, "lever");
      
      const resumeField = result.fields.find((f) => f.fieldId === "resume");
      assert.equal(resumeField?.value, dummyProfile.resumeFilePath);

      const linkedinField = result.fields.find((f) => f.label.includes("LinkedIn"));
      assert.equal(linkedinField?.value, dummyProfile.linkedInUrl);
    });

    it("flags unfamiliar custom subjective questions for human-in-the-loop review", () => {
      const rawFields: UnmappedDomField[] = [
        { id: "name", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email", type: "email", required: true },
        { id: "custom_q1", label: "Describe a time you solved an ambiguous distributed systems race condition under pressure.", type: "textarea", required: true },
      ];

      const result = mapAtsFormFields("ashby", rawFields, dummyProfile);
      assert.equal(result.requiresHumanIntervention, true);
      assert.equal(result.unresolvedFieldCount, 1);

      const customField = result.fields.find((f) => f.fieldId === "custom_q1");
      assert.equal(customField?.needsReview, true);
      assert.equal(customField?.category, "custom_subjective");
    });
  });

  describe("Security Barriers & CAPTCHA Detection", () => {
    it("detects Google reCAPTCHA in page DOM", () => {
      const html = `<div class="g-recaptcha" data-sitekey="6Ld..."></div>`;
      assert.equal(detectCaptchaInPage(html), true);
    });

    it("detects Cloudflare Turnstile in page DOM", () => {
      const html = `<div class="cf-turnstile" data-sitekey="0x4AAAAAA..."></div>`;
      assert.equal(detectCaptchaInPage(html), true);
    });

    it("detects hCaptcha in page DOM", () => {
      const html = `<div class="h-captcha" data-sitekey="10000000-ffff-ffff-ffff-000000000001"></div>`;
      assert.equal(detectCaptchaInPage(html), true);
    });

    it("returns false when DOM has zero bot-detection or CAPTCHA elements", () => {
      const html = `<form id="application-form"><input name="email" /></form>`;
      assert.equal(detectCaptchaInPage(html), false);
    });
  });

  describe("Pre-Submission Quality Gate Audit", () => {
    it("passes when resume attached, score >= 80, cover letter fact verified, and no CAPTCHA", () => {
      const mapping = mapAtsFormFields("greenhouse", [
        { id: "name", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email", type: "email", required: true },
        { id: "resume", label: "Resume", type: "file", required: true },
      ], dummyProfile);

      const audit = auditSubmissionQualityGate(mapping, 94, true, "<div>clean</div>");
      assert.equal(audit.passed, true);
      assert.equal(audit.violations.length, 0);
    });

    it("fails when resume score is below threshold (< 80)", () => {
      const mapping = mapAtsFormFields("greenhouse", [
        { id: "name", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email", type: "email", required: true },
        { id: "resume", label: "Resume", type: "file", required: true },
      ], dummyProfile);

      const audit = auditSubmissionQualityGate(mapping, 74, true, "<div>clean</div>");
      assert.equal(audit.passed, false);
      assert.ok(audit.violations.some((v) => v.includes("below minimum threshold")));
    });

    it("fails when cover letter lacks verified intelligence fact", () => {
      const mapping = mapAtsFormFields("greenhouse", [
        { id: "name", label: "Full Name", type: "text", required: true },
        { id: "email", label: "Email", type: "email", required: true },
        { id: "resume", label: "Resume", type: "file", required: true },
      ], dummyProfile);

      const audit = auditSubmissionQualityGate(mapping, 90, false, "<div>clean</div>");
      assert.equal(audit.passed, false);
      assert.ok(audit.violations.some((v) => v.includes("Cover letter lacks verified company intelligence fact")));
    });
  });

  describe("Reputation Guard & Pacing Rate Limits", () => {
    it("allows submission when within daily cap and cooldown", () => {
      const check = canApplyToJob("user_test_123", "Stripe");
      assert.equal(check.allowed, true);
      assert.equal(check.remainingDailyQuota, 15);
    });

    it("enforces 3-minute pacing cooldown after an application submission", () => {
      const now = Date.now();
      recordApplicationAttempt("user_test_123", {
        jobId: "job_1",
        companyName: "Stripe",
        status: "submitted",
      }, now);

      // Check 60 seconds later (within 180s cooldown)
      const checkWithinCooldown = canApplyToJob("user_test_123", "Datadog", now + 60 * 1000);
      assert.equal(checkWithinCooldown.allowed, false);
      assert.ok(checkWithinCooldown.reason?.includes("Pacing cooldown active"));

      // Check 181 seconds later (cooldown elapsed)
      const checkAfterCooldown = canApplyToJob("user_test_123", "Datadog", now + 181 * 1000);
      assert.equal(checkAfterCooldown.allowed, true);
    });

    it("enforces 30-day cooldown per employer to avoid spamming", () => {
      const now = Date.now();
      recordApplicationAttempt("user_test_123", {
        jobId: "job_stripe_1",
        companyName: "Stripe",
        status: "submitted",
      }, now - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const check = canApplyToJob("user_test_123", "Stripe", now);
      assert.equal(check.allowed, false);
      assert.ok(check.reason?.includes("Already applied to Stripe 10 day(s) ago"));
      assert.ok(check.reason?.includes("30-day cooldown active"));
    });

    it("enforces 15 applications daily quota cap", () => {
      const now = Date.now();
      for (let i = 0; i < 15; i++) {
        recordApplicationAttempt("user_test_123", {
          jobId: `job_${i}`,
          companyName: `Company_${i}`,
          status: "submitted",
        }, now - (15 - i) * 5 * 60 * 1000); // spread across past hour
      }

      const check = canApplyToJob("user_test_123", "NewCo", now);
      assert.equal(check.allowed, false);
      assert.ok(check.reason?.includes("Daily application limit reached"));
      assert.equal(check.remainingDailyQuota, 0);
    });
  });

  describe("Sandboxed Auto-Apply Execution Loop & Kanban Transition", () => {
    it("halts and triggers human intervention when CAPTCHA is detected", async () => {
      const mapping = mapAtsFormFields("greenhouse", [
        { id: "name", label: "Name", type: "text", required: true },
        { id: "resume", label: "Resume", type: "file", required: true },
      ], dummyProfile);

      const result = await executeAutoApplyRun("job_captcha_1", "https://boards.greenhouse.io/demo", mapping, {
        userId: "user_test_123",
        companyName: "TestCorp",
        pageHtmlSample: `<div class="g-recaptcha"></div>`,
      });

      assert.equal(result.stage, "CAPTCHA_DETECTED");
      assert.equal(result.requiresHumanReview, true);
      assert.ok(result.humanReviewPrompt?.includes("CAPTCHA detected"));

      const events = getRecentTelemetryEvents();
      assert.ok(events.some((e) => e.type === "auto_apply_captcha_halted"));
    });

    it("completes clean application, records submission, and transitions Kanban to 'applied'", async () => {
      const mapping = mapAtsFormFields("greenhouse", [
        { id: "first_name", label: "First Name", type: "text", required: true },
        { id: "last_name", label: "Last Name", type: "text", required: true },
        { id: "email", label: "Email", type: "email", required: true },
        { id: "resume", label: "Resume", type: "file", required: true },
      ], dummyProfile);

      const result = await executeAutoApplyRun("job_clean_1", "https://boards.greenhouse.io/clean", mapping, {
        userId: "user_test_123",
        companyName: "Figma",
        roleTitle: "Staff Software Engineer",
        resumeScore: 92,
        hasCoverLetterFact: true,
      });

      assert.equal(result.stage, "COMPLETED");
      assert.equal(result.requiresHumanReview, false);
      assert.ok(result.appliedTimestamp);

      // Verify Kanban Application Payload
      assert.ok(result.pipelineApplication);
      assert.equal(result.pipelineApplication.stage, "applied");
      assert.equal(result.pipelineApplication.company, "Figma");
      assert.equal(result.pipelineApplication.fitScore, 92);
      assert.ok(result.pipelineApplication.followUpDueDate); // 7-day cadence

      // Verify Telemetry
      const events = getRecentTelemetryEvents();
      assert.ok(events.some((e) => e.type === "auto_apply_completed"));
    });
  });

  describe("8-Minute First-Mover Alert Queue & Scraper Matching", () => {
    const alertProfile: AlertProfile = {
      id: "prof_1",
      userId: "user_test_123",
      targetTitles: ["Staff Engineer", "Senior Software Engineer", "Distributed Systems"],
      minFitScore: 85,
      remoteOnly: false,
      blacklistedCompanies: ["RevokedCorp"],
      appliedCompaniesLast30Days: ["PreviousAppliedCorp"],
      frequency: "instant",
    };

    const candidateSkills = ["TypeScript", "Go", "PostgreSQL", "Kafka", "Distributed Systems", "AWS"];

    const sampleScrapedJobs: IncomingScrapedJob[] = [
      {
        jobId: "scraped_job_1",
        title: "Staff Engineer, Core Infrastructure",
        company: "Stripe",
        location: "San Francisco, CA / Remote",
        isRemote: true,
        source: "greenhouse",
        applyUrl: "https://boards.greenhouse.io/stripe/jobs/1",
        postedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 mins ago!
        salary: "$230,000 - $280,000",
        requiredSkills: ["Go", "Distributed Systems", "Kafka", "AWS"],
        descriptionSnippet: "Architect high-throughput settlement systems handling billions...",
      },
      {
        jobId: "scraped_job_2",
        title: "Senior Software Engineer",
        company: "RevokedCorp", // Blacklisted!
        location: "Remote",
        isRemote: true,
        source: "lever",
        applyUrl: "https://jobs.lever.co/revoked/1",
        postedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        requiredSkills: ["TypeScript", "Kafka"],
        descriptionSnippet: "Build internal tools...",
      },
      {
        jobId: "scraped_job_3",
        title: "Senior Product Designer", // Title mismatch!
        company: "Linear",
        location: "Remote",
        isRemote: true,
        source: "ashby",
        applyUrl: "https://jobs.ashbyhq.com/linear/1",
        postedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        requiredSkills: ["Figma", "Design Systems"],
        descriptionSnippet: "Craft extraordinary interfaces...",
      },
    ];

    it("correctly identifies high-match role and generates First-Mover alert hook", async () => {
      const alert = await evaluateFirstMoverCandidate(alertProfile, candidateSkills, sampleScrapedJobs[0]);
      assert.ok(alert);
      assert.equal(alert.job.company, "Stripe");
      assert.ok(alert.fitScore >= 85);
      assert.ok(alert.postedMinutesAgo <= 5);
      assert.ok(alert.whyAlerted.includes("Matches"));
      assert.ok(alert.whyAlerted.includes("Stripe"));
    });

    it("suppresses blacklisted company postings", async () => {
      const alert = await evaluateFirstMoverCandidate(alertProfile, candidateSkills, sampleScrapedJobs[1]);
      assert.equal(alert, null);
    });

    it("suppresses non-matching titles", async () => {
      const alert = await evaluateFirstMoverCandidate(alertProfile, candidateSkills, sampleScrapedJobs[2]);
      assert.equal(alert, null);
    });

    it("deduplicates already alerted jobs", async () => {
      // First evaluation produces alert
      const alert1 = await evaluateFirstMoverCandidate(alertProfile, candidateSkills, sampleScrapedJobs[0]);
      assert.ok(alert1);

      // Second evaluation of same job ID is suppressed
      const alert2 = await evaluateFirstMoverCandidate(alertProfile, candidateSkills, sampleScrapedJobs[0]);
      assert.equal(alert2, null);
    });

    it("processes batch scans and returns only qualified opportunities", async () => {
      resetFirstMoverMemory();
      const batchAlerts = await processScrapedJobsBatch(alertProfile, candidateSkills, sampleScrapedJobs);
      assert.equal(batchAlerts.length, 1);
      assert.equal(batchAlerts[0].job.company, "Stripe");
    });
  });

  describe("Real-Time Notification & Email Dispatcher", () => {
    it("formats and dispatches in-app notification and branded email payload", async () => {
      const mockAlert = {
        alertId: "alert_test_99",
        userId: "user_test_123",
        job: {
          jobId: "job_notif_1",
          title: "Lead Infrastructure Architect",
          company: "Datadog",
          location: "New York, NY",
          isRemote: false,
          source: "greenhouse" as const,
          applyUrl: "https://boards.greenhouse.io/datadog/1",
          postedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          salary: "$240,000",
          requiredSkills: ["Go", "Kubernetes", "Distributed Systems"],
          descriptionSnippet: "Scale telemetry pipelines...",
        },
        fitScore: 93,
        matchingSkills: ["Go", "Distributed Systems"],
        postedMinutesAgo: 5,
        whyAlerted: "Direct match for Lead Infrastructure Architect at Datadog with Go and Distributed Systems expertise.",
        createdAt: new Date().toISOString(),
      };

      const result = await dispatchFirstMoverAlert(mockAlert, "candidate@example.com");

      assert.equal(result.deliveredInApp, true);
      assert.equal(result.deliveredEmail, true);
      assert.ok(result.inAppNotification);
      assert.equal(result.inAppNotification.company, "Datadog");
      assert.equal(result.inAppNotification.fitScore, 93);

      assert.ok(result.emailPayload);
      assert.equal(result.emailPayload.to, "candidate@example.com");
      assert.ok(result.emailPayload.subject.includes("First-Mover Alert"));
      assert.ok(result.emailPayload.html.includes("#16213A")); // Primary Ink
      assert.ok(result.emailPayload.html.includes("Why You Were Alerted"));
    });
  });
});
