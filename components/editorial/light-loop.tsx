"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { MOTION_SMALL_QUERY, motionLoop, type MotionLoopName } from "@/lib/editorial";
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
 *
 * A phone gets the half-width files (`<name>-sm`, T-369). Which files is known only on the
 * client, so the static HTML carries no `<source>` at all and the sources are inserted once
 * the screen is known (`useSyncExternalStore` over the media query): inserting them starts the
 * browser's own source selection under `preload="none"`, which fetches nothing until `play()`.
 * Swapping sources with `load()` would not do — an explicit `load()` makes Chromium ignore
 * `preload="none"` and download — and `media` on a video's `<source>` is not honoured by it.
 */
export function LightLoop({ name, className, marker }: { name: MotionLoopName; className?: string; marker: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const loop = motionLoop(BASE_PATH, name);
  const small = useSmallScreen();

  useEffect(() => {
    const video = ref.current;
    if (small === null || !video) return;
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
  }, [small]);

  return (
    <div aria-hidden="true" {...{ [marker]: "" }} className={cn("editorial-light", className)}>
      <video ref={ref} muted loop playsInline preload="none" poster={loop.poster} disablePictureInPicture tabIndex={-1}>
        {small !== null &&
          loop.sources.map((source) => <source key={source.type} src={small ? source.small : source.src} type={source.type} />)}
      </video>
    </div>
  );
}

/** `true` on a phone, `false` on a wider screen, `null` on the server and during hydration. */
function useSmallScreen(): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(MOTION_SMALL_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(MOTION_SMALL_QUERY).matches,
    () => null
  );
}
