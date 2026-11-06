"use client";

import { useEffect, useRef } from "react";
import { motionLoop, type MotionLoopName } from "@/lib/editorial";
import { cn } from "@/lib/utils";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * A light loop rendered in Blender (T-340; scene in `scripts/motion/<name>.py`): neutral
 * light on black that `editorial.css` screens onto the page and tints with the palette, so
 * "Change colour" relights it like every other glow. Decoration only — hidden from assistive
 * technology, no controls, never focusable.
 *
 * It plays only while it is on screen and only for a reader who did not ask for calm: a
 * reduced-motion reader keeps the still (`poster`) and never downloads the video
 * (`preload="none"`); off screen it pauses, so a long page costs no decoding it cannot see.
 * `muted` is set again on the element before `play()` — React does not write the attribute
 * into the static HTML, and a browser lets only a muted video start on its own.
 */
export function LightLoop({ name, className, marker }: { name: MotionLoopName; className?: string; marker: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const loop = motionLoop(BASE_PATH, name);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    const sync = () => {
      if (visible && !calm.matches) video.play().catch(() => {});
      else video.pause();
    };
    const watch = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    });
    watch.observe(video);
    calm.addEventListener("change", sync);
    return () => {
      watch.disconnect();
      calm.removeEventListener("change", sync);
    };
  }, []);

  return (
    <div aria-hidden="true" {...{ [marker]: "" }} className={cn("editorial-light", className)}>
      <video ref={ref} muted loop playsInline preload="none" poster={loop.poster} disablePictureInPicture tabIndex={-1}>
        {loop.sources.map((source) => (
          <source key={source.type} src={source.src} type={source.type} />
        ))}
      </video>
    </div>
  );
}
