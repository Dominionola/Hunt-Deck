"use client";

import React from "react";
import { useReducedMotion } from "framer-motion";
import { useRive, Layout, Fit, Alignment } from "@rive-app/react-canvas";
import type { OnboardingStep } from "./OnboardingProgress";

interface RiveDeckMascotProps {
  step: OnboardingStep;
  className?: string;
}

const ARTBOARD_MAP: Record<OnboardingStep, string> = {
  import: "Welcome",
  skills: "Review",
  targets: "Goals",
  reveal: "Celebrate",
};

export function RiveDeckMascot({ step, className = "" }: RiveDeckMascotProps) {
  const artboardName = ARTBOARD_MAP[step] || "Welcome";
  const reducedMotion = useReducedMotion();

  const { RiveComponent } = useRive({
    src: "/assets/mascot/deck.riv",
    artboard: artboardName,
    stateMachine: "Play",
    autoplay: !reducedMotion,
    layout: new Layout({
      fit: Fit.Contain,
      alignment: Alignment.Center,
    }),
  });

  return (
    <div
      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#E5E1D8]/80 bg-[#FAF7F0] shadow-xs sm:h-24 sm:w-24 flex items-center justify-center select-none ${className}`}
      aria-hidden="true"
    >
      <RiveComponent className="w-full h-full" />
    </div>
  );
}
