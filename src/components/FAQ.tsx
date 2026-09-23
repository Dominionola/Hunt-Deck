"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import { useGsapReveal } from "@/hooks/useGsapReveal";

const faqs = [
  {
    q: "How does the pricing work?",
    a: "Hunt Deck offers a free tier that lets you upload your resume and see matched jobs. Paid plans unlock tailored resume generation, cover letters, interview prep, and the application tracker. Cancel anytime — no lock-in.",
  },
  {
    q: "How does job matching actually work?",
    a: "We parse your resume to extract skills, experience, seniority, and role type. We then score live job listings against that profile using a combination of keyword relevance, semantic similarity, and role-level fit. You see a ranked list, not a firehose.",
  },
  {
    q: "Is my resume data private?",
    a: "Yes. Your resume is stored securely and is never shared with third parties or used to train AI models. You can delete your data at any time from your account settings.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. There are no long-term commitments. Cancel from your dashboard in seconds — your data is retained for 30 days after cancellation in case you change your mind.",
  },
  {
    q: "What job boards do you pull from?",
    a: "Hunt Deck aggregates from LinkedIn, Indeed, Glassdoor, Wellfound (AngelList), Lever, Greenhouse, and more. We're continuously adding new sources. Remote-friendly filters are applied across all boards.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  const headerRef = useGsapReveal<HTMLDivElement>({
    preset: "fade-up",
    single: true,
    duration: 0.65,
    start: "top 88%",
  });

  const listRef = useGsapReveal<HTMLDivElement>({
    preset: "stagger-grid",
    staggerSelector: ".faq-item",
    staggerAmount: 0.08,
    duration: 0.65,
    start: "top 85%",
  });

  return (
    <section id="faq" className="py-24 sm:py-32 bg-white border-b border-[#E5E1D8]/60">
      <div className="max-w-[760px] mx-auto px-6">
        <div ref={headerRef} className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2D5F8A] inline-block px-3 py-1 rounded-full bg-[#FAF7F0] border border-[#E5E1D8] mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-[#16213A] leading-[1.12] tracking-[-0.02em]">
            Common <span className="font-serif italic font-normal text-[#2D5F8A]">questions</span>
          </h2>
        </div>

        <div ref={listRef} className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className={`faq-item rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "border-[#2D5F8A]/40 bg-[#FAF7F0]/60 shadow-md shadow-[#16213A]/3"
                    : "border-[#E5E1D8] bg-[#FAF7F0]/30 hover:border-[#2D5F8A]/30 hover:bg-[#FAF7F0]/50"
                }`}
              >
                <button
                  id={`faq-${i}`}
                  className="w-full flex items-center justify-between gap-4 p-6 text-left group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-inset rounded-2xl"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className={`text-base sm:text-lg font-bold transition-colors ${
                    isOpen ? "text-[#2D5F8A]" : "text-[#16213A] group-hover:text-[#2D5F8A]"
                  }`}>
                    {faq.q}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-colors shadow-2xs ${
                      isOpen
                        ? "bg-[#16213A] text-white border-[#16213A]"
                        : "bg-white border-[#E5E1D8] text-[#16213A] group-hover:border-[#2D5F8A]/40"
                    }`}
                  >
                    <Plus size={14} weight="bold" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-1 text-sm sm:text-base text-[#5B6478] leading-relaxed border-t border-[#E5E1D8]/40 bg-white">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
