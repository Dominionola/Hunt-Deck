"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { OnboardingStep } from "./OnboardingProgress";
import { LiveDeckMascot } from "./LiveDeckMascot";
import { RiveDeckMascot } from "./RiveDeckMascot";

interface DeckMascotProps {
  step: OnboardingStep;
  className?: string;
}

export function DeckMascot({ step, className = "" }: DeckMascotProps) {
  const prefersReduced = useReducedMotion();
  const [engine, setEngine] = useState<"live" | "rive">("live");

  if (engine === "rive") {
    return (
      <div className="relative group">
        <RiveDeckMascot step={step} className={className} />
        <button
          onClick={() => setEngine("live")}
          className="absolute -bottom-1 -right-1 text-[9px] font-bold bg-[#16213A] text-white hover:bg-[#2D5F8A] px-2 py-0.5 rounded-full shadow-xs opacity-75 hover:opacity-100 transition-opacity z-20 cursor-pointer"
          title="Switch to 2D Live Model"
        >
          Rive (.riv)
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/*
        Apple HIG Micro-Interaction wrapper:
        – key={step}: physical re-grounding nod when navigating between steps
        – whileHover: spring lift (y -4, scale 1.04)
        – whileTap: tactile compression (scale 0.96, 150ms spring snap)
        – 44×44px minimum touch area
      */}
      <motion.div
        key={step}
        initial={prefersReduced ? false : { scale: 0.95, y: 2, rotate: -1.5 }}
        animate={prefersReduced ? {} : { scale: 1, y: 0, rotate: 0 }}
        whileHover={prefersReduced ? {} : { y: -4, scale: 1.04 }}
        whileTap={prefersReduced ? {} : { scale: 0.96 }}
        transition={
          prefersReduced
            ? { duration: 0 }
            : {
              type: "spring",
              stiffness: 380,
              damping: 22,
              mass: 0.8,
            }
        }
        style={{ minWidth: 44, minHeight: 44, display: "flex" }}
      >
        <LiveDeckMascot step={step} className={className} />
      </motion.div>

      {/* Engine badge (hover-reveal) */}
      <button
        onClick={() => setEngine("rive")}
        className={[
          "absolute -bottom-1 -right-1 z-20 cursor-pointer",
          "text-[8px] font-bold px-1.5 py-0.5 rounded-full",
          "bg-[#FAF7F0] border border-[#E5E1D8] text-[#5B6478] shadow-2xs",
          "opacity-0 group-hover:opacity-100",
          "hover:bg-[#2D5F8A] hover:text-white",
          "transition-all duration-150",
          // HIG: visible focus ring on tab
          "focus-visible:ring-2 focus-visible:ring-[#2D5F8A] focus-visible:outline-none",
        ].join(" ")}
        title="Switch to Rive Engine (.riv)"
      >
        Rive
      </button>
    </div>
  );
}

export { LiveDeckMascot };
