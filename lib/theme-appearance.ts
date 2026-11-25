/**
 * theme-appearance.ts — the one place the project's `theme.appearance` turns into how the
 * `<html>` document is themed on a FIRST visit (T-400, 2026-11-09).
 *
 * Dark or light is the visitor's choice (founder decision 2026-11-25: the dark-only rule is
 * dropped): the header carries a switch, every build ships both variants of every palette,
 * and `theme.appearance` — dark when the config names none — is only the side the page opens
 * on, as `theme.colorScheme` is only the palette it opens in. The switch and the bootstrap
 * script (`@tokenwise/shared-ui`) move the same class and the same mark this file sets, so
 * keeping the rule here — pure, tested — keeps the three in step: dark is the `.dark` class
 * and no mark, light is the mark and no class.
 */
import type { Appearance } from "@tokenwise/shared-ui/theming";

export interface HtmlAppearance {
  /** Dark applies shadcn's `.dark` base (as the template always has); light drops it so
   * `:root`'s light base shows through under the palette's light tokens. */
  darkClass: boolean;
  /** `"light"` marks the document for the light-only CSS refinements (e.g. the Blender light
   * loops, made for a dark ground, stand down); dark adds no attribute at all. */
  dataAppearance: "light" | undefined;
}

export function htmlAppearance(appearance: Appearance): HtmlAppearance {
  return {
    darkClass: appearance === "dark",
    dataAppearance: appearance === "light" ? "light" : undefined,
  };
}
