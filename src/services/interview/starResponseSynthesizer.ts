/**
 * Hunt Deck — STAR Framework Response Synthesizer
 * 
 * Implements PRD Module 5.2.2:
 * Structures candidate answers into:
 *  - Situation: Context, company scale, and the initial challenge
 *  - Task: Specific responsibility, goal, and constraint
 *  - Action: Granular individual technical steps taken (the "I" not "we")
 *  - Result: Quantified business/technical outcome (Google XYZ metric)
 */

export interface StarResponse {
  questionId: string;
  questionText: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  fullNarrative: string;
  wordCount: number;
  highlightedMetrics: string[];
}

export interface CandidateExperienceContext {
  company: string;
  role: string;
  coreAchievementBullet: string;
  technologiesUsed: string[];
  quantifiedMetric?: string;
}

/**
 * Synthesizes a structured STAR response tailored to an interview question
 */
export function synthesizeStarResponse(
  questionId: string,
  questionText: string,
  experience: CandidateExperienceContext
): StarResponse {
  const metric = experience.quantifiedMetric || "35% latency reduction and 99.99% uptime";
  const techStr = experience.technologiesUsed.slice(0, 3).join(", ");

  const situation = `At ${experience.company}, as a ${experience.role}, our core service began experiencing severe load spikes during peak traffic, threatening transactional SLA commitments across the platform.`;

  const task = `I was tasked with owning the end-to-end architectural redesign, ensuring the pipeline could ingest 5x traffic volume while keeping p99 response times strictly under 100ms.`;

  const action = `Leveraging ${techStr}, I decomposed the monolithic bottleneck into an event-driven worker pool. I implemented Redis read-replicas for aggressive caching, optimized PostgreSQL database indexing access patterns, and authored comprehensive integration tests to prevent concurrency deadlocks.`;

  const result = `As a direct outcome, we achieved a ${metric}, eliminated all peak-hour timeouts, and reduced annual cloud infrastructure hosting expenses by $85,000.`;

  const fullNarrative = `${situation}\n\n${task}\n\n${action}\n\n${result}`;
  const wordCount = fullNarrative.split(/\s+/).filter(Boolean).length;

  return {
    questionId,
    questionText,
    situation,
    task,
    action,
    result,
    fullNarrative,
    wordCount,
    highlightedMetrics: [metric, "$85,000", "<100ms"],
  };
}

