"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Star, CheckCircle } from "@phosphor-icons/react";
import { useGsapReveal } from "@/hooks/useGsapReveal";

const testimonials = [
  {
    name: "Tobi A.",
    role: "Software Engineer",
    location: "Abuja",
    initial: "T",
    quote:
      "Hunt Deck tailored my resume perfectly for a Senior Frontend role. I got the interview the next day. It completely removed the anxiety of rewriting my CV.",
    highlight: false,
    outcome: "Landed Senior Frontend Role",
  },
  {
    name: "Sarah M.",
    role: "Product Manager",
    location: "London",
    initial: "S",
    quote:
      "The interview prep is uncanny. It asked me three behavioral questions that actually came up word-for-word in my final round. Worth every penny.",
    highlight: true,
    outcome: "3 Callbacks in 1 Week",
  },
  {
    name: "David K.",
    role: "Marketing Director",
    location: "Remote",
    initial: "D",
    quote:
      "I was pivoting industries and struggling to position myself. The tailored cover letters bridged the gap flawlessly. Saved me 15+ hours of manual labor.",
    highlight: false,
    outcome: "Successfully Switched Industries",
  },
];

export function Testimonials() {
  const shouldReduceMotion = useReducedMotion();
  const gridRef = useGsapReveal<HTMLDivElement>({
    preset: "stagger-grid",
    staggerSelector: ".testimonial-card",
    staggerAmount: 0.1,
    duration: 0.68,
    start: "top 87%",
  });

  return (
    <section className="py-24 sm:py-32 bg-white border-b border-[#E5E1D8]/60">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2D5F8A] inline-block px-3 py-1 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] mb-4">
            Testimonials
          </span>
          <h2
            className="text-3xl sm:text-5xl font-bold text-[#16213A] leading-[1.12] tracking-[-0.02em]"
            style={{ textWrap: "balance" }}
          >
            Real job seekers. <span className="font-serif italic font-normal text-[#2D5F8A]">Real results.</span>
          </h2>
        </div>

        <div ref={gridRef} className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className={`testimonial-card p-8 rounded-2xl border flex flex-col justify-between cursor-pointer ${
                t.highlight
                  ? "bg-[#16213A] border-[#16213A] text-white shadow-xl shadow-[#16213A]/15"
                  : "bg-[#FAF7F0] border-[#E5E1D8]"
              }`}
              whileHover={shouldReduceMotion ? undefined : {
                y: -6,
                boxShadow: t.highlight
                  ? "0 20px 48px -8px rgba(22,33,58,0.30)"
                  : "0 16px 40px -8px rgba(22,33,58,0.10), 0 0 0 1px rgba(45,95,138,0.25)",
              }}
              transition={{ type: "spring", stiffness: 340, damping: 24 }}
            >
              <div>
                {/* Outcome tag & Rating */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, si) => (
                      <Star
                        key={si}
                        weight="fill"
                        size={15}
                        className={t.highlight ? "text-amber-400" : "text-amber-500"}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    t.highlight ? "bg-white/15 text-white border border-white/20" : "bg-white text-[#2D5F8A] border border-[#E5E1D8]"
                  }`}>
                    <CheckCircle size={12} weight="fill" />
                    {t.outcome}
                  </span>
                </div>

                {/* Quote */}
                <p
                  className={`text-base leading-relaxed mb-8 font-normal ${
                    t.highlight ? "text-white/90" : "text-[#16213A]"
                  }`}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3.5 pt-4 border-t border-current/10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    t.highlight
                      ? "bg-white/15 text-white border border-white/20"
                      : "bg-white text-[#16213A] border border-[#E5E1D8]"
                  }`}
                >
                  {t.initial}
                </div>
                <div>
                  <p
                    className={`font-bold text-sm ${
                      t.highlight ? "text-white" : "text-[#16213A]"
                    }`}
                  >
                    {t.name}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      t.highlight ? "text-white/65" : "text-[#5B6478]"
                    }`}
                  >
                    {t.role} &middot; {t.location}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
