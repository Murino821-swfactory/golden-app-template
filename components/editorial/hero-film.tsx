"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FILM_SMALL_QUERY, heroFilmFiles, heroFilmHold, heroPictureFiles, type HeroFilmName, type HeroPictureFiles, type HeroStillName } from "@/lib/hero-film";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** An asset's picture in its two cuts — the phone's for a phone, chosen by the browser itself. */
function Poster({ files }: { files: HeroPictureFiles }) {
  return (
    <picture>
      <source media={FILM_SMALL_QUERY} srcSet={files.posterSmall} />
      {/* next/image cannot optimise in a static export; this is a plain decorative img. */}
      <img src={files.poster} alt="" decoding="async" fetchPriority="high" />
    </picture>
  );
}

/**
 * A still scene of the asset database (founder, 2026-11-25; `HERO_ASSETS` in `lib/hero-film.ts`):
 * the place, the veil and the two cuts of a film's first frame, and nothing else — no video, no
 * script. Decoration only. "Change image" is the only way to one (a config opens on a film), so
 * a still is never in the static HTML and costs a visitor nothing until they ask for it.
 */
export function HeroStill({ name }: { name: HeroStillName }) {
  return (
    <div aria-hidden="true" data-hero-film={name} data-hero-kind="still" className="editorial-film">
      <Poster files={heroPictureFiles(BASE_PATH, name)} />
    </div>
  );
}

/**
 * The hero film (T-460, after the cinematic landings of wismeo and PropCheck): real footage
 * across the first screen, under the words — in its own colours, like the AI hero image, and
 * faded into the page by `stage.css`. Decoration only: hidden from assistive technology, no
 * controls, never focusable.
 *
 * The first frame is a `<picture>` in the static HTML — the phone's cut for a phone, chosen by
 * the browser before any script runs — so the first paint is the film's opening picture. The
 * video lies over it, invisible until it is actually playing (`data-film-on`), and starts from
 * that same frame.
 *
 * It is told in two parts (founder, 2026-11-18). Part one plays on arrival and rests where the
 * story pauses (`heroFilmHold`: the van has stopped, the door stands open). The visitor's first
 * scroll starts part two (the van drives away), and the film rests on its last frame — it never
 * loops: a story that jumps back to its start reads as a glitch. `data-film-part` says which
 * part the film is in. A page that opens already scrolled plays straight through.
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
    const hold = heroFilmHold(name, small);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const thrift = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    let visible = false;
    let released = window.scrollY > 0;
    let frame = 0;
    // Which part the film is in, for the page's tests and styles. Written to the element, not
    // kept in state: nothing is drawn from it, and React leaves an attribute alone whose prop
    // did not change.
    const mark = () => {
      if (video.parentElement) video.parentElement.dataset.filmPart = released ? "2" : "1";
    };
    mark();

    /** Part one ends here: stop on the frame where the story pauses, until the first scroll. */
    const rest = () => {
      frame = 0;
      if (released || video.paused) return;
      if (video.currentTime >= hold) video.pause();
      else frame = requestAnimationFrame(rest);
    };
    const sync = () => {
      const resting = !released && video.currentTime >= hold;
      if (visible && !calm.matches && !thrift && !video.ended && !resting) {
        video.play().catch(() => {});
        if (!released && !frame) frame = requestAnimationFrame(rest);
      } else video.pause();
    };
    const shown = () => {
      setOn(true);
      if (!released && !frame) frame = requestAnimationFrame(rest);
    };
    const release = () => {
      if (released || window.scrollY <= 0) return;
      released = true;
      mark();
      window.removeEventListener("scroll", release);
      sync();
    };
    const watch = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      sync();
    });
    watch.observe(video);
    calm.addEventListener("change", sync);
    video.addEventListener("playing", shown);
    if (!released) window.addEventListener("scroll", release, { passive: true });
    return () => {
      watch.disconnect();
      cancelAnimationFrame(frame);
      calm.removeEventListener("change", sync);
      video.removeEventListener("playing", shown);
      window.removeEventListener("scroll", release);
    };
  }, [small, name]);

  return (
    <div aria-hidden="true" data-hero-film={name} data-hero-kind="film" data-film-part="1" data-film-on={on ? "" : undefined} className="editorial-film">
      <Poster files={files} />
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
