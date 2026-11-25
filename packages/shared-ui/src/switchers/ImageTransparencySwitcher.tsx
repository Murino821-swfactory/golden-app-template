"use client";

import {
  IMAGE_TRANSPARENCY_STEPS,
  nextImageTransparency,
  type ImageTransparency,
} from "../theming/image-transparency";
import { imageTransparencyStore } from "../theming/stores";
import { format, type HeaderLabels } from "../header/labels";

/**
 * How transparent the page's picture is — one button that makes it ten per cent more so, from
 * 0 to 100 % and round again, beside the colour, the font, dark/light and the action's look
 * [founder, 2026-11-25].
 *
 * `inline` is the header bar: an icon and nothing else, like its neighbours, in the 1.5px line
 * of the cart and the figure — a picture in its frame. The picture inside fades as the page's
 * does (the step on screen, as "Aa" is the face on screen); at 100 % the frame is empty. The
 * step is in `aria-label`, and spelled out in the menu below 1024px. `row` is that menu panel:
 * "Image transparency: ▨ 30 %", full width.
 */

/** A sun and a ridge: what the frame holds. */
const RIDGE = "M3.4 14.3 7.3 10.4l2.7 2.7 2.3-2.3 4.3 4.3";

function ImageIcon({ step }: { step: ImageTransparency }) {
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
      data-image-icon={step}
    >
      <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2" />
      <g data-image-ink style={{ opacity: 1 - Number(step) / 100 }}>
        <circle cx="7" cy="7.9" r="1.3" />
        <path d={RIDGE} />
      </g>
    </svg>
  );
}

export function ImageTransparencySwitcher({
  defaultStep,
  labels,
  layout = "inline",
}: {
  defaultStep: ImageTransparency;
  labels: Pick<HeaderLabels, "imageTransparency" | "changeImageTransparencyLabel">;
  layout?: "inline" | "row";
}) {
  const active = imageTransparencyStore.use(defaultStep);
  const ariaLabel = format(labels.changeImageTransparencyLabel, {
    value: active,
    position: IMAGE_TRANSPARENCY_STEPS.indexOf(active) + 1,
    total: IMAGE_TRANSPARENCY_STEPS.length,
  });
  const onClick = () => imageTransparencyStore.select(nextImageTransparency(active));

  if (layout === "row") {
    return (
      <button
        type="button"
        data-shared-control="image"
        onClick={onClick}
        aria-label={ariaLabel}
        className="flex min-h-14 w-full items-center justify-between border-b border-[var(--shared-rule)] text-left text-[15px] uppercase tracking-[0.12em] text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)]"
        style={{ fontFamily: "var(--shared-font-mono)" }}
      >
        <span>{labels.imageTransparency}</span>
        <span className="flex items-center gap-2 normal-case tracking-normal" style={{ fontFamily: "var(--shared-font-sans)" }}>
          <ImageIcon step={active} />
          {active} %
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-shared-control="image"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[var(--shared-ink)] transition-colors hover:text-[var(--shared-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--shared-accent)]"
    >
      <ImageIcon step={active} />
    </button>
  );
}
