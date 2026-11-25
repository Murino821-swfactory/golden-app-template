/**
 * button-styles.ts — the looks a page's action can wear, and the header's button that steps
 * through them (founder, 2026-11-25: "the CTA button, the same way as the font and the colour").
 *
 * A look is a shape and a fill, nothing else: five variables an action reads. It names no
 * colour of its own — every value is one of the host's `--shared-*` tokens or a mix of them —
 * so a look repaints with every palette, and "Change colour" and this button never argue.
 *
 * Order is the cycle order. The first two are what the pages already drew before the looks
 * existed (a pill on the editorial landing, the rounded button of every other page), so a host
 * that names its own look as the default changes nothing for a first-time visitor.
 *
 * Adding a look is one entry here; `test/button-styles.test.ts` holds every look to the five
 * variables and to the tokens, and the template's `tests/button-style.spec.ts` to WCAG AA on
 * every palette.
 */

export interface ButtonStyle {
  id: string;
  /** Shown in the switcher's accessible name and in the menu. A proper name, like a palette's. */
  name: string;
  /** CSS length. A pill is any radius at least half the action's height. */
  radius: string;
  /** What the action stands on. */
  background: string;
  /** The same under the pointer. */
  backgroundHover: string;
  /** The action's words. */
  ink: string;
  /** Its border; `transparent` for a look that has none. */
  edge: string;
}

/** The accent, and the ink that reads on it. A host that defines no `--shared-accent-ink`
 * gets its page ground there — on a dark page the accent is the light. */
const ACCENT = "var(--shared-accent)";
const ACCENT_INK = "var(--shared-accent-ink,var(--shared-bg))";
/** The host's raised plane (the template's card) — a ground its ink is already held to WCAG AA
 * on. A host that defines no `--shared-surface` gets its page ground. */
const SURFACE = "var(--shared-surface,var(--shared-bg))";
const mix = (a: string, percent: number, b: string) => `color-mix(in oklab,${a} ${percent}%,${b})`;

/** A filled action: the accent, its ink, no border. Under the pointer the accent thins by a
 * fifth — the value the template's button always used. */
const SOLID = {
  background: ACCENT,
  backgroundHover: mix(ACCENT, 80, "transparent"),
  ink: ACCENT_INK,
  edge: "transparent",
} as const;

/** The rounded corner of the host's own controls (the template's `--radius`). */
const ROUNDED = "0.625rem";

export const BUTTON_STYLES = [
  { id: "pill", name: "Pill", radius: "9999px", ...SOLID },
  { id: "rounded", name: "Rounded", radius: ROUNDED, ...SOLID },
  { id: "square", name: "Square", radius: "0px", ...SOLID },
  {
    // A line in the accent round the page's own ground. The ground is kept at four fifths, not
    // dropped: an action may lie over a picture, and its words are the page's ink. Under the
    // pointer it fills with the raised plane.
    id: "outline",
    name: "Outline",
    radius: "9999px",
    background: mix("var(--shared-bg)", 80, "transparent"),
    backgroundHover: SURFACE,
    ink: "var(--shared-ink)",
    edge: ACCENT,
  },
  {
    // The raised plane with the page's ink and a quiet line of the accent (three fifths — at
    // less the header's small icon of this look was hard to find on the dark palettes): quiet,
    // still a surface. Not a wash of the accent — on a palette of two colours the accent IS the ink,
    // and a wash of more than 6 % takes the words under WCAG AA on the tightest pairs (measured
    // on all thirty, 2026-11-25). The plane is the one ground the palettes already hold the ink
    // to. Under the pointer it settles to the page's ground.
    id: "soft",
    name: "Soft",
    radius: ROUNDED,
    background: SURFACE,
    backgroundHover: "var(--shared-bg)",
    ink: "var(--shared-ink)",
    edge: mix(ACCENT, 60, "transparent"),
  },
] as const satisfies readonly ButtonStyle[];

export type ButtonStyleId = (typeof BUTTON_STYLES)[number]["id"];

export const BUTTON_STYLE_IDS: readonly ButtonStyleId[] = BUTTON_STYLES.map((s) => s.id);

export function isButtonStyleId(value: string | null | undefined): value is ButtonStyleId {
  return (BUTTON_STYLE_IDS as readonly string[]).includes(value ?? "");
}

export function buttonStyleById(id: ButtonStyleId): (typeof BUTTON_STYLES)[number] {
  return BUTTON_STYLES.find((s) => s.id === id)!;
}

/** The look after `id`, wrapping from the last back to the first. */
export function nextButtonStyleId(id: ButtonStyleId): ButtonStyleId {
  const index = BUTTON_STYLE_IDS.indexOf(id);
  return BUTTON_STYLE_IDS[(index + 1) % BUTTON_STYLE_IDS.length]!;
}

/**
 * Every look as an `html[data-button="<id>"]` rule, so switching is an attribute write — the
 * way the palettes ship. A host's action reads the five variables; the package's own switcher
 * draws its icon from the same five, so the icon is the look on screen.
 */
export function buttonCssBlocks(): string {
  return BUTTON_STYLES.map(
    (s) =>
      `html[data-button="${s.id}"]{--shared-button-radius:${s.radius};--shared-button-bg:${s.background};--shared-button-bg-hover:${s.backgroundHover};--shared-button-ink:${s.ink};--shared-button-edge:${s.edge}}`
  ).join("\n");
}
