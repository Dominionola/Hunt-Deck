import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  scoreHeadline,
  scoreAboutSection,
  scoreExperienceQuality,
  scoreSkillsCoverage,
  scoreProfileCompleteness,
  scoreSearchability,
  auditLinkedInProfile,
  type RawLinkedInProfile,
} from "../../src/services/linkedin/profileScorer";

import {
  generateOptimizedHeadlines,
  generateValueFirstAbout,
} from "../../src/services/linkedin/headlineAboutGenerator";

import {
  analyzeSkillsGap,
  generateEndorsementTemplates,
} from "../../src/services/linkedin/skillsEndorsementAnalyzer";

describe("Phase 6: LinkedIn Profile Intelligence Optimizer (PRD Module 12)", () => {
  const targetKeywords = [
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "Distributed Systems",
    "AWS",
  ];

  describe("LinkedIn Readiness Scoring Engine (TASK-048)", () => {
    it("evaluates headline optimization and penalizes missing or short headlines", () => {
      const emptyScore = scoreHeadline("", targetKeywords);
      assert.equal(emptyScore.score, 0);
      assert.equal(emptyScore.grade, "NEEDS_IMPROVEMENT");

      const weakHeadline = "Engineer at Company";
      const weakScore = scoreHeadline(weakHeadline, targetKeywords);
      assert.ok(weakScore.score < 60);

      const strongHeadline =
        "Senior Full-Stack Engineer | React · TypeScript · Node.js · AWS | Open to Remote SaaS Roles";
      const strongScore = scoreHeadline(strongHeadline, targetKeywords);
      assert.ok(strongScore.score >= 85);
      assert.equal(strongScore.grade, "STRONG");
      assert.equal(strongScore.weight, 0.25);
    });

    it("evaluates About section and penalizes bot clichés like 'I am a passionate'", () => {
      const clicheAbout =
        "I am a passionate and results-driven software engineer with 6 years of experience. I am a team player who loves coding and challenges.";
      const clicheScore = scoreAboutSection(clicheAbout, targetKeywords);
      assert.ok(clicheScore.score < 70);
      assert.ok(
        clicheScore.recommendations.some((r) =>
          r.includes("Replace generic opening")
        )
      );

      const strongAbout = `
Specialized in building high-throughput, low-latency distributed systems that scale cleanly under real-world load. Over the last 6 years, I have engineered distributed cloud backends, resilient event-driven architectures, and high-performance interfaces.

Core technical competencies include TypeScript, React, Node.js, PostgreSQL, Distributed Systems, and AWS. I focus heavily on operational simplicity, automated verification, and eliminating system failure modes before they reach production.

Key engineering milestones:
• Architected payment stream processing handling 20,000+ operations/sec with 99.99% uptime.
• Reduced p99 database query latency by 42% through query index restructuring and Redis caching.
• Mentored 8 engineers across design docs, testing patterns, and scalable microservice design.

Actively exploring Senior Full-Stack Engineer roles with forward-thinking engineering organizations. Drop a note here on LinkedIn to start a conversation.
      `.trim();

      const strongScore = scoreAboutSection(strongAbout, targetKeywords);
      assert.ok(strongScore.score >= 85);
      assert.equal(strongScore.grade, "STRONG");
    });

    it("evaluates experience bullet quality by detecting quantified metrics", () => {
      const unquantifiedExp = [
        {
          title: "Software Engineer",
          company: "Acme",
          bullets: [
            "Wrote web services in Node.js.",
            "Responsible for database maintenance.",
            "Attended daily standups.",
          ],
        },
      ];
      const unquantScore = scoreExperienceQuality(unquantifiedExp);
      assert.ok(unquantScore.score <= 50);

      const quantifiedExp = [
        {
          title: "Senior Engineer",
          company: "Stripe",
          bullets: [
            "Scaled transaction settlement pipelines to $15M daily volume with 99.99% uptime.",
            "Reduced API p99 latency from 320ms to 95ms (70% reduction) via Redis caching.",
            "Led a team of 6 engineers to deliver core billing service ahead of schedule.",
          ],
        },
      ];
      const quantScore = scoreExperienceQuality(quantifiedExp);
      assert.ok(quantScore.score >= 90);
      assert.equal(quantScore.grade, "STRONG");
    });

    it("evaluates skills coverage against target roles", () => {
      const sparseSkills = [{ name: "JavaScript" }, { name: "HTML" }];
      const sparseScore = scoreSkillsCoverage(sparseSkills, targetKeywords);
      assert.ok(sparseScore.score < 60);

      const richSkills = [
        { name: "TypeScript" },
        { name: "React" },
        { name: "Node.js" },
        { name: "PostgreSQL" },
        { name: "AWS" },
        { name: "Docker" },
        { name: "Distributed Systems" },
        { name: "Go" },
        { name: "Redis" },
        { name: "GraphQL" },
        { name: "CI/CD" },
        { name: "Kubernetes" },
        { name: "System Design" },
        { name: "Microservices" },
        { name: "Next.js" },
      ];
      const richScore = scoreSkillsCoverage(richSkills, targetKeywords);
      assert.ok(richScore.score >= 90);
    });

    it("computes overall weighted LinkedIn Readiness score across 6 dimensions", () => {
      const sampleProfile: RawLinkedInProfile = {
        headline: "Senior Full-Stack Engineer | React · TypeScript · Node.js | Remote",
        about: "I build high-scale cloud platforms and distributed architectures with TypeScript, React, Node.js, and AWS.",
        location: "San Francisco, CA",
        openToWork: true,
        skills: [{ name: "TypeScript" }, { name: "React" }, { name: "Node.js" }, { name: "PostgreSQL" }, { name: "AWS" }],
        experience: [
          {
            title: "Senior Engineer",
            company: "TechCorp",
            bullets: [
              "Built payment gateway scaling to 5,000 requests/sec with 99.95% availability.",
              "Cut cloud infrastructure costs by 28% through autoscaling optimization.",
            ],
          },
          {
            title: "Full Stack Engineer",
            company: "EarlyCo",
            bullets: ["Shipped core web app using React and Node.js for 100k active users."],
          },
        ],
        education: [{ school: "UC Berkeley", degree: "B.S. EECS" }],
      };

      const audit = auditLinkedInProfile(sampleProfile, targetKeywords);
      assert.ok(audit.overallScore >= 75);
      assert.ok(audit.overallScore <= 100);
      assert.ok(audit.dimensions.headline.weightedScore > 0);
      assert.ok(audit.dimensions.about.weightedScore > 0);
      assert.ok(audit.dimensions.experience.weightedScore > 0);
      assert.ok(audit.dimensions.skills.weightedScore > 0);
      assert.ok(audit.dimensions.completeness.weightedScore > 0);
      assert.ok(audit.dimensions.searchability.weightedScore > 0);
      assert.ok(audit.summary.length > 20);

      // Verify individual completeness and searchability sub-scorers
      const comp = scoreProfileCompleteness(sampleProfile);
      assert.ok(comp.score >= 80);
      assert.equal(comp.weight, 0.10);

      const search = scoreSearchability(sampleProfile);
      assert.ok(search.score >= 80);
      assert.equal(search.weight, 0.10);
    });
  });

  describe("Headline Rewriter & About Generator (TASK-049)", () => {
    const context = {
      fullName: "Alex Rivera",
      targetRole: "Senior Full-Stack Engineer",
      yearsOfExperience: 7,
      coreSkills: ["TypeScript", "React", "Node.js", "PostgreSQL", "Distributed Systems"],
      remotePreference: "REMOTE",
      targetIndustry: "High-Growth SaaS & Developer Tools",
    };

    it("generates 3 ranked recruiter-search-optimized headline variants <= 220 chars", () => {
      const variants = generateOptimizedHeadlines(context);
      assert.equal(variants.length, 3);

      for (const variant of variants) {
        assert.ok(variant.characterCount <= 220);
        assert.ok(variant.headline.includes("Senior"));
        assert.ok(variant.headline.includes("Engineer"));
        assert.ok(variant.predictedSearchScore >= 80);
      }

      // Rank 1 variant is stack focused
      assert.equal(variants[0].searchRank, 1);
      assert.equal(variants[0].style, "stack_focused");
      assert.ok(variants[0].headline.includes("TypeScript"));
    });

    it("generates value-first About sections across modern_tech, executive, and warm tones", () => {
      const modernResult = generateValueFirstAbout(context, "modern_tech");
      assert.ok(modernResult.wordCount >= 100 && modernResult.wordCount <= 350);
      assert.ok(!modernResult.aboutText.startsWith("I am writing"));
      assert.ok(!modernResult.aboutText.startsWith("I am a passionate"));
      assert.ok(modernResult.aboutText.includes("TypeScript"));
      assert.ok(modernResult.callToAction.length > 10);

      const execResult = generateValueFirstAbout(context, "executive");
      assert.equal(execResult.tone, "executive");
      assert.ok(execResult.aboutText.includes("commercial advantage"));

      const warmResult = generateValueFirstAbout(context, "warm");
      assert.equal(warmResult.tone, "warm");
      assert.ok(warmResult.aboutText.includes("craft and clear communication"));
    });
  });

  describe("Skills Gap & Endorsement Strategy Analyzer (TASK-050)", () => {
    it("identifies missing skills from Master Profile to add to LinkedIn", () => {
      const linkedInSkills = ["TypeScript", "React", "Node.js"];
      const masterResumeSkills = ["TypeScript", "React", "Node.js", "PostgreSQL", "Distributed Systems", "AWS", "Docker", "Go"];

      const report = analyzeSkillsGap(linkedInSkills, masterResumeSkills);

      assert.ok(report.overallCoveragePercent > 0);
      assert.equal(report.matchedSkillsCount, 3);
      assert.ok(report.missingSkillsCount > 0);

      // Verify missing skills were flagged with ADD_TO_LINKEDIN
      const postgres = report.skillsList.find((s) => s.skill === "PostgreSQL");
      assert.equal(postgres?.actionRequired, "ADD_TO_LINKEDIN");

      // Verify top 3 recommended pinned skills
      assert.equal(report.top3RecommendedPinned.length, 3);
      assert.ok(report.top3RecommendedPinned.includes("TypeScript"));
    });

    it("generates collegiate endorsement outreach messages", () => {
      const templates = generateEndorsementTemplates(["TypeScript", "Distributed Systems"]);
      assert.equal(templates.length, 2);

      for (const t of templates) {
        assert.ok(t.message.includes("TypeScript and Distributed Systems"));
        assert.ok(t.characterCount < 300);
      }
    });
  });
});

