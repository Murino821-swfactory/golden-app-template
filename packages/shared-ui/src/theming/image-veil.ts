/**
 * image-veil.ts — whether the veil lies over a page's picture, and the toggle the header's button
 * flips (founder, 2026-11-26: "a configuration that turns the layer used today on and off; it
 * does not touch the transparency").
 *
 * The veil is the layer of the page's own ground a host lays over its picture so the words stay
 * readable (the template: the gradient over the hero's film or still scene). `on` is the page as
 * it has always been drawn; `off` leaves the picture in its own colours. It is a second control
 * beside the picture's transparency (`image-transparency.ts`), not a step of it: each has its own
 * attribute, its own stored value and its own rules, so neither moves the other. The state lives
 * where the palette, the face, the look and the transparency do: in `html[data-image-veil]` and
 * in localStorage.
 *
 * This file is the table and the toggle. WHAT the veil is, is the host's: its stylesheet keys its
 * picture's rules by the attribute (the template: `components/editorial/stage.css`).
 */

export const IMAGE_VEIL_STATES = ["on", "off"] as const;

export type ImageVeil = (typeof IMAGE_VEIL_STATES)[number];

/** The state a host opens on: the veil as the page has always drawn it. */
export const DEFAULT_IMAGE_VEIL: ImageVeil = "on";

export function isImageVeil(value: string | null | undefined): value is ImageVeil {
  return (IMAGE_VEIL_STATES as readonly string[]).includes(value ?? "");
}

/** On becomes off, off becomes on. */
export function nextImageVeil(state: ImageVeil): ImageVeil {
  return state === "on" ? "off" : "on";
}
