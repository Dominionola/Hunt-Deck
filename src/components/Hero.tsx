"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, Variants } from "framer-motion";

export function Hero() {
  const headlineText = "Land interviews, not rejection emails.";
  const words = headlineText.split(" ");

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-32 pb-20 overflow-hidden">
      {/* Background Image / Placeholder - Full Bleed */}
      <div className="absolute inset-0 z-0">
        {/* Visual Placeholder for images/illustrations */}
        <div className="absolute inset-0 bg-slate-800/50 animate-pulse lg:hidden" />
        <Image
          src="/assets/hero3.jpeg"
          alt="Professional using Hunt Deck on their phone"
          fill
          className="object-cover object-[center_10%]"
          priority
        />
      </div>

      {/* Content Container - Centered */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 w-full text-center">
        <div className="flex flex-col items-center">
          <motion.h1
            className="font-display font-bold text-5xl sm:text-6xl lg:text-[80px] leading-[1.1] tracking-[-0.02em] text-white mb-6 drop-shadow-lg"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {words.map((word, i) => (
              <motion.span key={i} variants={wordVariants} className="inline-block mr-3">
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="text-[18px] sm:text-[20px] leading-[1.6] text-white/90 mb-10 max-w-2xl mx-auto drop-shadow-md"
          >
            Hunt Deck matches you to jobs that fit, then builds everything you need to apply — tailored resume, cover letter, and interview prep — in minutes.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-8"
          >
            <Link
              href="/signup"
              className="h-12 px-8 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg-dark)] text-[16px] font-semibold hover:shadow-[0_0_0_4px_var(--color-accent-light)] transition-all duration-200"
            >
              Start for free &rarr;
            </Link>
            <Link
              href="#how-it-works"
              className="h-12 px-6 flex items-center justify-center text-[16px] font-medium text-white hover:text-white/80 transition-colors relative group"
            >
              <span className="relative drop-shadow-md">
                See how it works
                <span className="absolute -bottom-1 left-0 w-full h-[1px] bg-white/50 group-hover:bg-white transition-colors" />
              </span>
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex items-center justify-center gap-3 text-sm text-white/80 font-medium mt-4"
          >
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-slate-700 border border-white/20" />
              <div className="w-6 h-6 rounded-full bg-slate-600 border border-white/20" />
              <div className="w-6 h-6 rounded-full bg-slate-500 border border-white/20" />
            </div>
            <span className="drop-shadow-md">Trusted by 2,000+ job seekers &middot; No credit card required</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
