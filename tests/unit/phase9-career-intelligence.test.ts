import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSalaryBenchmark,
  type SalaryBenchmarkQuery,
} from "../../src/services/compensation/salaryBenchmarkService";
import {
  calculateRsuVesting,
  calculateStartupOptionsValuation,
} from "../../src/services/compensation/equityValuationCalculator";
import {
  analyzeCandidateFunnel,
  type FunnelCounts,
} from "../../src/services/analytics/funnelAnalyticsService";

describe("Phase 9: Career Intelligence & Salary Benchmarking Engine (PRD Module 7)", () => {
  describe("1. Real-Time Salary Benchmarking & Percentiles (salaryBenchmarkService.ts)", () => {
    it("computes p25, p50, p75, and p90 percentiles for Base, Bonus, Equity, and Total Comp", () => {
      const query: SalaryBenchmarkQuery = {
        roleTitle: "Staff Software Engineer",
        seniority: "Staff",
        geoTier: "tier_1_sf_nyc",
        specialization: "distributed_systems",
        candidateTargetSalary: 240000,
      };

      const report = calculateSalaryBenchmark(query);

      assert.equal(report.currency, "USD");
      assert.ok(report.marketData.baseSalary.p50 > report.marketData.baseSalary.p25);
      assert.ok(report.marketData.baseSalary.p75 > report.marketData.baseSalary.p50);
      assert.ok(report.marketData.baseSalary.p90 > report.marketData.baseSalary.p75);

      // Total compensation must exceed base salary
      assert.ok(report.marketData.totalCompensation.p50 > report.marketData.baseSalary.p50);
      assert.ok(report.targetPercentileRank !== undefined);
      assert.ok(report.targetPercentileRank >= 1 && report.targetPercentileRank <= 99);
      assert.ok(report.negotiationLeverageInsight.length > 0);
    });

    it("scales compensation properly across seniority levels and geographic tiers", () => {
      const entryReport = calculateSalaryBenchmark({
        roleTitle: "Software Engineer",
        seniority: "Entry",
        geoTier: "tier_1_sf_nyc",
        specialization: "full_stack",
      });

      const staffReport = calculateSalaryBenchmark({
        roleTitle: "Staff Software Engineer",
        seniority: "Staff",
        geoTier: "tier_1_sf_nyc",
        specialization: "full_stack",
      });

      const remoteReport = calculateSalaryBenchmark({
        roleTitle: "Staff Software Engineer",
        seniority: "Staff",
        geoTier: "us_remote",
        specialization: "full_stack",
      });

      // Staff must earn more than Entry
      assert.ok(staffReport.marketData.baseSalary.p50 > entryReport.marketData.baseSalary.p50);
      // Tier 1 must earn more than Remote
      assert.ok(staffReport.marketData.baseSalary.p50 > remoteReport.marketData.baseSalary.p50);
    });
  });

  describe("2. Equity Valuation & Vesting Simulator (equityValuationCalculator.ts)", () => {
    it("models public company RSU 4-year cumulative growth and scenario outcomes", () => {
      const rsuReport = calculateRsuVesting({
        type: "rsu",
        initialGrantValueUsd: 300000,
        currentStockPriceUsd: 150,
        vestingSchedule: "standard_4yr_cliff",
        estimatedAnnualGrowthPct: 15,
        annualRefreshGrantUsd: 50000,
      });

      assert.equal(rsuReport.grantType, "rsu");
      assert.equal(rsuReport.vestingByYear.length, 4);
      assert.equal(rsuReport.vestingByYear[0].vestedPercentage, 25);
      assert.ok(rsuReport.fourYearTotalEstimatedValueUsd > 300000);
      assert.ok(rsuReport.scenarioOutcomes.bullScenarioUsd > rsuReport.scenarioOutcomes.baseScenarioUsd);
      assert.ok(rsuReport.scenarioOutcomes.baseScenarioUsd > rsuReport.scenarioOutcomes.bearScenarioUsd);
      assert.ok(rsuReport.taxAndLiquidityTips.length >= 2);
    });

    it("models private startup stock options with dilution and exit valuation thresholds", () => {
      const optionsReport = calculateStartupOptionsValuation({
        type: "options",
        optionsCount: 30000,
        strikePriceUsd: 1.5,
        current409aPriceUsd: 4.0,
        totalCompanySharesOutstanding: 10000000,
        companyValuationAtGrantUsd: 50000000,
        futureDilutionPct: 20,
      });

      assert.equal(optionsReport.grantType, "options");
      assert.equal(optionsReport.vestingByYear.length, 4);
      assert.ok(optionsReport.initialPaperValueUsd > 0);
      assert.ok(optionsReport.scenarioOutcomes.bullScenarioUsd > optionsReport.scenarioOutcomes.baseScenarioUsd);
      assert.ok(
        optionsReport.taxAndLiquidityTips.some((tip) =>
          tip.toLowerCase().includes("exercise")
        )
      );
    });
  });

  describe("3. Candidate Search Funnel Analytics (funnelAnalyticsService.ts)", () => {
    it("computes conversion rates across all 5 stages and compares against tech industry benchmarks", () => {
      const counts: FunnelCounts = {
        submitted: 40,
        recruiterScreen: 8,
        technicalRound: 4,
        finalOnsite: 2,
        offersReceived: 1,
      };

      const funnel = analyzeCandidateFunnel(counts, 14);

      assert.equal(funnel.totalSubmitted, 40);
      assert.equal(funnel.totalOffers, 1);
      assert.equal(funnel.stages.length, 5);
      assert.equal(funnel.weeklyApplicationVelocity, 14);
      assert.equal(funnel.searchVelocityHealth, "Strong Momentum");

      // Verify submit-to-screen conversion calculation: 8 / 40 = 20%
      const screenStage = funnel.stages[1];
      assert.equal(screenStage.conversionRateFromPreviousPct, 20);
      assert.ok(["Exemplary", "Healthy"].includes(screenStage.status));
    });

    it("detects resume keyword bottleneck when application-to-screen conversion is severely lagging", () => {
      const bottleneckCounts: FunnelCounts = {
        submitted: 50,
        recruiterScreen: 2, // 4% conversion (industry median is 10%)
        technicalRound: 1,
        finalOnsite: 1,
        offersReceived: 0,
      };

      const funnel = analyzeCandidateFunnel(bottleneckCounts, 6);

      assert.ok(funnel.primaryBottleneck !== null);
      assert.equal(funnel.primaryBottleneck.stage, "Application -> Recruiter Screen");
      assert.ok(
        funnel.primaryBottleneck.detectedIssue.toLowerCase().includes("resume conversion")
      );
      assert.ok(
        funnel.primaryBottleneck.actionableRemedy.toLowerCase().includes("ats tailor")
      );
    });
  });
});

