import { APPEARANCES, COLOR_SCHEME_IDS, type Appearance, type ColorSchemeId } from "./color-schemes";
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
