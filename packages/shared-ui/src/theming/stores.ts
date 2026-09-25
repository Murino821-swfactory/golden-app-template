import { COLOR_SCHEME_IDS, type ColorSchemeId } from "./color-schemes";
import { FONT_IDS, type FontId } from "./font-families";
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
