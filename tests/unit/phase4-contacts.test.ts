import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildDorkQuerySet,
} from "../../src/services/search/dorkQueryBuilder";

import {
  isAtsDirectUrl,
  isLinkedInProfileUrl,
  isAllowedResultUrl,
  executeDorkSearch,
} from "../../src/services/search/serpApiClient";

import {
  parseLinkedInSnippet,
} from "../../src/services/contacts/linkedInDiscovery";

import {
  resolveCompanyDomain,
  formatEmailWithPattern,
  enrichCompanyContacts,
  generateOutreachDraft,
} from "../../src/services/contacts/contactIntelligenceService";

describe("Phase 4: Google Dork Crawler & Contact Intelligence", () => {
  // ─────────────────────────────────────────────────────────────
  // 1. Google Dork Query Builder (TASK-033)
  // ─────────────────────────────────────────────────────────────
  describe("Google Dork Query Builder (TASK-033)", () => {
    test("should generate structured ATS dorks for Greenhouse, Lever, Ashby, and Workday", () => {
      const querySet = buildDorkQuerySet({
        roleTitle: "Staff Systems Engineer",
        companyName: "Stripe",
        remoteOnly: true,
      });

      assert.strictEqual(querySet.targetRole, "Staff Systems Engineer");
      assert.strictEqual(querySet.targetCompany, "Stripe");

      // Verify ATS platform coverage
      assert.ok(querySet.atsQueries.some((q) => q.platform === "Greenhouse" && q.query.includes("boards.greenhouse.io")));
      assert.ok(querySet.atsQueries.some((q) => q.platform === "Lever" && q.query.includes("jobs.lever.co")));
      assert.ok(querySet.atsQueries.some((q) => q.platform === "Ashby" && q.query.includes("jobs.ashbyhq.com")));
      assert.ok(querySet.atsQueries.some((q) => q.platform === "Workday" && q.query.includes("myworkdayjobs.com")));

      // Verify remote filter inclusion
      assert.ok(querySet.atsQueries.some((q) => q.query.includes('"remote"')));
    });

    test("should generate startup community and Notion career dorks", () => {
      const querySet = buildDorkQuerySet({
        roleTitle: "Founding Full-Stack Engineer",
        companyName: "HyperScale",
      });

      assert.ok(querySet.directDomainQueries.some((q) => q.query.includes("site:notion.site")));
      assert.ok(querySet.directDomainQueries.some((q) => q.query.includes("site:ycombinator.com/companies")));
    });

    test("should generate role-specific LinkedIn Contact Intelligence dorks", () => {
      const querySet = buildDorkQuerySet({
        roleTitle: "Senior Backend Engineer",
        companyName: "Vercel",
      });

      assert.ok(querySet.contactDorks.some((d) => d.roleType === "hiring_manager" && d.query.includes("Engineering Manager")));
      assert.ok(querySet.contactDorks.some((d) => d.roleType === "team_lead" && d.query.includes("Staff Engineer")));
      assert.ok(querySet.contactDorks.some((d) => d.roleType === "executive" && d.query.includes("CTO")));
    });

    test("should generate social hiring post dorks for LinkedIn and X/Twitter", () => {
      const querySet = buildDorkQuerySet({
        roleTitle: "Staff Systems Engineer",
        companyName: "PostHog",
      });

      assert.ok(querySet.socialHiringDorks.some((d) => d.platform === "linkedin" && d.query.includes("site:linkedin.com/posts")));
      assert.ok(querySet.socialHiringDorks.some((d) => d.platform === "x" && d.query.includes("site:x.com/*/status")));
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. SerpAPI Search Proxy & Caching (TASK-034)
  // ─────────────────────────────────────────────────────────────
  describe("SerpAPI Search Proxy & Domain Filtering (TASK-034)", () => {
    test("should identify authentic direct ATS portals and LinkedIn profiles", () => {
      assert.strictEqual(isAtsDirectUrl("https://boards.greenhouse.io/stripe/jobs/123"), true);
      assert.strictEqual(isAtsDirectUrl("https://jobs.ashbyhq.com/posthog/456"), true);
      assert.strictEqual(isAtsDirectUrl("https://myworkdayjobs.com/target/789"), true);
      assert.strictEqual(isAtsDirectUrl("https://randomblog.com/post"), false);

      assert.strictEqual(isLinkedInProfileUrl("https://www.linkedin.com/in/davidsingleton"), true);
      assert.strictEqual(isLinkedInProfileUrl("https://www.linkedin.com/company/stripe"), false);
      assert.strictEqual(isLinkedInProfileUrl("https://www.linkedin.com/jobs/view/123"), false);
    });

    test("should filter out noisy job aggregator domains (Indeed, ZipRecruiter)", () => {
      assert.strictEqual(isAllowedResultUrl("https://www.indeed.com/viewjob?jk=123"), false);
      assert.strictEqual(isAllowedResultUrl("https://www.ziprecruiter.com/jobs/456"), false);
      assert.strictEqual(isAllowedResultUrl("https://boards.greenhouse.io/stripe/jobs/123"), true);
      assert.strictEqual(isAllowedResultUrl("https://www.linkedin.com/in/sarahjenkins"), true);
    });

    test("should execute dork search and return cached responses on repeat calls", async () => {
      const query = 'site:linkedin.com/in "Stripe" ("Engineering Manager")';
      const firstCall = await executeDorkSearch(query);
      const secondCall = await executeDorkSearch(query);

      assert.ok(firstCall.results.length > 0);
      assert.strictEqual(secondCall.cached, true);
      assert.strictEqual(secondCall.results.length, firstCall.results.length);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. LinkedIn Profile Metadata Parsing (TASK-036)
  // ─────────────────────────────────────────────────────────────
  describe("LinkedIn Profile Discovery & Parsing (TASK-036)", () => {
    test("should parse LinkedIn search result snippets into structured contact entities", () => {
      const mockResult = {
        title: "Raylene Yung - Engineering Director, Core Products - Stripe | LinkedIn",
        link: "https://www.linkedin.com/in/rayleneyung",
        snippet: "Engineering Director at Stripe. Leading distributed transactional systems and platform teams.",
        sourceDomain: "linkedin.com",
        isAtsDirect: false,
        isLinkedInProfile: true,
      };

      const contact = parseLinkedInSnippet(mockResult, "Stripe");

      assert.ok(contact !== null);
      assert.strictEqual(contact.fullName, "Raylene Yung");
      assert.strictEqual(contact.title, "Engineering Director, Core Products");
      assert.strictEqual(contact.roleType, "hiring_manager");
      assert.strictEqual(contact.department, "Engineering");
      assert.strictEqual(contact.companyName, "Stripe");
    });

    test("should classify executives, team leads, and product leaders accurately", () => {
      const ctoResult = {
        title: "David Singleton - Chief Technology Officer - Stripe | LinkedIn",
        link: "https://www.linkedin.com/in/davidsingleton",
        snippet: "CTO at Stripe.",
        sourceDomain: "linkedin.com",
        isAtsDirect: false,
        isLinkedInProfile: true,
      };

      const ctoContact = parseLinkedInSnippet(ctoResult, "Stripe");
      assert.ok(ctoContact !== null);
      assert.strictEqual(ctoContact.roleType, "executive");

      const leadResult = {
        title: "Marcus Chen - Staff Systems Engineer & Tech Lead - Stripe | LinkedIn",
        link: "https://www.linkedin.com/in/marcuschen",
        snippet: "Tech Lead at Stripe.",
        sourceDomain: "linkedin.com",
        isAtsDirect: false,
        isLinkedInProfile: true,
      };

      const leadContact = parseLinkedInSnippet(leadResult, "Stripe");
      assert.ok(leadContact !== null);
      assert.strictEqual(leadContact.roleType, "team_lead");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Contact Intelligence & Email Enrichment (TASK-035, TASK-038)
  // ─────────────────────────────────────────────────────────────
  describe("Contact Intelligence & Outreach Generation (TASK-035, TASK-038)", () => {
    test("should resolve company web domains and format email patterns", () => {
      assert.strictEqual(resolveCompanyDomain("Stripe"), "stripe.com");
      assert.strictEqual(resolveCompanyDomain("PostHog"), "posthog.com");
      assert.strictEqual(resolveCompanyDomain("Unknown Corp Inc"), "unknowncorpinc.com");

      // Test pattern generation
      const firstEmail = formatEmailWithPattern("David Singleton", "stripe.com", "{first}");
      assert.strictEqual(firstEmail, "david@stripe.com");

      const standardEmail = formatEmailWithPattern("Sarah Jenkins", "example.com", "{first}.{last}");
      assert.strictEqual(standardEmail, "sarah.jenkins@example.com");
    });

    test("enrichCompanyContacts should discover decision makers with confidence tiers", async () => {
      const contacts = await enrichCompanyContacts("Stripe", "Staff Systems Engineer");

      assert.ok(contacts.length > 0, "Should discover contacts for Stripe");
      const firstContact = contacts[0];

      assert.ok(firstContact.email.includes("@stripe.com"));
      assert.ok(["verified", "high_confidence"].includes(firstContact.confidenceTier));
      assert.ok(firstContact.confidenceScore >= 80);
    });

    test("generateOutreachDraft should generate professional cold email and <300 char InMail note", () => {
      const mockContact = {
        id: "test-1",
        fullName: "Sarah Jenkins",
        title: "VP of Engineering",
        companyName: "Stripe",
        linkedinUrl: "https://www.linkedin.com/in/sarahjenkins",
        roleType: "executive" as const,
        department: "Engineering",
        summarySnippet: "VP of Engineering at Stripe",
        email: "sarah@stripe.com",
        emailPatternUsed: "{first}",
        confidenceTier: "verified" as const,
        confidenceScore: 96,
        source: "hunter_io" as const,
        isDismissed: false,
      };

      const draft = generateOutreachDraft(
        mockContact,
        "Staff Systems Engineer",
        "Alex Rivera",
        ["TypeScript", "Distributed Systems"]
      );

      // Verify cold email
      assert.ok(draft.coldEmailSubject.includes("Staff Systems Engineer"));
      assert.ok(draft.coldEmailSubject.includes("Alex Rivera"));
      assert.ok(draft.coldEmailBody.includes("Hi Sarah,"));
      assert.ok(draft.coldEmailBody.includes("Stripe"));
      assert.ok(draft.coldEmailBody.includes("TypeScript"));

      // Verify LinkedIn InMail strict character constraint (< 300 chars)
      assert.ok(
        draft.linkedInInMailNote.length <= 300,
        `InMail length is ${draft.linkedInInMailNote.length}, must be <= 300`
      );
      assert.ok(draft.linkedInInMailNote.includes("Hi Sarah"));
      assert.ok(draft.linkedInInMailNote.includes("Staff Systems Engineer"));
    });
  });
});
