import type { ButtonStyleId } from "./button-styles";
import type { Appearance, ColorSchemeId } from "./color-schemes";
import type { FontId } from "./font-families";
import type { ImageTransparency } from "./image-transparency";
import { appearanceStore, buttonStore, fontStore, imageTransparencyStore, schemeStore } from "./stores";

/**
 * show-look.ts — a look put on the page for this view only (2026-11-27, the golden demo's tour:
 * "every new section a random combination of colour, transparency, font, CTA and dark/light; the
 * language stays").
 *
 * A look is what the header's five restyling controls set: palette, face, dark or light, the
 * action's look and the picture's transparency. The language is not part of it — it is another
 * document. `showLook` moves the page and the controls exactly as their clicks do (the same
 * attributes, shadcn's `.dark` class, the same events, so every icon follows) but stores nothing:
 * a reload brings back the visitor's own choice or the host's first-visit look, and a look the
 * visitor never chose never reaches tokenwise.sk, which shares the golden demo's origin.
 */
export interface Look {
  scheme: ColorSchemeId;
  font: FontId;
  appearance: Appearance;
  button: ButtonStyleId;
  imageTransparency: ImageTransparency;
}

/** Shows every control `look` names; a control it leaves out stays as it is. */
export function showLook(look: Partial<Look>): void {
  if (look.scheme !== undefined) schemeStore.show(look.scheme);
  if (look.font !== undefined) fontStore.show(look.font);
  if (look.appearance !== undefined) appearanceStore.show(look.appearance);
  if (look.button !== undefined) buttonStore.show(look.button);
  if (look.imageTransparency !== undefined) imageTransparencyStore.show(look.imageTransparency);
}
