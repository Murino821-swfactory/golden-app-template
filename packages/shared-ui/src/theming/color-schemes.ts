/**
 * color-schemes.ts (@tokenwise/shared-ui; moved from golden-app-template lib/ on 2026-09-25)
 * — the palettes a customer picks from, and the deterministic rule that turns two or more
 * colours into CSS roles.
 *
 * A palette was a PAIR [founder decision 2026-09-24]: the fifteen combinations the founder
 * supplied as images, in the order supplied — which is also the order the header's
 * "Change colour" button cycles through. Since 2026-10-26 a palette may have more colours
 * [founder decision]: the extra ones become accents (`derivePaletteRoles`), and the founder's
 * first five such palettes have seven colours each. Since 2026-11-08 a palette of twenty
 * colours is TONAL (T-371, `deriveTonalRoles`): nothing is mixed any more — its four darkest
 * colours are the grounds, its four lightest the inks and the twelve between the lights, a
 * series every card of the page takes one of. Deriving
 * roles instead of hand-writing them means a new palette is one line and needs no CSS work.
 *
 * The pair rule (sw-factory spec 2026-09-24-prototype-palettes-15-pairs-design.md §4): the
 * darker colour is the background, the lighter is both text and accent. A pair whose text would
 * fall under WCAG AA on a card is corrected — the background is deepened toward black
 * first, then the text lifted toward white, one percent at a time — so the hue the founder
 * picked survives and only the contrast moves. Five of the fifteen are corrected; the
 * values are pinned in golden-app-template tests/color-schemes.spec.ts.
 *
 * Canonical documentation: sw-factory `docs/COLOR_SCHEMES.md`.
 *
 * Golden rule 1 (dark-only): the darkest colour of a palette is always the background.
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
  "deep-sea-blues",
  "lime-lagoon",
  "peacock-amber",
  "mulled-spice",
  "black-gold",
  "aurora-night",
  "ember-forge",
  "neon-tokyo",
  "desert-dusk",
  "coral-reef",
  "moss-lantern",
  "royal-velvet",
  "glacier-mint",
  "candy-arcade",
  "clay-kiln",
] as const;
export type ColorSchemeId = (typeof COLOR_SCHEME_IDS)[number];

/** Two or more hex colours without `#`. */
export type PaletteColors = readonly [string, string, ...string[]];

export interface Palette {
  /** What a visitor reads. Proper names — never translated. */
  name: string;
  /** Exactly as the founder supplied them, top colour of the image first. */
  colors: PaletteColors;
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
  // Seven colours each, supplied as images on 2026-10-26 (top of the image first); the names
  // are ours — the images carry none.
  "deep-sea-blues": {
    name: "Deep Sea Blues",
    colors: ["9DB9CE", "6DAFD1", "3A9ED0", "0E5588", "052E55", "031F45", "041526"],
  },
  "lime-lagoon": {
    name: "Lime Lagoon",
    colors: ["9EBC0F", "11A516", "096C32", "0B305F", "3888A8", "11B6E6", "37D2E0"],
  },
  "peacock-amber": {
    name: "Peacock Amber",
    colors: ["C98819", "8E5012", "4F2E1A", "0A2130", "503272", "764BA5", "0595A1"],
  },
  "mulled-spice": {
    name: "Mulled Spice",
    colors: ["090802", "381307", "571F08", "EFA717", "F1DDA6", "82AB9C", "627357"],
  },
  "black-gold": {
    name: "Black Gold",
    colors: ["292C31", "070706", "2D1F11", "89612B", "AC8B56", "CDAD69", "F4E185"],
  },
  // Twenty colours each — the tonal tier (T-371, 2026-11-08), designed in-house for the
  // founder's third category: four grounds (page, card, raised plane, border), four inks
  // (words, a card's words, the raised plane's words, muted) and twelve lights. Listed in
  // that order for a reader; the rule sorts by luminance and does not care.
  "aurora-night": {
    name: "Aurora Night",
    colors: [
      "05080D", "0C121B", "151E2B", "22304A",
      "EEF5F3", "D4E0DC", "B9CBC5", "A6BDB6",
      "22BF92", "2FB5A8", "27B8E0", "3F8FE8", "6E6BF0", "9A5CF2",
      "C65BE8", "E65BB8", "46B86A", "76B832", "C9A43A", "4FA9F5",
    ],
  },
  "ember-forge": {
    name: "Ember Forge",
    colors: [
      "0B0806", "161009", "231911", "352819",
      "F6EFE6", "E3D7C8", "D3C5B4", "C4B4A2",
      "E8572A", "F07A2B", "EC9530", "D4A53E", "C9472E", "A8302A",
      "D4794A", "B5793A", "9C5A32", "E86E4D", "6A8FA6", "8A9A5B",
    ],
  },
  "neon-tokyo": {
    name: "Neon Tokyo",
    colors: [
      "070612", "100D20", "1A162F", "282245",
      "F3F1FA", "DEDBEF", "CBC7E3", "B9B4D8",
      "FF2D78", "FF4FA3", "D63CFF", "8B3DFF", "4F6BFF", "2BB4FF",
      "19B6BE", "22C47A", "8DB322", "E09E1C", "FF6A2B", "7A5CFF",
    ],
  },
  "desert-dusk": {
    name: "Desert Dusk",
    colors: [
      "0E0709", "1B1114", "2A1C1F", "3C2A2E",
      "F5EEE6", "E4D8CB", "D5C6B6", "C7B5A4",
      "C8643C", "E08A5A", "D98E8E", "B47A8E", "8FA37B", "9A9A4E",
      "A48BC2", "7FA3BF", "D9A066", "B5553F", "6E8F8A", "C47E5A",
    ],
  },
  "coral-reef": {
    name: "Coral Reef",
    colors: [
      "03101C", "091C2F", "122B42", "1D3D58",
      "ECF6FA", "D3E6EE", "B9D2DE", "9FBDCB",
      "FF6F61", "FF8C42", "24B5A6", "3AB0E0", "72B53D", "8E6CE8",
      "E65BA3", "CFA246", "2E86DE", "F25F8C", "26A69A", "E89A35",
    ],
  },
  "moss-lantern": {
    name: "Moss Lantern",
    colors: [
      "070B07", "101710", "1A241A", "283628",
      "F2F0E7", "DFDBCC", "CCC8B6", "BAB6A2",
      "7FA64A", "8FB236", "4F9A5E", "DA9C36", "C77A2F", "C9A64B",
      "3C9D8A", "B35B2E", "6C8C3E", "E0714A", "8A9EC2", "B08A5E",
    ],
  },
  "royal-velvet": {
    name: "Royal Velvet",
    colors: [
      "0A0610", "160E20", "231732", "332448",
      "F4F0F8", "E1D9EA", "D0C5DC", "BFB1CF",
      "C9A52F", "9B59D0", "C94FB5", "C8324B", "2E9E6B", "3C6FD6",
      "B388E0", "E07A9A", "D59E3F", "41B3C4", "8E6AB8", "D86B3A",
    ],
  },
  "glacier-mint": {
    name: "Glacier Mint",
    colors: [
      "080C10", "11181E", "1C262E", "2A3842",
      "F0F6F8", "D8E3E9", "C1D1D9", "A9BCC7",
      "3DBFA0", "52B5A8", "2FB4D8", "5AA9EE", "7D8FE6", "A98BDC",
      "8DB54D", "6FA8A8", "4C8FD6", "CC9C50", "3C9B8C", "C77DA0",
    ],
  },
  "candy-arcade": {
    name: "Candy Arcade",
    colors: [
      "050A1A", "0D162C", "172240", "233256",
      "F3F4FA", "DCE0ED", "C7CDE0", "AFB7D1",
      "FF5CA8", "D9A020", "6CBE1E", "3FB6FF", "FF7A2E", "9D5CFF",
      "FF3B5C", "1FB8A5", "4D7CFF", "F75FE0", "3BBF5E", "F59427",
    ],
  },
  "clay-kiln": {
    name: "Clay Kiln",
    colors: [
      "0D0906", "1B130C", "2A1F15", "3C2D1F",
      "F4EFE8", "E3D9CE", "D4C7B9", "C4B4A3",
      "B5452B", "C97B3A", "D4A038", "8F8A3C", "3F8F86", "A0522D",
      "6E8CA8", "7A9A4E", "D98C5A", "B07050", "C9A66B", "8A6A9A",
    ],
  },
};

/**
 * The four ids retired on 2026-09-24, mapped by nearest hue. Every `demo/*` branch built
 * before then carries one in prototype.config.json, and a refresh deliberately never edits
 * a customer's config — so the parser translates instead (golden-app-template lib/prototype-config.ts).
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
  /** The second accent: decoration only (glows, gradients), never text. `primary` when
   * the palette has no fourth colour. */
  highlight: string;
  /** Tonal palettes only (twenty colours, T-371). The third ground: menus, badges and
   * secondary buttons (`--popover`, `--secondary`, `--muted`, `--accent`). */
  raised?: string;
  /** Tonal only: the second ink, a card's words (`--card-foreground`). */
  cardForeground?: string;
  /** Tonal only: the third ink, the words on the raised plane (`--popover-foreground`,
   * `--secondary-foreground`, `--accent-foreground`). */
  raisedForeground?: string;
  /** Tonal only: the twelve lights in hue order from the accent, each lifted until it reads
   * on a card — `--accent-1` … `--accent-12`, one per card and step (`stage.css`). */
  accents?: readonly string[];
}

/** A palette of this many colours is tonal (T-371): four grounds, four inks, the rest lights. */
export const TONAL_MIN_COLOURS = 20;
/** The grounds of a tonal palette, darkest first: page, card, raised plane, border. */
const TONAL_GROUNDS = 4;
/** The inks of a tonal palette, lightest first: words, a card's words, the raised plane's words, muted. */
const TONAL_INKS = 4;

export type PaletteKind = "pair" | "accented" | "tonal";

/** Which rule a palette falls under — decided by its count alone. */
export function paletteKind(colors: readonly string[]): PaletteKind {
  if (colors.length >= TONAL_MIN_COLOURS) return "tonal";
  return colors.length === 2 ? "pair" : "accented";
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

/** Hue on the colour circle, 0..360 (red 0, yellow 60, green 120, cyan 180, blue 240,
 * magenta 300); a grey has none and reads 0. Hex without `#`. */
export function hue(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  const sector =
    max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return Math.round(sector * 60 * 1000) / 1000;
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
 * The rule. Pure: same colours in, same roles out, whatever their order; no I/O, no config.
 *
 * The darkest colour is the background and the lightest the text. With two colours the text
 * is also the accent — exactly the pair rule of 2026-09-24. A middle colour is the accent
 * (`primary`); of two or more middles, the one most readable on a card is the accent and the
 * next the second accent (`highlight`), which only decoration paints and so ships as
 * supplied. Further middles are kept in the palette as supplied and not painted.
 *
 * Contrast is checked against the SURFACE, not the background: the surface is the lighter
 * of the two planes text sits on, so text readable on a card is readable everywhere. An
 * accent under WCAG AA there is lifted toward white one percent at a time, like the text.
 */
export function derivePaletteRoles(colors: readonly string[]): SchemeRoles {
  if (colors.length < 2) {
    throw new Error(`A palette has at least 2 colours, got ${colors.length}`);
  }
  // Ties broken by the hex itself, so the order the colours were supplied in never matters.
  const sorted = [...colors].sort(
    (x, y) => relativeLuminance(x) - relativeLuminance(y) || x.localeCompare(y)
  );
  if (sorted.length >= TONAL_MIN_COLOURS) return deriveTonalRoles(sorted);
  const dark = sorted[0]!;
  const light = sorted[sorted.length - 1]!;
  const middles = sorted.slice(1, -1);

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
  const [accent, second] = [...middles].sort(
    (x, y) => contrastRatio(y, surface) - contrastRatio(x, surface) || x.localeCompare(y)
  );
  let primary = accent ?? foreground;
  for (let percent = 1; percent <= 100 && contrastRatio(primary, surface) < WCAG_AA_TEXT; percent++) {
    primary = mix(accent!, "FFFFFF", percent / 100);
  }

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
    primary: `#${primary}`,
    muted: `#${muted}`,
    foreground: `#${foreground}`,
    highlight: `#${second ?? primary}`,
  };
}

/**
 * The tonal rule (T-371, 2026-11-08). Twenty colours are a whole system, so nothing is
 * mixed: sorted by luminance, the four darkest are the grounds — page, card, raised plane
 * (menus, badges, secondary buttons), border — the four lightest the inks — words, a
 * card's words, the raised plane's words, muted — and the twelve between are the lights.
 * The light most readable on a card is the accent and the next the second accent, exactly
 * as in a palette of seven; and all twelve, in hue order starting from the accent, are the
 * series the page hands its cards and steps (`--accent-1` …, stage.css). Every ink is
 * lifted toward white until it reads on its plane and every light until it reads on a
 * card; the second accent ships as supplied, as before. Pure and order-blind like the rest.
 */
function deriveTonalRoles(sorted: readonly string[]): SchemeRoles {
  const [background, surface, raised, border] = sorted as unknown as [string, string, string, string];
  const inks = sorted.slice(-TONAL_INKS).reverse();
  const lights = sorted.slice(TONAL_GROUNDS, -TONAL_INKS);
  const byReadability = [...lights].sort(
    (x, y) => contrastRatio(y, surface) - contrastRatio(x, surface) || x.localeCompare(y)
  );
  const accent = byReadability[0]!;
  const byHue = [...lights].sort((x, y) => hue(x) - hue(y) || x.localeCompare(y));
  const from = byHue.indexOf(accent);
  const series = [...byHue.slice(from), ...byHue.slice(0, from)];
  return {
    background: `#${background}`,
    surface: `#${surface}`,
    border: `#${border}`,
    primary: `#${lift(accent, surface)}`,
    muted: `#${lift(inks[3]!, raised)}`,
    foreground: `#${lift(inks[0]!, surface)}`,
    highlight: `#${byReadability[1]!}`,
    raised: `#${raised}`,
    cardForeground: `#${lift(inks[1]!, surface)}`,
    raisedForeground: `#${lift(inks[2]!, raised)}`,
    accents: series.map((light) => `#${lift(light, surface)}`),
  };
}

/** `colour` pulled toward white one percent at a time until it reads on `plane` (WCAG AA) —
 * the hue survives, only the contrast moves. */
function lift(colour: string, plane: string): string {
  let lifted = colour;
  for (let percent = 1; percent <= 100 && contrastRatio(lifted, plane) < WCAG_AA_TEXT; percent++) {
    lifted = mix(colour, "FFFFFF", percent / 100);
  }
  return lifted;
}

/** The pair rule, kept by name for the template forks whose tests import it. */
export function derivePairRoles(pair: readonly [string, string]): SchemeRoles {
  return derivePaletteRoles(pair);
}

/** Throws when any text the page paints would be unreadable. Called by the build. */
export function assertReadable(id: string, roles: SchemeRoles): void {
  const checks: Array<[string, string, string]> = [
    ["foreground on background", roles.foreground, roles.background],
    ["foreground on surface", roles.foreground, roles.surface],
    ["muted on surface", roles.muted, roles.surface],
    // `text-primary` paints words in the accent — a pair's accent is its text, a third
    // colour's is not.
    ["primary on surface", roles.primary, roles.surface],
    // `--primary-foreground` is the background (variablesFrom): a button's own text.
    ["button text on primary", roles.background, roles.primary],
  ];
  if (roles.raised) {
    // A tonal palette paints two more planes and twelve lights; each pair that can be read
    // is checked, so no ink or light ships dimmer than the words.
    checks.push(["card words on card", roles.cardForeground ?? roles.foreground, roles.surface]);
    checks.push(["raised words on raised plane", roles.raisedForeground ?? roles.foreground, roles.raised]);
    checks.push(["muted on raised plane", roles.muted, roles.raised]);
    roles.accents?.forEach((light, i) => checks.push([`light ${i + 1} on card`, light, roles.surface]));
  }
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
  const roles = derivePaletteRoles(PALETTES[id].colors);
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
 * Calling `cssVariablesFor` for every palette also runs `assertReadable` on each at build,
 * so no palette the header can reach ships unchecked.
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
  // A pair or an accented palette has one surface and one ink for every plane; a tonal
  // palette has its raised plane and its three further inks, and its series of lights.
  const raised = r.raised ?? r.surface;
  const raisedForeground = r.raisedForeground ?? r.foreground;
  const variables: Record<string, string> = {
    "--background": r.background,
    "--foreground": r.foreground,
    "--card": r.surface,
    "--card-foreground": r.cardForeground ?? r.foreground,
    "--popover": raised,
    "--popover-foreground": raisedForeground,
    "--primary": r.primary,
    "--primary-foreground": r.background,
    "--secondary": raised,
    "--secondary-foreground": raisedForeground,
    "--muted": raised,
    "--muted-foreground": r.muted,
    "--accent": raised,
    "--accent-foreground": raisedForeground,
    "--border": r.border,
    "--input": r.border,
    "--ring": r.primary,
    "--highlight": r.highlight,
  };
  r.accents?.forEach((light, i) => {
    variables[`--accent-${i + 1}`] = light;
  });
  return variables;
}
