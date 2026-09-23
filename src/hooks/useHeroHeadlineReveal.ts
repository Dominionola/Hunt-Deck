"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Animate Hero headline words in on mount.
 * Each word wraps in a clip container and flies up from below.
 * Handles prefers-reduced-motion by falling back to a simple opacity fade.
 */
export function useHeroHeadlineReveal() {
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const h1 = headlineRef.current;
    if (!h1) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // Accessible fallback — simple opacity
      gsap.from(h1, { opacity: 0, duration: 0.6, ease: "power2.out" });
      return;
    }

    // Split text nodes into word-spans
    const wordSpans = splitIntoWords(h1);
    if (!wordSpans.length) return;

    // Wrap each word span in an overflow:hidden clipper
    wordSpans.forEach((span) => {
      const wrapper = document.createElement("span");
      wrapper.style.cssText = "display:inline-block; overflow:hidden; vertical-align:bottom; line-height:inherit;";
      span.parentNode!.insertBefore(wrapper, span);
      wrapper.appendChild(span);
    });

    // Animate each word flying up from 110%
    const tl = gsap.timeline({ delay: 0.05 });
    tl.from(wordSpans, {
      y: "110%",
      opacity: 0,
      duration: 0.72,
      ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      stagger: 0.055,
    });

    return () => {
      tl.kill();
    };
  }, []);

  return headlineRef;
}

/** Split all text nodes in an element into individual word spans, preserving markup */
function splitIntoWords(el: HTMLElement): HTMLSpanElement[] {
  const spans: HTMLSpanElement[] = [];

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (!text.trim()) return;

      const words = text.split(/(\s+)/);
      const frag = document.createDocumentFragment();

      words.forEach((chunk) => {
        if (/\s/.test(chunk)) {
          frag.appendChild(document.createTextNode(chunk));
        } else if (chunk.length) {
          const span = document.createElement("span");
          span.style.cssText = "display:inline-block;";
          span.textContent = chunk;
          spans.push(span);
          frag.appendChild(span);
        }
      });

      node.parentNode!.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Don't descend into <br> or <span> that will be animated
      Array.from(node.childNodes).forEach(walk);
    }
  };

  Array.from(el.childNodes).forEach(walk);
  return spans;
}
