/**
 * button-styles.ts — the looks a page's action can wear, and the cycle the header's button
 * steps through (founder, 2026-11-25: "the CTA button, the same way as the font and the colour").
 *
 * A look is a character, not a corner radius (founder, the same day, on the first five that
 * differed by their corners: "five different visuals and an animation after the click"). Each
 * is one material of the page's own vocabulary — light, a key, glass, a running edge, ink — with
 * its own answer to the pointer and to the click:
 *
 *   glow    a pill of the accent in a pool of its own light        a ripple from where it was pressed
 *   block   a slab of the accent standing on a hard shadow         it is pushed down onto the shadow
 *   glass   a frosted pane over whatever lies behind it            a sheen crosses the pane
 *   orbit   a dark capsule with a light running round its edge     the edge flares and a ring leaves it
 *   marker  bare words on a stroke of marker                       the stroke rises over the words
 *
 * This file is the table and the cycle. What a look draws is `buttons.css`, the stylesheet a
 * host imports: rules keyed by `html[data-button="<id>"]` for the host's action (`[data-cta]`)
 * and for the header's icon. `action-press.ts` plays the click.
 *
 * Order is the cycle order; the first is what a host opens in unless it names another.
 * Adding a look is one entry here and its rules in `buttons.css` — `test/button-styles.test.ts`
 * fails on a look without them, and the template's `tests/button-style.spec.ts` holds every look
 * to WCAG AA on every palette.
 */

export interface ButtonStyle {
  id: string;
  /** Shown in the switcher's accessible name and in the menu. A proper name, like a palette's. */
  name: string;
}

export const BUTTON_STYLES = [
  { id: "glow", name: "Glow" },
  { id: "block", name: "Block" },
  { id: "glass", name: "Glass" },
  { id: "orbit", name: "Orbit" },
  { id: "marker", name: "Marker" },
] as const satisfies readonly ButtonStyle[];

export type ButtonStyleId = (typeof BUTTON_STYLES)[number]["id"];

export const BUTTON_STYLE_IDS: readonly ButtonStyleId[] = BUTTON_STYLES.map((s) => s.id);

/** The look a host opens in when it names none. */
export const DEFAULT_BUTTON_STYLE: ButtonStyleId = "glow";

export function isButtonStyleId(value: string | null | undefined): value is ButtonStyleId {
  return (BUTTON_STYLE_IDS as readonly string[]).includes(value ?? "");
}

export function buttonStyleById(id: ButtonStyleId): (typeof BUTTON_STYLES)[number] {
  return BUTTON_STYLES.find((s) => s.id === id)!;
}

/** The look after `id`, wrapping from the last back to the first. */
export function nextButtonStyleId(id: ButtonStyleId): ButtonStyleId {
  const index = BUTTON_STYLE_IDS.indexOf(id);
  return BUTTON_STYLE_IDS[(index + 1) % BUTTON_STYLE_IDS.length]!;
}
