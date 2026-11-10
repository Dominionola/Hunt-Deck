import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  addBusinessDays,
  computeDaysDifference,
  deriveFollowUpStatus,
  generateApplicationFollowUpSchedule,
  getActionableFollowUps,
} from "../../src/services/followup/followUpScheduler";

import {
  generateFollowUp1ValueAdd,
  generateFollowUp2Graceful,
  generatePostInterviewThankYou,
  type FollowUpGenerationContext,
} from "../../src/services/ai/followUpGenerator";

describe("Phase 7: Application Follow-Up Engine (PRD Module 13)", () => {
  describe("Follow-Up Cadence & Business Day Scheduler (TASK-053)", () => {
    it("correctly skips weekends when adding business days", () => {
      // Friday 2026-11-06 -> +1 business day should be Monday 2026-11-09
      const friday = new Date("2026-11-06T12:00:00Z");
      const monday = addBusinessDays(friday, 1);
      assert.equal(monday.toISOString().split("T")[0], "2026-11-09");

      // Friday 2026-11-06 -> +6 business days:
      // Mon 9, Tue 10, Wed 11, Thu 12, Fri 13, Mon 16
      const nextMon = addBusinessDays(friday, 6);
      assert.equal(nextMon.toISOString().split("T")[0], "2026-11-16");
    });

    it("generates 3 distinct milestone schedule items for an application with an interview", () => {
      const application = {
        id: "app_stripe_1",
        company: "Stripe",
        role: "Staff Software Engineer",
        appliedDate: "2026-11-02",
        interviewDate: "2026-11-12",
        contact: {
          name: "David Kim",
          email: "david@stripe.com",
          linkedInUrl: "https://linkedin.com/in/davidkim-eng",
        },
      };

      const now = new Date("2026-11-10T12:00:00Z");
      const schedule = generateApplicationFollowUpSchedule(application, now);

      assert.equal(schedule.length, 3);

      const fu1 = schedule.find((s) => s.type === "FOLLOW_UP_1");
      assert.ok(fu1);
      assert.equal(fu1.companyName, "Stripe");
      assert.equal(fu1.recommendedChannel, "email");
      assert.equal(fu1.targetContactName, "David Kim");

      const fu2 = schedule.find((s) => s.type === "FOLLOW_UP_2");
      assert.ok(fu2);

      const ty = schedule.find((s) => s.type === "POST_INTERVIEW_THANK_YOU");
      assert.ok(ty);
      assert.equal(ty.scheduledDate, "2026-11-13");
    });

    it("derives accurate status (PENDING, DUE_TODAY, OVERDUE) based on dates", () => {
      const now = new Date("2026-11-10T12:00:00Z");
      assert.equal(computeDaysDifference("2026-11-13", now), 3);
      assert.equal(computeDaysDifference("2026-11-10", now), 0);
      assert.equal(computeDaysDifference("2026-11-08", now), -2);

      assert.equal(deriveFollowUpStatus(3), "PENDING");
      assert.equal(deriveFollowUpStatus(0), "DUE_TODAY");
      assert.equal(deriveFollowUpStatus(-2), "OVERDUE");
      assert.equal(deriveFollowUpStatus(-5, true), "SENT");
    });

    it("filters and sorts actionable follow-ups that are due today or overdue", () => {
      const items = [
        {
          id: "item_1",
          applicationId: "app_1",
          companyName: "Stripe",
          roleTitle: "Staff Engineer",
          type: "FOLLOW_UP_1" as const,
          scheduledDate: "2026-11-08",
          status: "OVERDUE" as const,
          daysRemainingOrOverdue: -2,
          recommendedChannel: "email" as const,
        },
        {
          id: "item_2",
          applicationId: "app_2",
          companyName: "Vercel",
          roleTitle: "Senior Engineer",
          type: "FOLLOW_UP_1" as const,
          scheduledDate: "2026-11-15",
          status: "PENDING" as const,
          daysRemainingOrOverdue: 5,
          recommendedChannel: "email" as const,
        },
        {
          id: "item_3",
          applicationId: "app_3",
          companyName: "Linear",
          roleTitle: "Full Stack Engineer",
          type: "FOLLOW_UP_1" as const,
          scheduledDate: "2026-11-10",
          status: "DUE_TODAY" as const,
          daysRemainingOrOverdue: 0,
          recommendedChannel: "email" as const,
        },
      ];

      const actionable = getActionableFollowUps(items);
      assert.equal(actionable.length, 2);
      assert.equal(actionable[0].companyName, "Stripe"); // most overdue first (-2)
      assert.equal(actionable[1].companyName, "Linear"); // due today (0)
    });
  });

  describe("AI Follow-Up Content Generator (TASK-054)", () => {
    const baseContext: FollowUpGenerationContext = {
      candidateName: "Alex Rivera",
      candidateEmail: "recruiter@target.com",
      companyName: "Datadog",
      roleTitle: "Lead Infrastructure Architect",
      contactName: "Sarah Chen",
      appliedDate: "2026-11-03",
      recentCompanyNews: "recent expansion of their observability platform to edge AI",
      technicalInsightHook: "scaling distributed query pipelines with sub-100ms latency",
      portfolioUrl: "https://github.com/alexrivera/distributed-streams",
      interviewTopicsDiscussed: ["distributed streaming architectures", "p99 database query latency"],
    };

    it("generates Follow-Up #1 complying with the <= 120 words rule and <= 300 char InMail limit", () => {
      const draft = generateFollowUp1ValueAdd(baseContext);

      assert.equal(draft.type, "FOLLOW_UP_1");
      assert.ok(draft.subject.includes("Alex Rivera"));
      assert.ok(draft.subject.includes("Lead Infrastructure Architect"));
      assert.ok(draft.emailBody.includes("Sarah"));
      assert.ok(draft.emailBody.includes("Alex Rivera"));

      // Word count constraint: strictly <= 120 words
      assert.ok(
        draft.wordCount <= 120,
        `Follow-Up #1 word count was ${draft.wordCount}, expected <= 120`
      );

      // InMail constraint: strictly <= 300 characters
      assert.ok(
        draft.inMailCharacterCount <= 300,
        `InMail length was ${draft.inMailCharacterCount}, expected <= 300`
      );

      // Valid mailto URL
      assert.ok(draft.mailtoUrl.startsWith("mailto:recruiter@target.com?subject="));
      assert.ok(draft.mailtoUrl.includes(encodeURIComponent(draft.subject)));
    });

    it("generates Follow-Up #2 (Graceful Final Touch) < 70 words with zero pressure", () => {
      const draft = generateFollowUp2Graceful(baseContext);

      assert.equal(draft.type, "FOLLOW_UP_2");
      assert.ok(draft.subject.includes("Closing the loop"));
      assert.ok(draft.emailBody.includes("Sarah"));
      assert.ok(draft.emailBody.includes("Datadog"));
      assert.ok(draft.emailBody.includes("no problem at all"));

      // Word count constraint: < 70 words
      assert.ok(
        draft.wordCount < 70,
        `Follow-Up #2 word count was ${draft.wordCount}, expected < 70`
      );

      // InMail constraint: strictly <= 300 characters
      assert.ok(
        draft.inMailCharacterCount <= 300,
        `InMail length was ${draft.inMailCharacterCount}, expected <= 300`
      );
    });

    it("generates Post-Interview Thank-You Note referencing specific conversation topics", () => {
      const draft = generatePostInterviewThankYou(baseContext);

      assert.equal(draft.type, "POST_INTERVIEW_THANK_YOU");
      assert.ok(draft.subject.includes("Thank you"));
      assert.ok(draft.emailBody.includes("Sarah"));
      assert.ok(
        draft.emailBody.includes("distributed streaming architectures") ||
        draft.emailBody.includes("p99 database query latency")
      );

      // InMail constraint: strictly <= 300 characters
      assert.ok(
        draft.inMailCharacterCount <= 300,
        `Thank-you InMail length was ${draft.inMailCharacterCount}, expected <= 300`
      );
    });
  });
});

