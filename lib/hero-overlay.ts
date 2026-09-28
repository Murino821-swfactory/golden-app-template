/**
 * How opaque the palette's background is over the AI hero image.
 *
 * Contrast over the image is NOT guaranteed, by founder decision (2026-09-25): the
 * palettes keep their text barely above WCAG AA (muted text 4.5–4.6 : 1), so a guarantee
 * against the worst pixel an image can contain (pure white) needs 86–97 % cover — the
 * image would be all but invisible. If a generated image and a palette read poorly
 * together, the visitor clicks "Change colour" and the overlay, which is drawn in
 * `var(--background)`, repaints with the next palette.
 *
 * The overlay is drawn in the active palette's background, so it follows "Change colour"
 * with no code, and a gradient into the same colour at the bottom lets the hero run into
 * the next section. Record: sw-factory docs/decisions/prototype-hero-image.md.
 */
export const HERO_OVERLAY_ALPHA = 0.75;

/** The overlay's CSS background, one layer per concern: the even tint, then the fade out. */
export function heroOverlayBackground(alpha: number = HERO_OVERLAY_ALPHA): string {
  const percent = Math.round(alpha * 100);
  return [
    "linear-gradient(to bottom, transparent 55%, var(--background) 100%)",
    `linear-gradient(color-mix(in srgb, var(--background) ${percent}%, transparent), color-mix(in srgb, var(--background) ${percent}%, transparent))`,
  ].join(", ");
}
