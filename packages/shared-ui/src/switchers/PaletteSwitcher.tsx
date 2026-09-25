"use client";

import {
  COLOR_SCHEME_IDS,
  PALETTES,
  nextSchemeId,
  rolesFor,
  type ColorSchemeId,
} from "../theming/color-schemes";
import { schemeStore } from "../theming/stores";
import { format, type HeaderLabels } from "../header/labels";

/**
 * "Change colour" — one button that steps to the next palette and wraps after the last
 * [founder decision 2026-09-24]. Fifteen swatches do not fit a 390px header, and a picker
 * asks the visitor for a decision they did not come to make; one step at a time is play.
 *
 * Below 640px only the swatch shows; the accessible name stays whole.
 */
export function PaletteSwitcher({
  defaultScheme,
  labels,
}: {
  defaultScheme: ColorSchemeId;
  labels: Pick<HeaderLabels, "changeColour" | "changeColourLabel">;
}) {
  const active = schemeStore.use(defaultScheme);
  const roles = rolesFor(active);

  return (
    <button
      type="button"
      data-shared-control="palette"
      onClick={() => schemeStore.select(nextSchemeId(active))}
      // Starts with the visible label (WCAG 2.5.3, label in name), then says what a sighted
      // visitor learns from the page itself: which palette, and where in the cycle it is.
      aria-label={format(labels.changeColourLabel, {
        name: PALETTES[active].name,
        position: COLOR_SCHEME_IDS.indexOf(active) + 1,
        total: COLOR_SCHEME_IDS.length,
      })}
      className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md px-2 text-xs font-medium text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
    >
      {/* Both halves of the pair, painted by the same pure rule the page uses — so the
          swatch can never advertise a colour the scheme does not actually produce. */}
      <span
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--shared-ink)]/60"
        style={{
          background: `linear-gradient(90deg, ${roles.background} 50%, ${roles.primary} 50%)`,
        }}
      />
      <span className="hidden whitespace-nowrap sm:inline">{labels.changeColour}</span>
    </button>
  );
}
