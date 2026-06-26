"use client";

import { motion } from "framer-motion";

export function Audience() {
  const segments = [
    {
      label: "Recent graduates",
      eyebrow: "Early career",
      desc: "Finding your first role is hard enough. Hunt Deck helps you compete against candidates with years more experience.",
      accentHue: "from-[#081E2B] to-[#0e2d42]",
    },
    {
      label: "Making a move",
      eyebrow: "Career switchers",
      desc: "Pivoting industries? We help you position your existing experience for a new role — without starting from scratch.",
      accentHue: "from-[#0a2030] to-[#081E2B]",
    },
    {
      label: "Going remote",
      eyebrow: "Remote-first",
      desc: "Searching across time zones and platforms is exhausting. Hunt Deck surfaces remote-friendly matches from everywhere.",
      accentHue: "from-[#0d2538] to-[#081E2B]",
    },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="font-display font-semibold text-4xl sm:text-5xl text-white mb-6" style={{ textWrap: "balance" }}>
            Built for every stage of the job search
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {segments.map((segment, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              className="group relative min-h-[360px] rounded-2xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-accent)]/30 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Photo background — clean gradient placeholder for real photo */}
              <div className={`absolute inset-0 bg-gradient-to-b ${segment.accentHue}`} />
              
              {/* Top accent bar */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-accent)]/30 to-transparent" />

              {/* Dark gradient overlay from bottom for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)]/90 via-[var(--color-bg-primary)]/40 to-transparent" />

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full justify-end p-8">
                <span className="font-sans font-medium text-[11px] tracking-[0.14em] uppercase text-[var(--color-accent)] mb-2 block">
                  {segment.eyebrow}
                </span>
                <h3 className="font-display font-semibold text-[22px] text-white mb-3">
                  {segment.label}
                </h3>
                <p className="text-[16px] text-[#90A5B4] leading-[1.65]">
                  {segment.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
