"use client";

import { FONT_IDS, fontById, nextFontId, type FontId } from "../theming/font-families";
import { fontStore } from "../theming/stores";
import { format, type HeaderLabels } from "../header/labels";

/**
 * One button that steps to the next typeface, like "Change colour". "Aa" is set in the face
 * on screen, so the button previews what it controls.
 *
 * `inline` is the header bar (≥640px): "Aa Inter". `row` is the mobile menu panel:
 * "Font: Inter", full width.
 */
export function FontSwitcher({
  defaultFont,
  labels,
  layout = "inline",
}: {
  defaultFont: FontId;
  labels: Pick<HeaderLabels, "font" | "changeFontLabel">;
  layout?: "inline" | "row";
}) {
  const active = fontStore.use(defaultFont);
  const font = fontById(active);
  const ariaLabel = format(labels.changeFontLabel, {
    name: font.name,
    position: FONT_IDS.indexOf(active) + 1,
    total: FONT_IDS.length,
  });
  const onClick = () => fontStore.select(nextFontId(active));

  if (layout === "row") {
    return (
      <button
        type="button"
        data-shared-control="font"
        onClick={onClick}
        aria-label={ariaLabel}
        className="flex min-h-14 w-full items-center justify-between border-b border-[var(--shared-rule)] text-left text-[15px] uppercase tracking-[0.12em] text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)]"
        style={{ fontFamily: "var(--shared-font-mono)" }}
      >
        <span>{labels.font}</span>
        <span className="normal-case tracking-normal" style={{ fontFamily: font.stack }}>
          Aa {font.name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-shared-control="font"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
    >
      <span aria-hidden className="text-sm" style={{ fontFamily: font.stack }}>
        Aa
      </span>
      <span className="whitespace-nowrap">{font.name}</span>
    </button>
  );
}
