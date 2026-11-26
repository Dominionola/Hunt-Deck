"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { OnboardingStep } from "./OnboardingProgress";

// ─── Apple HIG ease-out curve ──────────────────────────────────────────────
const HIG_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface LiveDeckMascotProps {
  step: OnboardingStep;
  className?: string;
}

export function LiveDeckMascot({ step, className = "" }: LiveDeckMascotProps) {
  const prefersReduced = useReducedMotion();
  const [isBlinking, setIsBlinking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // ── Gaze tracking via spring physics ──────────────────────────────────
  const rawGazeX = useRef(0);
  const rawGazeY = useRef(0);
  const gazeXSpring = useSpring(0, { stiffness: 80, damping: 18 });
  const gazeYSpring = useSpring(0, { stiffness: 80, damping: 18 });
  // Smooth pupil translate values
  const pupilDX = useTransform(gazeXSpring, [-1, 1], [-2.5, 2.5]);
  const pupilDY = useTransform(gazeYSpring, [-1, 1], [-2, 2]);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Organic blink loop using recursive scheduling ─────────────────────
  useEffect(() => {
    if (prefersReduced) return;
    let alive = true;

    const scheduleBlink = () => {
      if (!alive) return;
      const delay = 2600 + Math.random() * 2800;
      const tid = setTimeout(() => {
        if (!alive) return;
        setIsBlinking(true);
        const closeId = setTimeout(() => {
          if (!alive) return;
          setIsBlinking(false);
          // 25 % double-blink
          if (Math.random() < 0.25) {
            const gapId = setTimeout(() => {
              if (!alive) return;
              setIsBlinking(true);
              const close2Id = setTimeout(() => {
                if (!alive) return;
                setIsBlinking(false);
                scheduleBlink();
              }, 110);
              return () => clearTimeout(close2Id);
            }, 80);
            return () => clearTimeout(gapId);
          } else {
            scheduleBlink();
          }
        }, 130);
        return () => clearTimeout(closeId);
      }, delay);
      return () => clearTimeout(tid);
    };

    scheduleBlink();
    return () => {
      alive = false;
    };
  }, [prefersReduced]);

  // ── Mouse gaze tracking ───────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || prefersReduced) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relX =
        (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const relY =
        (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      rawGazeX.current = Math.max(-1, Math.min(1, relX));
      rawGazeY.current = Math.max(-1, Math.min(1, relY));
      gazeXSpring.set(rawGazeX.current);
      gazeYSpring.set(rawGazeY.current);
    },
    [prefersReduced, gazeXSpring, gazeYSpring]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
    gazeXSpring.set(0);
    gazeYSpring.set(0);
  }, [gazeXSpring, gazeYSpring]);

  // ── Computed animation states ─────────────────────────────────────────
  const isCelebrate = step === "reveal";
  const showHappyEyes =
    isBlinking || (isCelebrate && !isHovered && !isPressed);
  const showSquintEyes = isHovered || isPressed;

  // ── Float / Breathing root animation ─────────────────────────────────
  const rootFloat = prefersReduced
    ? {}
    : isCelebrate
      ? {
        y: [0, 4, -14, 2, 0],
        scaleY: [1, 0.94, 1.06, 0.97, 1],
        scaleX: [1, 1.05, 0.95, 1.02, 1],
      }
      : { y: [0, -5, 0], scaleY: [1, 1.018, 1], scaleX: [1, 0.99, 1] };

  const rootTransition = prefersReduced
    ? { duration: 0 }
    : {
      duration: isCelebrate ? 1.6 : 3.0,
      repeat: Infinity,
      ease: "easeInOut" as const,
    };

  // ── Head tilt ─────────────────────────────────────────────────────────
  const headAnimate = prefersReduced
    ? {}
    : step === "skills"
      ? { rotate: [0, 3.5, -1, 0] }
      : isCelebrate
        ? { rotate: [-2, 2.5, -2] }
        : { rotate: [-1, 2, -1] };

  const headTransition = prefersReduced
    ? { duration: 0 }
    : {
      duration: step === "skills" ? 3.4 : 2.8,
      repeat: Infinity,
      ease: "easeInOut" as const,
    };

  // ── Scarf tail animation (delayed 0.15 s behind head = overlapping action)
  const scarfAnimate = prefersReduced
    ? {}
    : {
      rotate: [-3, 6, -3],
      scaleY: [1, 1.08, 0.95, 1],
    };

  // ─── Shadow ellipse ───────────────────────────────────────────────────
  const shadowAnimate = prefersReduced
    ? { opacity: 0.18 }
    : isCelebrate
      ? { rx: [44, 48, 30, 46, 44], opacity: [0.2, 0.28, 0.08, 0.26, 0.2] }
      : { rx: [44, 38, 44], opacity: [0.2, 0.13, 0.2] };

  // ── Waving arm animation on import step ──────────────────────────────
  const waveArmAnimate = prefersReduced
    ? {}
    : { rotate: [0, 22, -8, 20, -6, 14, 0, 16, -6, 14, 0] };

  const waveArmTransition = prefersReduced
    ? { duration: 0 }
    : {
      duration: 2.2,
      repeat: Infinity,
      repeatDelay: 0.8,
      ease: "easeInOut" as const,
    };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      tabIndex={0}
      role="img"
      aria-label="Deck the guide mascot"
      className={[
        "relative shrink-0 overflow-hidden rounded-2xl",
        "border border-[#E5E1D8]/80 bg-[#FAF7F0] shadow-xs",
        "h-20 w-20 sm:h-24 sm:w-24",
        "flex items-center justify-center select-none cursor-pointer",
        // Apple HIG: tactile active scale + 150ms snap
        "transition-transform duration-150",
        isPressed ? "scale-[0.96]" : "scale-100",
        // HIG focus ring
        "outline-none focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:ring-offset-1",
        // hover lift
        "hover:shadow-md",
        className,
      ].join(" ")}
    >
      <svg
        viewBox="0 0 200 220"
        className="w-full h-full overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Card Head Gradient */}
          <linearGradient id="deckFaceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFBF5" />
            <stop offset="70%" stopColor="#F5ECE0" />
            <stop offset="100%" stopColor="#EBDDCB" />
          </linearGradient>

          {/* Card Back 1: Dark Navy */}
          <linearGradient id="cardBack1Grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#253A5E" />
            <stop offset="100%" stopColor="#182740" />
          </linearGradient>

          {/* Card Back 2: Sand Tan */}
          <linearGradient id="cardBack2Grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ECE1D1" />
            <stop offset="100%" stopColor="#DACABA" />
          </linearGradient>

          {/* Scarf Blue */}
          <linearGradient id="scarfGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4A7EAA" />
            <stop offset="50%" stopColor="#35648C" />
            <stop offset="100%" stopColor="#264D70" />
          </linearGradient>

          {/* Navy Jumper */}
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#242E45" />
            <stop offset="100%" stopColor="#151D2E" />
          </linearGradient>

          {/* Cream / Sole */}
          <linearGradient id="creamSoleGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFBF5" />
            <stop offset="100%" stopColor="#E6D7C3" />
          </linearGradient>

          {/* Warm blush */}
          <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F8BAAB" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F8BAAB" stopOpacity="0" />
          </radialGradient>

          {/* Shadows */}
          <filter id="softCardShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="-2" dy="3" stdDeviation="2.5" floodColor="#16213A" floodOpacity="0.12" />
          </filter>
          <filter id="limbShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#16213A" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* ── 1. Ground Contact Shadow ─────────────────────────────────── */}
        <motion.ellipse
          cx="100"
          cy="204"
          rx="44"
          ry="6.5"
          fill="#16213A"
          animate={shadowAnimate}
          transition={{
            duration: isCelebrate ? 1.6 : 3.0,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* ── 2. Entire character root (float + squash/stretch) ────────── */}
        <motion.g
          animate={rootFloat}
          transition={rootTransition}
        >
          {/* A. Legs & Shoes */}
          <g id="legs-and-shoes">
            {/* Left Leg */}
            <rect x="74" y="162" width="22" height="28" rx="8" fill="url(#bodyGrad)" />
            {/* Left Shoe */}
            <path
              d="M71 184 C71 179, 99 179, 99 184 L99 194 C99 198, 71 198, 71 194 Z"
              fill="url(#bodyGrad)"
            />
            <path
              d="M71 190 C71 187, 99 187, 99 190 L99 195 C99 199, 71 199, 71 195 Z"
              fill="url(#creamSoleGrad)"
              filter="url(#limbShadow)"
            />

            {/* Right Leg — kick on celebrate */}
            <motion.g
              animate={
                isCelebrate && !prefersReduced
                  ? { rotate: [0, 10, -7, 0], y: [0, -4, 0] }
                  : {}
              }
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformOrigin: "115px 162px" }}
            >
              <rect x="104" y="162" width="22" height="28" rx="8" fill="url(#bodyGrad)" />
              <path
                d="M101 184 C101 179, 129 179, 129 184 L129 194 C129 198, 101 198, 101 194 Z"
                fill="url(#bodyGrad)"
              />
              <path
                d="M101 190 C101 187, 129 187, 129 190 L129 195 C129 199, 101 199, 101 195 Z"
                fill="url(#creamSoleGrad)"
                filter="url(#limbShadow)"
              />
            </motion.g>
          </g>

          {/* B. Torso */}
          <g id="torso">
            <path
              d="M68 132 C68 126, 132 126, 132 132 L136 166 C136 172, 64 172, 64 166 Z"
              fill="url(#bodyGrad)"
              filter="url(#limbShadow)"
            />
            {/* Backpack straps — cream */}
            <path
              d="M74 133 C73 145, 73 158, 77 167"
              stroke="#E8DCC8"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
            <path
              d="M126 133 C127 145, 127 158, 123 167"
              stroke="#E8DCC8"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
          </g>

          {/* C. Scarf Flutter Tails — delayed 0.15s (overlapping action) */}
          <motion.g
            id="scarf-tails"
            animate={scarfAnimate}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.15,          // ← overlapping action trail
            }}
            style={{ transformOrigin: "65px 128px" }}
          >
            <path
              d="M65 125 C50 123, 38 132, 34 144 C42 146, 52 142, 64 135 Z"
              fill="url(#scarfGrad)"
              filter="url(#limbShadow)"
            />
            <path
              d="M62 130 C48 132, 40 142, 38 152 C45 154, 54 148, 62 139 Z"
              fill="#264D70"
              opacity="0.85"
            />
          </motion.g>

          {/* D. Scarf Collar */}
          <path
            d="M58 124 C58 116, 142 116, 142 124 C142 134, 58 134, 58 124 Z"
            fill="url(#scarfGrad)"
            filter="url(#limbShadow)"
          />

          {/* E. Head Group — card deck stack + face */}
          <motion.g
            id="deck-head"
            animate={headAnimate}
            transition={headTransition}
            style={{ transformOrigin: "100px 120px" }}
          >
            {/* Back card — deep navy */}
            <rect
              x="42" y="38" width="90" height="84" rx="18"
              fill="url(#cardBack1Grad)"
              transform="rotate(-9 87 80)"
              filter="url(#softCardShadow)"
            />

            {/* Middle card — sand tan */}
            <rect
              x="48" y="34" width="94" height="84" rx="18"
              fill="url(#cardBack2Grad)"
              transform="rotate(-4.5 95 76)"
              filter="url(#softCardShadow)"
            />

            {/* Front face card */}
            <g id="front-card-face" filter="url(#softCardShadow)">
              <path
                d="M56 42 
                   C56 32, 64 24, 76 24 
                   L90 24 
                   C93 24, 96 28, 100 35 
                   C104 28, 107 24, 110 24 
                   L124 24 
                   C136 24, 144 32, 144 42 
                   L144 100 
                   C144 112, 136 120, 124 120 
                   L76 120 
                   C64 120, 56 112, 56 100 
                   Z"
                fill="url(#deckFaceGrad)"
                stroke="#EAE0D2"
                strokeWidth="1.5"
              />

              {/* Compass arrow notch — subtly bobs independently */}
              <motion.g
                animate={
                  prefersReduced
                    ? {}
                    : { y: [0, -1.5, 0.5, 0], rotate: [-1, 1, -1] }
                }
                transition={{
                  duration: 2.1,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4,       // ← secondary motion offset
                }}
                style={{ transformOrigin: "100px 25px" }}
              >
                <polygon points="100,18 106,32 100,28 94,32" fill="#264D70" />
              </motion.g>

              {/* Eyebrows — lift slightly on hover */}
              <motion.path
                d="M74 54 C78 51, 86 52, 89 56"
                stroke="#16213A"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                animate={isHovered ? { y: -1 } : { y: 0 }}
                transition={{ duration: 0.15, ease: HIG_EASE }}
              />
              <motion.path
                d="M126 54 C122 51, 114 52, 111 56"
                stroke="#16213A"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                animate={isHovered ? { y: -1 } : { y: 0 }}
                transition={{ duration: 0.15, ease: HIG_EASE }}
              />

              {/* Blush cheeks */}
              <ellipse cx="73" cy="80" rx="9" ry="5" fill="url(#blushGrad)" />
              <ellipse cx="127" cy="80" rx="9" ry="5" fill="url(#blushGrad)" />

              {/* ── Eyes (AnimatePresence for smooth swap) ─────────────── */}
              <AnimatePresence mode="wait">
                {showHappyEyes ? (
                  <motion.g
                    key="happy-eyes"
                    id="closed-happy-eyes"
                    initial={{ opacity: 0, scaleY: 0.3 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.3 }}
                    transition={{ duration: 0.08, ease: HIG_EASE }}
                    style={{ transformOrigin: "100px 70px" }}
                  >
                    <path
                      d="M74 72 C76 66, 84 66, 86 72"
                      stroke="#16213A"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M114 72 C116 66, 124 66, 126 72"
                      stroke="#16213A"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </motion.g>
                ) : showSquintEyes ? (
                  <motion.g
                    key="squint-eyes"
                    id="hover-squint-eyes"
                    initial={{ opacity: 0, scaleY: 0.3 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.3 }}
                    transition={{ duration: 0.1, ease: HIG_EASE }}
                    style={{ transformOrigin: "100px 70px" }}
                  >
                    <path
                      d="M73 70 C76 64, 85 64, 87 70"
                      stroke="#16213A"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M113 70 C116 64, 125 64, 127 70"
                      stroke="#16213A"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </motion.g>
                ) : (
                  /* Open glossy eyes — pupils spring to cursor */
                  <motion.g
                    key="open-eyes"
                    id="open-expressive-eyes"
                    initial={{ opacity: 0, scaleY: 0.3 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0.3 }}
                    transition={{ duration: 0.1, ease: HIG_EASE }}
                    style={{ transformOrigin: "100px 70px" }}
                  >
                    {/* Left Eye */}
                    <motion.g
                      style={{ x: pupilDX, y: pupilDY }}
                    >
                      <ellipse cx="80" cy="70" rx="6" ry="8.5" fill="#16213A" />
                      <circle cx="82" cy="67" r="2.2" fill="#FFFFFF" />
                      {/* Tiny second specular for realism */}
                      <circle cx="77" cy="73" r="1" fill="#FFFFFF" opacity="0.4" />
                    </motion.g>
                    {/* Right Eye */}
                    <motion.g
                      style={{ x: pupilDX, y: pupilDY }}
                    >
                      <ellipse cx="120" cy="70" rx="6" ry="8.5" fill="#16213A" />
                      <circle cx="122" cy="67" r="2.2" fill="#FFFFFF" />
                      <circle cx="117" cy="73" r="1" fill="#FFFFFF" opacity="0.4" />
                    </motion.g>
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Warm Mouth — morphs on hover / celebrate */}
              <motion.path
                d={
                  showSquintEyes || isCelebrate
                    ? "M90 84 C95 93, 105 93, 110 84"  // big smile
                    : "M92 84 C96 89, 104 89, 108 84"  // gentle
                }
                stroke="#16213A"
                strokeWidth="3"
                strokeLinecap="round"
                fill={showSquintEyes || isCelebrate ? "#96382D" : "none"}
                transition={{ duration: 0.2, ease: HIG_EASE }}
              />
            </g>
          </motion.g>

          {/* F. Arms — step-specific poses */}
          <g id="arms-layer">

            {/* ── IMPORT: Right arm waves hello ─────────────────────── */}
            {step === "import" && (
              <g id="pose-welcome-arms">
                {/* Left arm — relaxed at side */}
                <path
                  d="M66 136 C55 142, 53 154, 58 162"
                  stroke="url(#bodyGrad)"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <circle cx="58" cy="162" r="7" fill="url(#creamSoleGrad)" filter="url(#limbShadow)" />

                {/* Right arm — waves, with squash at max extension */}
                <motion.g
                  animate={waveArmAnimate}
                  transition={waveArmTransition}
                  style={{ transformOrigin: "135px 138px" }}
                >
                  <path
                    d="M133 138 C144 130, 153 118, 160 108"
                    stroke="url(#bodyGrad)"
                    strokeWidth="13"
                    strokeLinecap="round"
                  />
                  {/* Mitten with thumb — squash on extreme extension */}
                  <g transform="translate(160, 106)">
                    <motion.circle
                      cx="0"
                      cy="0"
                      r="8.5"
                      fill="url(#creamSoleGrad)"
                      filter="url(#limbShadow)"
                      animate={
                        prefersReduced
                          ? {}
                          : { scaleX: [1, 0.82, 1], rotate: [-8, 12, -8] }
                      }
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <circle cx="-5" cy="-2" r="3.5" fill="url(#creamSoleGrad)" />
                  </g>
                </motion.g>
              </g>
            )}

            {/* ── SKILLS: Thoughtful chin pose ─────────────────────── */}
            {step === "skills" && (
              <g id="pose-review-arms">
                {/* Left arm folded across chest */}
                <path
                  d="M66 138 C75 148, 110 148, 118 140"
                  stroke="url(#bodyGrad)"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <circle cx="118" cy="140" r="6.5" fill="url(#creamSoleGrad)" filter="url(#limbShadow)" />

                {/* Right arm — micro-float at chin */}
                <motion.g
                  animate={
                    prefersReduced
                      ? {}
                      : { y: [0, -1.5, 0], rotate: [0, 2, 0] }
                  }
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: "133px 138px" }}
                >
                  <path
                    d="M133 138 C136 148, 124 154, 114 135 L108 116"
                    stroke="url(#bodyGrad)"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <circle cx="108" cy="113" r="7.5" fill="url(#creamSoleGrad)" filter="url(#limbShadow)" />
                </motion.g>
              </g>
            )}

            {/* ── TARGETS: Holding career doc ──────────────────────── */}
            {step === "targets" && (
              <g id="pose-goals-arms">
                <motion.g
                  animate={
                    prefersReduced
                      ? {}
                      : { y: [0, -2.5, 0], rotate: [-1, 1, -1] }
                  }
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  style={{ transformOrigin: "100px 145px" }}
                >
                  {/* Document card */}
                  <rect
                    x="84" y="126" width="32" height="42" rx="4"
                    fill="#FFFDF9"
                    stroke="#D9CEBE"
                    strokeWidth="1.2"
                    filter="url(#softCardShadow)"
                  />
                  {/* Avatar */}
                  <circle cx="94" cy="136" r="3.5" fill="#2D5F8A" />
                  <path d="M90 144 C90 141, 98 141, 98 144" stroke="#2D5F8A" strokeWidth="1.2" fill="none" />
                  {/* Bullet lines */}
                  <line x1="101" y1="135" x2="111" y2="135" stroke="#7A869A" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="101" y1="139" x2="108" y2="139" stroke="#7A869A" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="88" y1="150" x2="112" y2="150" stroke="#4A7EAA" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="88" y1="155" x2="106" y2="155" stroke="#7A869A" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="88" y1="160" x2="110" y2="160" stroke="#7A869A" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Mitts */}
                  <circle cx="83" cy="146" r="6" fill="url(#creamSoleGrad)" filter="url(#limbShadow)" />
                  <circle cx="117" cy="146" r="6" fill="url(#creamSoleGrad)" filter="url(#limbShadow)" />
                </motion.g>

                {/* Supporting arms */}
                <path
                  d="M66 136 C68 144, 76 148, 83 146"
                  stroke="url(#bodyGrad)"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
                <path
                  d="M134 136 C132 144, 124 148, 117 146"
                  stroke="url(#bodyGrad)"
                  strokeWidth="11"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* ── REVEAL: Victory arms pumping ─────────────────────── */}
            {step === "reveal" && (
              <g id="pose-celebrate-arms">
                {/* Left arm raised */}
                <motion.g
                  animate={
                    prefersReduced
                      ? {}
                      : { rotate: [-4, 7, -4], y: [0, -4, 0] }
                  }
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: HIG_EASE,
                  }}
                  style={{ transformOrigin: "66px 134px" }}
                >
                  <path
                    d="M66 134 C55 124, 46 112, 42 98"
                    stroke="url(#bodyGrad)"
                    strokeWidth="13"
                    strokeLinecap="round"
                  />
                  <circle cx="41" cy="95" r="8" fill="url(#creamSoleGrad)" filter="url(#limbShadow)" />
                </motion.g>

                {/* Right arm raised — slightly offset for life */}
                <motion.g
                  animate={
                    prefersReduced
                      ? {}
                      : { rotate: [4, -7, 4], y: [0, -4, 0] }
                  }
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: HIG_EASE,
                    delay: 0.08,    // ← stagger for organic asymmetry
                  }}
                  style={{ transformOrigin: "134px 134px" }}
                >
                  <path
                    d="M134 134 C145 124, 154 112, 158 98"
                    stroke="url(#bodyGrad)"
                    strokeWidth="13"
                    strokeLinecap="round"
                  />
                  <circle cx="159" cy="95" r="8" fill="url(#creamSoleGrad)" filter="url(#limbShadow)" />
                </motion.g>

                {/* Sparkle lines — animate in */}
                <motion.g
                  id="celebration-sparkles"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 0.8], scale: [0.4, 1.1, 1] }}
                  transition={{ duration: 0.6, ease: HIG_EASE }}
                  style={{ transformOrigin: "160px 55px" }}
                >
                  <motion.path
                    d="M152 46 L158 36"
                    stroke="#2D5F8A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.path
                    d="M162 54 L172 50"
                    stroke="#2D5F8A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                  />
                  <motion.path
                    d="M158 64 L168 66"
                    stroke="#2D5F8A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                  />
                  {/* Extra star dot */}
                  <motion.circle
                    cx="168"
                    cy="38"
                    r="2.5"
                    fill="#2D5F8A"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.9, 0.3, 0.9] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                  />
                </motion.g>
              </g>
            )}
          </g>
        </motion.g>
      </svg>
    </div>
  );
}
