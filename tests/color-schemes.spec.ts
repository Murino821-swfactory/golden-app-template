import { test, expect } from "@playwright/test";
import {
  COLOR_SCHEME_IDS,
  PALETTES,
  LEGACY_SCHEME_IDS,
  derivePairRoles,
  derivePaletteRoles,
  cssVariablesFor,
  rolesFor,
  nextSchemeId,
  assertReadable,
  contrastRatio,
  relativeLuminance,
  mix,
  WCAG_AA_TEXT,
} from "@tokenwise/shared-ui/theming";
import { config } from "../lib/prototype-config";

/**
 * The contrast floor under the deterministic pair rule.
 *
 * The rule picks roles mechanically and does not know intent, so this suite is what stops
 * an unreadable palette from reaching a customer. It is pure — no browser, no server — and
 * runs in the same command as the smoke suite so there is one gate to keep green.
 */

/** The founder's order (spec sw-factory 2026-09-24 §3). The header's button walks it, so a
 * reorder changes behaviour and has to be a deliberate edit here, not an accident. */
const EXPECTED_ORDER = [
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
  // Five palettes of seven colours, supplied as images on 2026-10-26, in that order.
  "deep-sea-blues",
  "lime-lagoon",
  "peacock-amber",
  "mulled-spice",
  "black-gold",
];

/** The five pairs the rule corrects, and what it corrects them to (spec §3). */
const CORRECTED: Record<string, { background: string; foreground: string }> = {
  "dark-plum-earthy-khaki": { background: "#140602", foreground: "#8F7B5E" },
  "burnt-orange-misty-ice-blue": { background: "#9D420A", foreground: "#DFE7E7" },
  "dark-cyan-tangerine": { background: "#013B40", foreground: "#FF8135" },
  "ice-blue-ocean-blue": { background: "#066D86", foreground: "#CFFAFE" },
  "burnt-orange-vanilla": { background: "#A94819", foreground: "#FFF4D6" },
};

/** The accents a palette of more than two colours derives, pinned like the corrections. */
const ACCENTS: Record<string, { primary: string; highlight: string }> = {
  "deep-sea-blues": { primary: "#6DAFD1", highlight: "#3A9ED0" },
  "lime-lagoon": { primary: "#9EBC0F", highlight: "#11B6E6" },
  "peacock-amber": { primary: "#179CA8", highlight: "#764BA5" },
  "mulled-spice": { primary: "#EFA717", highlight: "#82AB9C" },
  "black-gold": { primary: "#CDAD69", highlight: "#AC8B56" },
};

/** The darkest and the lightest colour of a palette — background and text before correction. */
function darkerAndLighter(id: (typeof COLOR_SCHEME_IDS)[number]): [string, string] {
  const sorted = [...PALETTES[id].colors].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  return [sorted[0]!, sorted[sorted.length - 1]!];
}

test.describe("the palettes", () => {
  test("ship in the founder's order", () => {
    expect([...COLOR_SCHEME_IDS]).toEqual(EXPECTED_ORDER);
    expect(Object.keys(PALETTES)).toEqual(EXPECTED_ORDER);
  });

  test("every name is unique — two pairs share Burnt Orange, their names must not", () => {
    const names = COLOR_SCHEME_IDS.map((id) => PALETTES[id].name);
    expect(new Set(names).size).toBe(names.length);
  });

  for (const id of COLOR_SCHEME_IDS) {
    test(`${id}: every text the page paints meets WCAG AA`, () => {
      const r = rolesFor(id);
      expect(contrastRatio(r.foreground, r.background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
      expect(contrastRatio(r.foreground, r.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
      expect(contrastRatio(r.muted, r.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
      expect(contrastRatio(r.background, r.primary)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });

    test(`${id}: the background comes from the darker colour (dark-only)`, () => {
      const [darker] = darkerAndLighter(id);
      expect(relativeLuminance(rolesFor(id).background)).toBeLessThanOrEqual(
        relativeLuminance(darker)
      );
    });

    if (PALETTES[id].colors.length === 2) {
      test(`${id}: text and accent are one colour — a pair has two`, () => {
        const r = rolesFor(id);
        expect(r.primary).toBe(r.foreground);
        expect(r.highlight).toBe(r.primary);
      });
    } else {
      test(`${id}: the accents are the pinned middle colours`, () => {
        const r = rolesFor(id);
        expect({ primary: r.primary, highlight: r.highlight }).toEqual(ACCENTS[id]);
      });
    }

    test(`${id}: the second accent reaches the CSS`, () => {
      expect(cssVariablesFor(id)["--highlight"]).toBe(rolesFor(id).highlight);
    });

    const corrected = CORRECTED[id];
    test(`${id}: ${corrected ? "is corrected to the pinned values" : "ships exactly as supplied"}`, () => {
      const r = rolesFor(id);
      if (corrected) {
        expect({ background: r.background, foreground: r.foreground }).toEqual(corrected);
      } else {
        const [darker, lighter] = darkerAndLighter(id);
        expect(r.background).toBe(`#${darker}`);
        expect(r.foreground).toBe(`#${lighter}`);
      }
    });
  }

  test("derivation is deterministic and ignores the order of the colours", () => {
    for (const id of COLOR_SCHEME_IDS) {
      const colours = PALETTES[id].colors;
      expect(derivePaletteRoles([...colours].reverse())).toEqual(derivePaletteRoles(colours));
    }
  });

  test("mix walks from one colour to the other", () => {
    expect(mix("000000", "FFFFFF", 0)).toBe("000000");
    expect(mix("000000", "FFFFFF", 1)).toBe("FFFFFF");
    expect(mix("000000", "FFFFFF", 0.5)).toBe("808080");
  });

  test("a pair deepening alone cannot fix still ends readable — the text is lifted too", () => {
    const r = derivePairRoles(["777777", "7A7A7A"]);
    expect(contrastRatio(r.foreground, r.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  test("assertReadable names what failed", () => {
    expect(() =>
      assertReadable("test", {
        background: "#000000",
        surface: "#000000",
        border: "#111111",
        primary: "#222222",
        muted: "#222222",
        foreground: "#222222",
        highlight: "#222222",
      })
    ).toThrow(/"test".*foreground on background/);
  });

  test("assertReadable refuses an accent too dark to read as text", () => {
    expect(() =>
      assertReadable("dim-accent", {
        background: "#000000",
        surface: "#141414",
        border: "#383838",
        primary: "#330000",
        muted: "#FFFFFF",
        foreground: "#FFFFFF",
        highlight: "#330000",
      })
    ).toThrow(/"dim-accent".*primary on surface/);
  });

  test("nextSchemeId walks the list and wraps after the last", () => {
    expect(nextSchemeId(COLOR_SCHEME_IDS[0])).toBe(COLOR_SCHEME_IDS[1]);
    expect(nextSchemeId(COLOR_SCHEME_IDS[COLOR_SCHEME_IDS.length - 1]!)).toBe(COLOR_SCHEME_IDS[0]);
    let id: (typeof COLOR_SCHEME_IDS)[number] = COLOR_SCHEME_IDS[3];
    for (let i = 0; i < COLOR_SCHEME_IDS.length; i++) id = nextSchemeId(id);
    expect(id).toBe(COLOR_SCHEME_IDS[3]);
  });

  test("every retired id maps to a palette that ships", () => {
    expect(Object.keys(LEGACY_SCHEME_IDS).sort()).toEqual(["blue", "green", "red", "yellow"]);
    for (const target of Object.values(LEGACY_SCHEME_IDS)) {
      expect(COLOR_SCHEME_IDS).toContain(target);
    }
  });

  test("the configured scheme is one this template actually ships", () => {
    expect(COLOR_SCHEME_IDS).toContain(config.theme.colorScheme);
  });
});

/**
 * Palettes of three and four colours (founder 2026-10-26). The pair rule stays as it was —
 * the pairs above pin that — and the extra colours become accents: the darkest is the
 * background, the lightest the text, the middle one the accent (`primary`), and a fourth
 * the second accent (`highlight`), which only decoration paints.
 */
test.describe("palettes of three and four colours", () => {
  function permutations<T>(items: readonly T[]): T[][] {
    if (items.length <= 1) return [[...items]];
    return items.flatMap((item, i) =>
      permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest])
    );
  }

  test("three colours: the middle one is the accent, and the only accent", () => {
    const r = derivePaletteRoles(["F7F7FF", "FF8135", "0C142A"]);
    expect(r.background).toBe("#0C142A");
    expect(r.foreground).toBe("#F7F7FF");
    expect(r.primary).toBe("#FF8135");
    expect(r.highlight).toBe("#FF8135");
  });

  test("four colours: the more readable middle is the accent, the other the second accent", () => {
    const r = derivePaletteRoles(["0055A6", "FFFFFF", "000000", "FF8135"]);
    expect(r.background).toBe("#000000");
    expect(r.foreground).toBe("#FFFFFF");
    expect(r.primary).toBe("#FF8135");
    expect(r.highlight).toBe("#0055A6");
  });

  test("the order the colours are supplied in does not matter", () => {
    const colours = ["0055A6", "FFFFFF", "000000", "FF8135"] as const;
    const expected = derivePaletteRoles(colours);
    for (const order of permutations(colours)) {
      expect(derivePaletteRoles(order)).toEqual(expected);
    }
  });

  test("an accent too dark to read is lifted toward white, keeping its hue", () => {
    const r = derivePaletteRoles(["000000", "640000", "FFFFFF"]);
    expect(r.primary).not.toBe("#640000");
    expect(contrastRatio(r.primary, r.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    const [red, green, blue] = [1, 3, 5].map((i) => parseInt(r.primary.slice(i, i + 2), 16));
    expect(red).toBeGreaterThan(green!);
    expect(red).toBeGreaterThan(blue!);
  });

  test("the second accent is decoration and ships exactly as supplied", () => {
    const r = derivePaletteRoles(["000000", "111111", "FF8135", "FFFFFF"]);
    expect(r.primary).toBe("#FF8135");
    expect(r.highlight).toBe("#111111");
  });

  test("every text a three- or four-colour palette paints meets WCAG AA", () => {
    for (const colours of [
      ["264653", "2A9D8F", "E9C46A", "F4A261"],
      ["000000", "640000", "FFFFFF"],
      ["421407", "6D542E", "FB3640"],
    ]) {
      const r = derivePaletteRoles(colours);
      expect(() => assertReadable(colours.join("-"), r)).not.toThrow();
    }
  });

  test("a palette has at least two colours", () => {
    expect(() => derivePaletteRoles(["000000"])).toThrow(/at least 2/);
  });

  test("beyond four colours, the further middles are kept as supplied and not painted", () => {
    const four = derivePaletteRoles(["000000", "0055A6", "FF8135", "FFFFFF"]);
    expect(derivePaletteRoles(["000000", "0A0A0A", "0055A6", "141414", "FF8135", "FFFFFF"])).toEqual(four);
  });

  test("a pair derives exactly as the pair rule does", () => {
    for (const id of COLOR_SCHEME_IDS) {
      const colours = PALETTES[id].colors;
      if (colours.length !== 2) continue;
      expect(derivePaletteRoles(colours)).toEqual(derivePairRoles([colours[0], colours[1]]));
    }
  });
});

test.describe("colour scheme reaches the page", () => {
  test("html carries the configured scheme and its background", async ({ page }) => {
    await page.goto("./");

    await expect(page.locator("html")).toHaveAttribute(
      "data-scheme",
      config.theme.colorScheme
    );

    const expected = rolesFor(config.theme.colorScheme).background.toLowerCase();
    const applied = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--background").trim()
    );
    expect(applied.toLowerCase()).toBe(expected);

    const highlight = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--highlight").trim()
    );
    expect(highlight.toLowerCase()).toBe(rolesFor(config.theme.colorScheme).highlight.toLowerCase());
  });
});
