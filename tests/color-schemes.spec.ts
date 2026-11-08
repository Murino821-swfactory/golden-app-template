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
  hue,
  paletteKind,
  TONAL_MIN_COLOURS,
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
  // Ten tonal palettes of twenty colours — four grounds, four inks, twelve lights — designed
  // in-house for the founder's third tier (T-371, 2026-11-08), in that order.
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

/** The tonal palettes' accents and their series of twelve lights (hue order from the accent),
 * pinned like the corrections — generated once from the rule, then frozen. */
const TONAL: Record<string, { primary: string; highlight: string; accents: string[] }> = {
  "aurora-night": { primary: "#27B8E0", highlight: "#22BF92", accents: ["#27B8E0", "#4FA9F5", "#3F8FE8", "#6F6CF0", "#9A5CF2", "#C65BE8", "#E65BB8", "#C9A43A", "#76B832", "#46B86A", "#22BF92", "#2FB5A8"] },
  "ember-forge": { primary: "#D4A53E", highlight: "#EC9530", accents: ["#D4A53E", "#8A9A5B", "#6A8FA6", "#BD625D", "#CE5841", "#E86E4D", "#E8572A", "#D4794A", "#A96F4D", "#F07A2B", "#B5793A", "#EC9530"] },
  "neon-tokyo": { primary: "#22C47A", highlight: "#E09E1C", accents: ["#22C47A", "#19B6BE", "#2BB4FF", "#536EFF", "#7D5FFF", "#9852FF", "#D63CFF", "#FF4FA3", "#FF2D78", "#FF6A2B", "#E09E1C", "#8DB322"] },
  "desert-dusk": { primary: "#D9A066", highlight: "#D98E8E", accents: ["#D9A066", "#9A9A4E", "#8FA37B", "#6E8F8A", "#7FA3BF", "#A48BC2", "#B47A8E", "#D98E8E", "#BC6652", "#C8643C", "#C47E5A", "#E08A5A"] },
  "coral-reef": { primary: "#E89A35", highlight: "#FF8C42", accents: ["#E89A35", "#CFA246", "#72B53D", "#24B5A6", "#26A69A", "#3AB0E0", "#2E86DE", "#8F6DE8", "#E65BA3", "#F25F8C", "#FF6F61", "#FF8C42"] },
  "moss-lantern": { primary: "#C9A64B", highlight: "#DA9C36", accents: ["#C9A64B", "#8FB236", "#6C8C3E", "#7FA64A", "#4F9A5E", "#3C9D8A", "#8A9EC2", "#E0714A", "#BA6A41", "#C77A2F", "#B08A5E", "#DA9C36"] },
  "royal-velvet": { primary: "#C9A52F", highlight: "#D59E3F", accents: ["#C9A52F", "#2E9E6B", "#41B3C4", "#4C7BD9", "#906DB9", "#B388E0", "#9F60D2", "#C94FB5", "#E07A9A", "#D05166", "#D86B3A", "#D59E3F"] },
  "glacier-mint": { primary: "#3DBFA0", highlight: "#8DB54D", accents: ["#3DBFA0", "#3C9B8C", "#52B5A8", "#6FA8A8", "#2FB4D8", "#5AA9EE", "#4C8FD6", "#7D8FE6", "#A98BDC", "#C77DA0", "#CC9C50", "#8DB54D"] },
  "candy-arcade": { primary: "#3FB6FF", highlight: "#F59427", accents: ["#3FB6FF", "#4D7CFF", "#9D5CFF", "#F75FE0", "#FF5CA8", "#FF3B5C", "#FF7A2E", "#F59427", "#D9A020", "#6CBE1E", "#3BBF5E", "#1FB8A5"] },
  "clay-kiln": { primary: "#C9A66B", highlight: "#D4A038", accents: ["#C9A66B", "#D4A038", "#8F8A3C", "#7A9A4E", "#3F8F86", "#6E8CA8", "#9173A0", "#C1634D", "#AF6E4F", "#B07050", "#D98C5A", "#C97B3A"] },
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
    } else if (paletteKind(PALETTES[id].colors) === "tonal") {
      test(`${id}: twenty colours — the accents and the series of lights are the pinned values`, () => {
        const r = rolesFor(id);
        expect(PALETTES[id].colors).toHaveLength(TONAL_MIN_COLOURS);
        expect({ primary: r.primary, highlight: r.highlight, accents: r.accents }).toEqual(TONAL[id]);
      });

      test(`${id}: every ink reads on its plane and every light on a card`, () => {
        const r = rolesFor(id);
        expect(contrastRatio(r.cardForeground!, r.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        expect(contrastRatio(r.raisedForeground!, r.raised!)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        expect(contrastRatio(r.muted, r.raised!)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        for (const light of r.accents!) {
          expect(contrastRatio(light, r.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
        }
      });

      test(`${id}: the grounds step up from the page — card, raised plane, border — each visibly`, () => {
        // WCAG contrast cannot tell two near-blacks apart (both sit under its 0.05 floor), so
        // the step is in luminance: each ground at least half again as bright as the one below.
        const r = rolesFor(id);
        const Y = (hex: string) => relativeLuminance(hex.slice(1));
        expect(Y(r.surface)).toBeGreaterThanOrEqual(1.5 * Y(r.background));
        expect(Y(r.raised!)).toBeGreaterThanOrEqual(1.5 * Y(r.surface));
        expect(Y(r.border)).toBeGreaterThanOrEqual(1.5 * Y(r.raised!));
      });
    } else {
      test(`${id}: the accents are the pinned middle colours`, () => {
        const r = rolesFor(id);
        expect({ primary: r.primary, highlight: r.highlight }).toEqual(ACCENTS[id]);
        expect(r.accents).toBeUndefined();
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

/**
 * Palettes of twenty colours (T-371, 2026-11-08) are tonal: the pair rule and the accent rule
 * stay as pinned above, and a twentieth colour changes the kind. Sorted by luminance, the
 * four darkest are the grounds (page, card, raised plane, border), the four lightest the
 * inks (words, a card's words, the raised plane's words, muted) and the twelve between are
 * the lights: the most readable on a card is the accent, the next the second accent, and
 * all twelve — in hue order from the accent — are the series the page gives its cards.
 */
test.describe("palettes of twenty colours — tonal", () => {
  const GROUNDS = ["000000", "0A0A0A", "141414", "222222"];
  const INKS = ["FFFFFF", "EEEEEE", "DDDDDD", "CCCCCC"];
  const LIGHTS = ["C00000", "C06000", "A0A000", "00A000", "00A0A0", "0060C0", "6000C0", "C000C0", "C04060", "40A080", "8060A0", "A08040"];
  /** Supplied in no particular order, as an image would be read. */
  const TWENTY = [...LIGHTS.slice(5), ...INKS.slice(2), ...GROUNDS.slice(1), ...LIGHTS.slice(0, 5), ...INKS.slice(0, 2), ...GROUNDS.slice(0, 1)];

  test("twenty colours make a palette tonal; nineteen keep it an accented palette", () => {
    expect(TONAL_MIN_COLOURS).toBe(20);
    expect(TWENTY).toHaveLength(20);
    expect(paletteKind(TWENTY)).toBe("tonal");
    expect(paletteKind(TWENTY.slice(1))).toBe("accented");
    expect(paletteKind(["000000", "FFFFFF"])).toBe("pair");
    expect(derivePaletteRoles(TWENTY.slice(1)).accents).toBeUndefined();
  });

  test("the four darkest are the grounds: page, card, raised plane, border — as supplied", () => {
    const r = derivePaletteRoles(TWENTY);
    expect([r.background, r.surface, r.raised, r.border]).toEqual(["#000000", "#0A0A0A", "#141414", "#222222"]);
  });

  test("the four lightest are the inks: words, a card's words, the raised plane's words, muted", () => {
    const r = derivePaletteRoles(TWENTY);
    expect([r.foreground, r.cardForeground, r.raisedForeground, r.muted]).toEqual(["#FFFFFF", "#EEEEEE", "#DDDDDD", "#CCCCCC"]);
  });

  test("the twelve between are the lights: the accent reads best on a card, the series walks the hue circle from it", () => {
    const r = derivePaletteRoles(TWENTY);
    expect(r.accents).toHaveLength(12);
    expect(r.accents![0]).toBe(r.primary);
    // Each light keeps its hue (lifting toward white does, to within a degree of channel
    // rounding), and from the accent on the hues only grow until the circle wraps once.
    const hues = r.accents!.map((c) => hue(c.slice(1)));
    let wraps = 0;
    for (let i = 1; i < hues.length; i++) if (hues[i]! < hues[i - 1]! - 1) wraps++;
    expect(wraps).toBeLessThanOrEqual(1);
    // The most readable light on the card is the accent, the next the second accent.
    const byReadability = [...LIGHTS].sort((x, y) => contrastRatio(y, r.surface) - contrastRatio(x, r.surface));
    expect(Math.abs(hue(r.primary.slice(1)) - hue(byReadability[0]!))).toBeLessThan(1);
    expect(r.highlight).toBe(`#${byReadability[1]}`);
  });

  test("a light too dark to read on a card is lifted toward white, keeping its hue", () => {
    const r = derivePaletteRoles(TWENTY);
    const blue = r.accents!.find((c) => Math.abs(hue(c.slice(1)) - hue("0060C0")) < 1)!;
    expect(blue).not.toBe("#0060C0");
    expect(contrastRatio(blue, r.surface)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });

  test("the order the twenty colours are supplied in does not matter", () => {
    const expected = derivePaletteRoles(TWENTY);
    expect(derivePaletteRoles([...TWENTY].reverse())).toEqual(expected);
    expect(derivePaletteRoles([...GROUNDS, ...INKS, ...LIGHTS])).toEqual(expected);
  });

  test("hue walks the circle: red 0, yellow 60, green 120, cyan 180, blue 240, magenta 300; grey has none", () => {
    expect(hue("FF0000")).toBe(0);
    expect(hue("FFFF00")).toBe(60);
    expect(hue("00FF00")).toBe(120);
    expect(hue("00FFFF")).toBe(180);
    expect(hue("0000FF")).toBe(240);
    expect(hue("FF00FF")).toBe(300);
    expect(hue("808080")).toBe(0);
  });

  test("assertReadable checks the tonal roles too, and names what failed", () => {
    const r = derivePaletteRoles(TWENTY);
    expect(() => assertReadable("tonal", r)).not.toThrow();
    expect(() => assertReadable("dim-ink", { ...r, cardForeground: "#222222" })).toThrow(/"dim-ink".*card words on card/);
    expect(() => assertReadable("dim-raised", { ...r, raisedForeground: "#222222" })).toThrow(/raised words on raised plane/);
    expect(() => assertReadable("dim-light", { ...r, accents: [...r.accents!.slice(1), "#222222"] })).toThrow(/light 12 on card/);
  });
});

test.describe("a tonal palette reaches the CSS", () => {
  const tonal = COLOR_SCHEME_IDS.filter((id) => paletteKind(PALETTES[id].colors) === "tonal");
  const others = COLOR_SCHEME_IDS.filter((id) => paletteKind(PALETTES[id].colors) !== "tonal");

  test("ten palettes of twenty colours ship, after the twenty of before", () => {
    expect(tonal).toHaveLength(10);
    expect(COLOR_SCHEME_IDS.slice(20)).toEqual(tonal);
  });

  test("the series is --accent-1 … --accent-12, the raised plane carries the menus and secondary surfaces, the inks their planes' words", () => {
    for (const id of tonal) {
      const r = rolesFor(id);
      const v = cssVariablesFor(id);
      r.accents!.forEach((light, i) => expect(v[`--accent-${i + 1}`]).toBe(light));
      expect(v["--accent-13"]).toBeUndefined();
      expect(v["--card"]).toBe(r.surface);
      for (const token of ["--popover", "--secondary", "--muted", "--accent"]) expect(v[token]).toBe(r.raised);
      expect(v["--card-foreground"]).toBe(r.cardForeground);
      for (const token of ["--popover-foreground", "--secondary-foreground", "--accent-foreground"]) expect(v[token]).toBe(r.raisedForeground);
      expect(v["--muted-foreground"]).toBe(r.muted);
    }
  });

  test("a pair or an accented palette emits no series — its cards paint the page's accent, as before", () => {
    for (const id of others) {
      const v = cssVariablesFor(id);
      expect(v["--accent-1"]).toBeUndefined();
      expect(v["--popover"]).toBe(v["--card"]);
      expect(v["--card-foreground"]).toBe(v["--foreground"]);
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

  test("under a tonal palette every card and step takes its own light; under the configured palette they paint the page's accent", async ({ page }) => {
    await page.goto("./");
    const cards = page.locator("[data-bento] > li");
    const steps = page.locator("[data-steps] > li");
    await expect(cards.nth(1)).toBeVisible();
    const accentOf = (locator: ReturnType<typeof page.locator>) =>
      locator.evaluate((el) => [
        getComputedStyle(el).getPropertyValue("--primary").trim().toLowerCase(),
        getComputedStyle(el).getPropertyValue("--highlight").trim().toLowerCase(),
      ]);

    const page_ = rolesFor(config.theme.colorScheme);
    expect(await accentOf(cards.nth(1))).toEqual([page_.primary.toLowerCase(), page_.highlight.toLowerCase()]);

    const tonal = COLOR_SCHEME_IDS.find((id) => paletteKind(PALETTES[id].colors) === "tonal")!;
    await page.evaluate((id) => {
      document.documentElement.dataset.scheme = id;
    }, tonal);
    const r = rolesFor(tonal);
    const cardCount = Math.min(await cards.count(), 6);
    for (let i = 0; i < cardCount; i++) {
      const light = r.accents![i]!.toLowerCase();
      expect(await accentOf(cards.nth(i)), `card ${i + 1}`).toEqual([light, light]);
    }
    const stepCount = Math.min(await steps.count(), 4);
    for (let i = 0; i < stepCount; i++) {
      const light = r.accents![6 + i]!.toLowerCase();
      expect(await accentOf(steps.nth(i)), `step ${i + 1}`).toEqual([light, light]);
    }
  });
});
