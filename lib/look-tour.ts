/**
 * look-tour.ts — the golden demo's tour of looks, its pure half (founder, 2026-11-26: "as the
 * visitor scrolls down the golden demo, every new section changes to a random combination of
 * colour, transparency, font, CTA and dark & light mode; the language stays").
 *
 * From the look on screen, the next one, in which every control changes — so each section shows
 * all five at work: a palette, a face, a look of the action and a step of the picture's
 * transparency drawn at random from the ones not on screen, and the other side.
 * `components/editorial/look-tour.tsx` decides when; shared-ui's `showLook` puts it on the page
 * without storing it.
 */
import {
  APPEARANCES,
  BUTTON_STYLE_IDS,
  COLOR_SCHEME_IDS,
  FONT_IDS,
  IMAGE_TRANSPARENCY_STEPS,
} from "@tokenwise/shared-ui/theming";
import type { Look } from "@tokenwise/shared-ui";

/** What `<html>` says about each control; any of it may be missing. */
export type LookOnScreen = Partial<Record<keyof Look, string>>;

/** Read off `<html>`, the marks the header's controls read too. Dark is the page without the
 * light mark (`lib/theme-appearance.ts`). */
export function lookOf(html: { dataset: DOMStringMap }): LookOnScreen {
  const { scheme, font, appearance, button, imageTransparency } = html.dataset;
  return { scheme, font, appearance: appearance === "light" ? "light" : "dark", button, imageTransparency };
}

/** A look in which every control shows something other than `now`. */
export function nextLook(now: LookOnScreen, random: () => number = Math.random): Look {
  const other = <T extends string>(ids: readonly T[], current: string | undefined): T => {
    const rest = ids.filter((id) => id !== current);
    return rest[Math.floor(random() * rest.length)]!;
  };
  return {
    scheme: other(COLOR_SCHEME_IDS, now.scheme),
    font: other(FONT_IDS, now.font),
    appearance: other(APPEARANCES, now.appearance),
    button: other(BUTTON_STYLE_IDS, now.button),
    imageTransparency: other(IMAGE_TRANSPARENCY_STEPS, now.imageTransparency),
  };
}
