"use client";

import Image from "next/image";
import {
  FilePdf,
  CheckCircle,
  Sparkle,
  CalendarBlank,
  PaperPlaneTilt,
  Check,
  TrendUp,
  Brain,
} from "@phosphor-icons/react";
import { useGsapReveal } from "@/hooks/useGsapReveal";

const steps = [
  {
    num: "01",
    title: "Upload your resume",
    desc: "Drop your existing resume. Our parser instantly extracts your verified skills, experience level, and career trajectory.",
    bgImage: "/assets/bg/download (3).png",
    ui: (
      <div className="w-full space-y-3">
        {/* Document Header Card */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-200/60 flex items-center justify-center shrink-0">
              <FilePdf size={18} weight="fill" />
            </div>
            <div className="truncate">
              <p className="text-[12px] font-bold text-[#16213A] truncate leading-tight">
                alex_carter_cv.pdf
              </p>
              <p className="text-[10px] text-[#5B6478] font-medium">184 KB · Parsed</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0 flex items-center gap-1">
            <Check size={10} weight="bold" />
            Extracted
          </span>
        </div>

        {/* Extracted Skills Cloud */}
        <div className="p-2.5 rounded-xl bg-[#FAF7F0] border border-[#E5E1D8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5B6478]">
              Verified Skills (28)
            </span>
            <span className="text-[10px] font-bold text-[#2D5F8A]">98% Confidence</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Product Strategy", match: "98%" },
              { label: "Design Systems", match: "95%" },
              { label: "UX Research", match: "92%" },
              { label: "Next.js / React", match: "89%" },
            ].map((skill) => (
              <span
                key={skill.label}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white border border-[#E5E1D8] text-[#16213A] flex items-center gap-1 shadow-2xs"
              >
                <span>{skill.label}</span>
                <span className="text-[9px] text-[#2D5F8A] font-bold">{skill.match}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Experience Level & Readiness Footer */}
        <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white border border-[#E5E1D8] text-[10.5px]">
          <span className="font-semibold text-[#16213A] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Senior Level · 6+ yrs
          </span>
          <span className="font-bold text-[#2D5F8A]">Ready to match →</span>
        </div>
      </div>
    ),
  },
  {
    num: "02",
    title: "Discover matched jobs",
    desc: "AI ranks live roles across top company boards specifically matched to your real background — zero spam jobs.",
    bgImage: "/assets/bg/download (4).png",
    ui: (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between pb-1 px-1">
          <span className="text-[11px] font-bold text-[#16213A] flex items-center gap-1.5">
            <TrendUp size={13} weight="bold" className="text-[#2D5F8A]" />
            Top AI Matches
          </span>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            Live Feed
          </span>
        </div>

        {/* 3 Matched Role Items (matching Inspo Card 1 structure) */}
        {[
          {
            role: "Lead Product Designer",
            co: "Stripe",
            logo: "S",
            logoBg: "bg-[#635BFF] text-white",
            salary: "$175k–$195k · Remote",
            score: "98% Match",
          },
          {
            role: "Senior UX Designer",
            co: "Linear",
            logo: "L",
            logoBg: "bg-[#16213A] text-white",
            salary: "$160k–$180k · Hybrid",
            score: "95% Match",
          },
          {
            role: "Design Engineer",
            co: "Vercel",
            logo: "▲",
            logoBg: "bg-black text-white",
            salary: "$165k–$190k · Remote",
            score: "92% Match",
          },
        ].map((job) => (
          <div
            key={job.co}
            className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E1D8] shadow-2xs hover:border-[#2D5F8A]/40 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div
                className={`w-7 h-7 rounded-lg ${job.logoBg} font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs`}
              >
                {job.logo}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-bold text-[#16213A] truncate leading-tight">
                  {job.role}
                </p>
                <p className="text-[9.5px] text-[#5B6478] truncate">{job.co} · {job.salary}</p>
              </div>
            </div>
            <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
              {job.score}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "03",
    title: "Get your application pack",
    desc: "Generates an ATS-tailored resume, personalized cover letter, and match breakdown built around the job description.",
    bgImage: "/assets/bg/download (5).png",
    ui: (
      <div className="w-full space-y-2 relative">
        {/* Top Card */}
        <div className="p-2.5 rounded-xl bg-white border border-[#E5E1D8] shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A]">
                <Sparkle size={12} weight="fill" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#16213A] leading-tight">
                  Stripe Application Pack
                </p>
                <p className="text-[9.5px] text-[#5B6478]">Resume + Cover Letter</p>
              </div>
            </div>
            <span className="text-[9.5px] font-bold text-[#2D5F8A] bg-[#FAF7F0] border border-[#E5E1D8] px-2 py-0.5 rounded-full">
              Generated
            </span>
          </div>
        </div>

        {/* Central Connecting Dotted Line with Floating Glowing Dark Badge (Inspo Card 2) */}
        <div className="relative py-1 flex items-center justify-center">
          <div className="absolute inset-x-0 h-px border-t border-dashed border-[#E5E1D8]" />
          <div className="relative z-10 px-2.5 py-1 rounded-full bg-[#16213A] text-white text-[9.5px] font-semibold flex items-center gap-1.5 shadow-md border border-[#16213A]/50">
            <Sparkle size={10} weight="fill" className="text-[#7ECEF4]" />
            <span>AI ATS Score: 98 / 100</span>
          </div>
        </div>

        {/* Bottom Optimization Breakdown Card */}
        <div className="p-2.5 rounded-xl bg-white border border-[#E5E1D8] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#5B6478] font-medium">JD Keyword Density</span>
            <span className="text-[#16213A] font-bold">98% Match</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#FAF7F0] overflow-hidden">
            <div className="h-full w-[98%] rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-center justify-between text-[10px] pt-0.5">
            <span className="text-[#5B6478] font-medium">Impact Quantified</span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
              <Check size={10} weight="bold" /> Passed
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: "04",
    title: "Prep and track",
    desc: "Review company-tailored interview practice questions and track every stage from application to signed offer.",
    bgImage: "/assets/bg/download (6).png",
    ui: (
      <div className="w-full space-y-2">
        <div className="flex items-center justify-between pb-0.5 px-1">
          <span className="text-[11px] font-bold text-[#16213A]">Interview Process</span>
          <span className="text-[9.5px] font-semibold text-[#5B6478]">Live Pipeline</span>
        </div>

        {/* Timeline Items (matching Inspo Card 3 structure) */}
        <div className="relative pl-3 space-y-2 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-px before:bg-[#E5E1D8]">
          {/* Step 1 */}
          <div className="relative flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E1D8] shadow-2xs">
            <div className="flex items-center gap-2 min-w-0 pr-1">
              <div className="w-6 h-6 rounded-md bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A] shrink-0">
                <PaperPlaneTilt size={11} weight="bold" />
              </div>
              <div className="truncate">
                <p className="text-[10.5px] font-bold text-[#16213A] truncate leading-tight">
                  Application Sent
                </p>
                <p className="text-[9px] text-[#5B6478]">Stripe · Yesterday</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-[#2D5F8A] bg-[#2D5F8A]/10 px-2 py-0.5 rounded-full shrink-0">
              Submitted
            </span>
          </div>

          {/* Step 2 */}
          <div className="relative flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E1D8] shadow-2xs">
            <div className="flex items-center gap-2 min-w-0 pr-1">
              <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shrink-0">
                <CalendarBlank size={11} weight="bold" />
              </div>
              <div className="truncate">
                <p className="text-[10.5px] font-bold text-[#16213A] truncate leading-tight">
                  Interview Scheduled
                </p>
                <p className="text-[9px] text-[#5B6478]">Tomorrow · 10:30 AM</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
              Confirmed
            </span>
          </div>

          {/* Step 3 */}
          <div className="relative flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E1D8] shadow-2xs">
            <div className="flex items-center gap-2 min-w-0 pr-1">
              <div className="w-6 h-6 rounded-md bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#16213A] shrink-0">
                <Brain size={11} weight="bold" />
              </div>
              <div className="truncate">
                <p className="text-[10.5px] font-bold text-[#16213A] truncate leading-tight">
                  AI Prep Questions
                </p>
                <p className="text-[9px] text-[#5B6478]">6 role-based case scenarios</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-[#16213A] bg-[#FAF7F0] border border-[#E5E1D8] px-2 py-0.5 rounded-full shrink-0">
              Ready
            </span>
          </div>
        </div>
      </div>
    ),
  },
];

export function HowItWorks() {
  const headerRef = useGsapReveal<HTMLDivElement>({
    preset: "fade-up",
    single: true,
    duration: 0.65,
    start: "top 88%",
  });
  const gridRef = useGsapReveal<HTMLDivElement>({
    preset: "stagger-grid",
    staggerSelector: ".howitworks-step",
    staggerAmount: 0.11,
    duration: 0.68,
    start: "top 85%",
  });

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-[#FAF7F0] border-b border-[#E5E1D8]/60 relative">
      {/* Ambient floating cloud to break flatness and add atmospheric depth */}
      <div
        className="absolute -top-16 -right-24 md:-top-12 md:right-[-4%] lg:-top-20 lg:right-[1%] w-[420px] sm:w-[580px] md:w-[720px] lg:w-[860px] pointer-events-none select-none z-10"
      >
        <Image
          src="/assets/cloud-2.png"
          alt=""
          width={1235}
          height={550}
          className="w-full h-auto object-contain opacity-75"
        />
      </div>

      <div className="max-w-[1240px] mx-auto px-6 relative z-20">
        {/* Split Header */}
        <div ref={headerRef} className="mb-14 sm:mb-18">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2D5F8A] inline-block px-3 py-1 rounded-full bg-white border border-[#E5E1D8] mb-5">
            How it works
          </span>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <h2
              className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#16213A] leading-[1.08] tracking-[-0.025em] max-w-2xl"
              style={{ textWrap: "balance" }}
            >
              Great career moves start with{" "}
              <span className="font-serif italic font-normal text-[#2D5F8A]">better tools.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#5B6478] max-w-md leading-relaxed">
              Hunt Deck understands your profile, uncovers hidden roles, generates tailored application packs, and prepares you to interview — in minutes.
            </p>
          </div>
        </div>

        {/* 4-Card Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className="howitworks-step group flex flex-col"
            >
              {/* [Top Section] Scenic Photographic Container with Floating UI Component */}
              <div className="relative h-[430px] sm:h-[450px] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E5E1D8] shadow-sm flex items-center justify-center p-3.5 sm:p-4 bg-[#16213A]/5">
                {/* Background Image */}
                <Image
                  src={step.bgImage}
                  alt={step.title}
                  fill
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />

                {/* Subtle soft gradient overlay */}
                <div className="absolute inset-0 bg-black/15 group-hover:bg-black/20 transition-colors duration-500" />

                {/* Floating Polished UI Card */}
                <div className="relative z-10 w-full rounded-2xl bg-white/95 backdrop-blur-md border border-[#E5E1D8]/80 shadow-2xl p-4 text-[#16213A]">
                  {step.ui}
                </div>
              </div>

              {/* [Bottom Section] Title and Description Underneath the Image (as in inspo) */}
              <div className="pt-5 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-[#2D5F8A] font-mono tracking-wider">
                    {step.num}
                  </span>
                  <span className="text-[#E5E1D8]">/</span>
                  <h3 className="text-lg font-bold text-[#16213A] tracking-[-0.015em] leading-snug">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-[#5B6478] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust statements */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 mt-16 pt-10 border-t border-[#E5E1D8]">
          {[
            { text: "No spam applications", icon: CheckCircle },
            { text: "Tailored, not templated", icon: CheckCircle },
            { text: "Cancel anytime", icon: CheckCircle },
          ].map((item) => {
            const IconComp = item.icon;
            return (
              <span
                key={item.text}
                className="text-sm text-[#16213A] font-semibold flex items-center gap-2"
              >
                <IconComp size={16} weight="fill" className="text-[#2D5F8A]" />
                {item.text}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

