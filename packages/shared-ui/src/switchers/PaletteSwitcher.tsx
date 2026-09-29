"use client";

import { COLOR_SCHEME_IDS, PALETTES, nextSchemeId, type ColorSchemeId } from "../theming/color-schemes";
import { schemeStore } from "../theming/stores";
import { format, type HeaderLabels } from "../header/labels";

/**
 * "Change colour" — one button that steps to the next palette and wraps after the last
 * [founder decision 2026-09-24]. Fifteen swatches do not fit a 390px header, and a picker
 * asks the visitor for a decision they did not come to make; one step at a time is play.
 *
 * An icon and nothing else, at every width [founder decision 2026-09-28]: a colour wheel,
 * like the cart and the user control beside it. The wheel replaces the pair swatch — which
 * palette is on screen is what the whole page already answers — and it is hollow, so it
 * keeps the weight of the 1.5px line icons around it. The words live in `aria-label`.
 */

/** The hue circle. Hollow: the mask keeps the outer 3px and drops the middle. */
const WHEEL =
  "conic-gradient(from 90deg, #ff2d55, #ff9f0a, #ffd60a, #32d74b, #00c7be, #0a84ff, #7d5cff, #ff2d55)";
const HOLLOW = "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))";

export function PaletteSwitcher({
  defaultScheme,
  labels,
}: {
  defaultScheme: ColorSchemeId;
  labels: Pick<HeaderLabels, "changeColour" | "changeColourLabel">;
}) {
  const active = schemeStore.use(defaultScheme);

  return (
    <button
      type="button"
      data-shared-control="palette"
      onClick={() => schemeStore.select(nextSchemeId(active))}
      // With no visible text this is the control's only name, so it says everything a
      // sighted visitor gets from the page: which palette, and where in the cycle it is.
      aria-label={format(labels.changeColourLabel, {
        name: PALETTES[active].name,
        position: COLOR_SCHEME_IDS.indexOf(active) + 1,
        total: COLOR_SCHEME_IDS.length,
      })}
      className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
    >
      {/* A quarter turn on hover: the button cycles, and the wheel says so without a word. */}
      <span
        aria-hidden
        className="h-[18px] w-[18px] rounded-full transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
        style={{ background: WHEEL, WebkitMask: HOLLOW, mask: HOLLOW }}
      />
    </button>
  );
}
