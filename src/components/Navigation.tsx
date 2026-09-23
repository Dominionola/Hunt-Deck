"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { List, X } from "@phosphor-icons/react";

export function Navigation() {
  const [phase, setPhase] = useState<"photo" | "light">("photo");
  const [menuOpen, setMenuOpen] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let isMouseAtTop = false;
    let rafId: number | null = null;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Stay in "photo" phase for first ~30% of viewport height
      const threshold = window.innerHeight * 0.28;
      setPhase(currentScrollY > threshold ? "light" : "photo");

      // Hide navbar when scrolling down, show at top of page or on hover
      if (currentScrollY <= 10) {
        setVisible(true);
      } else if (!isMouseAtTop) {
        setVisible(false);
      }

      lastScrollY = currentScrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (e.clientY < 68) {
          isMouseAtTop = true;
          setVisible(true);
        } else {
          isMouseAtTop = false;
          if (window.scrollY > 10) {
            setVisible(false);
          }
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const isPhoto = phase === "photo";

  const navLinks = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: visible ? 0 : -80, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-400 ${
        isPhoto
          ? "bg-transparent"
          : "bg-white/95 backdrop-blur-md border-b border-[#E5E1D8] shadow-sm"
      }`}
    >
      <div className="max-w-[1100px] mx-auto px-6 h-[68px] flex items-center justify-between">

        {/* Left: Wordmark */}
        <Link
          href="/"
          className={`text-lg font-bold tracking-tight rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] transition-colors duration-300 ${
            isPhoto ? "text-white" : "text-[#16213A]"
          }`}
        >
          Hunt Deck
        </Link>

        {/* Center: Nav links */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`text-sm font-medium tracking-wide rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] transition-colors duration-200 ${
                isPhoto
                  ? "text-white/85 hover:text-white"
                  : "text-[#5B6478] hover:text-[#16213A]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/signin"
            className={`text-sm font-medium px-3 py-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] transition-colors duration-200 ${
              isPhoto
                ? "text-white/85 hover:text-white"
                : "text-[#5B6478] hover:text-[#16213A]"
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={`h-9 px-5 flex items-center justify-center rounded-full text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2 transition-all duration-200 ${
              isPhoto
                ? "bg-white text-[#16213A] hover:bg-white/90"
                : "bg-[#16213A] text-white hover:bg-[#2D5F8A]"
            }`}
          >
            Get started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`md:hidden p-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] transition-colors ${
            isPhoto ? "text-white" : "text-[#16213A]"
          }`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-b border-[#E5E1D8] px-6 py-5 flex flex-col gap-4 shadow-xl"
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
            <Link href="/signin" className="text-sm font-medium text-[#5B6478] py-1">Sign in</Link>
            <Link
              href="/signup"
              className="h-10 flex items-center justify-center rounded-full bg-[#16213A] text-white text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2"
            >
              Get started
            </Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
