"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function FinalCTA() {
  return (
    <section className="relative py-32 sm:py-40 bg-[var(--color-bg-dark)] overflow-hidden">
      
      {/* Decorative gradient blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-bg-primary)] rounded-full blur-[120px] opacity-60 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-display font-semibold text-5xl sm:text-6xl text-text-primary mb-6"
        >
          Your next job is closer than you think.
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="text-xl text-text-secondary mb-12"
        >
          Start free. No credit card. Cancel anytime.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
        >
          <Link
            href="/signup"
            className="inline-flex h-14 px-8 items-center justify-center rounded-md bg-[var(--color-accent)] text-[var(--color-bg-dark)] text-[18px] font-bold hover:shadow-[0_0_0_6px_var(--color-accent-light)] hover:-translate-y-1 transition-all duration-300"
          >
            Start for free &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
