"use client";

import { useEffect } from "react";

/**
 * Scroll reveal for the landing's `[data-reveal]` blocks: once JavaScript runs, a block
 * still below the fold is marked `pending` (hidden, a little lower) and becomes `in`
 * (visible, in place) the first time it enters the viewport — `app/globals.css` draws the
 * two states. Nothing is ever hidden without a way back: without JavaScript, with a
 * reduced-motion preference, or when a block is already on screen at hydration, the
 * attribute stays empty and the block is simply visible. Renders nothing.
 */
export function LandingReveal() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "in";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    for (const block of blocks) {
      if (block.getBoundingClientRect().top > window.innerHeight) block.dataset.reveal = "pending";
      observer.observe(block);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
