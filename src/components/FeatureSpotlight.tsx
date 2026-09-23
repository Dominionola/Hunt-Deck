"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, ArrowUpRight, Quotes } from "@phosphor-icons/react";
import { useGsapReveal } from "@/hooks/useGsapReveal";

/* ─────────────────────────────────────────────────────────────────────────────
   FLOATING UI CARD 1: Job Match Engine Ledger (Matching Inspo Ledger)
   ───────────────────────────────────────────────────────────────────────────── */
function JobMatchLedger() {
  const jobs = [
    { name: "Stripe", role: "Staff Product Designer", comp: "$185,000", match: "Verified", score: "98%" },
    { name: "Linear", role: "Senior UX Designer", comp: "$170,000", match: "Verified", score: "95%" },
    { name: "Vercel", role: "Design Systems Engineer", comp: "$165,000", match: "Reconciled", score: "92%" },
    { name: "Figma", role: "Product Manager II", comp: "$160,000", match: "Verified", score: "89%" },
  ];

  return (
    <div className="w-full max-w-[410px] rounded-2xl bg-white/95 backdrop-blur-md border border-white/90 p-5 sm:p-6 shadow-2xl shadow-black/30 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.06]">
        <span className="text-[13px] font-bold text-[#16213A] tracking-tight">
          Job Match Ledger
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10.5px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        {jobs.map((job) => (
          <div
            key={job.name}
            className="flex items-center justify-between py-1 border-b border-black/[0.03] last:border-0"
          >
            <div className="min-w-0 pr-2">
              <p className="text-[12.5px] font-bold text-[#16213A] leading-tight truncate">
                {job.name}
              </p>
              <p className="text-[10.5px] text-[#5B6478] font-medium truncate">
                {job.role}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[12px] font-mono font-bold text-[#16213A]">
                {job.comp}
              </span>
              <span
                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border ${
                  job.match === "Verified"
                    ? "bg-[#D8F3DC] text-[#1B4332] border-[#B7E4C7]"
                    : "bg-[#FEF08A] text-[#854D0E] border-[#FDE047]"
                }`}
              >
                {job.match}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FLOATING UI CARD 2: ATS Rewrite & Attribution Ledger
   ───────────────────────────────────────────────────────────────────────────── */
function ResumeOptimizationLedger() {
  const metrics = [
    { label: "JD Keyword Density", value: "98% Match", status: "Verified" },
    { label: "Quantified Impact Bullets", value: "14 Reframed", status: "Verified" },
    { label: "Executive Cover Letter", value: "Tailored", status: "Reconciled" },
    { label: "ATS File Structure Check", value: "100% Clean", status: "Verified" },
  ];

  return (
    <div className="w-full max-w-[410px] rounded-2xl bg-white/95 backdrop-blur-md border border-white/90 p-5 sm:p-6 shadow-2xl shadow-black/30 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.06]">
        <span className="text-[13px] font-bold text-[#16213A] tracking-tight">
          ATS Rewrite Ledger
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10.5px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          98 / 100 Score
        </span>
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center justify-between py-1 border-b border-black/[0.03] last:border-0"
          >
            <div className="min-w-0 pr-2">
              <p className="text-[12px] font-bold text-[#16213A] leading-tight truncate">
                {m.label}
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-[11.5px] font-semibold text-[#2D5F8A]">
                {m.value}
              </span>
              <span
                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border ${
                  m.status === "Verified"
                    ? "bg-[#D8F3DC] text-[#1B4332] border-[#B7E4C7]"
                    : "bg-[#FEF08A] text-[#854D0E] border-[#FDE047]"
                }`}
              >
                {m.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FLOATING UI CARD 3: Interview Prep Ledger
   ───────────────────────────────────────────────────────────────────────────── */
function InterviewPrepLedger() {
  const questions = [
    { prompt: "Prioritize competing roadmap items", framework: "STAR Method", status: "Verified" },
    { prompt: "Architecture trade-offs under scale", framework: "Technical", status: "Verified" },
    { prompt: "Resolving cross-functional deadlocks", framework: "Behavioral", status: "Reconciled" },
    { prompt: "Salary band & offer negotiation", framework: "Closing", status: "Verified" },
  ];

  return (
    <div className="w-full max-w-[410px] rounded-2xl bg-white/95 backdrop-blur-md border border-white/90 p-5 sm:p-6 shadow-2xl shadow-black/30 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-black/[0.06]">
        <span className="text-[13px] font-bold text-[#16213A] tracking-tight">
          Interview Prep Ledger
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10.5px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Loop Ready
        </span>
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        {questions.map((q) => (
          <div
            key={q.prompt}
            className="flex items-center justify-between py-1 border-b border-black/[0.03] last:border-0"
          >
            <div className="min-w-0 pr-2">
              <p className="text-[11.5px] font-bold text-[#16213A] leading-tight truncate">
                {q.prompt}
              </p>
              <p className="text-[10px] text-[#5B6478] font-medium">
                {q.framework}
              </p>
            </div>
            <span
              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                q.status === "Verified"
                  ? "bg-[#D8F3DC] text-[#1B4332] border-[#B7E4C7]"
                  : "bg-[#FEF08A] text-[#854D0E] border-[#FDE047]"
              }`}
            >
              {q.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SPOTLIGHT DATA DEFINITIONS
   ───────────────────────────────────────────────────────────────────────────── */
const spotlights = [
  {
    tag: "[JOB MATCHING & ATTRIBUTION]",
    title: "See where every matched role actually goes.",
    desc: "First-party career board scraping that bypasses sponsored junk, ghost jobs, and duplicate agency posts — so your matches reflect real opportunities.",
    bullets: [
      "Real-time scraping across 5,000+ top company career boards",
      "Direct background & seniority match verification",
      "Salary band transparency with zero recruiter spam",
      "Instant push alerts the moment a target role opens",
    ],
    buttonText: "See It In Action",
    quote: {
      text: "I had 12 relevant matches waiting for me within minutes of uploading my resume. I'd spent 3 weeks manually searching before.",
      name: "Tobi A.",
      role: "Software Engineer, Abuja",
    },
    natureImage: "/assets/nature-1.jpg",
    ui: <JobMatchLedger />,
    imageRight: true,
  },
  {
    tag: "[RESUME OPTIMIZATION]",
    title: "Tailored rewrites that match the recruiter's rubric.",
    desc: "ATS-optimized rewrites that survive enterprise keyword filters, hiring manager scans, and formatting pitfalls — so every bullet point earns your interview.",
    bullets: [
      "ATS keyword density and phrasing reconciliation",
      "Quantified impact metrics reframing for every achievement",
      "Role-specific executive cover letters generated instantly",
      "Side-by-side before-and-after audit and verification",
    ],
    buttonText: "Optimize Resume",
    quote: {
      text: "The before/after was night and day. My tailored resume landed me three callbacks in the same week.",
      name: "Sarah M.",
      role: "Product Manager, London",
    },
    natureImage: "/assets/nature-2.jpg",
    ui: <ResumeOptimizationLedger />,
    imageRight: false,
  },
  {
    tag: "[INTERVIEW INTELLIGENCE]",
    title: "Prep flows directly to what converts.",
    desc: "Once you apply, Hunt Deck synthesizes role-based behavioral, technical, and case scenarios directly from the JD and your resume. No generic prep questions.",
    bullets: [
      "Role-specific behavioral & technical prompt generation",
      "STAR-method coached response frameworks",
      "Company-specific culture and evaluation rubric alignment",
      "Multi-round pipeline tracking from initial screen to offer",
    ],
    buttonText: "Explore Interview Prep",
    quote: {
      text: "Three of the behavioral questions it gave me came up almost word-for-word in my final round. I was prepared. They noticed.",
      name: "David K.",
      role: "Marketing Director, Remote",
    },
    natureImage: "/assets/nature-3.jpg",
    ui: <InterviewPrepLedger />,
    imageRight: true,
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   SPOTLIGHT ROW — each row gets its own directional GSAP reveal
   ───────────────────────────────────────────────────────────────────────────── */
function SpotlightRow({
  spot,
}: {
  spot: (typeof spotlights)[number];
}) {
  // Text panel slides in from the side the image IS NOT on
  const textPreset = spot.imageRight ? "fade-right" : "fade-left";
  const imgPreset  = spot.imageRight ? "fade-left"  : "fade-right";

  const textRef = useGsapReveal<HTMLDivElement>({
    preset: textPreset,
    single: true,
    duration: 0.68,
    start: "top 85%",
  });
  const imgRef = useGsapReveal<HTMLDivElement>({
    preset: imgPreset,
    single: true,
    duration: 0.72,
    delay: 0.08,
    start: "top 85%",
  });
  const quoteRef = useGsapReveal<HTMLDivElement>({
    preset: "fade-up",
    single: true,
    duration: 0.55,
    delay: 0.18,
    start: "top 90%",
  });

  return (
    <div className="space-y-8">
      <div
        className={`flex flex-col gap-12 lg:gap-16 items-center ${
          spot.imageRight ? "lg:flex-row" : "lg:flex-row-reverse"
        }`}
      >
        {/* Content Column */}
        <div ref={textRef} className="flex-1 w-full max-w-lg">
          {/* Monospace Bracketed Eyebrow */}
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-[#5B6478] mb-3 block font-semibold">
            {spot.tag}
          </span>

          {/* Big Editorial Serif Headline */}
          <h3
            className="text-3xl sm:text-5xl font-serif font-normal text-[#16213A] leading-[1.1] mb-4 tracking-[-0.02em]"
            style={{ textWrap: "balance" }}
          >
            {spot.title}
          </h3>

          {/* Subtitle Description */}
          <p className="text-sm sm:text-base text-[#5B6478] leading-relaxed mb-6">
            {spot.desc}
          </p>

          {/* Feature Check List */}
          <ul className="space-y-2.5 mb-8 text-sm text-[#16213A] font-medium">
            {spot.bullets.map((b, bIdx) => (
              <li key={bIdx} className="flex items-center gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-600 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* Action Button */}
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16213A] text-white text-sm font-semibold hover:bg-[#2D5F8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2 transition-colors shadow-sm"
          >
            <span>{spot.buttonText}</span>
            <ArrowUpRight size={14} weight="bold" />
          </Link>
        </div>

        {/* Visual Canvas Column */}
        <div ref={imgRef} className="flex-1 w-full">
          <div className="relative h-[430px] sm:h-[470px] lg:h-[490px] w-full rounded-[28px] overflow-hidden border border-[#E5E1D8] shadow-lg flex items-center justify-center p-4 sm:p-7">
            {/* Nature Background Photo */}
            <Image
              src={spot.natureImage}
              alt=""
              fill
              className="object-cover transition-transform duration-700 ease-out hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />

            {/* 35mm Analog Film Grain Texture Overlay */}
            <div
              className="absolute inset-0 pointer-events-none opacity-35 mix-blend-overlay z-1"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />

            {/* Soft Vignette / Ambient Lighting */}
            <div className="absolute inset-0 bg-black/10 pointer-events-none z-1" />

            {/* Floating White UI Card */}
            <div className="relative z-10 w-full flex justify-center">
              {spot.ui}
            </div>
          </div>
        </div>
      </div>

      {/* Testimonial Quote Pill */}
      <div
        ref={quoteRef}
        className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E1D8] shadow-xs flex items-start gap-3.5 max-w-2xl"
      >
        <div className="w-8 h-8 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] flex items-center justify-center text-[#2D5F8A] shrink-0 mt-0.5">
          <Quotes size={15} weight="fill" />
        </div>
        <div className="text-xs sm:text-sm leading-relaxed">
          <p className="text-[#16213A] italic mb-1.5">
            &ldquo;{spot.quote.text}&rdquo;
          </p>
          <p className="font-bold text-[#16213A] text-xs">
            {spot.quote.name}{" "}
            <span className="font-normal text-[#5B6478]">— {spot.quote.role}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   FEATURE SPOTLIGHT COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */
export function FeatureSpotlight() {
  return (
    <section className="py-24 sm:py-32 bg-[#FAF7F0] border-b border-[#E5E1D8]/60 relative z-10">
      <div className="max-w-[1140px] mx-auto px-6 space-y-28 sm:space-y-36 relative z-10">
        {spotlights.map((spot, i) => (
          <SpotlightRow key={i} spot={spot} />
        ))}
      </div>
    </section>
  );
}
