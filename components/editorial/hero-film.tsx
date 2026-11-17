"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FILM_SMALL_QUERY, heroFilmFiles, type HeroFilmName } from "@/lib/hero-film";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * The hero film (T-460, after the cinematic landings of wismeo and PropCheck): real footage
 * across the first screen, under the words — in its own colours, like the AI hero image, and
 * faded into the page by `stage.css`. Decoration only: hidden from assistive technology, no
 * controls, never focusable.
 *
 * The first frame is a `<picture>` in the static HTML — the phone's cut for a phone, chosen by
 * the browser before any script runs — so the first paint is the film's opening picture. The
 * video lies over it, invisible until it is actually playing (`data-film-on`), and starts from
 * that same frame. It plays ONCE and rests on its last frame: the films tell a small story (a
 * van arrives, a floor lights up), and a story that jumps back to its start reads as a glitch.
 *
 * It plays only on screen and only for a visitor who asked for neither calm nor thrift: under
 * reduced motion or Save-Data the poster stays and the film is never downloaded
 * (`preload="none"`, and the `<source>` is inserted on the client once the screen is known —
 * the same reasons as `LightLoop`: Chromium does not honour `media` on a video's `<source>`, and
 * an explicit `load()` would ignore `preload="none"`).
 *
 * The parent keys this component by the film's name, so "Change image" mounts a fresh one.
 */
export function HeroFilm({ name }: { name: HeroFilmName }) {
  const ref = useRef<HTMLVideoElement>(null);
  const files = heroFilmFiles(BASE_PATH, name);
  const small = useSmallScreen();
  const [on, setOn] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (small === null || !video) return;
    video.muted = true;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const thrift = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    let visible = false;
    const sync = () => {
      if (visible && !calm.matches && !thrift && !video.ended) video.play().catch(() => {});
      else video.pause();
    };
    const shown = () => setOn(true);
    const watch = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    });
    watch.observe(video);
    calm.addEventListener("change", sync);
    video.addEventListener("playing", shown);
    return () => {
      watch.disconnect();
      calm.removeEventListener("change", sync);
      video.removeEventListener("playing", shown);
    };
  }, [small]);

  return (
    <div aria-hidden="true" data-hero-film={name} data-film-on={on ? "" : undefined} className="editorial-film">
      <picture>
        <source media={FILM_SMALL_QUERY} srcSet={files.posterSmall} />
        {/* next/image cannot optimise in a static export; this is a plain decorative img. */}
        <img src={files.poster} alt="" decoding="async" fetchPriority="high" />
      </picture>
      <video ref={ref} muted playsInline preload="none" disablePictureInPicture tabIndex={-1}>
        {small !== null && <source src={small ? files.small : files.src} type="video/mp4" />}
      </video>
    </div>
  );
}

/** `true` on a phone, `false` on a wider screen, `null` on the server and during hydration. */
function useSmallScreen(): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(FILM_SMALL_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(FILM_SMALL_QUERY).matches,
    () => null
  );
}
