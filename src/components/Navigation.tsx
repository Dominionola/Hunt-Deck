"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-[var(--color-bg-primary)]/90 backdrop-blur-md border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        {/* Left: Wordmark */}
        <div className="w-1/3">
          <Link href="/" className="text-2xl font-display font-bold text-white tracking-tight drop-shadow-md">
            Hunt Deck
          </Link>
        </div>

        {/* Center: Links (Pill-shaped glassmorphism) */}
        <div className="w-1/3 flex justify-center">
          <nav className="hidden md:flex items-center gap-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-2.5 shadow-lg">
            <Link href="#how-it-works" className="text-[14px] font-medium text-white/90 hover:text-white transition-colors">
              How it works
            </Link>
            <Link href="#features" className="text-[14px] font-medium text-white/90 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-[14px] font-medium text-white/90 hover:text-white transition-colors">
              Pricing
            </Link>
          </nav>
        </div>

        {/* Right: CTAs */}
        <div className="w-1/3 flex items-center justify-end gap-4">
          <Link href="/signin" className="hidden sm:block text-[15px] font-medium text-white/90 hover:text-white transition-colors drop-shadow-md">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="h-10 px-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg-dark)] text-[15px] font-semibold hover:shadow-[0_0_0_4px_var(--color-accent-light)] transition-all duration-200"
          >
            Start for free
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
