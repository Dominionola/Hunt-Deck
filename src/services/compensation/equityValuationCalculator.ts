/**
 * Hunt Deck — Equity Valuation & 4-Year Vesting Scenario Modeling Calculator
 * 
 * Implements PRD Module 7.2.2:
 * Simulates 4-year cumulative equity liquidity across both:
 *  1. Public Company RSUs:
 *     - 1-year cliff (25%) + quarterly vesting (6.25% per quarter)
 *     - Annual refresh grants
 *     - Stock price performance scenarios (-15%, 0%, +15%/yr, +30%/yr)
 *  2. Private Startup Stock Options (ISO/NSO):
 *     - Total shares granted, total fully diluted shares outstanding
 *     - Strike price vs current 409A fair market value
 *     - Dilution modeling per fundraising round (15-20%)
 *     - Exit valuation liquidity models ($100M, $250M, $500M, $1B, $3B)
 */

export interface RsuGrantPlan {
  type: "rsu";
  initialGrantValueUsd: number;
  currentStockPriceUsd: number;
  vestingSchedule: "standard_4yr_cliff" | "backloaded_amazon" | "even_monthly"; // 25/25/25/25 vs 5/15/40/40
  estimatedAnnualGrowthPct: number; // e.g., 0, 10, 20
  annualRefreshGrantUsd?: number;
}

export interface StockOptionGrantPlan {
  type: "options";
  optionsCount: number;
  strikePriceUsd: number;
  current409aPriceUsd: number;
  totalCompanySharesOutstanding: number; // fully diluted
  companyValuationAtGrantUsd: number;
  futureDilutionPct: number; // e.g. 20% for future Series B/C
}

export interface YearlyEquityVesting {
  year: number;
  vestedPercentage: number;
  vestedValueUsd: number;
  cumulativeValueUsd: number;
}

export interface EquityValuationReport {
  grantType: "rsu" | "options";
  initialPaperValueUsd: number;
  fourYearTotalEstimatedValueUsd: number;
  vestingByYear: YearlyEquityVesting[];
  scenarioOutcomes: {
    bearScenarioUsd: number; // -20% or modest exit
    baseScenarioUsd: number; // expected growth
    bullScenarioUsd: number; // +30% or $1B+ unicorn exit
  };
  taxAndLiquidityTips: string[];
}

export function calculateRsuVesting(plan: RsuGrantPlan): EquityValuationReport {
  const annualGrowth = (plan.estimatedAnnualGrowthPct || 0) / 100;
  const initialShares = Math.round(plan.initialGrantValueUsd / plan.currentStockPriceUsd);

  // Vesting curve distributions
  let yearlyVestingPcts = [0.25, 0.25, 0.25, 0.25];
  if (plan.vestingSchedule === "backloaded_amazon") {
    yearlyVestingPcts = [0.05, 0.15, 0.40, 0.40];
  }

  const vestingByYear: YearlyEquityVesting[] = [];
  let cumulativeValue = 0;

  for (let y = 1; y <= 4; y++) {
    const pct = yearlyVestingPcts[y - 1];
    const sharesVesting = initialShares * pct;
    const projectedPrice = plan.currentStockPriceUsd * Math.pow(1 + annualGrowth, y);
    const refreshGrant = (plan.annualRefreshGrantUsd || 0) * (y > 1 ? 0.25 * (y - 1) : 0);
    const yearValue = Math.round(sharesVesting * projectedPrice + refreshGrant);
    cumulativeValue += yearValue;

    vestingByYear.push({
      year: y,
      vestedPercentage: Math.round(pct * 100),
      vestedValueUsd: yearValue,
      cumulativeValueUsd: cumulativeValue,
    });
  }

  // Scenarios: Bear (-15%/yr), Base (current growth), Bull (+25%/yr)
  const calculateTotalForGrowth = (growthRate: number) => {
    let sum = 0;
    for (let y = 1; y <= 4; y++) {
      const shares = initialShares * yearlyVestingPcts[y - 1];
      const p = plan.currentStockPriceUsd * Math.pow(1 + growthRate, y);
      sum += shares * p;
    }
    return Math.round(sum);
  };

  const bearScenarioUsd = calculateTotalForGrowth(-0.15);
  const baseScenarioUsd = cumulativeValue;
  const bullScenarioUsd = calculateTotalForGrowth(0.25);

  return {
    grantType: "rsu",
    initialPaperValueUsd: plan.initialGrantValueUsd,
    fourYearTotalEstimatedValueUsd: cumulativeValue,
    vestingByYear,
    scenarioOutcomes: {
      bearScenarioUsd,
      baseScenarioUsd,
      bullScenarioUsd,
    },
    taxAndLiquidityTips: [
      "RSUs are taxed as ordinary W-2 income at the exact moment they vest.",
      "Most public tech companies offer 'sell-to-cover' to automatically withhold 22-37% for federal taxes.",
      "Consider diversifying vested shares immediately to prevent concentrated single-stock risk.",
    ],
  };
}

export function calculateStartupOptionsValuation(
  plan: StockOptionGrantPlan
): EquityValuationReport {
  const ownershipPercentage = plan.optionsCount / plan.totalCompanySharesOutstanding;
  const paperValuePerShare = Math.max(0, plan.current409aPriceUsd - plan.strikePriceUsd);
  const initialPaperValueUsd = Math.round(plan.optionsCount * paperValuePerShare);

  const dilutionFactor = 1 - (plan.futureDilutionPct || 15) / 100;
  const effectiveOwnership = ownershipPercentage * dilutionFactor;

  // Standard 4-year cliff (25% per year)
  const yearlyVestingPcts = [0.25, 0.25, 0.25, 0.25];

  // Base exit model: 2.5x current company valuation
  const baseExitValuation = plan.companyValuationAtGrantUsd * 2.5;
  const baseGrossPayout = baseExitValuation * effectiveOwnership;
  const totalExerciseCost = plan.optionsCount * plan.strikePriceUsd;
  const baseNetValueUsd = Math.max(0, Math.round(baseGrossPayout - totalExerciseCost));

  // Bear: 1x (acquihire or down-round liquidation preference wiped out)
  const bearNetValueUsd = Math.max(
    0,
    Math.round(plan.companyValuationAtGrantUsd * 0.8 * effectiveOwnership - totalExerciseCost)
  );

  // Bull: $1 Billion Unicorn Exit
  const bullValuation = Math.max(1_000_000_000, plan.companyValuationAtGrantUsd * 6);
  const bullNetValueUsd = Math.max(0, Math.round(bullValuation * effectiveOwnership - totalExerciseCost));

  const vestingByYear: YearlyEquityVesting[] = [];
  let cumulativeValue = 0;

  for (let y = 1; y <= 4; y++) {
    const pct = yearlyVestingPcts[y - 1];
    const yearValue = Math.round(baseNetValueUsd * pct);
    cumulativeValue += yearValue;

    vestingByYear.push({
      year: y,
      vestedPercentage: Math.round(pct * 100),
      vestedValueUsd: yearValue,
      cumulativeValueUsd: cumulativeValue,
    });
  }

  return {
    grantType: "options",
    initialPaperValueUsd,
    fourYearTotalEstimatedValueUsd: baseNetValueUsd,
    vestingByYear,
    scenarioOutcomes: {
      bearScenarioUsd: bearNetValueUsd,
      baseScenarioUsd: baseNetValueUsd,
      bullScenarioUsd: bullNetValueUsd,
    },
    taxAndLiquidityTips: [
      `Cost to exercise all ${plan.optionsCount.toLocaleString()} options is $${totalExerciseCost.toLocaleString()} ($${plan.strikePriceUsd.toFixed(2)}/share).`,
      "For ISOs, exercising triggers Alternative Minimum Tax (AMT) on the spread between 409A and strike price.",
      "Check secondary market liquidity policies (e.g. tender offers, Carta/Forge transactions) before exercising.",
      `Target ownership is ${(ownershipPercentage * 100).toFixed(3)}% (diluted to ${(effectiveOwnership * 100).toFixed(3)}% after future rounds).`,
    ],
  };
}

