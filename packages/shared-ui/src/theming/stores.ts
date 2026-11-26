import { BUTTON_STYLE_IDS, type ButtonStyleId } from "./button-styles";
import { APPEARANCES, COLOR_SCHEME_IDS, type Appearance, type ColorSchemeId } from "./color-schemes";
import { FONT_IDS, type FontId } from "./font-families";
import { IMAGE_TRANSPARENCY_STEPS, type ImageTransparency } from "./image-transparency";
import { IMAGE_VEIL_STATES, type ImageVeil } from "./image-veil";
import { createAttributeStore } from "./theme-store";

/** Key and event unchanged from the template's pre-package switcher: a visitor's stored
 * palette keeps working across the move. */
export const schemeStore = createAttributeStore<ColorSchemeId>({
  attribute: "scheme",
  storageKey: "scheme",
  event: "scheme-change",
  ids: COLOR_SCHEME_IDS,
});

export const fontStore = createAttributeStore<FontId>({
  attribute: "font",
  storageKey: "font",
  event: "font-change",
  ids: FONT_IDS,
});

/**
 * Dark or light (founder decision 2026-11-25). The mark is `html[data-appearance]` — the
 * light rules of every palette are keyed by it — and shadcn's `.dark` class moves with it, so
 * `dark:` utilities and the `.dark` base tokens follow the same switch. A document that
 * carries no mark yet is the host's first-visit appearance (`use(serverDefault)`).
 */
export const appearanceStore = createAttributeStore<Appearance>({
  attribute: "appearance",
  storageKey: "appearance",
  event: "appearance-change",
  ids: APPEARANCES,
  apply: (value) => document.documentElement.classList.toggle("dark", value === "dark"),
});

/** The look of the page's action (2026-11-25): `html[data-button]`, stored like the other three. */
export const buttonStore = createAttributeStore<ButtonStyleId>({
  attribute: "button",
  storageKey: "button",
  event: "button-change",
  ids: BUTTON_STYLE_IDS,
});

/** How transparent the page's picture is (2026-11-25): `html[data-image-transparency]`, a
 * step from 0 to 100 in tens, stored like the others. */
export const imageTransparencyStore = createAttributeStore<ImageTransparency>({
  attribute: "imageTransparency",
  storageKey: "imageTransparency",
  event: "image-transparency-change",
  ids: IMAGE_TRANSPARENCY_STEPS,
});

/** Whether the veil lies over the page's picture (2026-11-26): `html[data-image-veil]`, on or
 * off, stored apart from the transparency so neither moves the other. */
export const imageVeilStore = createAttributeStore<ImageVeil>({
  attribute: "imageVeil",
  storageKey: "imageVeil",
  event: "image-veil-change",
  ids: IMAGE_VEIL_STATES,
});
