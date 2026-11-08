"use client";

import { useEffect, useRef, type ComponentProps } from "react";

/**
 * A muted loop (T-384): the source is chosen on first sight (the half-size file under 700 px) and the loop plays
 * only while on screen. Under reduced motion nothing loads and the poster stays.
 */
export function LoopVideo({ large, small, ...rest }: { large: string; small: string } & ComponentProps<"video">) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (!video.getAttribute("src")) video.src = window.innerWidth < 700 ? small : large;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.05 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [large, small]);

  return <video ref={ref} muted loop playsInline preload="none" aria-hidden {...rest} />;
}
