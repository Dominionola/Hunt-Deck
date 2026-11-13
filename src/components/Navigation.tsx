"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { List, X } from "@phosphor-icons/react";
import { RiArrowDownSLine } from "@remixicon/react";
import { Dropdown, DropdownPopover, DropdownTrigger } from "@/components/base/dropdown/dropdown";
import { cx } from "@/utils/cx";

const features = [
  { label: "Resume Tailor", description: "Adapt your resume for each role.", href: "#resume-tailor" },
  { label: "Role Matching", description: "Find roles suited to your background.", href: "#role-matching" },
  { label: "Interview Prep", description: "Prepare for your next conversation.", href: "#interview-prep" },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, [menuOpen]);

  const navLinks = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out ${
        scrolled
          ? "bg-white/75 backdrop-blur-lg border-b border-[#E5E1D8]/60 shadow-none"
          : "bg-white/85 backdrop-blur-md border-b border-[#E5E1D8]/60 shadow-none"
      }`}
    >
      <div className="max-w-[1100px] mx-auto px-6 h-[68px] flex items-center justify-between">
        {/* Left: Wordmark */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[#16213A] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] transition-colors"
        >
          Hunt Deck
        </Link>

        {/* Center: Nav links */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => link.label === "Features" ? (
            <Dropdown key={link.label} isOpen={featuresOpen} onOpenChange={setFeaturesOpen}>
              <DropdownTrigger className="flex min-h-11 items-center gap-1 rounded-md px-2 text-body-medium text-text-secondary transition-colors hover:text-text-primary active:scale-[0.98]">
                Features <RiArrowDownSLine aria-hidden="true" className={cx("size-4 transition-transform motion-reduce:transition-none", featuresOpen && "rotate-180")} />
              </DropdownTrigger>
              <DropdownPopover aria-label="Explore features" className="w-80" offset={8}>
                {features.map((feature) => (
                  <Link key={feature.href} href={feature.href} onClick={() => setFeaturesOpen(false)} className="flex min-h-11 flex-col gap-1 rounded-xl px-3 py-3 text-start outline-none transition-colors hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring">
                    <span className="text-body-medium text-text-primary">{feature.label}</span>
                    <span className="text-body-2-regular text-text-secondary">{feature.description}</span>
                  </Link>
                ))}
              </DropdownPopover>
            </Dropdown>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              className="flex min-h-11 items-center rounded-md px-2 text-body-medium text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[#5B6478] hover:text-[#16213A] px-3 py-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] transition-colors duration-200"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="h-9 px-5 flex items-center justify-center rounded-full text-sm font-semibold bg-[#16213A] text-white hover:bg-[#2D5F8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2 transition-all duration-200 shadow-xs"
          >
            Get started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex size-11 items-center justify-center text-text-primary rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring transition-colors active:scale-[0.98]"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: "easeOut" }}
            className="md:hidden overflow-hidden bg-white border-b border-[#E5E1D8] px-6 py-5 flex flex-col gap-4 shadow-xl"
          >
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex min-h-11 items-center text-body-medium text-text-primary hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#E5E1D8] flex flex-col gap-3">
              <Link
                href="/login"
                className="flex min-h-11 items-center text-body-medium text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="min-h-11 flex items-center justify-center rounded-full bg-accent-900 text-text-white text-body-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring focus-visible:ring-offset-2"
                onClick={() => setMenuOpen(false)}
              >
                Get started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
