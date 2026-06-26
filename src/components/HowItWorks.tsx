"use client";

import { motion } from "framer-motion";

export function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Upload your resume",
      desc: "Drop your existing resume. Hunt Deck reads it, extracts your skills, experience, and goals.",
      imgAlt: "Resume upload UI mockup",
    },
    {
      num: "02",
      title: "Discover matched jobs",
      desc: "We surface roles from across the web ranked by fit — no more scrolling job boards.",
      imgAlt: "Job match card UI mockup",
    },
    {
      num: "03",
      title: "Get your application pack",
      desc: "One click generates a tailored resume + cover letter for the specific job, optimised for ATS.",
      imgAlt: "Application pack generation UI mockup",
    },
    {
      num: "04",
      title: "Prep and track",
      desc: "Get role-specific interview questions. Track every application in your personal job dashboard.",
      imgAlt: "Interview prep and application tracker UI mockup",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16 sm:mb-24">
          <span className="font-sans font-medium text-[12px] tracking-[0.12em] uppercase text-[var(--color-accent)] mb-4 block">
            How it works
          </span>
          <h2 className="font-display font-semibold text-4xl sm:text-5xl text-white mb-6" style={{ textWrap: "balance" }}>
            From search to offer, without the chaos
          </h2>
          <p className="text-[18px] text-[#90A5B4] max-w-2xl mx-auto leading-[1.7]">
            Four steps. One place. No more switching between tabs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              className="flex flex-col"
            >
              {/* Step number — large, prominent */}
              <span className="font-display font-semibold text-[48px] leading-none text-[var(--color-accent)] mb-5 tracking-[-0.01em]">
                {step.num}
              </span>
              <h3 className="font-sans font-semibold text-[20px] text-white mb-3">
                {step.title}
              </h3>
              <p className="text-[16px] text-[#90A5B4] leading-[1.7] mb-8">
                {step.desc}
              </p>
              
              {/* Image placeholder — clean, ready to receive a screenshot */}
              <div className="mt-auto w-full aspect-[4/3] rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] relative overflow-hidden">
                {/* Clean gradient shimmer instead of pulsing block */}
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-primary)]" />
                {/* Subtle corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--color-accent)]/5 rounded-bl-[60px]" />
                <div className="absolute bottom-4 left-4 font-sans text-[11px] font-medium tracking-[0.1em] uppercase text-[#90A5B4]/50">
                  Step {step.num}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
