/**
 * color-schemes.ts — the fifteen palettes a customer picks from, and the deterministic rule
 * that turns a two-colour pair into CSS roles.
 *
 * A palette is a PAIR [founder decision 2026-09-24]: the fifteen combinations the founder
 * supplied as images, in the order supplied — which is also the order the header's
 * "Change colour" button cycles through. Deriving roles instead of hand-writing them means
 * a sixteenth pair is one line and needs no CSS work.
 *
 * The rule (sw-factory spec 2026-09-24-prototype-palettes-15-pairs-design.md §4): the darker
 * colour is the background, the lighter is both text and accent. A pair whose text would
 * fall under WCAG AA on a card is corrected — the background is deepened toward black
 * first, then the text lifted toward white, one percent at a time — so the hue the founder
 * picked survives and only the contrast moves. Five of the fifteen are corrected; the
 * values are pinned in tests/color-schemes.spec.ts.
 *
 * Canonical documentation: sw-factory `docs/COLOR_SCHEMES.md`.
 *
 * Golden rule 1 (dark-only): the darker colour of a pair is always the background.
 */

/** Cycle order — the header's button walks this list and wraps after the last. */
export const COLOR_SCHEME_IDS = [
  "fresh-sky-blood-red",
  "fresh-lime-azure-blue",
  "wine-mauve-vanilla-beige",
  "deep-indigo-frost-white",
  "black-green-ruby-red",
  "dark-plum-earthy-khaki",
  "warm-apricot-royal-plum",
  "midnight-teal-ocean-mist",
  "burnt-orange-misty-ice-blue",
  "fluorescent-cyan-oxford-blue",
  "dark-cyan-tangerine",
  "chartreuse-pastel-deep-teal-green",
  "ice-blue-ocean-blue",
  "honey-tan-jet-black",
  "burnt-orange-vanilla",
] as const;
export type ColorSchemeId = (typeof COLOR_SCHEME_IDS)[number];

export interface Palette {
  /** What a visitor reads. Proper names — never translated. */
  name: string;
  /** Exactly as the founder supplied them, top colour of the image first. */
  colors: readonly [string, string];
}

export const PALETTES: Record<ColorSchemeId, Palette> = {
  "fresh-sky-blood-red": { name: "Fresh Sky & Blood Red", colors: ["8CCDE9", "640000"] },
  "fresh-lime-azure-blue": { name: "Fresh Lime & Azure Blue", colors: ["DDF3A3", "0055A6"] },
  "wine-mauve-vanilla-beige": { name: "Wine Mauve & Vanilla Beige", colors: ["66444F", "EFE0CC"] },
  "deep-indigo-frost-white": { name: "Deep Indigo & Frost White", colors: ["271870", "F7F7FF"] },
  "black-green-ruby-red": { name: "Black Green & Ruby Red", colors: ["000F08", "FB3640"] },
  "dark-plum-earthy-khaki": { name: "Dark Plum & Earthy Khaki", colors: ["421407", "6D542E"] },
  "warm-apricot-royal-plum": { name: "Warm Apricot & Royal Plum", colors: ["FAAE62", "3E0856"] },
  "midnight-teal-ocean-mist": { name: "Midnight Teal & Ocean Mist", colors: ["05354C", "B1EDF8"] },
  "burnt-orange-misty-ice-blue": {
    name: "Burnt Orange & Misty Ice Blue",
    colors: ["9F430A", "DFE7E7"],
  },
  "fluorescent-cyan-oxford-blue": {
    name: "Fluorescent Cyan & Oxford Blue",
    colors: ["6FFFE8", "0C142A"],
  },
  "dark-cyan-tangerine": { name: "Dark Cyan & Tangerine", colors: ["015B63", "FF8135"] },
  "chartreuse-pastel-deep-teal-green": {
    name: "Chartreuse Pastel & Deep Teal Green",
    colors: ["CEFF8A", "143732"],
  },
  "ice-blue-ocean-blue": { name: "Ice Blue & Ocean Blue", colors: ["CFFAFE", "0891B2"] },
  "honey-tan-jet-black": { name: "Honey Tan & Jet Black", colors: ["E3C586", "171717"] },
  "burnt-orange-vanilla": { name: "Burnt Orange & Vanilla", colors: ["FC6C26", "FFF4D6"] },
};

/**
 * The four ids retired on 2026-09-24, mapped by nearest hue. Every `demo/*` branch built
 * before then carries one in prototype.config.json, and a refresh deliberately never edits
 * a customer's config — so the parser translates instead (lib/prototype-config.ts).
 */
export const LEGACY_SCHEME_IDS: Readonly<Record<string, ColorSchemeId>> = {
  red: "warm-apricot-royal-plum",
  blue: "deep-indigo-frost-white",
  yellow: "honey-tan-jet-black",
  green: "chartreuse-pastel-deep-teal-green",
};

/** The palette after `id`, wrapping from the last back to the first. */
export function nextSchemeId(id: ColorSchemeId): ColorSchemeId {
  const index = COLOR_SCHEME_IDS.indexOf(id);
  return COLOR_SCHEME_IDS[(index + 1) % COLOR_SCHEME_IDS.length]!;
}

export interface SchemeRoles {
  background: string;
  surface: string;
  border: string;
  primary: string;
  muted: string;
  foreground: string;
}

/** WCAG AA for normal text. Text below this does not ship. */
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

/** `weight` of the way from `from` to `to`, per channel, rounded. Hex without `#`, upper case. */
export function mix(from: string, to: string, weight: number): string {
  const a = toRgb(from);
  const b = toRgb(to);
  return a
    .map((v, i) =>
      Math.round(v + (b[i]! - v) * weight)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")
    .toUpperCase();
}

/** Card surface: this far from the background toward the text. */
const SURFACE_MIX = 0.08;
/** Borders and inputs: further, so they read against both background and card. */
const BORDER_MIX = 0.22;
/** How far the background may be deepened toward black before the text is lifted instead. */
const MAX_DEEPEN_PERCENT = 70;
/** Muted text is the text pulled toward the background — at most this far. */
const MAX_MUTED_PERCENT = 35;

/**
 * The rule. Pure: same pair in, same roles out, no I/O, no config.
 *
 * Contrast is checked against the SURFACE, not the background: the surface is the lighter
 * of the two planes text sits on, so text readable on a card is readable everywhere.
 */
export function derivePairRoles(pair: readonly [string, string]): SchemeRoles {
  const [a, b] = pair;
  const [dark, light] = relativeLuminance(a) <= relativeLuminance(b) ? [a, b] : [b, a];

  let background = dark;
  let foreground = light;
  const surfaceOf = () => mix(background, foreground, SURFACE_MIX);

  for (
    let percent = 1;
    percent <= MAX_DEEPEN_PERCENT && contrastRatio(foreground, surfaceOf()) < WCAG_AA_TEXT;
    percent++
  ) {
    background = mix(dark, "000000", percent / 100);
  }
  for (
    let percent = 1;
    percent <= 100 && contrastRatio(foreground, surfaceOf()) < WCAG_AA_TEXT;
    percent++
  ) {
    foreground = mix(light, "FFFFFF", percent / 100);
  }

  const surface = surfaceOf();
  let muted = foreground;
  for (let percent = 1; percent <= MAX_MUTED_PERCENT; percent++) {
    const candidate = mix(foreground, background, percent / 100);
    if (contrastRatio(candidate, surface) < WCAG_AA_TEXT) break;
    muted = candidate;
  }

  return {
    background: `#${background}`,
    surface: `#${surface}`,
    border: `#${mix(background, foreground, BORDER_MIX)}`,
    primary: `#${foreground}`,
    muted: `#${muted}`,
    foreground: `#${foreground}`,
  };
}

/** Throws when any text the page paints would be unreadable. Called by the build. */
export function assertReadable(id: string, roles: SchemeRoles): void {
  const checks: Array<[string, string, string]> = [
    ["foreground on background", roles.foreground, roles.background],
    ["foreground on surface", roles.foreground, roles.surface],
    ["muted on surface", roles.muted, roles.surface],
    // `--primary-foreground` is the background (variablesFrom): a button's own text.
    ["button text on primary", roles.background, roles.primary],
  ];
  for (const [what, text, plane] of checks) {
    const ratio = contrastRatio(text, plane);
    if (ratio < WCAG_AA_TEXT) {
      throw new Error(
        `Colour scheme "${id}" fails WCAG AA: ${what} (${text} on ${plane}) is ` +
          `${ratio.toFixed(2)}:1, needs ${WCAG_AA_TEXT}:1`
      );
    }
  }
}

export function rolesFor(id: ColorSchemeId): SchemeRoles {
  const roles = derivePairRoles(PALETTES[id].colors);
  assertReadable(id, roles);
  return roles;
}

/**
 * Roles mapped onto the shadcn token set the components already use. The harness never
 * has to rewrite `globals.css`: a palette is data here, and `cssBlocksForAll` turns all of
 * them into CSS at build time.
 */
export function cssVariablesFor(id: ColorSchemeId): Record<string, string> {
  return variablesFrom(rolesFor(id));
}

/**
 * Every palette as a CSS rule keyed by `data-scheme`, so switching one is an attribute
 * write rather than a rebuild. `html[data-scheme="x"]` is (0,1,1), which outranks both
 * `:root` and `.dark` in globals.css — no `!important`, no ordering dependency.
 *
 * Calling `cssVariablesFor` for all fifteen also runs `assertReadable` fifteen times at
 * build, so no palette the header can reach ships unchecked.
 */
export function cssBlocksForAll(): string {
  return COLOR_SCHEME_IDS.map((id) => {
    const body = Object.entries(cssVariablesFor(id))
      .map(([name, value]) => `${name}:${value}`)
      .join(";");
    return `html[data-scheme="${id}"]{${body}}`;
  }).join("");
}

function variablesFrom(r: SchemeRoles): Record<string, string> {
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
