"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkle,
  Copy,
  Check,
  Brain,
  ChatTeardropDots,
  ShieldCheck,
  Question,
  Lightbulb,
  ArrowsClockwise,
  User,
  CaretRight,
  ChartBar,
  WarningCircle,
  CheckCircle,
} from "@phosphor-icons/react";
import { toast } from "@/components/base/toast/toast";
import {
  generateInterviewQuestionBank,
  type InterviewQuestion,
  type InterviewQuestionCategory,
  type QuestionBankContext,
} from "@/services/interview/interviewQuestionGenerator";
import {
  synthesizeStarResponse,
  type StarResponse,
  type CandidateExperienceContext,
} from "@/services/interview/starResponseSynthesizer";
import {
  critiqueInterviewAnswer,
  type AnswerCritiqueResult,
} from "@/services/interview/answerCritiqueEngine";

const DEFAULT_CONTEXT: QuestionBankContext = {
  roleTitle: "Senior Full-Stack Engineer",
  companyName: "Stripe",
  coreSkills: ["TypeScript", "Distributed Systems", "PostgreSQL", "Redis", "Kafka"],
  seniorityLevel: "Senior",
  companyValuesOrPrinciples: [
    "Move with Urgency & Precision",
    "Extreme Ownership & Rigor",
    "Users First",
  ],
};

const DEFAULT_EXPERIENCE: CandidateExperienceContext = {
  company: "Vanguard Tech",
  role: "Senior Full-Stack Engineer",
  coreAchievementBullet:
    "Architected event-driven ingestion worker pool reducing p99 latency by 42% and sustaining 99.99% SLA during Black Friday surges.",
  technologiesUsed: ["TypeScript", "Redis", "PostgreSQL", "Kafka"],
  quantifiedMetric: "42% latency reduction & 99.99% uptime",
};

export function InterviewPrepPane() {
  const [selectedCategory, setSelectedCategory] = useState<InterviewQuestionCategory>("technical");
  const [activeQuestionId, setActiveQuestionId] = useState<string>("q_tech_1");
  const [candidateAnswer, setCandidateAnswer] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [critiqueResult, setCritiqueResult] = useState<AnswerCritiqueResult | null>(null);
  const [hasSimulatedError, setHasSimulatedError] = useState<boolean>(false);

  // Generate question bank
  const questionBank = useMemo(() => {
    return generateInterviewQuestionBank(DEFAULT_CONTEXT);
  }, []);

  const filteredQuestions = useMemo(() => {
    return questionBank.filter((q) => q.category === selectedCategory);
  }, [questionBank, selectedCategory]);

  const activeQuestion: InterviewQuestion = useMemo(() => {
    return (
      questionBank.find((q) => q.id === activeQuestionId) ||
      filteredQuestions[0] ||
      questionBank[0]
    );
  }, [questionBank, activeQuestionId, filteredQuestions]);

  // Handle category switch
  const handleSelectCategory = (cat: InterviewQuestionCategory) => {
    setSelectedCategory(cat);
    const firstInCat = questionBank.find((q) => q.category === cat);
    if (firstInCat) {
      setActiveQuestionId(firstInCat.id);
    }
  };

  // 1-Click Auto-Draft STAR response
  const handleAutoDraftStar = () => {
    const star: StarResponse = synthesizeStarResponse(
      activeQuestion.id,
      activeQuestion.question,
      DEFAULT_EXPERIENCE
    );
    setCandidateAnswer(star.fullNarrative);
    setCritiqueResult(null);
    toast.success("STAR Response Generated", {
      description: "Mapped your verified resume experience into Situation, Task, Action, and Result.",
    });
  };

  // Run AI critique
  const handleRunCritique = () => {
    if (!candidateAnswer.trim()) {
      toast.error("Answer is Empty", {
        description: "Please type or paste an answer, or click 'Auto-Draft STAR Response' first.",
      });
      return;
    }

    setIsAnalyzing(true);
    setHasSimulatedError(false);

    // Simulate snappy AI evaluation
    setTimeout(() => {
      try {
        const result = critiqueInterviewAnswer({
          questionText: activeQuestion.question,
          candidateAnswer,
          category: activeQuestion.category,
          targetCompany: DEFAULT_CONTEXT.companyName,
          associatedPrinciple: activeQuestion.associatedCompanyPrinciple,
        });
        setCritiqueResult(result);
        setIsAnalyzing(false);
        toast.success("AI Answer Critique Ready", {
          description: `Evaluated across 4 dimensions: Overall Score ${result.totalScore}/100 (${result.grade}).`,
        });
      } catch {
        setIsAnalyzing(false);
        setHasSimulatedError(true);
      }
    }, 450);
  };

  // Clipboard copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to Clipboard", {
      description: "Answer copied and ready for your interview notes.",
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const wordCount = candidateAnswer.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Top Banner: Role & Company Context */}
      <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2D5F8A]/10 border border-[#2D5F8A]/20 flex items-center justify-center text-[#2D5F8A] shrink-0 mt-0.5">
            <Brain size={22} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D5F8A]">
                Target Context:
              </span>
              <span className="text-sm font-semibold text-[#16213A]">
                {DEFAULT_CONTEXT.roleTitle} @ {DEFAULT_CONTEXT.companyName}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#FFFFFF] border border-[#E5E1D8] text-[#5B6478]">
                {DEFAULT_CONTEXT.seniorityLevel} Level
              </span>
            </div>
            <p className="text-xs text-[#5B6478] mt-1">
              Curated for {DEFAULT_CONTEXT.companyName}&apos;s engineering bar & leadership principles.
              Practice STAR responses and receive instant 4-axis AI diagnostics.
            </p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FFFFFF] border border-[#E5E1D8] rounded-xl self-start md:self-auto shrink-0">
          {(
            [
              { key: "technical", label: "Technical", icon: Brain },
              { key: "behavioral", label: "Behavioral", icon: ChatTeardropDots },
              { key: "reverse", label: "Reverse (Ask Them)", icon: Question },
            ] as const
          ).map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleSelectCategory(cat.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold min-h-[44px] transition-all duration-150 active:scale-[0.98] ${
                  isSelected
                    ? "bg-[#16213A] text-white shadow-sm"
                    : "text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0]"
                }`}
              >
                <Icon size={16} weight={isSelected ? "bold" : "regular"} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Left Question Explorer, Right Practice & Critique Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Questions List (4 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E1D8]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5B6478]">
              {selectedCategory.toUpperCase()} QUESTIONS ({filteredQuestions.length})
            </h2>
            <span className="text-[11px] text-[#2D5F8A] font-semibold">High Probability</span>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {filteredQuestions.map((q, idx) => {
              const isActive = q.id === activeQuestion.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setActiveQuestionId(q.id);
                    setCritiqueResult(null);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-150 min-h-[44px] active:scale-[0.99] flex flex-col justify-between gap-2.5 ${
                    isActive
                      ? "bg-[#FFFFFF] border-[#2D5F8A] shadow-md ring-1 ring-[#2D5F8A]/30"
                      : "bg-[#FFFFFF] border-[#E5E1D8] hover:border-[#2D5F8A]/50 hover:bg-[#FAF7F0]/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] text-[#5B6478]">
                      #{idx + 1} &bull; {q.subcategory}
                    </span>
                    {q.associatedCompanyPrinciple && (
                      <span className="text-[10px] font-medium text-[#2D5F8A] bg-[#2D5F8A]/10 px-2 py-0.5 rounded-full">
                        {q.associatedCompanyPrinciple.split("&")[0]}
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs font-semibold leading-relaxed line-clamp-3 ${
                      isActive ? "text-[#16213A]" : "text-[#5B6478]"
                    }`}
                  >
                    {q.question}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#5B6478] pt-1 border-t border-[#E5E1D8]/60">
                    <span className="italic truncate max-w-[220px]">
                      {q.whyAsked.slice(0, 50)}...
                    </span>
                    <CaretRight
                      size={14}
                      weight="bold"
                      className={isActive ? "text-[#2D5F8A]" : "text-[#5B6478]/50"}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Question Workspace & AI Critique Studio (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Active Question Context Card */}
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F0] text-[#16213A] border border-[#E5E1D8] uppercase tracking-wider">
                    {activeQuestion.subcategory}
                  </span>
                  {activeQuestion.targetInterviewerType && (
                    <span className="text-[10px] font-semibold text-[#2D5F8A] bg-[#2D5F8A]/10 px-2 py-0.5 rounded-full">
                      Target: {activeQuestion.targetInterviewerType.replace("_", " ")}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#16213A] leading-snug">
                  {activeQuestion.question}
                </h3>
              </div>
            </div>

            {/* Why This Is Asked */}
            <div className="bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#16213A]">
                <Lightbulb size={15} weight="duotone" className="text-[#2D5F8A]" />
                <span>Interviewer Signal & Objective</span>
              </div>
              <p className="text-xs text-[#5B6478] leading-relaxed">
                {activeQuestion.whyAsked}
              </p>
            </div>

            {/* Suggested Focus Points */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B6478] block mb-2">
                Suggested Focus Pillars:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeQuestion.suggestedFocusPoints.map((pt, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-[#FAF7F0] border border-[#E5E1D8] text-[#16213A] font-medium"
                  >
                    &bull; {pt}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-[#E5E1D8] flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAutoDraftStar}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FAF7F0] hover:bg-[#E5E1D8] text-[#16213A] border border-[#E5E1D8] text-xs font-semibold min-h-[44px] transition-all duration-150 active:scale-[0.98]"
              >
                <Sparkle size={15} weight="fill" className="text-[#2D5F8A]" />
                <span>Auto-Draft STAR from Resume</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(activeQuestion.question, "q_copy")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#5B6478] hover:text-[#16213A] hover:bg-[#FAF7F0] text-xs font-medium min-h-[44px] transition-all duration-150"
              >
                {copiedKey === "q_copy" ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy Question</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Answer Practice & Critique Area */}
          <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={18} weight="bold" className="text-[#2D5F8A]" />
                <h4 className="text-sm font-bold text-[#16213A]">
                  Your Practice Answer (Spoken or Draft)
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    wordCount >= 120 && wordCount <= 350
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : wordCount > 350
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-[#FAF7F0] text-[#5B6478] border border-[#E5E1D8]"
                  }`}
                >
                  {wordCount} words {wordCount >= 120 && wordCount <= 350 ? "(Optimal)" : "(Target 120-350)"}
                </span>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={candidateAnswer}
                onChange={(e) => setCandidateAnswer(e.target.value)}
                placeholder="Type your spoken answer or paste your notes here... You can also click 'Auto-Draft STAR from Resume' to synthesize an initial framework."
                rows={7}
                className="w-full text-xs sm:text-sm text-[#16213A] bg-[#FAF7F0]/40 border border-[#E5E1D8] rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[#2D5F8A] focus:border-transparent transition-all leading-relaxed placeholder:text-[#5B6478]/60 font-sans"
              />
            </div>

            {/* AI Critique Trigger Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#5B6478]">
                Evaluates clarity, &quot;I&quot; ownership, metrics, and leadership alignment.
              </span>

              <button
                type="button"
                onClick={handleRunCritique}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16213A] hover:bg-[#0D1527] text-white text-xs font-semibold min-h-[44px] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 shadow-sm"
              >
                {isAnalyzing ? (
                  <>
                    <ArrowsClockwise size={16} className="animate-spin" />
                    <span>Critiquing Answer...</span>
                  </>
                ) : (
                  <>
                    <Sparkle size={16} weight="fill" className="text-amber-300" />
                    <span>Run AI Critique & Score</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Loading Skeleton State (Apple HIG compliant pulse on #FAF7F0) */}
          {isAnalyzing && (
            <div
              data-testid="loading-skeleton"
              className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-6 shadow-sm space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 bg-[#FAF7F0] rounded-md" />
                <div className="h-6 w-20 bg-[#FAF7F0] rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="h-12 bg-[#FAF7F0] rounded-xl" />
                <div className="h-12 bg-[#FAF7F0] rounded-xl" />
                <div className="h-12 bg-[#FAF7F0] rounded-xl" />
                <div className="h-12 bg-[#FAF7F0] rounded-xl" />
              </div>
              <div className="h-20 bg-[#FAF7F0] rounded-xl" />
            </div>
          )}

          {/* Error State */}
          {hasSimulatedError && (
            <div
              data-testid="error-state"
              className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-800 space-y-2"
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <WarningCircle size={18} weight="bold" />
                <span>Diagnostic Evaluation Interrupted</span>
              </div>
              <p className="text-xs">
                An unexpected error occurred while parsing the answer structure.
              </p>
              <button
                type="button"
                onClick={handleRunCritique}
                className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold min-h-[44px] active:scale-[0.98]"
              >
                Retry Critique
              </button>
            </div>
          )}

          {/* AI Diagnostic Scorecard (When critique is ready) */}
          {critiqueResult && !isAnalyzing && (
            <div className="bg-[#FFFFFF] border border-[#E5E1D8] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E1D8]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#2D5F8A]/10 border border-[#2D5F8A]/20 flex items-center justify-center text-[#2D5F8A] font-bold text-base">
                    {critiqueResult.totalScore}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#16213A]">
                        Overall Readiness Score
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          critiqueResult.grade === "Exemplary"
                            ? "bg-emerald-100 text-emerald-800"
                            : critiqueResult.grade === "Strong"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {critiqueResult.grade}
                      </span>
                    </div>
                    <p className="text-xs text-[#5B6478]">
                      Benchmark based on {DEFAULT_CONTEXT.companyName} bar
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#5B6478]">
                  <ChartBar size={16} weight="duotone" className="text-[#2D5F8A]" />
                  <span>4 Evaluated Dimensions</span>
                </div>
              </div>

              {/* 4 Dimension Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  {
                    label: "Clarity & Brevity",
                    score: critiqueResult.dimensionScores.clarityAndBrevity,
                    max: 25,
                    desc: "Optimal spoken word count & flow",
                  },
                  {
                    label: "Ownership & Agency",
                    score: critiqueResult.dimensionScores.ownershipAgency,
                    max: 25,
                    desc: "Individual 'I' impact vs team diffusion",
                  },
                  {
                    label: "Metric Quantification",
                    score: critiqueResult.dimensionScores.metricQuantification,
                    max: 25,
                    desc: "Google XYZ % / $ / SLA empirical evidence",
                  },
                  {
                    label: "Principle Alignment",
                    score: critiqueResult.dimensionScores.principleAlignment,
                    max: 25,
                    desc: "Rigor, customer focus, & trade-offs",
                  },
                ].map((dim, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#16213A]">
                      <span>{dim.label}</span>
                      <span className="font-mono text-[#2D5F8A]">
                        {dim.score} / {dim.max}
                      </span>
                    </div>
                    <div className="w-full bg-[#E5E1D8] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#2D5F8A] h-full rounded-full transition-all duration-300"
                        style={{ width: `${(dim.score / dim.max) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#5B6478]">{dim.desc}</p>
                  </div>
                ))}
              </div>

              {/* Strengths & Improvement Areas */}
              <div className="space-y-3 pt-1">
                {critiqueResult.strengths.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <CheckCircle size={14} weight="fill" />
                      <span>Observed Strengths</span>
                    </span>
                    <ul className="space-y-1">
                      {critiqueResult.strengths.map((str, i) => (
                        <li
                          key={i}
                          className="text-xs text-[#16213A] bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 flex items-start gap-1.5"
                        >
                          <span className="text-emerald-700 font-bold">&bull;</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {critiqueResult.improvementAreas.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                      <WarningCircle size={14} weight="fill" />
                      <span>Critical Polish Areas</span>
                    </span>
                    <ul className="space-y-1">
                      {critiqueResult.improvementAreas.map((imp, i) => (
                        <li
                          key={i}
                          className="text-xs text-[#16213A] bg-amber-50/60 border border-amber-100 rounded-lg p-2 flex items-start gap-1.5"
                        >
                          <span className="text-amber-700 font-bold">&bull;</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {critiqueResult.coachingTips.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2D5F8A] flex items-center gap-1">
                      <Lightbulb size={14} weight="fill" />
                      <span>Actionable Coaching Recommendations</span>
                    </span>
                    <ul className="space-y-1">
                      {critiqueResult.coachingTips.map((tip, i) => (
                        <li
                          key={i}
                          className="text-xs text-[#5B6478] bg-[#FAF7F0] border border-[#E5E1D8] rounded-lg p-2"
                        >
                          &rarr; {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* AI-Refined STAR Rewrite Preview */}
              <div className="mt-4 pt-4 border-t border-[#E5E1D8] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} weight="duotone" className="text-[#2D5F8A]" />
                    <span className="text-xs font-bold text-[#16213A]">
                      AI Refined STAR Answer (Empirical Benchmark)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(critiqueResult.suggestedRevision.fullNarrative, "revised_copy")
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF7F0] hover:bg-[#E5E1D8] text-[#16213A] text-xs font-semibold min-h-[44px] transition-all duration-150 active:scale-[0.98]"
                  >
                    {copiedKey === "revised_copy" ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span>Copied Rewrite</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Refined STAR</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3.5 bg-[#FAF7F0] border border-[#E5E1D8] rounded-xl text-xs sm:text-sm text-[#16213A] leading-relaxed whitespace-pre-line font-sans">
                  {critiqueResult.suggestedRevision.fullNarrative}
                </div>
              </div>
            </div>
          )}

          {/* Empty State when no answer is written yet */}
          {!critiqueResult && !isAnalyzing && candidateAnswer.trim().length === 0 && (
            <div
              data-testid="empty-state"
              className="bg-[#FAF7F0]/40 border border-dashed border-[#E5E1D8] rounded-2xl p-8 text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-[#FFFFFF] border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A] mx-auto shadow-sm">
                <ChatTeardropDots size={24} weight="duotone" />
              </div>
              <h4 className="text-sm font-bold text-[#16213A]">
                Ready to practice your response
              </h4>
              <p className="text-xs text-[#5B6478] max-w-sm mx-auto">
                Type your spoken talking points above or auto-draft a structured STAR answer from your verified resume bullets.
              </p>
              <button
                type="button"
                onClick={handleAutoDraftStar}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5F8A] text-white text-xs font-semibold min-h-[44px] transition-all duration-150 active:scale-[0.98] shadow-sm hover:bg-[#254F73]"
              >
                <Sparkle size={14} weight="fill" />
                <span>Auto-Draft STAR Answer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
