"use client";

import { BUTTON_STYLE_IDS, buttonStyleById, nextButtonStyleId, type ButtonStyleId } from "../theming/button-styles";
import { buttonStore } from "../theming/stores";
import { format, type HeaderLabels } from "../header/labels";

/**
 * One button that steps to the next look of the page's action, like "Change colour" and the
 * font button beside it [founder, 2026-11-25].
 *
 * `inline` is the header bar: an icon among icons — the look on screen in small, as "Aa" is the
 * face on screen. `buttons.css` draws it (`.shared-button-glyph`, one rule per look, from the
 * same tokens the action is drawn from), so the icon repaints with the palette too. The look's
 * name is in `aria-label`, and spelled out in the menu below 1024px. `row` is that menu panel:
 * "Button: ▭ Glow", full width.
 */

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
          <span aria-hidden className="shared-button-glyph shrink-0" />
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
    >
      <span aria-hidden className="shared-button-glyph" />
    </button>
  );
}
