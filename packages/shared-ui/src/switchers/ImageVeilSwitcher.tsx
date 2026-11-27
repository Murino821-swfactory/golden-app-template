"use client";

import { nextImageVeil, type ImageVeil } from "../theming/image-veil";
import { imageVeilStore } from "../theming/stores";
import { format, type HeaderLabels } from "../header/labels";

/**
 * Whether the veil lies over the page's picture — one button that takes it off and lays it back,
 * right after the picture's transparency [founder, 2026-11-26: "a configuration that turns the
 * layer used today on and off; it does not touch the transparency"]. Its own store, its own
 * attribute: stepping one never moves the other.
 *
 * `inline` is the header bar: an icon and nothing else, like its neighbours, in the same 1.5px
 * line. The icon is a layer laid over a layer — the veil over the picture — faded and struck
 * through while the veil is off, as the moon or the sun is the side on screen. (Three bands of
 * haze were tried first and read as a filter.) The state is in `aria-label`, and spelled out in
 * the menu below 1024px: `row` is that menu's "Image veil: ◇ On", full width.
 */

/** The veil: a sheet seen from above. */
const SHEET = "M10 3.5 17 7.5 10 11.5 3 7.5Z";
/** The picture under it: the edge of the sheet beneath. */
const UNDER = "M3 11.25 10 15.25 17 11.25";
/** The stroke that says the veil is off. */
const STRIKE = "M3.75 3.75l12.5 12.5";

function VeilIcon({ state }: { state: ImageVeil }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      data-image-veil-icon={state}
    >
      <g style={state === "off" ? { opacity: 0.45 } : undefined}>
        <path d={SHEET} />
        <path d={UNDER} />
      </g>
      {state === "off" && <path d={STRIKE} />}
    </svg>
  );
}

export function ImageVeilSwitcher({
  defaultState,
  labels,
  layout = "inline",
}: {
  defaultState: ImageVeil;
  labels: Pick<HeaderLabels, "imageVeil" | "changeImageVeilLabel" | "imageVeilOn" | "imageVeilOff">;
  layout?: "inline" | "row";
}) {
  const active = imageVeilStore.use(defaultState);
  const name = active === "on" ? labels.imageVeilOn : labels.imageVeilOff;
  const ariaLabel = format(labels.changeImageVeilLabel, { name });
  const onClick = () => imageVeilStore.select(nextImageVeil(active));

  if (layout === "row") {
    return (
      <button
        type="button"
        data-shared-control="veil"
        onClick={onClick}
        aria-label={ariaLabel}
        className="flex min-h-14 w-full items-center justify-between border-b border-[var(--shared-rule)] text-left text-[15px] uppercase tracking-[0.12em] text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)]"
        style={{ fontFamily: "var(--shared-font-mono)" }}
      >
        <span>{labels.imageVeil}</span>
        <span className="flex items-center gap-2 normal-case tracking-normal" style={{ fontFamily: "var(--shared-font-sans)" }}>
          <VeilIcon state={active} />
          {name}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-shared-control="veil"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
    >
      <VeilIcon state={active} />
    </button>
  );
}
