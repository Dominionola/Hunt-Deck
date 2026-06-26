"use client";

import { motion } from "framer-motion";

export function Audience() {
  const segments = [
    {
      label: "Recent graduates",
      desc: "Finding your first role is hard enough. Hunt Deck helps you compete against candidates with years more experience.",
    },
    {
      label: "Making a move",
      desc: "Pivoting industries? We help you position your existing experience for a new role — without starting from scratch.",
    },
    {
      label: "Going remote",
      desc: "Searching across time zones and platforms is exhausting. Hunt Deck surfaces remote-friendly matches from everywhere.",
    },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16 sm:mb-20">
          <h2 className="font-display font-semibold text-4xl sm:text-5xl text-text-primary mb-6">
            Built for every stage of the job search
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
          {segments.map((segment, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              className="group relative"
            >
              {/* Photo Background Placeholder for Gradient-style photo grid */}
              <div className="absolute inset-0 rounded-2xl bg-surface border border-border overflow-hidden">
                <div className="absolute inset-0 bg-slate-800/20 animate-pulse group-hover:bg-slate-800/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center text-text-secondary/50 text-sm font-medium z-0">
                  [ Image: {segment.label} ]
                </div>
                {/* Dark overlay to ensure text readability if a real image is added */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)] via-[var(--color-bg-primary)]/80 to-transparent" />
              </div>

              {/* Content on top */}
              <div className="relative z-10 flex flex-col h-full justify-end p-8 min-h-[320px]">
                <span className="font-sans font-medium text-[11px] tracking-[0.12em] uppercase text-accent mb-3 block">
                  {segment.label}
                </span>
                <p className="text-text-secondary leading-[1.6]">
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
