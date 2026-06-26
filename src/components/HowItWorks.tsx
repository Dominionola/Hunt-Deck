"use client";

import { motion } from "framer-motion";

export function HowItWorks() {
  const steps = [
    {
      num: "1",
      title: "Upload your resume",
      desc: "Drop your existing resume. Hunt Deck reads it, extracts your skills, experience, and goals.",
    },
    {
      num: "2",
      title: "Discover matched jobs",
      desc: "We surface roles from across the web ranked by fit — no more scrolling job boards.",
    },
    {
      num: "3",
      title: "Get your application pack",
      desc: "One click generates a tailored resume + cover letter for the specific job, optimised for ATS.",
    },
    {
      num: "4",
      title: "Prep and track",
      desc: "Get role-specific interview questions. Track every application in your personal job dashboard.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="text-center mb-16 sm:mb-24">
          <span className="font-sans font-medium text-[12px] tracking-[0.12em] uppercase text-text-secondary mb-4 block">
            How it works
          </span>
          <h2 className="font-display font-semibold text-4xl sm:text-5xl text-text-primary mb-6">
            From search to offer, without the chaos
          </h2>
          <p className="text-[18px] text-text-secondary max-w-2xl mx-auto">
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
              <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center font-display font-bold text-xl text-text-primary mb-6">
                {step.num}
              </div>
              <h3 className="font-sans font-semibold text-[22px] text-text-primary mb-3">
                {step.title}
              </h3>
              <p className="text-text-secondary leading-[1.6] mb-8">
                {step.desc}
              </p>
              
              {/* Visual UI Placeholder as per instructions */}
              <div className="mt-auto w-full aspect-[4/3] rounded-lg bg-surface border border-border relative overflow-hidden group">
                <div className="absolute inset-0 bg-slate-800/40 animate-pulse group-hover:bg-slate-800/20 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-sm font-medium">
                  [ UI Mockup: Step {step.num} ]
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
