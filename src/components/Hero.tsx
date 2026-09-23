"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useReducedMotion, type MotionStyle } from "framer-motion";
import { Play } from "@phosphor-icons/react";
import { useHeroHeadlineReveal } from "@/hooks/useHeroHeadlineReveal";

const marqueeCards = [
  { src: "/assets/hero-related1.jpeg", alt: "Candidate reviewing opportunities" },
  { src: "/assets/hero3.jpeg", alt: "Professional using Hunt Deck" },
  { src: "/assets/hero-related2.jpeg", alt: "Career growth with Hunt Deck" },
  { src: "/assets/hero-related3.png", alt: "Team interview and offer stage" },
];

// Triple the cards for seamless infinite looping marquee
const doubleMarqueeCards = [...marqueeCards, ...marqueeCards, ...marqueeCards];

// ─────────────────────────────────────────────────────────────────────────────

export function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [marqueeActive, setMarqueeActive] = useState(false);
  const headlineRef = useHeroHeadlineReveal();
  const shouldReduceMotion = useReducedMotion();

  // scrollYProgress: 0 → section top at viewport top, 1 → section bottom at viewport bottom
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Track scroll position to trigger infinite marquee after cards are settled
  useEffect(() => {
    if (shouldReduceMotion) return;
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (latest >= 0.60) {
        setMarqueeActive(true);
      } else {
        setMarqueeActive(false);
      }
    });
    return () => unsubscribe();
  }, [scrollYProgress, shouldReduceMotion]);

  // ──────────────────────────────────────────────────────────────────────────
  // The dark overlay on the main hero image fades away as user scrolls
  // ──────────────────────────────────────────────────────────────────────────
  const overlayOpacity = useTransform(scrollYProgress, [0.06, 0.20], [1, 0]);

  // ──────────────────────────────────────────────────────────────────────────
  // IMAGE shrinks from full-screen → card using inset animation.
  // Final card: 32vw × 34vh, top at 56vh, centered horizontally at left: 34vw.
  // ──────────────────────────────────────────────────────────────────────────
  const imgTop    = useTransform(scrollYProgress, [0.16, 0.60], ["0vh",  "56vh"]);
  const imgLeft   = useTransform(scrollYProgress, [0.16, 0.60], ["0vw",  "34vw"]);
  const imgRight  = useTransform(scrollYProgress, [0.16, 0.60], ["0vw",  "34vw"]);
  const imgBottom = useTransform(scrollYProgress, [0.16, 0.60], ["0vh",  "10vh"]);
  const imgRadius = useTransform(scrollYProgress, [0.20, 0.60], [0, 16]);

  // White background fills in behind the image as it shrinks from edges
  const bgOpacity = useTransform(scrollYProgress, [0.16, 0.55], [0, 1]);

  // ──────────────────────────────────────────────────────────────────────────
  // UNIFIED TEXT TRANSITIONS
  // The text container shifts up and scales down slightly as the image shrinks
  // ──────────────────────────────────────────────────────────────────────────
  const textY     = useTransform(scrollYProgress, [0.12, 0.58], ["14vh", "-8vh"]);
  const textScale = useTransform(scrollYProgress, [0.12, 0.58], [1, 0.82]);

  // Headline and description colors transition from white to dark blue/slate
  const headingColor = useTransform(scrollYProgress, [0.12, 0.52], ["#ffffff", "#16213A"]);
  const textColor    = useTransform(scrollYProgress, [0.12, 0.52], ["rgba(255, 255, 255, 0.8)", "#5B6478"]);

  // Button 2 ("See how it works") style transforms
  const cta2Bg = useTransform(scrollYProgress, [0.12, 0.52], ["rgba(255, 255, 255, 0)", "#FAF7F0"]);
  const cta2Border = useTransform(scrollYProgress, [0.12, 0.52], ["rgba(255, 255, 255, 0.4)", "#E5E1D8"]);
  const cta2Text = useTransform(scrollYProgress, [0.12, 0.52], ["#ffffff", "#16213A"]);
  const playIconOpacity = useTransform(scrollYProgress, [0.35, 0.52], [0, 1]);
  const playIconWidth = useTransform(scrollYProgress, [0.35, 0.52], [0, 24]);

  // Side cards ONLY become visible during shrink phase (opacity 0 before 0.22)
  const sideOpacity   = useTransform(scrollYProgress, [0.22, 0.58], [0, 1]);

  // Review badge text color transform
  const badgeText = useTransform(scrollYProgress, [0.12, 0.52], ["rgba(255, 255, 255, 0.9)", "#5B6478"]);

  // ──────────────────────────────────────────────────────────────────────────
  // Side cards entrance slide (starting completely off-screen)
  // Card step = width (32vw) + gap (4vw) = 36vw
  // ──────────────────────────────────────────────────────────────────────────
  const g1X = useTransform(scrollYProgress, [0.25, 0.60], ["-36vw", "0vw"]);
  const g3X = useTransform(scrollYProgress, [0.25, 0.60], [" 36vw", "0vw"]);
  const g4X = useTransform(scrollYProgress, [0.30, 0.60], [" 72vw", "0vw"]);
  const g5X = useTransform(scrollYProgress, [0.35, 0.60], ["108vw", "0vw"]);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    // 300vh = scroll runway for full transition + filmstrip movement
    <div ref={sectionRef} style={{ height: "300vh" }}>

      {/* Sticky viewport — stays pinned while user scrolls 300vh */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">

        {/* [0] White background reveals as image shrinks from edges */}
        <motion.div
          style={{ opacity: bgOpacity }}
          className="absolute inset-0 z-0 bg-white pointer-events-none"
        />

        {/* ================================================================
            [1] SCROLL-IN CARDS (Visible only when marquee is NOT active)
            ================================================================ */}
        {!marqueeActive && (
          <>
            {/* Background Component for Center Card */}
            <motion.div
              style={{
                opacity:       sideOpacity,
                position:      "absolute",
                top:           "56vh",
                left:          "34vw",
                width:         "32vw",
                height:        "34vh",
                minWidth:      "260px",
                minHeight:     "180px",
                zIndex:        9,
                pointerEvents: "none",
              } as MotionStyle}
            >
              <div
                className="absolute rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] shadow-xs pointer-events-none"
                style={{
                  left: "-6%",
                  bottom: "-6%",
                  width: "100%",
                  height: "100%",
                }}
              />
            </motion.div>

            {/* Center Image Card — hero3.jpeg */}
            <motion.div
              style={{
                position:     "absolute",
                top:          imgTop,
                left:         imgLeft,
                right:        imgRight,
                bottom:       imgBottom,
                borderRadius: imgRadius,
                zIndex:       10,
                overflow:     "hidden",
              } as MotionStyle}
              className="border border-[#E5E1D8] shadow-md bg-[#FAF7F0]"
            >
              <Image
                src="/assets/hero3.jpeg"
                alt="Professional using Hunt Deck to land their next job"
                fill
                className="object-cover object-right-center"
                priority
              />

              {/* Phase 1 dark overlay (fades before shrink begins) */}
              <motion.div
                style={{ opacity: overlayOpacity }}
                className="absolute inset-0 bg-[#16213A]/32 pointer-events-none"
              />
            </motion.div>

            {/* Left-1 card (Card 1) */}
            <motion.div
              style={{
                opacity:      sideOpacity,
                x:            g1X,
                position:     "absolute",
                left:         "-2vw",
                top:          "56vh",
                width:        "32vw",
                height:       "34vh",
                minWidth:     "260px",
                minHeight:    "180px",
                zIndex:       10,
              } as MotionStyle}
              className="group"
            >
              <div
                className="absolute rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] shadow-xs pointer-events-none"
                style={{
                  left: "-6%",
                  bottom: "-6%",
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                }}
              />

              <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border border-[#E5E1D8] shadow-md bg-[#FAF7F0]">
                <Image src="/assets/hero-related1.jpeg" alt="Candidate reviewing opportunities" fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="32vw" />
              </div>
            </motion.div>

            {/* Right-1 card (Card 3) */}
            <motion.div
              style={{
                opacity:      sideOpacity,
                x:            g3X,
                position:     "absolute",
                left:         "70vw",
                top:          "56vh",
                width:        "32vw",
                height:       "34vh",
                minWidth:     "260px",
                minHeight:    "180px",
                zIndex:       10,
              } as MotionStyle}
              className="group"
            >
              <div
                className="absolute rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] shadow-xs pointer-events-none"
                style={{
                  left: "-6%",
                  bottom: "-6%",
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                }}
              />

              <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border border-[#E5E1D8] shadow-md bg-[#FAF7F0]">
                <Image src="/assets/hero-related2.jpeg" alt="Career growth with Hunt Deck" fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="32vw" />
              </div>
            </motion.div>

            {/* Right-2 card (Card 4) */}
            <motion.div
              style={{
                opacity:      sideOpacity,
                x:            g4X,
                position:     "absolute",
                left:         "106vw",
                top:          "56vh",
                width:        "32vw",
                height:       "34vh",
                minWidth:     "260px",
                minHeight:    "180px",
                zIndex:       10,
              } as MotionStyle}
              className="group"
            >
              <div
                className="absolute rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] shadow-xs pointer-events-none"
                style={{
                  left: "-6%",
                  bottom: "-6%",
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                }}
              />

              <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border border-[#E5E1D8] shadow-md bg-[#FAF7F0]">
                <Image src="/assets/hero-related3.png" alt="Team interview and offer stage" fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="32vw" />
              </div>
            </motion.div>

            {/* Right-3 card (Card 5) */}
            <motion.div
              style={{
                opacity:      sideOpacity,
                x:            g5X,
                position:     "absolute",
                left:         "142vw",
                top:          "56vh",
                width:        "32vw",
                height:       "34vh",
                minWidth:     "260px",
                minHeight:    "180px",
                zIndex:       10,
              } as MotionStyle}
              className="group"
            >
              <div
                className="absolute rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] shadow-xs pointer-events-none"
                style={{
                  left: "-6%",
                  bottom: "-6%",
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                }}
              />

              <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border border-[#E5E1D8] shadow-md bg-[#FAF7F0]">
                <Image src="/assets/hero-related1.jpeg" alt="Candidate reviewing opportunities" fill className="object-cover transition-transform duration-700 group-hover:scale-105" sizes="32vw" />
              </div>
            </motion.div>
          </>
        )}

        {/* ================================================================
            [2] INFINITE LOOPING MARQUEE (Visible only when marquee is active)
            Clean photo cards with subtle offset background cards & elegant spacing
            ================================================================ */}
        {marqueeActive && (
          <motion.div
            initial={{ x: "-144vw" }}
            animate={{ x: "0vw" }}
            transition={{
              repeat: Infinity,
              repeatType: "loop",
              duration: 45,
              ease: "linear",
            }}
            className="absolute top-[56vh] flex gap-[4vw] z-10 w-max"
            style={{ left: "-2vw" }}
          >
            {doubleMarqueeCards.map((card, idx) => (
              <div
                key={idx}
                style={{
                  width:        "32vw",
                  height:       "34vh",
                  minWidth:     "260px",
                  minHeight:    "180px",
                  position:     "relative",
                }}
                className="shrink-0 group"
              >
                {/* [Background Component] Attached behind each image, subtle offset (-6% left & -6% below) */}
                <div
                  className="absolute rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] shadow-xs pointer-events-none transition-transform duration-300 group-hover:scale-[1.01]"
                  style={{
                    left: "-6%",
                    bottom: "-6%",
                    width: "100%",
                    height: "100%",
                    zIndex: 1,
                  }}
                />

                {/* [Foreground Photo Card] */}
                <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border border-[#E5E1D8] shadow-md group-hover:shadow-lg transition-all duration-500 bg-[#FAF7F0]">
                  <Image
                    src={card.src}
                    alt={card.alt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="32vw"
                  />
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ================================================================
            [3] UNIFIED TEXT CONTAINER (sits ABOVE the image)
            Translates and scales dynamically. Color inverts on scroll.
            ================================================================ */}
        <motion.div
          style={{ 
            y: textY, 
            scale: textScale, 
            transformOrigin: "top center" 
          }}
          className="absolute top-0 left-0 right-0 z-30 flex flex-col items-center text-center px-6 pointer-events-none pt-[110px]"
        >
          {/* Headline — GSAP word-split reveal on mount */}
          <motion.h1
            ref={headlineRef}
            style={{ color: headingColor }}
            className="font-bold text-4xl sm:text-6xl lg:text-7xl leading-[1.08] tracking-[-0.025em] mb-5 max-w-3xl"
          >
            Land interviews,
            <br />
            <span className="font-serif italic font-normal">not rejection emails.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            style={{ color: textColor }}
            className="text-base sm:text-lg leading-relaxed mb-9 max-w-xl"
          >
            Hunt Deck matches you to jobs that fit, then builds everything
            you need to apply — tailored resume, cover letter, and interview
            prep — in minutes.
          </motion.p>

          {/* Single Component Unified CTAs (No Layout/Fade jumps) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pointer-events-auto">
            {/* Button 1: Start for free — Framer Motion micro-interaction */}
            <motion.div
              whileHover={{ scale: 1.035, y: -2 }}
              whileTap={{ scale: 0.965 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <Link
                href="/signup"
                className="h-11 px-7 flex items-center justify-center rounded-full bg-[#16213A] text-white text-sm font-semibold hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2 transition-colors duration-200 shadow-md"
              >
                Start for free
              </Link>
            </motion.div>

            {/* Button 2: See how it works — spring micro-interaction wraps the scroll-driven style wrapper */}
            <motion.div
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            >
              <motion.div
                style={{
                  backgroundColor: cta2Bg,
                  borderColor: cta2Border,
                  color: cta2Text,
                }}
                className="rounded-full border transition-all duration-200"
              >
                <Link
                  href="#how-it-works"
                  className="h-11 px-5 flex items-center text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2 rounded-full transition-all duration-200 text-inherit"
                >
                  <motion.span
                    style={{ opacity: playIconOpacity, width: playIconWidth }}
                    className="inline-flex items-center overflow-hidden shrink-0"
                  >
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#E5E1D8] shrink-0 mr-2">
                      <Play size={9} weight="fill" className="text-[#16213A] translate-x-[0.5px]" />
                    </span>
                  </motion.span>
                  See how it works
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Review badge below CTAs with overlapping circular headshots above the text */}
          <motion.div
            style={{
              color: badgeText,
            }}
            className="mt-8 flex flex-col items-center gap-2 pointer-events-auto"
          >
            <div className="flex -space-x-2.5">
              <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden relative shrink-0 shadow-xs">
                <img
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                  alt="User avatar 1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden relative shrink-0 shadow-xs">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="User avatar 2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden relative shrink-0 shadow-xs">
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80"
                  alt="User avatar 3"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <span className="font-serif italic font-normal text-lg sm:text-xl tracking-wide">
              Loved by 2,000+ job seekers
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
