"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { useGsapReveal } from "@/hooks/useGsapReveal";

export function FinalCTA() {
  const shouldReduceMotion = useReducedMotion();
  const contentRef = useGsapReveal<HTMLDivElement>({
    preset: "stagger-grid",
    staggerSelector: ".cta-stagger",
    staggerAmount: 0.1,
    duration: 0.7,
    start: "top 85%",
  });

  return (
    <section className="relative py-32 sm:py-44 overflow-hidden border-t border-[#E5E1D8]/60">
      {/* Background photo with clean placeholder support */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/cta-meadow.jpg"
          alt="Lush wildflower meadow under an open sky"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      <div ref={contentRef} className="relative z-10 max-w-[760px] mx-6 sm:mx-auto px-6 py-10 sm:px-10 sm:py-12 text-center rounded-3xl border border-white/70 bg-white/60 backdrop-blur-md">
        <div className="cta-stagger inline-block mb-6">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2D5F8A] inline-block px-3.5 py-1.5 rounded-full bg-[#FAF7F0] border border-[#E5E1D8]">
            Start your search today
          </span>
        </div>

        <h2
          className="cta-stagger text-4xl sm:text-6xl font-bold text-[#16213A] leading-[1.08] tracking-[-0.025em] mb-6"
          style={{ textWrap: "balance" }}
        >
          Your next job is{" "}
          <span className="font-serif italic font-normal text-[#2D5F8A]">
            closer than you think.
          </span>
        </h2>

        <p className="cta-stagger text-base sm:text-lg text-[#5B6478] max-w-lg mx-auto mb-10 leading-relaxed">
          Start free. No credit card required. Cancel anytime.
        </p>

        <div className="cta-stagger flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.div
            whileHover={shouldReduceMotion ? undefined : { scale: 1.04, y: -2 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Link
              href="/signup"
              className="inline-flex h-13 px-9 items-center justify-center rounded-full bg-[#16213A] text-white text-base font-bold shadow-md gap-2 group hover:bg-[#0D1527] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2 transition-colors duration-200"
            >
              <span>Start for free</span>
              <ArrowRight size={16} weight="bold" className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
