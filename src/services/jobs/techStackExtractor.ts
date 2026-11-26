export type TechStackRule = {
  tag: string;
  pattern: RegExp;
  searchTerm: string;
};

const TECH_STACK_RULES: readonly TechStackRule[] = [
  { tag: "TypeScript", pattern: /\btypescript\b/i, searchTerm: "TypeScript" },
  { tag: "JavaScript", pattern: /\bjavascript\b/i, searchTerm: "JavaScript" },
  { tag: "React", pattern: /\breact(?:\.js|js)?\b/i, searchTerm: "React" },
  { tag: "Next.js", pattern: /\bnext\.?js\b/i, searchTerm: "Next" },
  { tag: "Node.js", pattern: /\bnode\.?js\b/i, searchTerm: "Node" },
  { tag: "Python", pattern: /\bpython\b/i, searchTerm: "Python" },
  { tag: "Go", pattern: /\bgolang\b|\bgo\s+(?:engineer|developer|services?|backend)\b/i, searchTerm: "Golang" },
  { tag: "Rust", pattern: /\brust\b/i, searchTerm: "Rust" },
  { tag: "Java", pattern: /\bjava\b(?!script)/i, searchTerm: "Java" },
  { tag: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/i, searchTerm: "Postgres" },
  { tag: "Redis", pattern: /\bredis\b/i, searchTerm: "Redis" },
  { tag: "GraphQL", pattern: /\bgraphql\b/i, searchTerm: "GraphQL" },
  { tag: "Tailwind CSS", pattern: /\btailwind(?:\s*css)?\b/i, searchTerm: "Tailwind" },
  { tag: "Vue", pattern: /\bvue(?:\.js)?\b/i, searchTerm: "Vue" },
  { tag: "Angular", pattern: /\bangular\b/i, searchTerm: "Angular" },
  { tag: "FastAPI", pattern: /\bfastapi\b/i, searchTerm: "FastAPI" },
  { tag: "Django", pattern: /\bdjango\b/i, searchTerm: "Django" },
  { tag: "Docker", pattern: /\bdocker\b/i, searchTerm: "Docker" },
  { tag: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i, searchTerm: "Kubernetes" },
  { tag: "AWS", pattern: /\baws\b|\bamazon web services\b/i, searchTerm: "AWS" },
  { tag: "GCP", pattern: /\bgcp\b|\bgoogle cloud\b/i, searchTerm: "Google Cloud" },
  { tag: "Cloudflare", pattern: /\bcloudflare\b/i, searchTerm: "Cloudflare" },
  { tag: "Terraform", pattern: /\bterraform\b/i, searchTerm: "Terraform" },
  { tag: "AI / LLM", pattern: /\b(?:llm|llms|openai|anthropic|langchain|rag|generative ai)\b/i, searchTerm: "LLM" },
  { tag: "PyTorch", pattern: /\bpytorch\b/i, searchTerm: "PyTorch" },
  { tag: "Figma", pattern: /\bfigma\b/i, searchTerm: "Figma" },
];

export const POPULAR_TECH_STACK_FILTERS = [
  "TypeScript",
  "React",
  "Next.js",
  "Python",
  "Node.js",
  "PostgreSQL",
  "AWS",
  "AI / LLM",
] as const;

/**
 * Extracts canonical tech stack tags from job title and description.
 * Title matches are prioritized before description matches.
 */
export function extractTechStack(title: string, description: string, maxTags = 6): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const rule of TECH_STACK_RULES) {
    if (rule.pattern.test(title) && !seen.has(rule.tag)) {
      seen.add(rule.tag);
      found.push(rule.tag);
      if (found.length >= maxTags) return found;
    }
  }

  for (const rule of TECH_STACK_RULES) {
    if (rule.pattern.test(description) && !seen.has(rule.tag)) {
      seen.add(rule.tag);
      found.push(rule.tag);
      if (found.length >= maxTags) return found;
    }
  }

  return found;
}

export function resolveStackSearchTerms(stackTags: string[]): string[] {
  return stackTags.map((tag) => {
    const matched = TECH_STACK_RULES.find((r) => r.tag.toLowerCase() === tag.toLowerCase());
    return matched ? matched.searchTerm : tag;
  });
}

export function getJobFreshness(
  postedAt: Date | string,
  now = new Date()
): { label: string; isHighlight: boolean } | null {
  const posted = typeof postedAt === "string" ? new Date(postedAt) : postedAt;
  if (!Number.isFinite(posted.getTime())) return null;

  const diffMs = now.getTime() - posted.getTime();
  if (diffMs < 0) return { label: "New · < 24h", isHighlight: true };

  const hours = diffMs / (1000 * 60 * 60);
  if (hours <= 24) return { label: "New · < 24h", isHighlight: true };
  if (hours <= 72) return { label: "Recent · < 3d", isHighlight: true };

  const days = Math.floor(hours / 24);
  if (days <= 7) return { label: `${days}d ago`, isHighlight: false };
  return null;
}
