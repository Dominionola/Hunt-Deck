"use client";

import { motion } from "framer-motion";

export function Features() {
  const features = [
    {
      label: "Find the right roles",
      title: "Stop scrolling. Start matching.",
      desc: "We aggregate listings from across the web and rank them against your resume and preferences. No alerts you'll ignore — just jobs worth applying for.",
      placeholder: "[ UI Mockup: Job Match Card ]",
    },
    {
      label: "Apply with confidence",
      title: "Your resume, rewritten for every role.",
      desc: "Hunt Deck rewrites key sections of your resume to match the job description — and writes the cover letter too. ATS-optimised, not generic.",
      placeholder: "[ Split View: Original vs Tailored Resume ]",
    },
    {
      label: "Nail the interview",
      title: "Prep built around the actual job.",
      desc: "Once you apply, Hunt Deck generates likely interview questions based on the job description and your resume — behavioral, technical, and role-specific. Not generic Q&A.",
      placeholder: "[ Mock Prep Card with Gap Flag ]",
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32 bg-[var(--color-bg-secondary)] border-y border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-20 sm:mb-28">
          <h2 className="font-display font-semibold text-4xl sm:text-5xl text-text-primary mb-6">
            Everything you need. Nothing you don&apos;t.
          </h2>
        </div>

        <div className="space-y-32">
          {features.map((feature, i) => {
            const isEven = i % 2 === 0;
            return (
              <div 
                key={i} 
                className={`flex flex-col gap-12 lg:gap-24 items-center ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}
              >
                {/* Text Content */}
                <motion.div 
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="flex-1 w-full"
                >
                  <span className="font-sans font-medium text-[12px] tracking-[0.12em] uppercase text-accent mb-4 block">
                    {feature.label}
                  </span>
                  <h3 className="font-display font-semibold text-3xl sm:text-[40px] leading-[1.1] text-text-primary mb-6">
                    {feature.title}
                  </h3>
                  <p className="text-[18px] text-text-secondary leading-[1.75] max-w-lg">
                    {feature.desc}
                  </p>
                </motion.div>

                {/* Visual Content Placeholder */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                  className="flex-1 w-full"
                >
                  <div className="w-full aspect-[4/3] sm:aspect-square lg:aspect-[4/3] rounded-xl bg-surface border border-border relative overflow-hidden shadow-2xl flex items-center justify-center group hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-300">
                    <div className="absolute inset-0 bg-slate-800/30 animate-pulse group-hover:bg-slate-800/10 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-base font-medium">
                      {feature.placeholder}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
