"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "@phosphor-icons/react";
import { useGsapReveal } from "@/hooks/useGsapReveal";

export function FinalCTA() {
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
          className="object-cover object-center transition-transform duration-1000 ease-out hover:scale-105"
          sizes="100vw"
        />
        {/* Layered overlay: preserves the vibrant oil-painting colors while ensuring AAA text legibility */}
        <div className="absolute inset-0 bg-[#16213A]/45 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16213A]/60 via-transparent to-[#0F1117]" />
      </div>

      <div ref={contentRef} className="relative z-10 max-w-[760px] mx-auto px-6 text-center">
        <div className="cta-stagger inline-block mb-6">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-white/90 inline-block px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20">
            Start your search today
          </span>
        </div>

        <h2
          className="cta-stagger text-4xl sm:text-6xl font-bold text-white leading-[1.08] tracking-[-0.025em] mb-6"
          style={{ textWrap: "balance" }}
        >
          Your next job is{" "}
          <span className="font-serif italic font-normal text-white">
            closer than you think.
          </span>
        </h2>

        <p className="cta-stagger text-base sm:text-lg text-white/80 max-w-lg mx-auto mb-10 leading-relaxed">
          Start free. No credit card required. Cancel anytime.
        </p>

        <div className="cta-stagger flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Link
              href="/signup"
              className="inline-flex h-13 px-9 items-center justify-center rounded-full bg-white text-[#16213A] text-base font-bold shadow-xl shadow-black/20 gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#16213A]"
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
