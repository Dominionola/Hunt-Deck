"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useReducedMotion,
  type MotionValue,
  type Variants,
} from "framer-motion";
import { Play } from "@phosphor-icons/react";

const wordRevealVariants: Variants = {
  hidden: { y: "110%", opacity: 0 },
  visible: (i: number) => ({
    y: "0%",
    opacity: 1,
    transition: {
      duration: 0.72,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.08 + i * 0.055,
    },
  }),
};

const TRACK_SCROLL_SPEED = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Side cards follow the clamped card width plus a viewport-relative gap.
// Center Hero Card is at k = 0 (hero3.jpeg)
// Sequence seamlessly cycles through the 4 imagery themes:
// ... → hero-related1 → hero3 → hero-related2 → hero-related3 → ...
// ─────────────────────────────────────────────────────────────────────────────
interface SideCardDef {
  key: string;
  k: number;
  src: string;
  alt: string;
}

const SIDE_CARDS: SideCardDef[] = [
  // Left cards glide in from the left wing.
  { key: "card-m3", k: -3, src: "/assets/hero-related3.png", alt: "Team interview and offer stage" },
  { key: "card-m2", k: -2, src: "/assets/hero-related2.jpeg", alt: "Career growth with Hunt Deck" },
  { key: "card-m1", k: -1, src: "/assets/hero-related1.jpeg", alt: "Candidate reviewing opportunities" },
  // k: 0 is the Center Hero Card (hero3.jpeg), which shrinks from full-bleed
  // Right cards glide in from the right wing.
  { key: "card-p1", k: 1, src: "/assets/hero-related2.jpeg", alt: "Career growth with Hunt Deck" },
  { key: "card-p2", k: 2, src: "/assets/hero-related3.png", alt: "Team interview and offer stage" },
  { key: "card-p3", k: 3, src: "/assets/hero-related1.jpeg", alt: "Candidate reviewing opportunities" },
  { key: "card-p4", k: 4, src: "/assets/hero3.jpeg", alt: "Professional using Hunt Deck to land their next job" },
  { key: "card-p5", k: 5, src: "/assets/hero-related2.jpeg", alt: "Career growth with Hunt Deck" },
  { key: "card-p6", k: 6, src: "/assets/hero-related3.png", alt: "Team interview and offer stage" },
  { key: "card-p7", k: 7, src: "/assets/hero-related1.jpeg", alt: "Candidate reviewing opportunities" },
  { key: "card-p8", k: 8, src: "/assets/hero3.jpeg", alt: "Professional using Hunt Deck to land their next job" },
  { key: "card-p9", k: 9, src: "/assets/hero-related2.jpeg", alt: "Career growth with Hunt Deck" },
  { key: "card-p10", k: 10, src: "/assets/hero-related3.png", alt: "Team interview and offer stage" },
];

function HeroSideCard({
  k,
  src,
  alt,
  scrollYProgress,
  trackProgress,
  sideOpacity,
}: {
  k: number;
  src: string;
  alt: string;
  scrollYProgress: MotionValue<number>;
  trackProgress: MotionValue<number>;
  sideOpacity: MotionValue<number>;
}) {
  const enterOffset = k < 0 ? -20 : 20;
  const entrance = useTransform(scrollYProgress, [0.02, 0.28], [enterOffset, 0]);
  const x = useTransform(() => {
    const roll = Math.max(trackProgress.get() - 0.38, 0) * TRACK_SCROLL_SPEED;
    const distance = Math.abs(k);
    const direction = k < 0 ? "-" : "+";
    return `calc(-50% ${direction} clamp(${distance * 312}px, ${distance * 38.4}vw, ${distance * 552}px) + ${k * 3.6 + entrance.get() - roll}vw)`;
  });

  return (
    <motion.div
      style={{
        opacity: sideOpacity,
        x,
        position: "absolute",
        left: "50%",
        top: "51vh",
        width: "38.4vw",
        height: "40.8vh",
        minWidth: "312px",
        maxWidth: "552px",
        minHeight: "216px",
        maxHeight: "384px",
        zIndex: 10,
        pointerEvents: "none",
      }}
      className="group"
    >
      {/* Attached Cream Elevation Backing */}
      <div
        className="absolute rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] shadow-xs pointer-events-none"
        style={{
          left: "-5%",
          bottom: "-5%",
          width: "100%",
          height: "100%",
          zIndex: 1,
        }}
      />
      {/* Photo Card */}
      <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border border-[#E5E1D8] shadow-md bg-[#FAF7F0]">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 70vw, 40vw"
        />
      </div>
    </motion.div>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const rawScrollProgress = useMotionValue(0);
  const rawTrackProgress = useMotionValue(0);
  const smoothScrollProgress = useSpring(rawScrollProgress, { stiffness: 180, damping: 30, mass: 0.6 });
  const smoothTrackProgress = useSpring(rawTrackProgress, { stiffness: 180, damping: 30, mass: 0.6 });
  const scrollYProgress = shouldReduceMotion ? rawScrollProgress : smoothScrollProgress;
  const trackProgress = shouldReduceMotion ? rawTrackProgress : smoothTrackProgress;

  useEffect(() => {
    const handleScroll = () => {
      const el = sectionRef.current;
      if (!el) return;

      const totalScrollable = el.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentScroll = -el.getBoundingClientRect().top;
      const track = Math.max(currentScroll / totalScrollable, 0);
      const progress = Math.min(track, 1);
      rawScrollProgress.set(shouldReduceMotion ? 0.35 : progress);
      rawTrackProgress.set(shouldReduceMotion ? 0.35 : track);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [rawScrollProgress, rawTrackProgress, shouldReduceMotion]);

  // ──────────────────────────────────────────────────────────────────────────
  // PHASE 1: Hero Shrink & Canvas Reveal (0.00 → 0.35)
  // Hero photo shrinks down from full bleed into center card position (+20% size).
  // ──────────────────────────────────────────────────────────────────────────
  const bgOpacity = useTransform(scrollYProgress, [0.02, 0.20], [0, 1]);

  const centerTop = useTransform(scrollYProgress, [0.02, 0.35], ["0vh", "51vh"]);
  const centerWidth = useTransform(scrollYProgress, (progress) => {
    const settled = Math.min(Math.max((progress - 0.02) / 0.33, 0), 1);
    return `calc(${(1 - settled) * 100}vw + clamp(${settled * 312}px, ${settled * 38.4}vw, ${settled * 552}px))`;
  });
  const centerHeight = useTransform(scrollYProgress, (progress) => {
    const settled = Math.min(Math.max((progress - 0.02) / 0.33, 0), 1);
    return `calc(${(1 - settled) * 100}vh + clamp(${settled * 216}px, ${settled * 40.8}vh, ${settled * 384}px))`;
  });
  const centerRadius = useTransform(scrollYProgress, [0.04, 0.35], [0, 18]);

  // Center card cream backing reveals as center card settles
  const centerBackingOpacity = useTransform(scrollYProgress, [0.26, 0.35], [0, 1]);

  // Unified Text Transitions (Shift & Invert during shrink)
  const textY = useTransform(scrollYProgress, [0.02, 0.35], ["10vh", "0vh"]);
  const textScale = useTransform(scrollYProgress, [0.02, 0.35], [1, 0.88]);

  const headingColor = useTransform(scrollYProgress, [0.02, 0.22], ["#ffffff", "#16213A"]);
  const textShadow = useTransform(scrollYProgress, [0.02, 0.22], ["0 2px 12px rgba(15, 17, 23, 0.85)", "0 2px 12px rgba(15, 17, 23, 0)"]);
  const textColor = useTransform(
    scrollYProgress,
    [0.02, 0.22],
    ["rgba(255, 255, 255, 0.88)", "#5B6478"]
  );

  const cta2Bg = useTransform(
    scrollYProgress,
    [0.02, 0.22],
    ["rgba(255, 255, 255, 0.15)", "#FAF7F0"]
  );
  const cta2Border = useTransform(
    scrollYProgress,
    [0.02, 0.22],
    ["rgba(255, 255, 255, 0.35)", "#E5E1D8"]
  );
  const cta2Text = useTransform(scrollYProgress, [0.02, 0.22], ["#ffffff", "#16213A"]);
  const playIconOpacity = useTransform(scrollYProgress, [0.14, 0.26], [0, 1]);
  const playIconWidth = useTransform(scrollYProgress, [0.14, 0.26], [0, 22]);

  const badgeText = useTransform(
    scrollYProgress,
    [0.02, 0.22],
    ["rgba(255, 255, 255, 0.9)", "#5B6478"]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Side cards settle, then the entire row rolls at a constant rate as the
  // sticky section releases and leaves the viewport.
  // ──────────────────────────────────────────────────────────────────────────
  const sideOpacity = useTransform(scrollYProgress, [0.02, 0.18], [0, 1]);

  const centerCardX = useTransform(trackProgress, (progress) =>
    `calc(-50% - ${Math.max(progress - 0.38, 0) * TRACK_SCROLL_SPEED}vw)`
  );

  const sectionExitOpacity = useTransform(scrollYProgress, [0.85, 1.00], [1, 0.96]);

  return (
    // 135vh runway: scroll wait cut by 60% for effortless browsing down the page
    <div ref={sectionRef} style={{ height: "135vh" }}>
      {/* Sticky viewport — pinned while user scrolls through the hero runway */}
      <motion.div
        style={{ opacity: sectionExitOpacity }}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        {/* [0] White background reveals as image shrinks from edges */}
        <motion.div
          style={{ opacity: bgOpacity }}
          className="absolute inset-0 z-0 bg-white pointer-events-none"
        />

        {/* ================================================================
            [1] UNIFIED CARD ROW — Continuous 14-card track, +20% larger cards
            ================================================================ */}

        {/* All Side Cards (k = -3 to +10, rendered without responsive hiding) */}
        {SIDE_CARDS.map((card) => (
          <HeroSideCard
            key={card.key}
            k={card.k}
            src={card.src}
            alt={card.alt}
            scrollYProgress={scrollYProgress}
            trackProgress={trackProgress}
            sideOpacity={sideOpacity}
          />
        ))}

        {/* Center Card Elevation Backing (glued to Center Card position) */}
        <motion.div
          style={{
            opacity: centerBackingOpacity,
            position: "absolute",
            top: "51vh",
            left: "50%",
            x: centerCardX,
            width: "38.4vw",
            height: "40.8vh",
            minWidth: "312px",
            maxWidth: "552px",
            minHeight: "216px",
            maxHeight: "384px",
            zIndex: 9,
            pointerEvents: "none",
          }}
        >
          <div
            className="absolute rounded-2xl bg-[#FAF7F0] border border-[#E5E1D8] shadow-xs pointer-events-none"
            style={{
              left: "-5%",
              bottom: "-5%",
              width: "100%",
              height: "100%",
            }}
          />
        </motion.div>

        {/* Center Hero Card (hero3.jpeg) — Shrinks from full-screen, then rolls with track */}
        <motion.div
          style={{
            position: "absolute",
            top: centerTop,
            left: "50%",
            x: centerCardX,
            width: centerWidth,
            height: centerHeight,
            minWidth: "min(312px, 100vw)",
            maxWidth: "100vw",
            borderRadius: centerRadius,
            zIndex: 10,
            overflow: "hidden",
          }}
          className="border border-[#E5E1D8] shadow-md bg-[#FAF7F0]"
        >
          <Image
            src="/assets/hero3.jpeg"
            alt="Professional using Hunt Deck to land their next job"
            fill
            className="object-cover object-center"
            priority
          />

        </motion.div>

        {/* ================================================================
            [2] UNIFIED TEXT CONTAINER (sits ABOVE the images)
            Translates and scales dynamically. Color inverts on scroll.
            ================================================================ */}
        <motion.div
          style={{
            y: textY,
            scale: textScale,
            textShadow,
            transformOrigin: "top center",
          }}
          className="absolute top-0 left-0 right-0 z-30 flex flex-col items-center text-center px-6 pointer-events-none pt-[100px] sm:pt-[110px]"
        >
          {/* Headline — Declarative SSR-safe word-reveal on mount */}
          <motion.h1
            style={{ color: headingColor }}
            className="font-bold text-4xl sm:text-6xl lg:text-7xl leading-[1.08] tracking-[-0.025em] mb-5 max-w-3xl"
          >
            <span className="inline-block overflow-hidden align-bottom">
              <motion.span
                custom={0}
                variants={shouldReduceMotion ? undefined : wordRevealVariants}
                initial="hidden"
                animate="visible"
                className="inline-block mr-2 sm:mr-3.5"
              >
                Land
              </motion.span>
            </span>
            <span className="inline-block overflow-hidden align-bottom">
              <motion.span
                custom={1}
                variants={shouldReduceMotion ? undefined : wordRevealVariants}
                initial="hidden"
                animate="visible"
                className="inline-block"
              >
                interviews,
              </motion.span>
            </span>
            <br />
            <span className="font-serif italic font-normal inline-block">
              <span className="inline-block overflow-hidden align-bottom">
                <motion.span
                  custom={2}
                  variants={shouldReduceMotion ? undefined : wordRevealVariants}
                  initial="hidden"
                  animate="visible"
                  className="inline-block mr-2 sm:mr-3"
                >
                  not
                </motion.span>
              </span>
              <span className="inline-block overflow-hidden align-bottom">
                <motion.span
                  custom={3}
                  variants={shouldReduceMotion ? undefined : wordRevealVariants}
                  initial="hidden"
                  animate="visible"
                  className="inline-block mr-2 sm:mr-3"
                >
                  rejection
                </motion.span>
              </span>
              <span className="inline-block overflow-hidden align-bottom">
                <motion.span
                  custom={4}
                  variants={shouldReduceMotion ? undefined : wordRevealVariants}
                  initial="hidden"
                  animate="visible"
                  className="inline-block"
                >
                  emails.
                </motion.span>
              </span>
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            style={{ color: textColor }}
            className="text-base sm:text-lg leading-relaxed mb-8 max-w-xl"
          >
            Hunt Deck matches you to jobs that fit, then builds everything you need to apply —
            tailored resume, cover letter, and interview prep — in minutes.
          </motion.p>

          {/* Unified CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pointer-events-auto">
            {/* Button 1: Start for free */}
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { scale: 1.035, y: -2 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.965 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <Link
                href="/signup"
                className="h-11 px-7 flex items-center justify-center rounded-full bg-[#16213A] text-white text-sm font-semibold hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-2 transition-all duration-200 shadow-md border border-white/20"
              >
                Start for free
              </Link>
            </motion.div>

            {/* Button 2: See how it works */}
            <motion.div
              whileHover={shouldReduceMotion ? undefined : { scale: 1.025, y: -1 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
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
                    <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-xs border border-[#E5E1D8] shrink-0 mr-2">
                      <Play size={9} weight="fill" className="text-[#16213A] translate-x-[0.5px]" />
                    </span>
                  </motion.span>
                  See how it works
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Review badge below CTAs */}
          <motion.div
            style={{ color: badgeText }}
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
      </motion.div>
    </div>
  );
}
