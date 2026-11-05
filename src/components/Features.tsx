"use client";

import Image from "next/image";
import {
  FileText,
  Sparkle,
  Check,
  CaretRight,
  Briefcase,
  Target,
} from "@phosphor-icons/react";
import { useGsapReveal } from "@/hooks/useGsapReveal";

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 1 UI: Layered Floating Document Cards (Matching "Spaces" inspo)
   ───────────────────────────────────────────────────────────────────────────── */
function ResumeTailorVisual() {
  return (
    <div className="relative w-full h-[280px] flex items-end justify-center select-none">
      {/* Back Card: Original Resume */}
      <div className="absolute left-2 sm:left-4 bottom-3 w-[72%] sm:w-[70%] rounded-2xl bg-white/90 backdrop-blur-xs border border-white/70 p-3.5 shadow-md space-y-2 transform -translate-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-black/[0.05]">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[10px] text-[#5B6478]">
              <FileText size={11} weight="fill" />
            </div>
            <span className="text-[11px] font-bold text-[#16213A] truncate">
              alex_resume.pdf
            </span>
          </div>
          <span className="text-[9px] font-medium text-[#5B6478] bg-black/[0.04] px-1.5 py-0.5 rounded">
            Original
          </span>
        </div>

        <div className="space-y-1 text-[9.5px] text-[#5B6478]">
          <p className="font-semibold text-[#16213A] text-[10px]">Product Designer</p>
          <p className="truncate text-black/60">Led sprint planning &amp; UI delivery</p>
          <div className="flex flex-wrap gap-1 pt-1 opacity-70">
            <span className="px-1.5 py-0.5 rounded bg-black/[0.04] text-[8.5px]">UI Design</span>
            <span className="px-1.5 py-0.5 rounded bg-black/[0.04] text-[8.5px]">Figma</span>
            <span className="px-1.5 py-0.5 rounded bg-black/[0.04] text-[8.5px]">User Research</span>
          </div>
        </div>
      </div>

      {/* Front Card: Stripe Tailored ATS Scorecard (Layered on top to the right) */}
      <div className="absolute right-2 sm:right-3 bottom-0 w-[76%] sm:w-[74%] rounded-2xl bg-white border border-white/90 p-4 shadow-xl shadow-[#16213A]/10 z-10 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#635BFF] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
              S
            </div>
            <span className="text-[11.5px] font-bold text-[#16213A]">Stripe Fit</span>
          </div>
          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70 flex items-center gap-1">
            <Sparkle size={10} weight="fill" />
            98 / 100 ATS
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#5B6478] font-medium">JD Keyword Match</span>
            <span className="font-bold text-[#16213A]">98%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#FAF7F0] overflow-hidden">
            <div className="h-full w-[98%] rounded-full bg-[#2D5F8A]" />
          </div>

          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#E5E1D8]/60">
            <span className="text-[#5B6478] font-medium">Impact Quantifiers</span>
            <span className="text-emerald-700 font-bold text-[9.5px] flex items-center gap-0.5">
              <Check size={10} weight="bold" /> 14 Tailored
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 2 UI: Angled Tilted Floating Cards (Matching "Folders & Tags" inspo)
   ───────────────────────────────────────────────────────────────────────────── */
function JobMatchVisual() {
  return (
    <div className="relative w-full h-[280px] flex items-end justify-center select-none">
      {/* Left Tilted Card: Matched Roles */}
      <div className="absolute left-2 sm:left-3 bottom-2 w-[64%] sm:w-[62%] rounded-2xl bg-white border border-white/80 p-3.5 shadow-xl shadow-[#16213A]/10 transform -rotate-4 transition-transform duration-300 group-hover:-rotate-6 z-10">
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.04]">
          <span className="text-[10.5px] font-bold text-[#16213A] flex items-center gap-1">
            <Briefcase size={11} weight="bold" className="text-[#2D5F8A]" />
            Matched Roles
          </span>
        </div>

        <div className="space-y-2 pt-2 text-[10px]">
          <div className="flex items-center gap-1.5 text-[#16213A] font-medium">
            <CaretRight size={9} weight="bold" className="text-[#5B6478] shrink-0" />
            <span className="w-4 h-4 rounded bg-[#635BFF] text-white text-[8px] font-bold flex items-center justify-center shrink-0">
              S
            </span>
            <span className="truncate">Stripe · Staff UX</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#16213A] font-medium">
            <CaretRight size={9} weight="bold" className="text-[#5B6478] shrink-0" />
            <span className="w-4 h-4 rounded bg-[#16213A] text-white text-[8px] font-bold flex items-center justify-center shrink-0">
              L
            </span>
            <span className="truncate">Linear · Lead PM</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#16213A] font-medium">
            <CaretRight size={9} weight="bold" className="text-[#5B6478] shrink-0" />
            <span className="w-4 h-4 rounded bg-black text-white text-[8px] font-bold flex items-center justify-center shrink-0">
              ▲
            </span>
            <span className="truncate">Vercel · Engineer</span>
          </div>
        </div>
      </div>

      {/* Right Tilted Card: Tags & Match Criteria (Overlapping in front) */}
      <div className="absolute right-2 sm:right-3 bottom-6 w-[56%] sm:w-[54%] rounded-2xl bg-white/95 backdrop-blur-xs border border-white/80 p-3.5 shadow-2xl shadow-[#16213A]/15 transform rotate-6 transition-transform duration-300 group-hover:rotate-8 z-20">
        <div className="pb-1.5 border-b border-black/[0.04]">
          <span className="text-[10px] font-bold text-[#16213A] flex items-center gap-1">
            <Target size={11} weight="bold" className="text-emerald-600" />
            Direct Fit
          </span>
        </div>

        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-[9.5px]">
            <span className="font-semibold text-[#2D5F8A]"># 98% Match</span>
          </div>
          <div className="flex items-center justify-between text-[9.5px]">
            <span className="font-medium text-[#5B6478]"># $180k - $210k</span>
          </div>
          <div className="flex items-center justify-between text-[9.5px]">
            <span className="font-medium text-[#5B6478]"># Remote First</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 3 UI: Structured Database Table Sheet (Matching "Collections" inspo)
   ───────────────────────────────────────────────────────────────────────────── */
function InterviewPrepVisual() {
  return (
    <div className="relative w-full h-[280px] flex items-end justify-center select-none">
      <div className="w-[92%] rounded-t-2xl bg-white border-t border-x border-white/90 shadow-2xl shadow-[#16213A]/10 p-3.5 pb-2 space-y-2 transform translate-y-1">
        {/* Table Header */}
        <div className="flex items-center justify-between text-[9.5px] font-semibold text-[#5B6478] border-b border-[#E5E1D8]/70 pb-1.5 px-1">
          <div className="flex items-center gap-2">
            <span>#</span>
            <span>Aa Question Prompt</span>
          </div>
          <span>Method / Tag</span>
        </div>

        {/* Category Pill */}
        <div className="flex items-center gap-1.5 px-1 pt-0.5">
          <span className="text-[9px] text-[#5B6478]">▾</span>
          <span className="text-[9px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
            Stripe Loop Prep
          </span>
        </div>

        {/* Rows */}
        <div className="space-y-1 text-[9.5px]">
          <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#FAF7F0] transition-colors">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="text-[#5B6478] font-mono text-[9px] w-2">1</span>
              <span className="text-[10px] text-amber-500">💡</span>
              <span className="truncate text-[#16213A] font-medium">Prioritize roadmap under deadlines</span>
            </div>
            <span className="text-[8.5px] font-bold text-[#2D5F8A] bg-[#2D5F8A]/10 px-1.5 py-0.5 rounded shrink-0">
              STAR
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#FAF7F0] transition-colors">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="text-[#5B6478] font-mono text-[9px] w-2">2</span>
              <span className="text-[10px] text-purple-500">⚡</span>
              <span className="truncate text-[#16213A] font-medium">Architecture scalability trade-offs</span>
            </div>
            <span className="text-[8.5px] font-semibold text-[#5B6478] bg-black/[0.04] px-1.5 py-0.5 rounded shrink-0">
              Technical
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#FAF7F0] transition-colors">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="text-[#5B6478] font-mono text-[9px] w-2">3</span>
              <span className="text-[10px] text-emerald-500">🤝</span>
              <span className="truncate text-[#16213A] font-medium">Cross-functional team alignment</span>
            </div>
            <span className="text-[8.5px] font-semibold text-[#5B6478] bg-black/[0.04] px-1.5 py-0.5 rounded shrink-0">
              Behavioral
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#FAF7F0] transition-colors">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="text-[#5B6478] font-mono text-[9px] w-2">4</span>
              <span className="text-[10px] text-blue-500">🎯</span>
              <span className="truncate text-[#16213A] font-medium">Compensation &amp; offer negotiation</span>
            </div>
            <span className="text-[8.5px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
              Closing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN FEATURES SECTION
   ───────────────────────────────────────────────────────────────────────────── */
export function Features() {
  const gridRef = useGsapReveal<HTMLDivElement>({
    preset: "stagger-grid",
    staggerSelector: ".features-card",
    staggerAmount: 0.1,
    duration: 0.7,
    start: "top 87%",
  });

  return (
    <section id="features" className="py-24 sm:py-32 bg-white border-b border-[#E5E1D8]/60 relative">
      {/* Ambient background cloud elements matching inspo depth */}
      <div
        className="absolute -top-14 -right-20 md:-top-18 md:right-[-2%] lg:-top-24 lg:right-[2%] w-[380px] sm:w-[540px] md:w-[680px] lg:w-[820px] pointer-events-none select-none z-10"
      >
        <Image
          src="/assets/cloud-1.png"
          alt=""
          width={1082}
          height={542}
          className="w-full h-auto object-contain opacity-85"
        />
      </div>

      {/* Secondary subtle cloud drift on lower left overlapping seamlessly into next section */}
      <div
        className="absolute -bottom-24 -left-16 sm:-bottom-32 sm:-left-20 md:-bottom-40 md:-left-12 lg:-bottom-48 lg:-left-8 w-[380px] sm:w-[540px] md:w-[680px] lg:w-[800px] pointer-events-none select-none z-10"
      >
        <Image
          src="/assets/cloud-2.png"
          alt=""
          width={1235}
          height={550}
          className="w-full h-auto object-contain opacity-80"
        />
      </div>

      <div className="max-w-[1140px] mx-auto px-6 relative z-20">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2D5F8A] inline-block px-3 py-1 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] mb-4">
            Core features
          </span>
          <h2
            className="text-3xl sm:text-5xl font-bold text-[#16213A] leading-[1.12] tracking-[-0.02em]"
            style={{ textWrap: "balance" }}
          >
            Everything you need. <span className="font-serif italic font-normal text-[#2D5F8A]">Nothing you don&apos;t.</span>
          </h2>
          <p className="text-sm sm:text-base text-[#5B6478] mt-3.5 max-w-xl mx-auto leading-relaxed">
            Tailor your resume, discover direct-match roles across top companies, and walk into every interview prepared.
          </p>
        </div>

        {/* 3-Card Grid */}
        <div ref={gridRef} className="grid grid-cols-1 lg:grid-cols-3 gap-7 sm:gap-8">

          {/* CARD 1 — Pastel Periwinkle Blue */}
          <div
            className="features-card group relative h-[470px] sm:h-[490px] rounded-[32px] overflow-hidden border border-[#CADBF0] bg-gradient-to-b from-[#BED4F2] via-[#C9DEF6] to-[#D8E7F9] p-6 pt-8 flex flex-col justify-between shadow-xs hover:shadow-xl hover:shadow-[#16213A]/8 hover:-translate-y-1.5 transition-all duration-400"
          >
            {/* Seamless full-card cloud & color wash (no boundary lines) */}
            <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
              <div className="absolute -bottom-8 -left-12 w-[540px] h-[390px]">
                <Image
                  src="/assets/cloud-2.png"
                  alt=""
                  fill
                  className="object-contain object-bottom-left opacity-80"
                />
              </div>
              {/* Filter spread smoothly throughout entire card */}
              <div className="absolute inset-0 bg-[#BED4F2]/30 mix-blend-color pointer-events-none" />
            </div>

            <div className="text-center z-10 px-2 relative">
              <h3 className="text-2xl font-serif font-normal text-[#16213A] leading-tight tracking-tight">
                Resume Tailor
              </h3>
              <p className="text-xs sm:text-sm text-[#3E4F6C] mt-1.5 leading-snug">
                ATS-optimised rewrites tailored for every single role
              </p>
            </div>

            <div className="relative z-10">
              <ResumeTailorVisual />
            </div>
          </div>

          {/* CARD 2 — Sky Blue */}
          <div
            className="features-card group relative h-[470px] sm:h-[490px] rounded-[32px] overflow-hidden border border-[#BCE1F2] bg-gradient-to-b from-[#B4DCF5] via-[#C9E7F8] to-[#DEF1FC] p-6 pt-8 flex flex-col justify-between shadow-xs hover:shadow-xl hover:shadow-[#16213A]/8 hover:-translate-y-1.5 transition-all duration-400"
          >
            {/* Seamless full-card cloud & color wash (no boundary lines) */}
            <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
              <div className="absolute -bottom-6 -right-10 w-[540px] h-[390px]">
                <Image
                  src="/assets/cloud-1.png"
                  alt=""
                  fill
                  className="object-contain object-bottom-right opacity-85"
                />
              </div>
              {/* Filter spread smoothly throughout entire card */}
              <div className="absolute inset-0 bg-[#B4DCF5]/30 mix-blend-color pointer-events-none" />
            </div>

            <div className="text-center z-10 px-2 relative">
              <h3 className="text-2xl font-serif font-normal text-[#16213A] leading-tight tracking-tight">
                Role Matching
              </h3>
              <p className="text-xs sm:text-sm text-[#2C3B53] mt-1.5 leading-snug">
                Live roles ranked by direct fit against your background
              </p>
            </div>

            <div className="relative z-10">
              <JobMatchVisual />
            </div>
          </div>

          {/* CARD 3 — Pastel Mint/Sage Green */}
          <div
            className="features-card group relative h-[470px] sm:h-[490px] rounded-[32px] overflow-hidden border border-[#CDE5D4] bg-gradient-to-b from-[#CDECD6] via-[#D8F1DF] to-[#E5F7EB] p-6 pt-8 flex flex-col justify-between shadow-xs hover:shadow-xl hover:shadow-[#16213A]/8 hover:-translate-y-1.5 transition-all duration-400"
          >
            {/* Seamless full-card cloud & color wash with prominent clouds rising above table */}
            <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
              {/* Main prominent cloud crest billowing high into view above table sheet */}
              <div className="absolute top-12 -right-8 w-[540px] h-[380px]">
                <Image
                  src="/assets/cloud-1.png"
                  alt=""
                  fill
                  className="object-contain object-top-right opacity-90"
                />
              </div>
              {/* Secondary cloud puff on the left side to balance prominence */}
              <div className="absolute top-24 -left-16 w-[380px] h-[280px]">
                <Image
                  src="/assets/cloud-2.png"
                  alt=""
                  fill
                  className="object-contain object-left opacity-80"
                />
              </div>
              {/* Filter spread smoothly throughout entire card */}
              <div className="absolute inset-0 bg-[#CDECD6]/35 mix-blend-color pointer-events-none" />
            </div>

            <div className="text-center z-10 px-2 relative">
              <h3 className="text-2xl font-serif font-normal text-[#16213A] leading-tight tracking-tight">
                Interview Prep
              </h3>
              <p className="text-xs sm:text-sm text-[#334F3C] mt-1.5 leading-snug">
                Structured tracking and role-specific coaching questions
              </p>
            </div>

            <div className="relative z-10">
              <InterviewPrepVisual />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
