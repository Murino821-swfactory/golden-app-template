/**
 * theme-appearance.ts — the one place the project's `theme.appearance` turns into how the
 * `<html>` document is themed (T-400, founder decision 2026-11-09).
 *
 * The light variant is a paid add-on; dark is the default and the baseline of every project.
 * The choice is made once at build time (`prototype.config.json` → `theme.appearance`), not by
 * a visitor toggle, so a build carries exactly one variant. Keeping the decision here — pure,
 * tested — is what lets the shell stay a one-liner and lets the dark default render
 * byte-for-byte as it always did: dark keeps the `.dark` class and adds nothing.
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
