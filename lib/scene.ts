/**
 * scene.ts — the three motion proposals of T-368 (2026-11-07), after the founder's reading of
 * apple.com's ProLED XDR page: `stage` (the backlight — whole zones of light switching on, a
 * device rendered in a card, an orb rising behind the close), `beam` (one stage light — every
 * group lit by a wipe of light, glass layers assembling under the beam as the steps advance)
 * and `glass` (a material study — frosted glass and chrome drifting beside the words, cards
 * dealt onto glass). Each is a whole language for the editorial page, not a hero swap.
 *
 * The scene is a BUILD-TIME switch read from `NEXT_PUBLIC_EDITORIAL_SCENE`, so the three
 * previews are three static exports of the same tree; a build without it is the editorial
 * page as before (`hero-light`, `closing-light`). Once the founder picks one, that scene
 * becomes the default and the other two leave the repository with their loops — no prototype
 * ships light it never shows.
 */
import type { MotionLoopName } from "./editorial";

export const SCENES = ["stage", "beam", "glass"] as const;
export type SceneId = (typeof SCENES)[number];

/** The scene a build asked for; anything but the three names — unset, empty, a typo — is none. */
export function sceneFrom(value: string | undefined | null): SceneId | null {
  return (SCENES as readonly string[]).includes(value ?? "") ? (value as SceneId) : null;
}

export const SCENE: SceneId | null = sceneFrom(process.env.NEXT_PUBLIC_EDITORIAL_SCENE);

export interface SceneLoops {
  /** Behind the hero's headline (only without an AI image). */
  hero: MotionLoopName;
  /** Behind the closing band's words. */
  closing: MotionLoopName;
  /** Inside the first (wide) feature card — the rendered object; none keeps the card plain. */
  card: MotionLoopName | null;
  /** Behind How it works, scrubbed by the steps' pin on a desktop, played once on a phone. */
  steps: MotionLoopName | null;
}

/** Which Blender loop plays where in a scene; `null` is the editorial page of T-340. */
export function sceneLoops(scene: SceneId | null): SceneLoops {
  switch (scene) {
    case "stage":
      return { hero: "stage-field", closing: "stage-orb", card: "stage-slab", steps: null };
    case "beam":
      return { hero: "beam-cone", closing: "beam-cone", card: null, steps: "beam-layers" };
    case "glass":
      return { hero: "glass-objects", closing: "glass-objects", card: null, steps: null };
    default:
      return { hero: "hero-light", closing: "closing-light", card: null, steps: null };
  }
}

/**
 * How far a pinned section has travelled: 0 when the runway's top reaches the sticky top, 1
 * when the stage has run out of runway. `null` when there is no pin — the runway is no taller
 * than the stage (a phone, a short window, reduced motion), so there is nothing to scrub and a
 * clip plays through once instead. Pure, for `tests/editorial-scenes.spec.ts`.
 */
export function pinProgress(input: { runwayTop: number; runwayHeight: number; stageHeight: number; stickyTop: number }): number | null {
  const travel = input.runwayHeight - input.stageHeight;
  if (travel < 8) return null;
  return Math.min(1, Math.max(0, (input.stickyTop - input.runwayTop) / travel));
}
