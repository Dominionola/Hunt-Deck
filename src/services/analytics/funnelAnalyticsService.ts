/**
 * Hunt Deck — Candidate Search Funnel Analytics & Bottleneck Engine
 * 
 * Implements PRD Module 7.2.3:
 * Calculates conversion rates across the 4 primary pipeline milestones:
 *  1. Applications Submitted -> Recruiter Screen
 *  2. Recruiter Screen -> Technical / Case Study Round
 *  3. Technical -> Final Onsite Round
 *  4. Final Onsite -> Signed Offer
 * 
 * Compares against tech industry benchmarks (Top 10% vs Median) and provides
 * empirical diagnostic bottleneck flags with actionable remedies.
 */

export interface FunnelCounts {
  submitted: number;
  recruiterScreen: number;
  technicalRound: number;
  finalOnsite: number;
  offersReceived: number;
}

export interface ConversionStageMetric {
  stage: string;
  count: number;
  conversionRateFromPreviousPct: number;
  overallConversionFromTopPct: number;
  industryMedianPct: number;
  industryTopDecilePct: number;
  status: "Exemplary" | "Healthy" | "Lagging" | "Bottleneck";
}

export interface FunnelDiagnosticReport {
  totalSubmitted: number;
  totalOffers: number;
  overallOfferRatePct: number;
  stages: ConversionStageMetric[];
  primaryBottleneck: {
    stage: string;
    detectedIssue: string;
    actionableRemedy: string;
    estimatedConversionLift: string;
  } | null;
  searchVelocityHealth: "Strong Momentum" | "Healthy Pace" | "Needs Pacing Calibration";
  weeklyApplicationVelocity: number;
}

// Tech industry conversion benchmarks
const BENCHMARKS = {
  submitToScreen: { median: 10, topDecile: 22 },
  screenToTech: { median: 45, topDecile: 65 },
  techToOnsite: { median: 35, topDecile: 55 },
  onsiteToOffer: { median: 25, topDecile: 45 },
};

export function analyzeCandidateFunnel(
  counts: FunnelCounts,
  weeklyVelocity: number = 8
): FunnelDiagnosticReport {
  const { submitted, recruiterScreen, technicalRound, finalOnsite, offersReceived } = counts;

  const safeDiv = (num: number, denom: number) => {
    if (denom <= 0) return 0;
    return Math.round((num / denom) * 1000) / 10;
  };

  const submitToScreenRate = safeDiv(recruiterScreen, submitted);
  const screenToTechRate = safeDiv(technicalRound, recruiterScreen);
  const techToOnsiteRate = safeDiv(finalOnsite, technicalRound);
  const onsiteToOfferRate = safeDiv(offersReceived, finalOnsite);
  const overallOfferRate = safeDiv(offersReceived, submitted);

  const getStatus = (rate: number, median: number, topDecile: number): ConversionStageMetric["status"] => {
    if (rate >= topDecile) return "Exemplary";
    if (rate >= median * 0.8) return "Healthy";
    if (rate >= median * 0.45) return "Lagging";
    return "Bottleneck";
  };

  const stages: ConversionStageMetric[] = [
    {
      stage: "1. Applications Submitted",
      count: submitted,
      conversionRateFromPreviousPct: 100,
      overallConversionFromTopPct: 100,
      industryMedianPct: 100,
      industryTopDecilePct: 100,
      status: "Healthy",
    },
    {
      stage: "2. Recruiter Screen",
      count: recruiterScreen,
      conversionRateFromPreviousPct: submitToScreenRate,
      overallConversionFromTopPct: submitToScreenRate,
      industryMedianPct: BENCHMARKS.submitToScreen.median,
      industryTopDecilePct: BENCHMARKS.submitToScreen.topDecile,
      status: getStatus(
        submitToScreenRate,
        BENCHMARKS.submitToScreen.median,
        BENCHMARKS.submitToScreen.topDecile
      ),
    },
    {
      stage: "3. Technical / Case Study",
      count: technicalRound,
      conversionRateFromPreviousPct: screenToTechRate,
      overallConversionFromTopPct: safeDiv(technicalRound, submitted),
      industryMedianPct: BENCHMARKS.screenToTech.median,
      industryTopDecilePct: BENCHMARKS.screenToTech.topDecile,
      status: getStatus(
        screenToTechRate,
        BENCHMARKS.screenToTech.median,
        BENCHMARKS.screenToTech.topDecile
      ),
    },
    {
      stage: "4. Final Onsite Loop",
      count: finalOnsite,
      conversionRateFromPreviousPct: techToOnsiteRate,
      overallConversionFromTopPct: safeDiv(finalOnsite, submitted),
      industryMedianPct: BENCHMARKS.techToOnsite.median,
      industryTopDecilePct: BENCHMARKS.techToOnsite.topDecile,
      status: getStatus(
        techToOnsiteRate,
        BENCHMARKS.techToOnsite.median,
        BENCHMARKS.techToOnsite.topDecile
      ),
    },
    {
      stage: "5. Signed Offers",
      count: offersReceived,
      conversionRateFromPreviousPct: onsiteToOfferRate,
      overallConversionFromTopPct: overallOfferRate,
      industryMedianPct: BENCHMARKS.onsiteToOffer.median,
      industryTopDecilePct: BENCHMARKS.onsiteToOffer.topDecile,
      status: getStatus(
        onsiteToOfferRate,
        BENCHMARKS.onsiteToOffer.median,
        BENCHMARKS.onsiteToOffer.topDecile
      ),
    },
  ];

  // Identify primary bottleneck
  let primaryBottleneck: FunnelDiagnosticReport["primaryBottleneck"] = null;

  if (submitted >= 10 && submitToScreenRate < BENCHMARKS.submitToScreen.median * 0.7) {
    primaryBottleneck = {
      stage: "Application -> Recruiter Screen",
      detectedIssue: `Your resume conversion is sitting at ${submitToScreenRate}% (industry median: ${BENCHMARKS.submitToScreen.median}%). Applications are likely being filtered by ATS keyword density or unquantified achievement bullets.`,
      actionableRemedy:
        "Run the ATS Tailor 3-pass rewrite before submitting and inject exact keywords from the job description. Prioritize First-Mover alert roles submitted within the first 8 minutes.",
      estimatedConversionLift: "+8% to +14% screen rate",
    };
  } else if (recruiterScreen >= 4 && screenToTechRate < BENCHMARKS.screenToTech.median * 0.7) {
    primaryBottleneck = {
      stage: "Recruiter Screen -> Technical Assessment",
      detectedIssue: `Recruiter screen pass rate is ${screenToTechRate}% (industry median: ${BENCHMARKS.screenToTech.median}%). Recruiters may be detecting hesitation on compensation expectations, seniority mismatch, or lack of crisp elevator pitch.`,
      actionableRemedy:
        "Frame your elevator pitch around your core impact metric ($/latency/throughput) and defer salary expectations using our salary benchmark percentiles.",
      estimatedConversionLift: "+15% to +25% technical invite rate",
    };
  } else if (technicalRound >= 3 && techToOnsiteRate < BENCHMARKS.techToOnsite.median * 0.7) {
    primaryBottleneck = {
      stage: "Technical Assessment -> Final Onsite",
      detectedIssue: `Technical screen pass rate is ${techToOnsiteRate}% (industry median: ${BENCHMARKS.techToOnsite.median}%). Indicates drop-off during live system design or concurrency trade-off discussions.`,
      actionableRemedy:
        "Utilize the Interview Preparation Copilot to rehearse distributed architecture scenarios and trade-off rationalization (p99 latency, caching, sharding).",
      estimatedConversionLift: "+20% onsite advancement",
    };
  } else if (finalOnsite >= 2 && onsiteToOfferRate < BENCHMARKS.onsiteToOffer.median * 0.7) {
    primaryBottleneck = {
      stage: "Final Onsite -> Offer Close",
      detectedIssue: `Onsite-to-offer rate is ${onsiteToOfferRate}%. Strong technical competencies demonstrated, but executive presence, behavioral culture alignment, or reverse-interview questions need refinement.`,
      actionableRemedy:
        "Structure all behavioral answers strictly in STAR format with individual 'I' ownership and prepare high-signal reverse interviewing questions for VP/Directors.",
      estimatedConversionLift: "+12% offer rate",
    };
  }

  let searchVelocityHealth: FunnelDiagnosticReport["searchVelocityHealth"] = "Needs Pacing Calibration";
  if (weeklyVelocity >= 10 && weeklyVelocity <= 18) {
    searchVelocityHealth = "Strong Momentum";
  } else if (weeklyVelocity >= 5 && weeklyVelocity < 10) {
    searchVelocityHealth = "Healthy Pace";
  }

  return {
    totalSubmitted: submitted,
    totalOffers: offersReceived,
    overallOfferRatePct: overallOfferRate,
    stages,
    primaryBottleneck,
    searchVelocityHealth,
    weeklyApplicationVelocity: weeklyVelocity,
  };
}

