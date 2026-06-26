"use client";

import { motion } from "framer-motion";

export function Features() {
  const features = [
    {
      label: "Find the right roles",
      title: "Stop scrolling. Start matching.",
      desc: "We aggregate listings from across the web and rank them against your resume and preferences. No alerts you'll ignore — just jobs worth applying for.",
      imgAlt: "Job match card UI with relevance score badge",
    },
    {
      label: "Apply with confidence",
      title: "Your resume, rewritten for every role.",
      desc: "Hunt Deck rewrites key sections of your resume to match the job description — and writes the cover letter too. ATS-optimised, not generic.",
      imgAlt: "Split view showing original resume on left and tailored version on right with diff highlights",
    },
    {
      label: "Nail the interview",
      title: "Prep built around the actual job.",
      desc: "Once you apply, Hunt Deck generates likely interview questions based on the job description and your resume — behavioral, technical, and role-specific. Not generic Q&A.",
      imgAlt: "Mock interview prep card with question, answer structure, and gap flag",
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32 bg-[var(--color-bg-secondary)] border-y border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-20 sm:mb-28">
          <h2 className="font-display font-semibold text-4xl sm:text-5xl text-white mb-6" style={{ textWrap: "balance" }}>
            Everything you need. Nothing you don&apos;t.
          </h2>
        </div>

        <div className="space-y-28 sm:space-y-40">
          {features.map((feature, i) => {
            const isEven = i % 2 === 0;
            return (
              <div 
                key={i} 
                className={`flex flex-col gap-12 lg:gap-20 items-center ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"}`}
              >
                {/* Text Content */}
                <motion.div 
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="flex-1 w-full max-w-lg"
                >
                  <span className="font-sans font-medium text-[12px] tracking-[0.12em] uppercase text-[var(--color-accent)] mb-5 block">
                    {feature.label}
                  </span>
                  <h3 className="font-display font-semibold text-3xl sm:text-[38px] leading-[1.15] text-white mb-6" style={{ textWrap: "balance" }}>
                    {feature.title}
                  </h3>
                  <p className="text-[17px] text-[#90A5B4] leading-[1.75] max-w-[48ch]">
                    {feature.desc}
                  </p>
                </motion.div>

                {/* Image Placeholder — ready for UI screenshot */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.97 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                  className="flex-1 w-full"
                >
                  <div className="w-full aspect-[4/3] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] relative overflow-hidden shadow-2xl hover:-translate-y-2 hover:shadow-[0_24px_48px_rgba(0,0,0,0.5)] transition-all duration-300">
                    {/* Styled placeholder — not a spinning pulse */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[#0a2030]" />
                    {/* Accent line top */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)]/40 to-transparent" />
                    {/* Label */}
                    <div className="absolute bottom-5 left-5 font-sans text-[11px] font-medium tracking-[0.1em] uppercase text-[#90A5B4]/50">
                      {feature.label}
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
