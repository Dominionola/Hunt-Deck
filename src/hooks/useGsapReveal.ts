"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export type RevealPreset =
  | "fade-up"
  | "fade-left"
  | "fade-right"
  | "scale-up"
  | "clip-up"
  | "stagger-grid";

interface UseGsapRevealOptions {
  preset?: RevealPreset;
  staggerSelector?: string | null;
  staggerAmount?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  start?: string;
  once?: boolean;
  single?: boolean;
}

export function useGsapReveal<T extends HTMLElement = HTMLDivElement>(
  options: UseGsapRevealOptions = {}
) {
  const {
    preset = "fade-up",
    staggerSelector = null,
    staggerAmount = 0.09,
    duration = 0.65,
    delay = 0,
    ease = "cubic-bezier(0.16, 1, 0.3, 1)",
    start = "top 88%",
    once = true,
    single = false,
  } = options;

  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets =
      staggerSelector && !single
        ? Array.from(el.querySelectorAll<HTMLElement>(staggerSelector))
        : [el];

    if (!targets.length) return;

    const toVars = buildToVars(preset);
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      gsap.set(targets, { ...toVars, clearProps: "transform,opacity" });
      return;
    }

    const fromVars = buildFromVars(preset);
    gsap.set(targets, fromVars);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start,
        once,
      },
    });

    if (targets.length === 1) {
      tl.to(targets[0], { ...toVars, duration, delay, ease });
    } else {
      tl.to(targets, { ...toVars, duration, delay, ease, stagger: staggerAmount });
    }

    return () => {
      tl.kill();
      ScrollTrigger.getAll()
        .filter((st) => st.vars.trigger === el)
        .forEach((st) => st.kill());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}

function buildFromVars(preset: RevealPreset): gsap.TweenVars {
  switch (preset) {
    case "fade-left":  return { opacity: 0, x: 36, y: 0 };
    case "fade-right": return { opacity: 0, x: -36, y: 0 };
    case "scale-up":   return { opacity: 0, scale: 0.93, y: 0 };
    case "clip-up":    return { clipPath: "inset(0 0 100% 0)", opacity: 1, y: 0 };
    case "stagger-grid": return { opacity: 0, y: 32, scale: 0.96 };
    default:           return { opacity: 0, y: 28, x: 0 };
  }
}

function buildToVars(preset: RevealPreset): gsap.TweenVars {
  switch (preset) {
    case "fade-left":
    case "fade-right": return { opacity: 1, x: 0 };
    case "scale-up":   return { opacity: 1, scale: 1 };
    case "clip-up":    return { clipPath: "inset(0 0 0% 0)" };
    case "stagger-grid": return { opacity: 1, y: 0, scale: 1 };
    default:           return { opacity: 1, y: 0 };
  }
}
