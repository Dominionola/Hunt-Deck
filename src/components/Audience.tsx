"use client";

import Image from "next/image";
import { useGsapReveal } from "@/hooks/useGsapReveal";

const segments = [
  {
    eyebrow: "Early career",
    label: "Starting out or just graduated.",
    desc: "We help you apply competitively without years of experience — surface the right roles, nail the application.",
    image: "/assets/Gradute.jpeg",
    imageAlt: "Graduate stepping into early career",
  },
  {
    eyebrow: "Career switchers",
    label: "Moving industries or roles.",
    desc: "We reframe your existing experience for the jobs you actually want. Your skills travel — we help you show it.",
    image: "/assets/Industry.jpeg",
    imageAlt: "Professional pivoting to a new industry",
  },
  {
    eyebrow: "Remote-first seekers",
    label: "Targeting distributed teams globally.",
    desc: "We surface remote-friendly roles that match your profile, cutting through the noise across every platform.",
    image: "/assets/Remote.jpeg",
    imageAlt: "Remote specialist working for global companies",
  },
];

export function Audience() {
  const gridRef = useGsapReveal<HTMLDivElement>({
    preset: "stagger-grid",
    staggerSelector: ".audience-card",
    staggerAmount: 0.12,
    duration: 0.7,
    start: "top 85%",
  });

  return (
    <section className="py-24 sm:py-28 bg-white border-b border-[#E5E1D8]/60 relative z-10">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2D5F8A] inline-block px-3 py-1 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] mb-4">
            Who this is for
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-[#16213A] leading-[1.12] tracking-[-0.02em]" style={{ textWrap: "balance" }}>
            Built for <span className="font-serif italic font-normal text-[#2D5F8A]">every stage</span> of the search
          </h2>
        </div>

        <div ref={gridRef} className="grid md:grid-cols-3 gap-6">
          {segments.map((seg, i) => (
            <div
              key={i}
              className="audience-card group relative h-[440px] rounded-2xl border border-[#E5E1D8] bg-[#16213A] overflow-hidden shadow-xs hover:border-[#2D5F8A]/50 hover:shadow-2xl hover:shadow-[#16213A]/15 hover:-translate-y-1.5 transition-all duration-500 flex flex-col justify-end"
            >
              {/* Full Card Photo with Zoom */}
              <Image
                src={seg.image}
                alt={seg.imageAlt}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 360px"
              />

              {/* Dynamic Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#16213A]/95 via-[#16213A]/40 to-black/10 transition-colors duration-500 group-hover:from-[#16213A]/98 group-hover:via-[#16213A]/60" />

              {/* Bottom Content Area */}
              <div className="relative z-10 p-6 sm:p-7 flex flex-col justify-end">
                {/* Always Visible Eyebrow & Title */}
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7ECEF4] block mb-2">
                  {seg.eyebrow}
                </span>
                <h3 className="text-xl font-bold text-white leading-snug tracking-tight">
                  {seg.label}
                </h3>

                {/* Collapsible Write-up with Smooth Deceleration on Hover */}
                <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grid-rows-[1fr] group-hover:opacity-100 group-hover:mt-3">
                  <div className="overflow-hidden">
                    <div className="transform translate-y-3 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100 space-y-4">
                      <p className="text-sm text-white/85 leading-relaxed pt-1">
                        {seg.desc}
                      </p>
                      <div className="pt-3 border-t border-white/15 flex items-center text-xs font-semibold text-white group-hover:text-[#7ECEF4] transition-colors">
                        <span>Tailored workflows</span>
                        <span className="ml-1.5 transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
