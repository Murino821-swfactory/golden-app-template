/**
 * The hero films (T-460, 2026-11-17, after the cinematic landings of wismeo and PropCheck): real
 * footage behind the editorial hero instead of the light loop. A film is shown in its own
 * colours — like the AI hero image, it is a picture, not light the palette tints — played once
 * and held on its last frame (`components/editorial/hero-film.tsx`, placed by `stage.css`).
 *
 * The library is the factory's own footage (HeyGen generations of the tokenwise tower, the two
 * films of tokenwise.sk/how-it-works): `tower-dusk`, a van arriving at the tower at sunset and
 * its ground floor lighting up (HeyGen e617b644… desktop, 55e6cf91… phone), and `tower-night`,
 * a helicopter lifting a crate off the roof (65f6a98e… desktop, c649205c… phone). Each ships as
 * a 1280 × 720 film, a 540 × 960 phone cut and the first frame of both as posters
 * (`scripts/film/encode.sh`), H.264 only.
 *
 * A config names one with `patterns.landing.film`; a config that names none keeps its light loop.
 * The content call never sets it — the footage is the factory's, not a customer's.
 */
export const HERO_FILMS = ["tower-dusk", "tower-night"] as const;
export type HeroFilmName = (typeof HERO_FILMS)[number];

/** The film a config names, or `null` when it names none (or something stale). Pure. */
export function heroFilm(film: string | undefined): HeroFilmName | null {
  return (HERO_FILMS as readonly string[]).includes(film ?? "") ? (film as HeroFilmName) : null;
}

/** The next film of the library, round and round — what "Change image" shows a visitor. Pure. */
export function nextHeroFilm(current: HeroFilmName): HeroFilmName {
  return HERO_FILMS[(HERO_FILMS.indexOf(current) + 1) % HERO_FILMS.length]!;
}

export interface HeroFilmFiles {
  /** The 16:9 film a wide screen plays. */
  src: string;
  /** The 9:16 cut a phone plays (`FILM_SMALL_QUERY`). */
  small: string;
  /** The first frame of each — what is painted before the film, and instead of it under reduced motion. */
  poster: string;
  posterSmall: string;
}

/** A phone, by the page's own `sm` breakpoint — the same line the light loops draw. */
export const FILM_SMALL_QUERY = "(max-width: 639px)";

/** One film's files under this build's base path. */
export function heroFilmFiles(basePath: string, name: HeroFilmName): HeroFilmFiles {
  const base = `${basePath}/film/${name}`;
  return { src: `${base}.mp4`, small: `${base}-sm.mp4`, poster: `${base}.webp`, posterSmall: `${base}-sm.webp` };
}

/** What one film's four files may weigh together — every prototype ships the library. */
export const FILM_BUDGET_BYTES = 1_000_000;
