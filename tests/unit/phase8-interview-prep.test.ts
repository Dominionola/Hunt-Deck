import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateInterviewQuestionBank,
  type QuestionBankContext,
} from "../../src/services/interview/interviewQuestionGenerator";
import {
  synthesizeStarResponse,
  type CandidateExperienceContext,
} from "../../src/services/interview/starResponseSynthesizer";
import {
  critiqueInterviewAnswer,
} from "../../src/services/interview/answerCritiqueEngine";

describe("Phase 8: Role-Specific Interview Preparation Copilot (PRD Module 5)", () => {
  const context: QuestionBankContext = {
    roleTitle: "Staff Software Engineer",
    companyName: "Stripe",
    coreSkills: ["TypeScript", "Distributed Systems", "PostgreSQL"],
    seniorityLevel: "Staff",
    companyValuesOrPrinciples: ["Move with Urgency & Precision", "Users First"],
  };

  const experience: CandidateExperienceContext = {
    company: "Acme Cloud",
    role: "Senior Backend Engineer",
    coreAchievementBullet:
      "Engineered distributed stream consumer handling 45k rps with Redis caching.",
    technologiesUsed: ["TypeScript", "PostgreSQL", "Redis"],
    quantifiedMetric: "35% latency reduction and 99.99% uptime",
  };

  describe("1. Question Generation Engine (interviewQuestionGenerator.ts)", () => {
    it("generates questions partitioned across technical, behavioral, and reverse categories", () => {
      const bank = generateInterviewQuestionBank(context);
      assert.ok(bank.length >= 12);

      const technical = bank.filter((q) => q.category === "technical");
      const behavioral = bank.filter((q) => q.category === "behavioral");
      const reverse = bank.filter((q) => q.category === "reverse");

      assert.ok(technical.length >= 5);
      assert.ok(behavioral.length >= 4);
      assert.ok(reverse.length >= 3);
    });

    it("customizes technical questions with target company and candidate core skills", () => {
      const bank = generateInterviewQuestionBank(context);
      const techQ = bank.find((q) => q.id === "q_tech_1");
      assert.ok(techQ !== undefined);
      assert.ok(techQ.question.includes("Stripe"));
      assert.ok(techQ.suggestedFocusPoints.length >= 2);
      assert.ok(techQ.whyAsked.length > 0);
    });

    it("associates behavioral questions with leadership principles", () => {
      const bank = generateInterviewQuestionBank(context);
      const behQ = bank.find((q) => q.category === "behavioral");
      assert.ok(behQ !== undefined);
      assert.ok(behQ.associatedCompanyPrinciple !== undefined);
      assert.ok(behQ.suggestedFocusPoints.length > 0);
    });

    it("includes target interviewer type for reverse interviewing questions", () => {
      const bank = generateInterviewQuestionBank(context);
      const reverseQuestions = bank.filter((q) => q.category === "reverse");
      for (const rq of reverseQuestions) {
        assert.ok(
          rq.targetInterviewerType === "hiring_manager" ||
            rq.targetInterviewerType === "peer_engineer" ||
            rq.targetInterviewerType === "vp_executive"
        );
      }
    });
  });

  describe("2. STAR Framework Response Synthesizer (starResponseSynthesizer.ts)", () => {
    it("synthesizes structured Situation, Task, Action, and Result", () => {
      const response = synthesizeStarResponse(
        "q_tech_1",
        "How do you handle scaling bottlenecks?",
        experience
      );

      assert.equal(response.questionId, "q_tech_1");
      assert.ok(response.situation.includes("Acme Cloud"));
      assert.ok(response.situation.includes("Senior Backend Engineer"));
      assert.ok(response.task.length > 0);
      assert.ok(response.action.includes("Redis"));
      assert.ok(response.result.includes("35% latency reduction"));
      assert.ok(response.fullNarrative.includes(response.situation));
      assert.ok(response.fullNarrative.includes(response.result));
      assert.ok(response.wordCount > 50);
      assert.ok(response.highlightedMetrics.length >= 1);
    });
  });

  describe("3. AI Answer Critique & Scoring Engine (answerCritiqueEngine.ts)", () => {
    it("evaluates a high-quality answer and awards high score with Exemplary or Strong grade", () => {
      const strongAnswer = `
At Acme Cloud, as the lead backend engineer, our core transactional service experienced latency spikes during peak events, threatening our 99.99% uptime SLA.
I was tasked with owning the end-to-end architectural redesign to ensure we could scale 5x under burst conditions while keeping p99 response times under 100ms.
I designed and spearheaded an event-driven worker pipeline using TypeScript and Redis caching. I isolated database queries, optimized PostgreSQL indexes, and authored integration tests to prevent concurrency deadlocks.
As a direct outcome, I reduced p99 latency by 42%, maintained 99.99% availability throughout the event, and cut our monthly cloud infrastructure costs by $15,000.
      `.trim();

      const critique = critiqueInterviewAnswer({
        questionText: "Tell me about a time you resolved a major latency bottleneck.",
        candidateAnswer: strongAnswer,
        category: "behavioral",
        targetCompany: "Stripe",
        associatedPrinciple: "Extreme Ownership & Rigor",
      });

      assert.ok(critique.totalScore >= 80);
      assert.ok(critique.grade === "Exemplary" || critique.grade === "Strong");
      assert.equal(critique.dimensionScores.clarityAndBrevity, 25);
      assert.equal(critique.dimensionScores.metricQuantification, 25);
      assert.ok(critique.metricsDetected.length >= 2);
      assert.ok(critique.strengths.length > 0);
      assert.ok(critique.suggestedRevision.fullNarrative.length > 0);
    });

    it("penalizes answers lacking individual ownership ('we' over 'I')", () => {
      const teamDiffusedAnswer = `
We had a problem at the company where the system was slow. The team discussed it and we decided that we should use Redis. 
We implemented caching together and we tested it as a squad. We thought it worked out pretty well for the company.
      `.trim();

      const critique = critiqueInterviewAnswer({
        questionText: "How did you optimize system performance?",
        candidateAnswer: teamDiffusedAnswer,
        category: "technical",
      });

      assert.ok(critique.dimensionScores.ownershipAgency <= 14);
      assert.ok(
        critique.improvementAreas.some((item) =>
          item.toLowerCase().includes("dilutes your individual agency")
        )
      );
    });

    it("penalizes answers lacking empirical metrics", () => {
      const nonMetricAnswer = `
At my previous company, I rebuilt our customer onboarding API. I replaced our older endpoints with clean TypeScript code and refactored our database models. 
The users were much happier and our product managers felt the experience was smoother. The performance improved noticeably and everyone was pleased with the delivery.
      `.trim();

      const critique = critiqueInterviewAnswer({
        questionText: "Describe an API redesign you led.",
        candidateAnswer: nonMetricAnswer,
        category: "technical",
      });

      assert.ok(critique.dimensionScores.metricQuantification <= 10);
      assert.ok(
        critique.improvementAreas.some((item) =>
          item.toLowerCase().includes("missing quantifiable metrics")
        )
      );
      assert.ok(
        critique.coachingTips.some((item) =>
          item.toLowerCase().includes("google xyz")
        )
      );
    });

    it("flags conversational filler words and deducts clarity points", () => {
      const fillerAnswer = `
So basically, you know, we had this issue where, like I said, things were kind of slow. 
And sort of like we decided to refactor stuff like that to make it better, you know?
      `.trim();

      const critique = critiqueInterviewAnswer({
        questionText: "Tell me about a technical challenge.",
        candidateAnswer: fillerAnswer,
      });

      assert.ok(
        critique.improvementAreas.some((item) =>
          item.toLowerCase().includes("filler")
        )
      );
      assert.ok(critique.totalScore < 60);
      assert.equal(critique.grade, "Needs Revision");
    });
  });
});
