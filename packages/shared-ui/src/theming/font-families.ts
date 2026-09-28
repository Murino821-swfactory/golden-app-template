/**
 * font-families.ts — the ten typefaces the header's font button cycles through, and the two
 * fixed faces the brand is set in.
 *
 * Order is the cycle order and matches the order the founder supplied the reference images
 * in (sw-factory spec 2026-09-25-shared-header-design.md §4). Each is a Google Fonts
 * alternative to a commercial face; `inspiredBy` names that face so the choice can be
 * revisited when a licence is bought.
 *
 * Adding a font is one entry here plus `npm run fonts:fetch -w @tokenwise/shared-ui`, which
 * downloads the woff2 files and regenerates `styles.css`. `test/fonts.test.ts` fails when an
 * entry has no files, or when the CSS declares a weight the files do not carry.
 *
 * Self-hosted on purpose: loading from fonts.googleapis.com would hand every visitor's IP
 * address to Google (GDPR). The OFL permits redistribution.
 */

export type FontCategory = "geometric" | "humanist" | "rounded" | "technical" | "industrial";

export interface FontFamily {
  id: string;
  /** Shown in the switcher. A proper name — never translated. */
  name: string;
  inspiredBy: string;
  category: FontCategory;
  /** A static face lists its weights; a variable face gives its axis range. */
  weights: readonly number[] | { min: number; max: number };
  /** CSS `font-family` value, fallbacks included. */
  stack: string;
}

const FALLBACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

export const FONT_FAMILIES = [
  {
    id: "outfit",
    name: "Outfit",
    inspiredBy: "Degular",
    category: "geometric",
    weights: { min: 100, max: 900 },
    stack: `"Outfit", ${FALLBACK}`,
  },
  {
    id: "inter",
    name: "Inter",
    inspiredBy: "Neue Haas Unica",
    category: "humanist",
    weights: { min: 100, max: 900 },
    stack: `"Inter", ${FALLBACK}`,
  },
  {
    id: "nunito",
    name: "Nunito",
    inspiredBy: "Stolzl",
    category: "rounded",
    weights: { min: 200, max: 1000 },
    stack: `"Nunito", ${FALLBACK}`,
  },
  {
    id: "lexend",
    name: "Lexend",
    inspiredBy: "Neutronic",
    category: "technical",
    weights: { min: 100, max: 900 },
    stack: `"Lexend", ${FALLBACK}`,
  },
  {
    // One weight only: bold text is synthesised by the browser (`font-synthesis`). A known
    // limitation of the face, not a defect.
    id: "archivo-black",
    name: "Archivo Black",
    inspiredBy: "Altivo",
    category: "industrial",
    weights: [400],
    stack: `"Archivo Black", ${FALLBACK}`,
  },
  {
    id: "montserrat",
    name: "Montserrat",
    inspiredBy: "Paralucent",
    category: "geometric",
    weights: { min: 100, max: 900 },
    stack: `"Montserrat", ${FALLBACK}`,
  },
  {
    // One weight only — see archivo-black.
    id: "varela-round",
    name: "Varela Round",
    inspiredBy: "Rustica",
    category: "rounded",
    weights: [400],
    stack: `"Varela Round", ${FALLBACK}`,
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    inspiredBy: "Objektiv",
    category: "geometric",
    weights: { min: 300, max: 700 },
    stack: `"Space Grotesk", ${FALLBACK}`,
  },
  {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    inspiredBy: "Area",
    category: "geometric",
    weights: { min: 200, max: 800 },
    stack: `"Plus Jakarta Sans", ${FALLBACK}`,
  },
  {
    id: "source-sans-3",
    name: "Source Sans 3",
    inspiredBy: "Museo Sans",
    category: "humanist",
    weights: { min: 200, max: 900 },
    stack: `"Source Sans 3", ${FALLBACK}`,
  },
] as const satisfies readonly FontFamily[];

export type FontId = (typeof FONT_FAMILIES)[number]["id"];

export const FONT_IDS: readonly FontId[] = FONT_FAMILIES.map((f) => f.id);

/**
 * Faces outside the cycle. The brand does not change with a visitor's choice: the logo is
 * always Big Shoulders 800 and the nav always JetBrains Mono.
 */
export const FIXED_FONTS = {
  display: {
    id: "big-shoulders",
    name: "Big Shoulders",
    weights: [800],
    stack: `"Big Shoulders", ${FALLBACK}`,
  },
  mono: {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    weights: { min: 100, max: 800 },
    stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
} as const satisfies Record<string, Omit<FontFamily, "inspiredBy" | "category">>;

/** Every face the package ships files for — the cycle plus the fixed two. */
export const ALL_FONT_FACES: ReadonlyArray<Omit<FontFamily, "inspiredBy" | "category">> = [
  ...FONT_FAMILIES,
  FIXED_FONTS.display,
  FIXED_FONTS.mono,
];

/** The two subsets every face ships: `latin-ext` carries Slovak diacritics. */
export const FONT_SUBSETS = ["latin", "latin-ext"] as const;

export function isFontId(value: string | null | undefined): value is FontId {
  return (FONT_IDS as readonly string[]).includes(value ?? "");
}

export function fontById(id: FontId): (typeof FONT_FAMILIES)[number] {
  return FONT_FAMILIES.find((f) => f.id === id)!;
}

/** The font after `id`, wrapping from the last back to the first. */
export function nextFontId(id: FontId): FontId {
  const index = FONT_IDS.indexOf(id);
  return FONT_IDS[(index + 1) % FONT_IDS.length]!;
}
