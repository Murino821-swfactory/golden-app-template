"use client";

import type { CSSProperties } from "react";
import { BUTTON_STYLE_IDS, buttonStyleById, nextButtonStyleId, type ButtonStyleId } from "../theming/button-styles";
import { buttonStore } from "../theming/stores";
import { format, type HeaderLabels } from "../header/labels";

/**
 * One button that steps to the next look of the page's action, like "Change colour" and the
 * font button beside it [founder, 2026-11-25].
 *
 * `inline` is the header bar: an icon among icons — a small action drawn from the very
 * variables the page's action reads (`--shared-button-*`), so the icon is the look on screen,
 * as "Aa" is the face on screen. The look's name is in `aria-label`, and spelled out in the
 * menu below 1024px. `row` is that menu panel: "Button: ▭ Pill", full width.
 */

/** The look in small. The corner is scaled with the icon: the rounded corner of a 48px action
 * set unscaled on a 13px icon would read as a pill. */
const GLYPH: CSSProperties = {
  width: 22,
  height: 13,
  borderRadius: "calc(var(--shared-button-radius) * 0.3)",
  background: "var(--shared-button-bg)",
  border: "1.5px solid var(--shared-button-edge)",
};

export function ButtonSwitcher({
  defaultStyle,
  labels,
  layout = "inline",
}: {
  defaultStyle: ButtonStyleId;
  labels: Pick<HeaderLabels, "button" | "changeButtonLabel">;
  layout?: "inline" | "row";
}) {
  const active = buttonStore.use(defaultStyle);
  const look = buttonStyleById(active);
  const ariaLabel = format(labels.changeButtonLabel, {
    name: look.name,
    position: BUTTON_STYLE_IDS.indexOf(active) + 1,
    total: BUTTON_STYLE_IDS.length,
  });
  const onClick = () => buttonStore.select(nextButtonStyleId(active));

  if (layout === "row") {
    return (
      <button
        type="button"
        data-shared-control="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className="flex min-h-14 w-full items-center justify-between border-b border-[var(--shared-rule)] text-left text-[15px] uppercase tracking-[0.12em] text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)]"
        style={{ fontFamily: "var(--shared-font-mono)" }}
      >
        <span>{labels.button}</span>
        <span className="flex items-center gap-3 normal-case tracking-normal" style={{ fontFamily: "var(--shared-font-sans)" }}>
          <span aria-hidden className="block shrink-0" style={GLYPH} />
          {look.name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-shared-control="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
    >
      {/* A little larger under the pointer: the button cycles, and the icon says it can be pressed. */}
      <span
        aria-hidden
        className="block transition-transform duration-200 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        style={GLYPH}
      />
    </button>
  );
}
