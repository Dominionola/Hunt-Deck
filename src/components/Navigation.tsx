"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { List, X } from "@phosphor-icons/react";

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium tracking-wide text-[#5B6478] hover:text-[#16213A] rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] transition-colors duration-200"
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
          className="md:hidden p-2 text-[#16213A] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
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
                className="text-base font-medium text-[#16213A] hover:text-[#2D5F8A] py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A]"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#E5E1D8] flex flex-col gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-[#5B6478] py-1"
                onClick={() => setMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="h-10 flex items-center justify-center rounded-full bg-[#16213A] text-white text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2"
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
