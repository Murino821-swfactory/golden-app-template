"use client";

import { useEffect } from "react";
import { showLook } from "@tokenwise/shared-ui";
import { lookOf, nextLook } from "@/lib/look-tour";

/**
 * The golden demo's tour of looks (founder, 2026-11-26: "as the visitor scrolls down the golden
 * demo, every new section changes to a random combination of colour, transparency, font, CTA and
 * dark & light mode; the language stays"). `app/[locale]/page.tsx` mounts it for a `tryIt`
 * config — the golden demo only; a customer's prototype never tours.
 *
 * When a section arrives from below — its top rises past the middle of the window — the page puts
 * on the next look (`nextLook`: all five controls change). Only:
 *   - while the visitor scrolls by hand (a wheel or a finger): a jump — a link to a section, a
 *     script, the browser restoring a position — is not the visitor scrolling;
 *   - once per arrival: the same section arriving again straight after (the new face moved its
 *     edge back under the middle, or the visitor wiggled) does not change the look twice;
 *   - until the visitor picks a look with a header control (the pad's colour and button keys
 *     press those): from then on the page is theirs;
 *   - without reduced motion: a page repainting itself while it scrolls is motion.
 * Going up changes nothing. The look is shown, not kept (`showLook` stores nothing): a reload
 * opens on the page's own look, and tokenwise.sk, which shares the origin, never inherits it.
 * `html[data-look-tour]` says the tour is listening.
 */

/** The header's restyling controls; the language is not a look. */
const LOOK_CONTROLS = ["palette", "font", "appearance", "button", "image"]
  .map((name) => `[data-shared-control="${name}"]`)
  .join(", ");

export function LookTour() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const html = document.documentElement;
    const inside = new WeakMap<Element, boolean>();
    let byHand = false;
    let last: Element | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting, boundingClientRect } of entries) {
          const was = inside.get(target);
          inside.set(target, isIntersecting);
          // Into the window's top half from below: the section's own top is still on screen.
          const arrived = was === false && isIntersecting && boundingClientRect.top >= 0;
          if (!arrived || !byHand || target === last) continue;
          last = target;
          showLook(nextLook(lookOf(html)));
        }
      },
      // The window's top half: a section enters it from below when its top passes the middle.
      { rootMargin: "0px 0px -50% 0px" }
    );
    document.querySelectorAll("[data-section]").forEach((section) => observer.observe(section));

    function scrolledByHand() {
      byHand = true;
    }
    function picked(event: MouseEvent) {
      if (event.target instanceof Element && event.target.closest(LOOK_CONTROLS)) stop();
    }
    function stop() {
      observer.disconnect();
      removeEventListener("wheel", scrolledByHand);
      removeEventListener("touchmove", scrolledByHand);
      document.removeEventListener("click", picked, true);
      html.removeAttribute("data-look-tour");
    }

    addEventListener("wheel", scrolledByHand, { passive: true });
    addEventListener("touchmove", scrolledByHand, { passive: true });
    document.addEventListener("click", picked, true);
    html.setAttribute("data-look-tour", "");
    return stop;
  }, []);

  return null;
}
