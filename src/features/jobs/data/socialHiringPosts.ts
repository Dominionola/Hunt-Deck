import { SocialHiringPost } from "../types/socialHiring";

export const SAMPLE_SOCIAL_POSTS: SocialHiringPost[] = [
  {
    id: "social-1",
    authorName: "Sarah Jenkins",
    authorRole: "VP Engineering",
    authorCompany: "EdgeScale (Series A)",
    platform: "linkedin",
    originalPostUrl: "https://linkedin.com/feed/update/urn:li:activity:7129034892301",
    targetRole: "Staff Infrastructure & Edge Systems Lead",
    location: "San Francisco, CA",
    workArrangement: "remote",
    postedAt: "18m ago",
    fitScore: 94,
    postContent:
      "We just closed our Series A and need an absolute systems beast to lead our distributed edge routing cluster. If you have deep experience in Go, eBPF, low-latency networking, and scaling Kubernetes without burning cash, my DMs are open. Zero recruiters.",
    highlightedKeywords: ["Go", "eBPF", "low-latency networking", "Kubernetes"],
    tailoredPitch:
      "Hi Sarah, noticed your post about EdgeScale's Series A infrastructure buildout. Over the past 4 years I've led low-latency Go and eBPF network routing clusters handling 180k+ req/sec, and would love to share a 1-page overview if you're open to connecting.",
    matchingSkills: ["Go", "Kubernetes", "eBPF", "Distributed Systems", "Docker"],
  },
  {
    id: "social-2",
    authorName: "Guillermo Rauch",
    authorRole: "CEO & Founder",
    authorCompany: "Vercel",
    platform: "x",
    originalPostUrl: "https://x.com/rauchg/status/1789234892301",
    targetRole: "Senior Systems Engineer — Turbopack & Bundling Core",
    location: "San Francisco / Remote",
    workArrangement: "remote",
    postedAt: "42m ago",
    fitScore: 91,
    postContent:
      "Hiring compilers and performance engineers for Turbopack & Next.js core. Looking for Rust wizards who obsess over microsecond cold starts and incremental AST caching. Link below or message me directly.",
    highlightedKeywords: ["Turbopack", "Rust", "Next.js", "AST caching"],
    tailoredPitch:
      "Hi Guillermo, saw your tweet on Turbopack compiler engineering. My recent work centers on Rust AST caching and incremental module compilation at scale; I've put together a verified breakdown of my low-level benchmarks here: https://huntdeck.com/p/candidate",
    matchingSkills: ["Rust", "TypeScript", "Next.js", "Compilers", "WebAssembly"],
  },
  {
    id: "social-3",
    authorName: "James Hawkins",
    authorRole: "CEO & Co-founder",
    authorCompany: "PostHog",
    platform: "linkedin",
    originalPostUrl: "https://linkedin.com/feed/update/urn:li:activity:7128912389102",
    targetRole: "Staff Data Platform Engineer — ClickHouse Core",
    location: "Remote Worldwide",
    workArrangement: "remote",
    postedAt: "1h ago",
    fitScore: 93,
    postContent:
      "PostHog is hiring an experienced ClickHouse and Kafka engineer to own our real-time event ingestion pipeline (50B+ events/month). Fully transparent salary, open source repo, unlimited vacation. Shoot me an email or comment here.",
    highlightedKeywords: ["ClickHouse", "Kafka", "event ingestion", "open source"],
    tailoredPitch:
      "Hi James, love PostHog's transparent engineering ethos. I've spent the last 3 years tuning ClickHouse cluster partitions and high-throughput Kafka ingestion pipelines, and would welcome the chance to contribute to the open-source event core.",
    matchingSkills: ["ClickHouse", "Kafka", "Python", "SQL", "High-Throughput Arch"],
  },
  {
    id: "social-4",
    authorName: "Amjad Masad",
    authorRole: "CEO",
    authorCompany: "Replit",
    platform: "x",
    originalPostUrl: "https://x.com/amasad/status/1789012938102",
    targetRole: "Principal Systems Architect — Workspace Virtualization",
    location: "San Francisco, CA",
    workArrangement: "hybrid",
    postedAt: "3h ago",
    fitScore: 89,
    postContent:
      "We're scaling container virtualization for millions of live developer containers. Looking for senior folks who know Linux namespaces, cgroups v2, and QEMU/Firecracker inside and out. DM me your GitHub or past systems work.",
    highlightedKeywords: ["container virtualization", "Linux namespaces", "cgroups v2", "Firecracker"],
    tailoredPitch:
      "Hi Amjad, saw your post regarding Replit container virtualization. I have extensive experience isolating high-density microVM workloads with Firecracker and Linux cgroups v2; here is my GitHub and tailored background: https://huntdeck.com/p/candidate",
    matchingSkills: ["Linux Kernel", "Firecracker", "Go", "Docker", "Virtualization"],
  },
];

