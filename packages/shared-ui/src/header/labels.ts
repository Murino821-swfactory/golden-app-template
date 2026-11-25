/**
 * Every string the header renders. The package ships English defaults and depends on no
 * i18n library; a host passes its translations through `labels`.
 *
 * Templates use `{name}` placeholders, filled by `format` — the same placeholder syntax
 * next-intl's ICU messages use, so a host can pass `t.raw(key)` straight through.
 */
export interface HeaderLabels {
  /** Accessible name of the nav landmark. */
  nav: string;
  openMenu: string;
  closeMenu: string;
  /** Accessible name of the full-screen menu dialog. */
  menu: string;
  changeColour: string;
  /** `{name}`, `{position}`, `{total}`. Must start with `changeColour` (WCAG 2.5.3). */
  changeColourLabel: string;
  font: string;
  /** `{name}`, `{position}`, `{total}`. */
  changeFontLabel: string;
  /** The dark/light row's name in the menu below 1024px. */
  appearance: string;
  /** `{name}` — the side on screen, `appearanceDark` or `appearanceLight`. */
  changeAppearanceLabel: string;
  appearanceDark: string;
  appearanceLight: string;
  /** The menu row of the action's look, as `font` is the font's. */
  button: string;
  /** `{name}`, `{position}`, `{total}`. */
  changeButtonLabel: string;
  /** The menu row of the picture's transparency, as `font` is the font's. */
  imageTransparency: string;
  /** `{value}` — the step on screen, 0 to 100 — `{position}`, `{total}`. */
  changeImageTransparencyLabel: string;
  language: string;
  cart: string;
  /** `{count}`. */
  cartLabel: string;
  cartEmpty: string;
  signIn: string;
  signOut: string;
  account: string;
  contact: string;
}

export const DEFAULT_LABELS: HeaderLabels = {
  nav: "Main",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  menu: "Site menu",
  changeColour: "Change colour",
  changeColourLabel: "Change colour — {name}, {position} of {total}",
  font: "Font",
  changeFontLabel: "Change font: {name} ({position} of {total})",
  appearance: "Appearance",
  changeAppearanceLabel: "Change appearance: {name}",
  appearanceDark: "Dark",
  appearanceLight: "Light",
  button: "Button",
  changeButtonLabel: "Change button: {name} ({position} of {total})",
  imageTransparency: "Image transparency",
  changeImageTransparencyLabel: "Change image transparency: {value} % ({position} of {total})",
  language: "Language",
  cart: "Cart",
  cartLabel: "Cart, {count} items",
  cartEmpty: "Your cart is empty",
  signIn: "Sign in",
  signOut: "Sign out",
  account: "Account",
  contact: "Contact",
};

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole
  );
}
