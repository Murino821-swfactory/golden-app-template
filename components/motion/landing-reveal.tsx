"use client";

import { useEffect } from "react";

/**
 * Scroll reveal for the landing's `[data-reveal]` blocks: once JavaScript runs, a block
 * still below the fold is marked `pending` (hidden, a little lower) and becomes `in`
 * (visible, in place) the first time it enters the viewport — or once the reader has scrolled
 * to or past it, however fast — `app/globals.css` draws the two states. Nothing is ever hidden without a way back: without JavaScript, with a
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
    // A fast scroll or a jump can carry a block past the viewport between two of the observer's
    // samples, and it would never report it (T-384: a slow machine left two blocks hidden). After
    // each scroll, once per frame, a block the reader has reached is in.
    let frame = 0;
    const sweep = () => {
      frame = 0;
      for (const block of blocks) {
        if (block.dataset.reveal !== "pending" || block.getBoundingClientRect().top >= window.innerHeight * 0.92) continue;
        block.dataset.reveal = "in";
        observer.unobserve(block);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sweep);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
