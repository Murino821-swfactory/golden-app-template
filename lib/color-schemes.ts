/**
 * color-schemes.ts — the four palettes a customer picks from, and the deterministic rule
 * that turns a ramp into CSS roles.
 *
 * The ramp is the artistic source; `roles` is what the page actually paints with. Deriving
 * roles instead of hand-writing them means editing a ramp — or adding a fifth palette —
 * needs no CSS work and cannot drift from the swatches the founder approved.
 *
 * The rule is deliberately mechanical [founder decision 2026-09-12]: darkest is the
 * background, lightest is the text, most saturated is the accent. It does not know intent,
 * so `assertReadable` is the floor that stops an unreadable palette from shipping.
 *
 * Canonical documentation (including the known Blue accent issue):
 * sw-factory `docs/COLOR_SCHEMES.md`.
 *
 * Golden rule 1 (dark-only): light ends of a ramp may be text or accent, never background.
 */

export const COLOR_SCHEME_IDS = ["red", "blue", "yellow", "green"] as const;
export type ColorSchemeId = (typeof COLOR_SCHEME_IDS)[number];

/** Ramps exactly as supplied by the founder, top to bottom. */
export const RAMPS: Record<ColorSchemeId, readonly string[]> = {
  red: ["38364C", "965B77", "6A3349", "6C192A", "B32132", "F16A48", "FFA55B"],
  blue: ["504D9C", "463688", "160C3D", "07031C", "2D0F3F", "5D2B7E", "AA5DC6"],
  yellow: ["455A76", "394D6A", "2C3C55", "121B28", "D79005", "F2B006", "F8D237"],
  green: ["79C412", "1A320C", "334C1F", "496039", "77905F", "D4E1B6", "E8F1CC"],
};

export interface SchemeRoles {
  background: string;
  surface: string;
  border: string;
  primary: string;
  muted: string;
  foreground: string;
}

/** WCAG AA for normal text. Body text below this does not ship. */
export const WCAG_AA_TEXT = 4.5;

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** WCAG contrast ratio between two colours, 1..21. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** HSL saturation — how colourful a swatch is, independent of how light it is. */
export function saturation(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

/**
 * The rule. Pure: same ramp in, same roles out, no I/O, no config.
 */
export function deriveRoles(ramp: readonly string[]): SchemeRoles {
  if (ramp.length < 4) {
    throw new Error(`A ramp needs at least 4 colours, got ${ramp.length}`);
  }

  const byLuminance = [...ramp].sort(
    (a, b) => relativeLuminance(a) - relativeLuminance(b)
  );
  const background = byLuminance[0]!;
  const surface = byLuminance[1]!;
  const foreground = byLuminance[byLuminance.length - 1]!;

  const taken = new Set([background, surface, foreground]);
  const remaining = ramp.filter((c) => !taken.has(c));

  const primary = remaining.reduce((best, c) =>
    saturation(c) > saturation(best) ? c : best
  );

  const rest = remaining.filter((c) => c !== primary);
  const border = rest.reduce((lowest, c) =>
    relativeLuminance(c) < relativeLuminance(lowest) ? c : lowest
  );
  const muted = rest.reduce((highest, c) =>
    relativeLuminance(c) > relativeLuminance(highest) ? c : highest
  );

  return {
    background: `#${background}`,
    surface: `#${surface}`,
    border: `#${border}`,
    primary: `#${primary}`,
    muted: `#${muted}`,
    foreground: `#${foreground}`,
  };
}

/** Throws when body text would be unreadable on its background. Called by the build. */
export function assertReadable(id: string, roles: SchemeRoles): void {
  const ratio = contrastRatio(roles.foreground, roles.background);
  if (ratio < WCAG_AA_TEXT) {
    throw new Error(
      `Colour scheme "${id}" fails WCAG AA: foreground ${roles.foreground} on ` +
        `background ${roles.background} is ${ratio.toFixed(2)}:1, needs ${WCAG_AA_TEXT}:1`
    );
  }
}

export function rolesFor(id: ColorSchemeId): SchemeRoles {
  const roles = deriveRoles(RAMPS[id]);
  assertReadable(id, roles);
  return roles;
}

/**
 * Roles mapped onto the shadcn token set the components already use. Returned as inline
 * custom properties for `<html>`, which is why no palette needs its own CSS block and why
 * the harness never has to rewrite `globals.css`.
 */
export function cssVariablesFor(id: ColorSchemeId): Record<string, string> {
  const r = rolesFor(id);
  return {
    "--background": r.background,
    "--foreground": r.foreground,
    "--card": r.surface,
    "--card-foreground": r.foreground,
    "--popover": r.surface,
    "--popover-foreground": r.foreground,
    "--primary": r.primary,
    "--primary-foreground": r.background,
    "--secondary": r.surface,
    "--secondary-foreground": r.foreground,
    "--muted": r.surface,
    "--muted-foreground": r.muted,
    "--accent": r.surface,
    "--accent-foreground": r.foreground,
    "--border": r.border,
    "--input": r.border,
    "--ring": r.primary,
  };
}
