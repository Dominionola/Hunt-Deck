/**
 * Hunt Deck — Role-Specific Interview Question Generator
 * 
 * Implements PRD Module 5.2.1:
 * Generates 15-20 high-probability interview questions categorized across 3 pillars:
 *  1. Technical & Domain Expertise (concurrency, system design, data structures, stack deep-dives)
 *  2. Behavioral & Leadership Principles (rigor, ownership, velocity, conflict resolution)
 *  3. Reverse Interviewing Questions (strategic questions for candidate to ask hiring leads)
 */

export type InterviewQuestionCategory = "technical" | "behavioral" | "reverse";

export interface InterviewQuestion {
  id: string;
  category: InterviewQuestionCategory;
  subcategory: string;
  question: string;
  whyAsked: string;
  suggestedFocusPoints: string[];
  associatedCompanyPrinciple?: string;
  targetInterviewerType?: "hiring_manager" | "peer_engineer" | "vp_executive";
}

export interface QuestionBankContext {
  roleTitle: string;
  companyName: string;
  coreSkills: string[];
  seniorityLevel?: "Mid" | "Senior" | "Staff" | "Lead";
  companyValuesOrPrinciples?: string[];
}

export function generateInterviewQuestionBank(context: QuestionBankContext): InterviewQuestion[] {
  const role = context.roleTitle;
  const company = context.companyName;
  const topSkill = context.coreSkills[0] || "Distributed Systems";
  const secondSkill = context.coreSkills[1] || "TypeScript";
  const thirdSkill = context.coreSkills[2] || "PostgreSQL";

  return [
    // --- 1. TECHNICAL & DOMAIN EXPERTISE ---
    {
      id: "q_tech_1",
      category: "technical",
      subcategory: "System Architecture & Scalability",
      question: `How would you architect a high-throughput, horizontally scalable ingestion pipeline as a ${role} at ${company} handling 50k+ events per second with strict ordering guarantees?`,
      whyAsked: `Assesses your mastery of distributed partitioning, stream processing (e.g. Kafka/Kinesis), and database backpressure handling.`,
      suggestedFocusPoints: [
        "Partition key strategy to prevent hot shards",
        "At-least-once vs exactly-once processing trade-offs",
        "Dead-letter queues and idempotency mechanisms",
      ],
    },
    {
      id: "q_tech_2",
      category: "technical",
      subcategory: "Performance & Low-Latency Optimization",
      question: `Walk me through a production scenario where you diagnosed and resolved an elusive p99 latency regression in a ${topSkill} service under heavy load.`,
      whyAsked: `Evaluates production observability (APM, distributed tracing, flame graphs) and empirical debugging rigor under pressure.`,
      suggestedFocusPoints: [
        "Isolating bottleneck (CPU, garbage collection, DB connection pool starvation)",
        "Empirical measurement before vs after changes",
        "Long-term regression guards (alerts, automated load tests)",
      ],
    },
    {
      id: "q_tech_3",
      category: "technical",
      subcategory: "Data Modeling & Storage Trade-offs",
      question: `When choosing between relational storage like ${thirdSkill} and distributed document/key-value stores for ${company}'s core entity models, what technical criteria dictate your decision?`,
      whyAsked: `Probes your understanding of ACID transactional boundaries, index access patterns, read/write ratios, and eventual consistency implications.`,
      suggestedFocusPoints: [
        "Relational foreign key integrity vs distributed sharding limits",
        "Connection pooling and replication lag considerations",
        "Read-heavy caching tiers (Redis) vs durable storage",
      ],
    },
    {
      id: "q_tech_4",
      category: "technical",
      subcategory: `${secondSkill} & API Craftsmanship`,
      question: `In modern ${secondSkill} microservices, how do you enforce strict type boundaries, backward-compatible API contracts, and defensive error handling?`,
      whyAsked: `Tests deep technical craftsmanship, runtime validation (e.g., Zod schemas), and preventing silent cascading failures across services.`,
      suggestedFocusPoints: [
        "Runtime payload validation at system perimeter",
        "Schema evolution and semantic versioning",
        "Circuit breakers and graceful degradation fallbacks",
      ],
    },
    {
      id: "q_tech_5",
      category: "technical",
      subcategory: "Reliability & Disaster Recovery",
      question: `If ${company}'s primary cloud region suffers an unexpected network partition or outage, how does your architectural design guarantee business continuity?`,
      whyAsked: `Tests disaster recovery preparedness, RPO (Recovery Point Objective), and RTO (Recovery Time Objective) realities.`,
      suggestedFocusPoints: [
        "Multi-region failover and DNS routing (Route53/Cloudflare)",
        "Data replication across availability zones and regions",
        "Graceful read-only fallback mode",
      ],
    },

    // --- 2. BEHAVIORAL & LEADERSHIP PRINCIPLES ---
    {
      id: "q_beh_1",
      category: "behavioral",
      subcategory: "Ownership & Production Rigor",
      associatedCompanyPrinciple: "Think Rigorously & Deliver Results",
      question: `Tell me about a time you made a difficult architectural trade-off that favored long-term system stability over short-term feature delivery. How did you align stakeholders?`,
      whyAsked: `Evaluates technical leadership, commercial awareness, and the ability to persuade product managers without creating friction.`,
      suggestedFocusPoints: [
        "Quantifying the technical debt risk in business terms ($ or engineering velocity)",
        "Staging the implementation in incremental milestones",
        "Clear documentation of the trade-off decision (ADR)",
      ],
    },
    {
      id: "q_beh_2",
      category: "behavioral",
      subcategory: "Crisis Management & Post-Mortems",
      associatedCompanyPrinciple: "Customer Obsession & Extreme Ownership",
      question: `Describe a severe production outage or data integrity incident you were directly involved in. What was your immediate response, and how did you prevent recurrence?`,
      whyAsked: `Probes composure under fire, blameless post-mortem culture, and root-cause remediation rather than surface-level hotfixes.`,
      suggestedFocusPoints: [
        "Triage: mitigation and communication before investigation",
        "Blameless retrospective identifying systemic failure modes",
        "Automated guardrails and monitors added to prevent identical outages",
      ],
    },
    {
      id: "q_beh_3",
      category: "behavioral",
      subcategory: "Technical Disagreement & Consensus",
      associatedCompanyPrinciple: "Disagree and Commit with Respect",
      question: `Tell me about a time you strongly disagreed with a senior colleague or staff engineer on a system design choice. How did you resolve the conflict?`,
      whyAsked: `Assesses collaboration, intellectual humility, reliance on empirical benchmarks rather than ego, and commitment to the final team decision.`,
      suggestedFocusPoints: [
        "Grounding the discussion in data and prototypes rather than opinion",
        "Actively listening to the counter-proposal's merits",
        "Full commitment to the chosen direction once consensus was reached",
      ],
    },
    {
      id: "q_beh_4",
      category: "behavioral",
      subcategory: "Mentorship & Team Multiplier",
      associatedCompanyPrinciple: "Raise the Technical Bar",
      question: `How have you mentored junior and mid-level engineers to improve their technical design rigor, testing discipline, and autonomous problem-solving?`,
      whyAsked: `Assesses whether the candidate acts as a force multiplier for the entire engineering organization.`,
      suggestedFocusPoints: [
        "Conducting constructive, pedagogical code reviews",
        "Pair programming on high-ambiguity system design tasks",
        "Encouraging engineers to author design proposals independently",
      ],
    },

    // --- 3. REVERSE INTERVIEWING (CANDIDATE TO INTERVIEWER) ---
    {
      id: "q_rev_1",
      category: "reverse",
      subcategory: "Engineering Culture & Pace",
      targetInterviewerType: "peer_engineer",
      question: `When a production outage or unexpected performance bottleneck occurs at ${company}, what is the exact team ritual between detection, mitigation, and post-mortem review?`,
      whyAsked: `Reveals whether the company possesses a mature, blameless engineering culture or resorts to stress and finger-pointing.`,
      suggestedFocusPoints: [
        "Shows you care deeply about operational hygiene and team health",
      ],
    },
    {
      id: "q_rev_2",
      category: "reverse",
      subcategory: "Product & Engineering Alignment",
      targetInterviewerType: "hiring_manager",
      question: `How does your team navigate the balance between shipping new customer-facing roadmap features and allocating dedicated capacity to technical debt and infrastructure modernization?`,
      whyAsked: `Signals that you think like a tech lead who values velocity without sacrificing the underlying foundation.`,
      suggestedFocusPoints: [
        "Demonstrates commercial and architectural balance",
      ],
    },
    {
      id: "q_rev_3",
      category: "reverse",
      subcategory: "Strategic Vision & Architecture",
      targetInterviewerType: "vp_executive",
      question: `Looking ahead 18 to 24 months, what is the single largest technical or architectural challenge ${company}'s platform will face as customer volume scales 5x?`,
      whyAsked: `Signals strategic vision, executive presence, and a long-term commitment to high-scale engineering challenges.`,
      suggestedFocusPoints: [
        "Positions you as a high-conviction partner rather than a transactional applicant",
      ],
    },
  ];
}
