"use client";

import { useEffect, useRef } from "react";
import { motionLoop, type MotionLoopName } from "@/lib/editorial";
import { pinProgress } from "@/lib/scene";
import { cn } from "@/lib/utils";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * A Blender clip the scroll scrubs (T-368, after apple.com's pinned sequences and the models
 * stage on tokenwise.sk): inside a pinned section the clip's time follows the pin's progress,
 * so the page's hand turns the scene — the glass layers assemble exactly as the steps advance.
 * Where nothing pins (a phone, a short window) it plays through once when it comes into view
 * and holds its last frame. Decoration, like `LightLoop`: hidden from assistive technology,
 * tinted by the palette through `.editorial-light`, nothing under reduced motion but the still.
 *
 * `runway` is the selector of the tall box the sticky stage travels in (`[data-steps-pin]`);
 * the stage is the nearest `[data-scrub-stage]`. The clip loads only once the runway comes
 * within a viewport of being seen; encoded with short keyframe intervals (`GOP=12`,
 * `scripts/motion/encode.sh`) so a seek costs a few frames, not a second of decoding.
 */
export function ScrubClip({ name, marker, className, runway }: { name: MotionLoopName; marker: string; className?: string; runway: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const loop = motionLoop(BASE_PATH, name);

  useEffect(() => {
    const video = ref.current;
    const stage = video?.closest<HTMLElement>("[data-scrub-stage]");
    const run = video?.closest<HTMLElement>(runway);
    if (!video || !stage || !run) return;
    video.muted = true;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    let near = false;
    let played = false;
    let frame = 0;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      if (!near || calm.matches) return;
      const rect = run.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(stage).top) || 0;
      const progress = pinProgress({ runwayTop: rect.top, runwayHeight: rect.height, stageHeight: stage.offsetHeight, stickyTop: top });
      if (progress === null) {
        if (!played && rect.top < window.innerHeight * 0.8 && rect.bottom > 0) {
          played = true;
          video.play().catch(() => {});
        }
        return;
      }
      if (!video.paused) video.pause();
      if (video.readyState >= 1 && Number.isFinite(video.duration)) {
        const time = progress * Math.max(0, video.duration - 1 / 24);
        if (Math.abs(video.currentTime - time) > 1 / 48) video.currentTime = time;
      }
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      frame = requestAnimationFrame(update);
    };
    const watch = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || calm.matches) return;
      near = true;
      video.preload = "auto";
      video.load();
      watch.disconnect();
      schedule();
    }, { rootMargin: "100% 0px" });
    watch.observe(run);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    video.addEventListener("loadeddata", schedule);
    calm.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      watch.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      video.removeEventListener("loadeddata", schedule);
      calm.removeEventListener("change", schedule);
    };
  }, [runway]);

  return (
    <div aria-hidden="true" {...{ [marker]: "" }} data-scrub="" className={cn("editorial-light", className)}>
      <video ref={ref} muted playsInline preload="none" poster={loop.poster} disablePictureInPicture tabIndex={-1}>
        {loop.sources.map((source) => (
          <source key={source.type} src={source.src} type={source.type} />
        ))}
      </video>
    </div>
  );
}
