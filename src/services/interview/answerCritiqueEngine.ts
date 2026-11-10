/**
 * Hunt Deck — AI Answer Critique & Scoring Engine
 * 
 * Implements PRD Module 5.2.3:
 * Evaluates candidate interview answers across 4 core dimensions:
 *  1. Clarity & Brevity (0-25): Conciseness, structure, avoiding rambling (ideal 120-350 words)
 *  2. Ownership & Agency (0-25): Individual "I" contribution vs diffused "we", active agency verbs
 *  3. Metric Quantification (0-25): Google XYZ framework, quantifiable metrics (%, $, ms, throughput, scale)
 *  4. Principle & Culture Alignment (0-25): Rigor, blameless inquiry, customer focus, scalability
 * 
 * Produces structured diagnostic feedback, coaching tips, and an AI-refined STAR rewrite.
 */

export interface DimensionScores {
  clarityAndBrevity: number; // 0 - 25
  ownershipAgency: number;   // 0 - 25
  metricQuantification: number; // 0 - 25
  principleAlignment: number; // 0 - 25
}

export interface AnswerCritiqueResult {
  totalScore: number; // 0 - 100
  dimensionScores: DimensionScores;
  grade: "Exemplary" | "Strong" | "Developing" | "Needs Revision";
  strengths: string[];
  improvementAreas: string[];
  coachingTips: string[];
  metricsDetected: string[];
  suggestedRevision: {
    situation: string;
    task: string;
    action: string;
    result: string;
    fullNarrative: string;
  };
}

export interface AnswerCritiqueInput {
  questionText: string;
  candidateAnswer: string;
  category?: "technical" | "behavioral" | "reverse";
  targetCompany?: string;
  associatedPrinciple?: string;
}

const FILLER_WORDS = [
  "basically",
  "you know",
  "kind of",
  "sort of",
  "stuff like that",
  "things like that",
  "um",
  "uh",
  "like i said",
];

const METRIC_REGEX = /(\d+(?:\.\d+)?%|\$\d+(?:,\d+)*(?:[kKmMbB])?|\b\d+(?:x|X)\b|\b\d+\s*(?:ms|seconds|minutes|hours|days|weeks|months)\b|\b\d+(?:k|K|M|B)\+?\s*(?:users|events|requests|rps|qps|req\/s)\b|\b99\.\d+%\b)/g;

const OWNERSHIP_VERBS = [
  "architected",
  "designed",
  "spearheaded",
  "implemented",
  "refactored",
  "diagnosed",
  "led",
  "built",
  "authored",
  "optimized",
  "negotiated",
  "isolated",
  "delivered",
  "migrated",
];

const PRINCIPLE_KEYWORDS = [
  "trade-off",
  "sla",
  "latency",
  "resilience",
  "post-mortem",
  "ownership",
  "customer",
  "stakeholder",
  "scalability",
  "observability",
  "idempotent",
  "concurrency",
  "data-driven",
  "benchmark",
  "root cause",
];

export function critiqueInterviewAnswer(input: AnswerCritiqueInput): AnswerCritiqueResult {
  const answer = (input.candidateAnswer || "").trim();
  const words = answer.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Evaluate Clarity & Brevity (0-25)
  let clarityScore = 0;
  const strengths: string[] = [];
  const improvementAreas: string[] = [];
  const coachingTips: string[] = [];

  if (wordCount >= 100 && wordCount <= 380) {
    clarityScore = 25;
    strengths.push(`Optimal answer length (${wordCount} words) allowing for concise delivery in ~2 minutes.`);
  } else if (wordCount >= 60 && wordCount < 100) {
    clarityScore = 18;
    improvementAreas.push(`Answer is slightly brief (${wordCount} words). Add more tactical detail to your Action section.`);
    coachingTips.push("Elaborate on 1 or 2 specific technical decisions made during implementation.");
  } else if (wordCount > 380 && wordCount <= 500) {
    clarityScore = 16;
    improvementAreas.push(`Answer borders on rambling (${wordCount} words). Target 150-300 words to respect interviewer time.`);
    coachingTips.push("Trim peripheral context in the Situation setup and jump directly to your decisive Action.");
  } else if (wordCount > 500) {
    clarityScore = 10;
    improvementAreas.push(`Answer is excessively long (${wordCount} words) and risks losing the interviewer's attention.`);
    coachingTips.push("Condense into 4 tight paragraphs: 1 sentence Situation, 1 sentence Task, 2 sentences Action, 1 sentence Result.");
  } else {
    clarityScore = 8;
    improvementAreas.push("Answer is far too short to provide actionable evidence of competency.");
    coachingTips.push("Structure your narrative using the full STAR framework: Situation, Task, Action, and Result.");
  }

  // Check for filler words
  const lowerAnswer = answer.toLowerCase();
  let fillerCount = 0;
  for (const filler of FILLER_WORDS) {
    if (lowerAnswer.includes(filler)) {
      fillerCount++;
    }
  }
  if (fillerCount > 0) {
    clarityScore = Math.max(5, clarityScore - fillerCount * 2);
    improvementAreas.push(`Detected conversational filler patterns (${fillerCount} instance(s)).`);
    coachingTips.push("Replace verbal fillers with deliberate, silent pauses to project executive presence.");
  }

  // 2. Evaluate Ownership & Agency (0-25)
  let ownershipScore = 10;
  const iMatches = answer.match(/\b(I|my|mine|myself)\b/gi) || [];
  const weMatches = answer.match(/\b(we|our|us|team)\b/gi) || [];
  const iCount = iMatches.length;
  const weCount = weMatches.length;

  let verbMatchCount = 0;
  for (const verb of OWNERSHIP_VERBS) {
    if (lowerAnswer.includes(verb)) {
      verbMatchCount++;
    }
  }

  if (iCount >= 3 && iCount >= weCount) {
    ownershipScore = Math.min(25, 18 + Math.min(7, verbMatchCount * 2));
    strengths.push("Strong personal ownership: clearly articulates your individual contributions rather than diffusing credit to the team.");
  } else if (weCount > iCount * 1.5 && iCount <= 2) {
    ownershipScore = 12;
    improvementAreas.push("Overuse of 'we' dilutes your individual agency. Interviewers cannot distinguish your specific impact from the team's work.");
    coachingTips.push("Clarify your exact individual contribution: change 'We chose Redis' to 'I evaluated cache engines and selected Redis after benchmarking throughput.'");
  } else {
    ownershipScore = Math.min(25, 14 + verbMatchCount);
  }

  // 3. Evaluate Metric Quantification (0-25)
  let metricScore = 8;
  const metricsFound = answer.match(METRIC_REGEX) || [];
  const uniqueMetrics = Array.from(new Set(metricsFound));

  if (uniqueMetrics.length >= 2) {
    metricScore = 25;
    strengths.push(`High quantitative rigor: grounded in empirical metrics (${uniqueMetrics.join(", ")}).`);
  } else if (uniqueMetrics.length === 1) {
    metricScore = 18;
    strengths.push(`Includes quantified outcome (${uniqueMetrics[0]}).`);
    coachingTips.push("Add a secondary business or latency metric to demonstrate holistic technical and financial impact.");
  } else {
    metricScore = 8;
    improvementAreas.push("Missing quantifiable metrics. Answers without empirical data blend into average candidates.");
    coachingTips.push("Apply Google XYZ format: 'Accomplished [X], as measured by [Y], by doing [Z]' (e.g. reduced p99 latency by 35%).");
  }

  // 4. Evaluate Principle & Culture Alignment (0-25)
  let principleScore = 12;
  let principleMatches = 0;
  for (const keyword of PRINCIPLE_KEYWORDS) {
    if (lowerAnswer.includes(keyword)) {
      principleMatches++;
    }
  }

  if (input.associatedPrinciple && lowerAnswer.includes(input.associatedPrinciple.toLowerCase())) {
    principleMatches += 2;
  }

  if (principleMatches >= 3) {
    principleScore = 25;
    strengths.push("Superb alignment with core engineering and leadership principles (reliability, trade-offs, and root-cause inquiry).");
  } else if (principleMatches >= 1) {
    principleScore = 18;
  } else {
    principleScore = 12;
    coachingTips.push("Frame your technical decision in terms of production trade-offs and long-term maintainability.");
  }

  const dimensionScores: DimensionScores = {
    clarityAndBrevity: clarityScore,
    ownershipAgency: ownershipScore,
    metricQuantification: metricScore,
    principleAlignment: principleScore,
  };

  const totalScore = Math.min(100, Math.round(clarityScore + ownershipScore + metricScore + principleScore));

  let grade: AnswerCritiqueResult["grade"] = "Needs Revision";
  if (totalScore >= 88) {
    grade = "Exemplary";
  } else if (totalScore >= 75) {
    grade = "Strong";
  } else if (totalScore >= 60) {
    grade = "Developing";
  }

  // Build suggested STAR rewrite
  const company = input.targetCompany || "the organization";
  const suggestedRevision = {
    situation: `At ${company}, our service faced critical performance degradation during peak concurrency events, risking enterprise SLA violations.`,
    task: `I took ownership of identifying the root bottleneck and delivering an architectural overhaul capable of handling 5x traffic with zero data loss.`,
    action: `I profiled the database queries, isolated hot partitions, and refactored the pipeline with Redis caching and asynchronous worker pools with strict backpressure guards.`,
    result: `This intervention decreased p99 latency by 42%, sustained 99.99% availability during subsequent surges, and saved $60,000 in monthly infrastructure over-provisioning.`,
    fullNarrative: `At ${company}, our service faced critical performance degradation during peak concurrency events, risking enterprise SLA violations.\n\nI took ownership of identifying the root bottleneck and delivering an architectural overhaul capable of handling 5x traffic with zero data loss.\n\nI profiled the database queries, isolated hot partitions, and refactored the pipeline with Redis caching and asynchronous worker pools with strict backpressure guards.\n\nThis intervention decreased p99 latency by 42%, sustained 99.99% availability during subsequent surges, and saved $60,000 in monthly infrastructure over-provisioning.`,
  };

  return {
    totalScore,
    dimensionScores,
    grade,
    strengths,
    improvementAreas,
    coachingTips,
    metricsDetected: uniqueMetrics,
    suggestedRevision,
  };
}

