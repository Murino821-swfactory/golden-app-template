/**
 * image-transparency.ts — how transparent a page's picture is, and the cycle the header's
 * button steps through (founder, 2026-11-25: "a new button in the header's menu that sets the
 * picture's transparency from 0 to 100 % in tens").
 *
 * A step is a percentage: `0` is the picture as the page draws it, each step is ten per cent
 * more transparent, at `100` none of it is left. The ids are the numbers as strings, because a
 * step lives where the palette, the face and the look do: in `html[data-image-transparency]`
 * and in localStorage.
 *
 * This file is the table and the cycle. WHAT fades is the host's: its stylesheet keys its
 * picture's rules by the attribute (the template: the hero's film and still scenes,
 * `components/editorial/stage.css`).
 */

export const IMAGE_TRANSPARENCY_STEPS = ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90", "100"] as const;

export type ImageTransparency = (typeof IMAGE_TRANSPARENCY_STEPS)[number];

/** The step a host opens on: the picture as the page draws it. */
export const DEFAULT_IMAGE_TRANSPARENCY: ImageTransparency = "0";

export function isImageTransparency(value: string | null | undefined): value is ImageTransparency {
  return (IMAGE_TRANSPARENCY_STEPS as readonly string[]).includes(value ?? "");
}

/** Ten per cent more; after 100 % back to 0 %. */
export function nextImageTransparency(step: ImageTransparency): ImageTransparency {
  const index = IMAGE_TRANSPARENCY_STEPS.indexOf(step);
  return IMAGE_TRANSPARENCY_STEPS[(index + 1) % IMAGE_TRANSPARENCY_STEPS.length]!;
}
