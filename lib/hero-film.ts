/**
 * The hero films (T-460, 2026-11-17, after the cinematic landings of wismeo and PropCheck): real
 * footage behind the editorial hero instead of the light loop. A film is shown in its own
 * colours — like the AI hero image, it is a picture, not light the palette tints
 * (`components/editorial/hero-film.tsx`, placed by `stage.css`).
 *
 * Every film is told in TWO PARTS (founder, 2026-11-18): it plays to the moment its story pauses
 * and rests there (`HERO_FILM_HOLD` — the van has arrived and the door stands open); the
 * visitor's first scroll plays the rest (the van drives away) and the film rests on its last frame.
 *
 * The library is the factory's own footage from HeyGen — the clean generations behind the videos
 * in its assets folder (the finished videos carry burnt-in captions, so they cannot lie under a
 * headline):
 *   tower-dusk    a van arrives at the tower at sunset, a door opens · the van leaves, a floor lights
 *                 (e617b644… wide, 55e6cf91… phone; the opening film of tokenwise.sk/how-it-works)
 *   tower-night   a helicopter lowers to the roof and takes a crate · it flies away
 *                 (65f6a98e… wide, c649205c… phone)
 *   bakery-oven   a baker draws loaves from a wood oven (77f8273f…, reel "what matters")
 *   bakery-house  a bakery at night with its front open, every floor at work (96f969a8…)
 *   rail-yard     a freight train leaves a rain-wet yard at night (da77f618…, reel v5)
 * Each ships as a 1280 × 720 film, a 540 × 960 phone cut and the first frame of both as posters
 * (encoded by `scripts/film/encode.sh`, removed 2026-11-22 — git history), H.264 only; sources of the last three are 9:16 only, so their wide
 * cut is a band of the same shot.
 *
 * A config names one with `patterns.landing.film`; a config that names none keeps its light loop
 * and its export carries no film at all (`scripts/prune-film.mjs`). The content call never sets
 * it — the footage is the factory's, not a customer's.
 */
export const HERO_FILMS = ["tower-dusk", "tower-night", "bakery-oven", "bakery-house", "rail-yard"] as const;
export type HeroFilmName = (typeof HERO_FILMS)[number];

/** The film a config names, or `null` when it names none (or something stale). Pure. */
export function heroFilm(film: string | undefined): HeroFilmName | null {
  return (HERO_FILMS as readonly string[]).includes(film ?? "") ? (film as HeroFilmName) : null;
}

/** The next film of the library, round and round — what "Change image" shows a visitor. Pure. */
export function nextHeroFilm(current: HeroFilmName): HeroFilmName {
  return HERO_FILMS[(HERO_FILMS.indexOf(current) + 1) % HERO_FILMS.length]!;
}

/**
 * Where each film rests until the visitor's first scroll, in seconds — `[wide, phone]`, because
 * the two cuts of a tower film are different takes. Read off the frames: the last moment before
 * the second half of the story starts.
 */
const HERO_FILM_HOLD: Record<HeroFilmName, readonly [number, number]> = {
  "tower-dusk": [4.2, 4.2],
  "tower-night": [4.0, 4.0],
  "bakery-oven": [2.6, 2.6],
  "bakery-house": [2.4, 2.4],
  "rail-yard": [2.2, 2.2],
};

/** The second at which this film's first part ends on this screen. Pure. */
export function heroFilmHold(name: HeroFilmName, small: boolean): number {
  return HERO_FILM_HOLD[name][small ? 1 : 0];
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

/** What one film's four files may weigh together. */
export const FILM_BUDGET_BYTES = 1_000_000;
