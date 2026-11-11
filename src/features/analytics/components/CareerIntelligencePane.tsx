"use client";

import React, { useState, useMemo } from "react";
import {
  CurrencyDollar,
  Funnel,
  WarningCircle,
  Sparkle,
  Lightbulb,
  Calculator,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import {
  calculateSalaryBenchmark,
  type SeniorityTier,
  type GeographicTier,
  type TechSpecialization,
  type BenchmarkReport,
} from "@/services/compensation/salaryBenchmarkService";
import {
  calculateRsuVesting,
  calculateStartupOptionsValuation,
  type EquityValuationReport,
} from "@/services/compensation/equityValuationCalculator";
import {
  analyzeCandidateFunnel,
  type FunnelCounts,
  type FunnelDiagnosticReport,
} from "@/services/analytics/funnelAnalyticsService";

const SAMPLE_FUNNEL_COUNTS: FunnelCounts = {
  submitted: 32,
  recruiterScreen: 6,
  technicalRound: 4,
  finalOnsite: 2,
  offersReceived: 1,
};

export function CareerIntelligencePane() {
  const [activeTab, setActiveTab] = useState<"benchmarks" | "equity" | "funnel">("benchmarks");

  // Benchmark filters
  const [seniority, setSeniority] = useState<SeniorityTier>("Senior");
  const [geoTier, setGeoTier] = useState<GeographicTier>("tier_1_sf_nyc");
  const [specialization, setSpecialization] = useState<TechSpecialization>("distributed_systems");
  const [targetSalary, setTargetSalary] = useState<number>(220000);

  // Equity calculator state
  const [equityType, setEquityType] = useState<"rsu" | "options">("rsu");
  const [rsuGrantValue, setRsuGrantValue] = useState<number>(350000);
  const [rsuGrowthPct, setRsuGrowthPct] = useState<number>(10);
  const [optionsCount, setOptionsCount] = useState<number>(25000);
  const [strikePrice, setStrikePrice] = useState<number>(2.5);
  const [companyValuation, setCompanyValuation] = useState<number>(85000000);

  // 1. Calculate salary report
  const benchmarkReport: BenchmarkReport = useMemo(() => {
    return calculateSalaryBenchmark({
      roleTitle: "Software Engineer",
      seniority,
      geoTier,
      specialization,
      candidateTargetSalary: targetSalary,
    });
  }, [seniority, geoTier, specialization, targetSalary]);

  // 2. Calculate equity report
  const equityReport: EquityValuationReport = useMemo(() => {
    if (equityType === "rsu") {
      return calculateRsuVesting({
        type: "rsu",
        initialGrantValueUsd: rsuGrantValue,
        currentStockPriceUsd: 140,
        vestingSchedule: "standard_4yr_cliff",
        estimatedAnnualGrowthPct: rsuGrowthPct,
        annualRefreshGrantUsd: 40000,
      });
    } else {
      return calculateStartupOptionsValuation({
        type: "options",
        optionsCount,
        strikePriceUsd: strikePrice,
        current409aPriceUsd: strikePrice * 2.2,
        totalCompanySharesOutstanding: 10000000,
        companyValuationAtGrantUsd: companyValuation,
        futureDilutionPct: 18,
      });
    }
  }, [equityType, rsuGrantValue, rsuGrowthPct, optionsCount, strikePrice, companyValuation]);

  // 3. Calculate funnel diagnostics
  const funnelReport: FunnelDiagnosticReport = useMemo(() => {
    return analyzeCandidateFunnel(SAMPLE_FUNNEL_COUNTS, 12);
  }, []);

  const handleCopyInsight = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Insight Copied", {
      description: "Market compensation insight ready for your negotiation playbook.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl w-fit">
        {[
          { key: "benchmarks", label: "Salary Benchmarks", icon: CurrencyDollar },
          { key: "equity", label: "Equity & Vesting Simulator", icon: Calculator },
          { key: "funnel", label: "Search Funnel Analytics", icon: Funnel },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold min-h-[44px] transition-all duration-150 active:scale-[0.98] ${
                isSelected
                  ? "bg-[#16213A] text-white shadow-sm"
                  : "text-[#5B6478] hover:text-[#16213A] hover:bg-[#FFFFFF]"
              }`}
            >
              <Icon size={17} weight={isSelected ? "bold" : "regular"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: SALARY BENCHMARKS */}
      {activeTab === "benchmarks" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-4 sm:p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
            {/* Seniority */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-1.5">
                Seniority Tier
              </label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as SeniorityTier)}
                className="w-full text-xs sm:text-sm font-semibold text-[#16213A] bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              >
                <option value="Entry">Entry (0-2 YOE)</option>
                <option value="Mid">Mid-Level (3-5 YOE)</option>
                <option value="Senior">Senior (6-8 YOE)</option>
                <option value="Staff">Staff / Lead (9-12 YOE)</option>
                <option value="Principal">Principal / Director (12+ YOE)</option>
              </select>
            </div>

            {/* Geo Market */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-1.5">
                Geographic Market
              </label>
              <select
                value={geoTier}
                onChange={(e) => setGeoTier(e.target.value as GeographicTier)}
                className="w-full text-xs sm:text-sm font-semibold text-[#16213A] bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              >
                <option value="tier_1_sf_nyc">Tier 1: SF Bay Area / New York</option>
                <option value="tier_2_metro">Tier 2: Seattle / Austin / Boston</option>
                <option value="us_remote">US Nationwide / Remote</option>
                <option value="uk_europe">UK / Europe (London / Berlin)</option>
              </select>
            </div>

            {/* Specialization */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-1.5">
                Specialization
              </label>
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value as TechSpecialization)}
                className="w-full text-xs sm:text-sm font-semibold text-[#16213A] bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              >
                <option value="distributed_systems">Distributed Systems / Infra</option>
                <option value="ai_ml">AI / Machine Learning</option>
                <option value="full_stack">Full-Stack Engineering</option>
                <option value="frontend">Frontend & Product</option>
                <option value="mobile">Mobile (iOS / Android)</option>
                <option value="security">Security / Platform</option>
              </select>
            </div>

            {/* Target Base Salary Input */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-1.5">
                Your Target Base ($)
              </label>
              <input
                type="number"
                step="5000"
                value={targetSalary}
                onChange={(e) => setTargetSalary(Number(e.target.value))}
                className="w-full text-xs sm:text-sm font-semibold text-[#16213A] bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl px-3 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
              />
            </div>
          </div>

          {/* Benchmark Curve Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Base Salary",
                data: benchmarkReport.marketData.baseSalary,
                highlight: true,
              },
              {
                title: "Annual Bonus (Target)",
                data: benchmarkReport.marketData.annualBonus,
              },
              {
                title: "Annual Equity (RSU/Options)",
                data: benchmarkReport.marketData.annualEquity,
              },
              {
                title: "Total Compensation (TC)",
                data: benchmarkReport.marketData.totalCompensation,
                highlightAccent: true,
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`rounded-2xl p-5 border shadow-sm space-y-3 ${
                  card.highlightAccent
                    ? "bg-[#16213A] text-white border-[#16213A]"
                    : card.highlight
                    ? "bg-[#FAF7F0] text-[#16213A] border-[#2D5F8A]/30"
                    : "bg-[#FFFFFF] text-[#16213A] border-[#E5E1D8]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      card.highlightAccent ? "text-slate-300" : "text-[#5B6478]"
                    }`}
                  >
                    {card.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      card.highlightAccent
                        ? "bg-white/10 text-white"
                        : "bg-[#FFFFFF] border border-[#E5E1D8] text-[#2D5F8A]"
                    }`}
                  >
                    p50: ${card.data.p50.toLocaleString()}
                  </span>
                </div>

                <div className="text-2xl font-bold tracking-tight">
                  ${card.data.p50.toLocaleString()}
                  <span
                    className={`text-xs font-normal ml-1 ${
                      card.highlightAccent ? "text-slate-400" : "text-[#5B6478]"
                    }`}
                  >
                    median
                  </span>
                </div>

                {/* Percentile Distribution Bars */}
                <div className="space-y-1.5 pt-2 border-t border-current/10 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="opacity-70">25th:</span>
                    <span>${card.data.p25.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="opacity-70">75th:</span>
                    <span>${card.data.p75.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="opacity-70">90th:</span>
                    <span>${card.data.p90.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Target Position & Negotiation Leverage Card */}
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E1D8]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2D5F8A]/10 border border-[#2D5F8A]/20 flex items-center justify-center text-[#2D5F8A] font-bold text-sm">
                  {benchmarkReport.targetPercentileRank}th
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#16213A]">
                    Target Base Placement: {benchmarkReport.targetPercentileRank}th Percentile
                  </h3>
                  <p className="text-xs text-[#5B6478]">
                    Market Demand:{" "}
                    <span className="text-[#2D5F8A] font-semibold">
                      {benchmarkReport.marketDemandTier}
                    </span>{" "}
                    &bull; Annual Sector Wage Growth:{" "}
                    <span className="text-emerald-700 font-semibold">
                      +{benchmarkReport.historicalPaceAnnualGrowthPct}%
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopyInsight(benchmarkReport.negotiationLeverageInsight)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF7F0] hover:bg-[#E5E1D8] text-[#16213A] text-xs font-semibold min-h-[44px] transition-all duration-150 active:scale-[0.98] border border-[#E5E1D8]"
              >
                <Sparkle size={15} weight="fill" className="text-[#2D5F8A]" />
                <span>Copy Negotiation Note</span>
              </button>
            </div>

            {/* Strategic Advice Box */}
            <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl p-4 flex items-start gap-3">
              <Lightbulb size={20} weight="duotone" className="text-[#2D5F8A] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#16213A] uppercase tracking-wider block">
                  Negotiation Playbook Anchor:
                </span>
                <p className="text-xs sm:text-sm text-[#16213A] leading-relaxed">
                  {benchmarkReport.negotiationLeverageInsight}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: EQUITY & VESTING SIMULATOR */}
      {activeTab === "equity" && (
        <div className="space-y-6">
          {/* Grant Type Selector */}
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#16213A]">Equity Grant Architecture</h3>
              <p className="text-xs text-[#5B6478]">
                Model 4-year liquidity curves, stock growth assumptions, and dilution impact.
              </p>
            </div>

            <div className="flex items-center gap-2 p-1 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl">
              <button
                type="button"
                onClick={() => setEquityType("rsu")}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold min-h-[44px] transition-all duration-150 active:scale-[0.98] ${
                  equityType === "rsu"
                    ? "bg-[#16213A] text-white shadow-sm"
                    : "text-[#5B6478] hover:text-[#16213A]"
                }`}
              >
                Public Company RSUs
              </button>
              <button
                type="button"
                onClick={() => setEquityType("options")}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold min-h-[44px] transition-all duration-150 active:scale-[0.98] ${
                  equityType === "options"
                    ? "bg-[#16213A] text-white shadow-sm"
                    : "text-[#5B6478] hover:text-[#16213A]"
                }`}
              >
                Private Startup Options
              </button>
            </div>
          </div>

          {/* Parameters Bar */}
          <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {equityType === "rsu" ? (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-1">
                    Initial 4-Year Grant ($)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={rsuGrantValue}
                    onChange={(e) => setRsuGrantValue(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm font-semibold text-[#16213A] bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-1">
                    Annual Stock Growth (%)
                  </label>
                  <input
                    type="number"
                    value={rsuGrowthPct}
                    onChange={(e) => setRsuGrowthPct(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm font-semibold text-[#16213A] bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="text-xs font-bold text-[#16213A]">
                    4-Yr Projected Value:{" "}
                    <span className="text-[#2D5F8A] font-mono text-base">
                      ${equityReport.fourYearTotalEstimatedValueUsd.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#5B6478]">
                    Includes standard 25% annual cliff
                  </span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-1">
                    Options Count
                  </label>
                  <input
                    type="number"
                    step="5000"
                    value={optionsCount}
                    onChange={(e) => setOptionsCount(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm font-semibold text-[#16213A] bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-1">
                    Strike Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={strikePrice}
                    onChange={(e) => setStrikePrice(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm font-semibold text-[#16213A] bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-1">
                    Company Valuation ($)
                  </label>
                  <input
                    type="number"
                    step="5000000"
                    value={companyValuation}
                    onChange={(e) => setCompanyValuation(Number(e.target.value))}
                    className="w-full text-xs sm:text-sm font-semibold text-[#16213A] bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl px-3 py-2 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-[#2D5F8A]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Vesting Table & Scenario Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* 4-Year Schedule (7 cols) */}
            <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                4-YEAR VESTING SCHEDULE
              </h4>
              <div className="space-y-3">
                {equityReport.vestingByYear.map((item) => (
                  <div
                    key={item.year}
                    className="p-3.5 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#16213A]">
                        Year {item.year} Vest ({item.vestedPercentage}%)
                      </div>
                      <div className="text-[11px] text-[#5B6478]">
                        Cumulative: ${item.cumulativeValueUsd.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-[#2D5F8A] font-mono">
                      +${item.vestedValueUsd.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenario Outcomes (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="p-4 bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Bear Scenario (-15% or Low Exit)
                </span>
                <div className="text-lg font-bold text-[#16213A] font-mono">
                  ${equityReport.scenarioOutcomes.bearScenarioUsd.toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-[#FAF7F0] border border-[#2D5F8A]/40 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D5F8A]">
                  Base Scenario (Expected)
                </span>
                <div className="text-xl font-bold text-[#16213A] font-mono">
                  ${equityReport.scenarioOutcomes.baseScenarioUsd.toLocaleString()}
                </div>
              </div>

              <div className="p-4 bg-[#16213A] text-white rounded-2xl space-y-1 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Bull Scenario (+25% / Unicorn Exit)
                </span>
                <div className="text-xl font-bold text-white font-mono">
                  ${equityReport.scenarioOutcomes.bullScenarioUsd.toLocaleString()}
                </div>
              </div>

              {/* Tips */}
              <div className="p-3.5 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl space-y-1 text-xs text-[#5B6478]">
                {equityReport.taxAndLiquidityTips.slice(0, 2).map((tip, i) => (
                  <p key={i}>&bull; {tip}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: SEARCH FUNNEL ANALYTICS & BOTTLENECK DIAGNOSIS */}
      {activeTab === "funnel" && (
        <div className="space-y-6">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E5E1D8] shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                Total Applications
              </span>
              <div className="text-2xl font-bold text-[#16213A]">
                {funnelReport.totalSubmitted}
              </div>
              <span className="text-[11px] text-[#5B6478]">
                Velocity: {funnelReport.weeklyApplicationVelocity}/week ({funnelReport.searchVelocityHealth})
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E5E1D8] shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
                Offers Received
              </span>
              <div className="text-2xl font-bold text-emerald-700">
                {funnelReport.totalOffers}
              </div>
              <span className="text-[11px] text-[#5B6478]">
                Overall conversion: {funnelReport.overallOfferRatePct}%
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F0] border border-[#2D5F8A]/30 shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D5F8A]">
                Funnel Diagnostic State
              </span>
              <div className="text-sm font-bold text-[#16213A] mt-1">
                {funnelReport.primaryBottleneck
                  ? `Bottleneck: ${funnelReport.primaryBottleneck.stage}`
                  : "All Stages Healthy"}
              </div>
              <span className="text-[11px] text-[#5B6478]">
                Benchmarked against tech industry top 10%
              </span>
            </div>
          </div>

          {/* 5-Stage Funnel Table */}
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
              PIPELINE CONVERSION BENCHMARK
            </h4>
            <div className="space-y-3">
              {funnelReport.stages.map((stage, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-[#16213A]">
                        {stage.stage}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          stage.status === "Exemplary"
                            ? "bg-emerald-100 text-emerald-800"
                            : stage.status === "Healthy"
                            ? "bg-blue-100 text-blue-800"
                            : stage.status === "Lagging"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {stage.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5B6478]">
                      Candidate conversion:{" "}
                      <span className="font-semibold text-[#16213A]">
                        {stage.conversionRateFromPreviousPct}%
                      </span>{" "}
                      (Industry Median: {stage.industryMedianPct}% &bull; Top Decile:{" "}
                      {stage.industryTopDecilePct}%)
                    </div>
                  </div>

                  <div className="text-base sm:text-lg font-bold text-[#16213A] font-mono shrink-0">
                    {stage.count}{" "}
                    <span className="text-xs font-normal text-[#5B6478]">leads</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Bottleneck Action Card */}
          {funnelReport.primaryBottleneck && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <WarningCircle size={18} weight="fill" />
                <span>Primary Funnel Bottleneck Detected: {funnelReport.primaryBottleneck.stage}</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
                {funnelReport.primaryBottleneck.detectedIssue}
              </p>
              <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-amber-900 font-medium">
                  <strong>Recommended Remedy:</strong> {funnelReport.primaryBottleneck.actionableRemedy}
                </div>
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full shrink-0">
                  Est. Lift: {funnelReport.primaryBottleneck.estimatedConversionLift}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
