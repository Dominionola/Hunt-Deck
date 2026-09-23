"use client";

import Link from "next/link";
import { useGsapReveal } from "@/hooks/useGsapReveal";

const links = {
  Product: [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
  ],
  Resources: [
    { label: "Resume guide", href: "/guides/resume" },
    { label: "Interview tips", href: "/guides/interview" },
    { label: "Job search playbook", href: "/guides/job-search" },
  ],
  Connect: [
    { label: "Twitter / X", href: "https://twitter.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Contact", href: "/contact" },
  ],
};

export function Footer() {
  const footerRef = useGsapReveal<HTMLElement>({
    preset: "fade-up",
    single: true,
    duration: 0.6,
    start: "top 92%",
  });

  return (
    <footer ref={footerRef} className="bg-[#0F1117] pt-20 pb-12 text-white border-t border-white/10">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <Link
              href="/"
              className="block text-[56px] sm:text-[80px] font-bold tracking-tight text-white leading-none hover:text-white/80 transition-colors"
            >
              HUNT DECK
            </Link>
            <p className="text-[15px] text-white/60 mt-3 max-w-sm">
              Smarter job matching, tailored application packs, and role-specific interview prep.
            </p>
          </div>
          <div className="text-right">
            <span className="text-[12px] font-mono text-white/40 block">VERSION 2.0</span>
            <span className="text-[13px] font-serif italic text-white/80">From search to offer</span>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16 border-t border-white/10 pt-12">
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/40 mb-4">
                {category}
              </p>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-[14px] text-white/60 hover:text-white transition-colors font-medium"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-white/40">
            &copy; {new Date().getFullYear()} Hunt Deck. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-[13px] text-white/40 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-[13px] text-white/40 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
