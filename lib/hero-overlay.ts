/**
 * What is drawn over the AI hero image.
 *
 * Founder decision 2026-10-09: the image is shown FULLY visible — no even tint over it.
 * (Until then a 75 % layer of the palette's background covered the whole image, which
 * made it read as a dark smudge.) Contrast over the image is still NOT guaranteed
 * (founder decision 2026-09-25); readability comes from a text shadow in the palette's
 * background colour on the hero copy (`HERO_TEXT_SHADOW`), which covers only the glyph
 * edges, and from "Change colour" when an image and a palette still read poorly together.
 *
 * The one remaining layer is a short fade into `var(--background)` across the bottom
 * strip, so the hero runs into the next section without a hard edge. Both follow
 * "Change colour" with no code. Record: sw-factory docs/decisions/prototype-hero-image.md.
 */
export const HERO_FADE_START = 80;

/** The overlay's CSS background: only the fade out of the bottom strip, no tint. */
export function heroOverlayBackground(fadeStart: number = HERO_FADE_START): string {
  return `linear-gradient(to bottom, transparent ${fadeStart}%, var(--background) 100%)`;
}

/** Applied to the hero copy only while an image is shown. */
export const HERO_TEXT_SHADOW =
  "0 1px 2px var(--background), 0 0 12px var(--background), 0 0 24px var(--background)";
