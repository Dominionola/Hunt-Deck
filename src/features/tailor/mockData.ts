import type { TailorTargetJob } from "./types";
import type { ResumeParsedData } from "@/lib/validations/resume";

export const SEED_MASTER_PROFILE: ResumeParsedData = {
  fullName: "Alex Rivera",
  email: "alex.rivera.dev@gmail.com",
  phone: "+1 (415) 890-2341",
  location: "San Francisco, CA (Open to Remote)",
  summary: "Staff Full-Stack & Distributed Systems Engineer with 8+ years architecting high-throughput cloud infrastructure, sub-50ms vector search pipelines, and enterprise TypeScript applications.",
  skills: [
    "TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Redis",
    "Docker", "Kubernetes", "AWS", "CI/CD", "Tailwind CSS", "Prisma",
    "GraphQL", "Microservices", "System Design", "Distributed Systems"
  ],
  experience: [
    {
      company: "EdgeScale Technologies",
      title: "Senior Infrastructure & Full-Stack Engineer",
      location: "San Francisco, CA",
      startDate: "Jan 2022",
      endDate: "Present",
      isCurrent: true,
      bullets: [
        "Architected multi-region event streaming pipeline in TypeScript and Redis, processing 14,000 rps with 99.99% uptime.",
        "Engineered sub-50ms vector similarity cache over PostgreSQL, reducing LLM token egress costs by 38% ($42,000/year).",
        "Streamlined continuous deployment workflows with Docker and GitHub Actions, cutting release turnaround from 45 minutes to 7 minutes.",
        "Mentored a pod of 5 engineers across microservice boundaries and introduced strict Zod payload contracts."
      ]
    },
    {
      company: "Vanguard Labs",
      title: "Full-Stack Software Engineer",
      location: "Austin, TX",
      startDate: "Mar 2019",
      endDate: "Dec 2021",
      isCurrent: false,
      bullets: [
        "Built responsive client portals in Next.js and Tailwind CSS used daily by 120,000 active business customers.",
        "Refactored monolithic PostgreSQL reporting schemas into partitioned tables, accelerating dashboard load times by 4.2x.",
        "Integrated Stripe Billing API with automated webhook idempotency, handling $8.5M in annual customer recurring volume."
      ]
    },
    {
      company: "Apex Cloud Systems",
      title: "Software Engineer",
      location: "Remote",
      startDate: "Jun 2017",
      endDate: "Feb 2019",
      isCurrent: false,
      bullets: [
        "Implemented RESTful Node.js microservices and Redis session caches for real-time fleet telematics.",
        "Authored automated integration test suites achieving 88% branch coverage across mission-critical services."
      ]
    }
  ],
  education: [
    {
      institution: "University of California, Berkeley",
      degree: "B.S. Computer Science",
      fieldOfStudy: "Computer Science & Engineering",
      graduationYear: "2017"
    }
  ],
  projects: [
    {
      name: "VectorStream",
      description: "Open-source hybrid keyword and vector retrieval engine built on PostgreSQL pgvector and Rust.",
      technologies: ["TypeScript", "PostgreSQL", "pgvector", "Docker"],
      url: "https://github.com/alexrivera/vectorstream"
    }
  ]
};

export const TARGET_JOBS_CATALOG: Record<string, TailorTargetJob> = {
  "stripe-staff-systems": {
    id: "stripe-staff-systems",
    title: "Staff Systems Engineer - Core Infrastructure",
    company: "Stripe",
    location: "San Francisco, CA / Remote",
    salaryRange: "$260k - $320k + Equity",
    remoteType: "Remote",
    atsPlatform: "Greenhouse",
    applicationUrl: "https://boards.greenhouse.io/stripe/jobs/4982711",
    fitScore: 94,
    description: `Stripe is looking for a Staff Systems Engineer to lead the evolution of our core transaction processing infrastructure. In this role, you will design, build, and operate distributed systems that process billions of dollars daily with strict five-nines availability.

Key Responsibilities:
- Architect high-throughput distributed systems that handle mission-critical financial workloads.
- Optimize database performance and caching layers across multi-region PostgreSQL and Redis clusters.
- Collaborate with cross-functional leadership to define technical standards, latency budgets, and disaster recovery strategies.
- Drive engineering excellence and mentor staff and senior engineers.

Requirements:
- 7+ years of experience engineering distributed systems and backend infrastructure.
- Deep expertise in TypeScript, Go, or Java, alongside PostgreSQL, Redis, and Linux internals.
- Proven experience with performance optimization, zero-downtime migrations, and microservice decoupling.
- Strong communication and architectural leadership.`,
    mustHaveSkills: ["TypeScript", "PostgreSQL", "Redis", "Distributed Systems", "Performance Optimization"],
    niceToHaveSkills: ["Kubernetes", "AWS", "Go", "Zero-downtime migrations"],
    implicitSkills: ["Cross-functional", "Mentorship", "System Design"],
    senioritySignals: ["Staff", "7+ years experience"]
  },

  "posthog-fullstack": {
    id: "posthog-fullstack",
    title: "Senior Full-Stack Engineer - Web Analytics",
    company: "PostHog",
    location: "Remote (Global)",
    salaryRange: "$160k - $210k + Generous Equity",
    remoteType: "Remote",
    atsPlatform: "Ashby",
    applicationUrl: "https://jobs.ashbyhq.com/posthog/12984",
    fitScore: 92,
    description: `PostHog is the open-source product analytics and session replay platform for developers. We are looking for a Senior Full-Stack Engineer to build fast, beautiful, and intuitive user experiences for our web analytics suite.

Key Responsibilities:
- Build and ship high-performance React and Next.js interfaces with Tailwind CSS.
- Design data queries over ClickHouse and PostgreSQL that return in under 100ms.
- Work directly with customers on Slack and GitHub to diagnose UX bottlenecks and ship features rapidly.

Requirements:
- 5+ years building modern web applications with TypeScript, React, and relational databases.
- Experience with high-traffic dashboards, event ingestion pipelines, or data visualization.
- High agency, autonomous ownership, and excellent written communication.`,
    mustHaveSkills: ["TypeScript", "React", "Next.js", "PostgreSQL", "Tailwind CSS"],
    niceToHaveSkills: ["ClickHouse", "Python", "Kafka"],
    implicitSkills: ["High agency", "Customer-centric", "Performance optimization"],
    senioritySignals: ["Senior", "5+ years experience"]
  },

  "vercel-frontend-infra": {
    id: "vercel-frontend-infra",
    title: "Staff Frontend Infrastructure Engineer",
    company: "Vercel",
    location: "Remote (US / EU)",
    salaryRange: "$220k - $280k",
    remoteType: "Remote",
    atsPlatform: "Greenhouse",
    applicationUrl: "https://boards.greenhouse.io/vercel/jobs/5829102",
    fitScore: 89,
    description: `Vercel is looking for a Staff Frontend Infrastructure Engineer to accelerate developer experience across Next.js and the Vercel platform.

Responsibilities:
- Build build-system optimizations, server components, and developer tooling.
- Partner with open-source contributors and enterprise engineering teams.
- Maintain rigorous standards for bundle size, page speed, and accessibility.`,
    mustHaveSkills: ["TypeScript", "Next.js", "React", "CI/CD", "Node.js"],
    niceToHaveSkills: ["Rust", "Turbopack", "Edge Networks"],
    implicitSkills: ["Open source", "Developer velocity", "Mentorship"],
    senioritySignals: ["Staff", "6+ years experience"]
  }
};

