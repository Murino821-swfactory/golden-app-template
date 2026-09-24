import { test, expect } from "@playwright/test";
import {
  COLOR_SCHEME_IDS,
  PALETTES,
  LEGACY_SCHEME_IDS,
  derivePairRoles,
  rolesFor,
  nextSchemeId,
  assertReadable,
  contrastRatio,
  relativeLuminance,
  mix,
  WCAG_AA_TEXT,
} from "../lib/color-schemes";
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
];

/** The five pairs the rule corrects, and what it corrects them to (spec §3). */
const CORRECTED: Record<string, { background: string; foreground: string }> = {
  "dark-plum-earthy-khaki": { background: "#140602", foreground: "#8F7B5E" },
  "burnt-orange-misty-ice-blue": { background: "#9D420A", foreground: "#DFE7E7" },
  "dark-cyan-tangerine": { background: "#013B40", foreground: "#FF8135" },
  "ice-blue-ocean-blue": { background: "#066D86", foreground: "#CFFAFE" },
  "burnt-orange-vanilla": { background: "#A94819", foreground: "#FFF4D6" },
};

function darkerAndLighter(id: (typeof COLOR_SCHEME_IDS)[number]): [string, string] {
  const [a, b] = PALETTES[id].colors;
  return relativeLuminance(a) <= relativeLuminance(b) ? [a, b] : [b, a];
}

test.describe("the fifteen palettes", () => {
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

    test(`${id}: text and accent are one colour — a pair has two`, () => {
      const r = rolesFor(id);
      expect(r.primary).toBe(r.foreground);
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

  test("derivation is deterministic and ignores the order within the pair", () => {
    for (const id of COLOR_SCHEME_IDS) {
      const [a, b] = PALETTES[id].colors;
      expect(derivePairRoles([a, b])).toEqual(derivePairRoles([b, a]));
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
      })
    ).toThrow(/"test".*foreground on background/);
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
  });
});
