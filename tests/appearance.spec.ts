import { test, expect } from "@playwright/test";
import { cssBlocksForAll, rolesFor, contrastRatio, WCAG_AA_TEXT } from "@tokenwise/shared-ui/theming";
import { parsePrototypeConfig, config } from "../lib/prototype-config";
import { htmlAppearance } from "../lib/theme-appearance";

/**
 * The light variant is a PROJECT choice, made once at build time — a paid add-on for a
 * customer whose brand is light (founder decision 2026-11-09, D6 of T-360). It is a single
 * setting in `prototype.config.json` (`theme.appearance`), the single source of truth, not a
 * visitor-facing dark/light toggle. Dark stays the default and the baseline of every project.
 *
 * These tests fix the two ends of that wire: the config carries the choice (defaulting to
 * dark), and the shell turns the choice into the one class and the one attribute the whole
 * page is themed by — so the dark default renders byte-for-byte as it always did.
 */

/** The smallest valid config — the appearance cases below edit `theme`. */
function baseConfig(): Record<string, unknown> {
  return {
    appName: "Trailhead",
    locales: ["en"],
    defaultLocale: "en",
    theme: { colorScheme: "chartreuse-pastel-deep-teal-green" },
    patterns: { landing: { sections: ["hero", "cta"] }, cta: { href: "/login" } },
    content: {
      en: {
        description: "Log the trails you walked.",
        landing: { headline: "Every trail you walk counts" },
        cta: { label: "Start logging" },
      },
    },
  };
}

test.describe("the appearance setting (T-400)", () => {
  test("defaults to dark when the config names none — the baseline of every project", () => {
    const parsed = parsePrototypeConfig(baseConfig());
    expect(parsed.theme.appearance).toBe("dark");
  });

  test("a project may opt into the light variant", () => {
    const parsed = parsePrototypeConfig({
      ...baseConfig(),
      theme: { colorScheme: "chartreuse-pastel-deep-teal-green", appearance: "light" },
    });
    expect(parsed.theme.appearance).toBe("light");
  });

  test("an appearance that is neither dark nor light is rejected", () => {
    expect(() =>
      parsePrototypeConfig({
        ...baseConfig(),
        theme: { colorScheme: "chartreuse-pastel-deep-teal-green", appearance: "sepia" },
      })
    ).toThrow(/theme\.appearance/);
  });

  test("the shipped config is dark (the add-on is off by default)", () => {
    expect(config.theme.appearance).toBe("dark");
  });
});

test.describe("the shell turns the setting into the document's theming", () => {
  test("dark keeps the `.dark` class and adds no attribute — the document is unchanged", () => {
    const a = htmlAppearance("dark");
    expect(a.darkClass).toBe(true);
    expect(a.dataAppearance).toBeUndefined();
  });

  test("light drops `.dark` so :root's light base shows, and marks the document for the light-only refinements", () => {
    const a = htmlAppearance("light");
    expect(a.darkClass).toBe(false);
    expect(a.dataAppearance).toBe("light");
  });
});

test.describe("the light tokens, applied, paint a readable light page", () => {
  // The committed build is dark, so this drives the shipped light CSS directly: the same
  // blocks the shell would emit for a light project, applied to the live document, must flip
  // every surface to its light grounds and keep the words readable. The visual check in the
  // PR covers the rest (three palettes in light, the same three in dark).
  test("every surface flips to its light ground and the words still meet WCAG AA", async ({ page }) => {
    await page.goto("./");
    // The dark build: the `.dark` class is on <html> and nothing marks it light.
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);
    await expect(page.locator("html")).not.toHaveAttribute("data-appearance", "light");

    const scheme = config.theme.colorScheme;
    const darkBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--background").trim()
    );
    expect(darkBg.toLowerCase()).toBe(rolesFor(scheme).background.toLowerCase());

    // Apply the light variant exactly as the shell would — swap the shipped palette blocks
    // for the light ones. The dark blocks sit in a <style> at the top of <body>; a light block
    // has the same selector, so it must come LATER in document order to win (equal specificity).
    // Appending to the end of <body> is that order; the class is dropped and the page marked
    // light, as `htmlAppearance("light")` prescribes.
    await page.evaluate((css) => {
      const style = document.createElement("style");
      style.textContent = css;
      document.body.appendChild(style);
      document.documentElement.classList.remove("dark");
      document.documentElement.dataset.appearance = "light";
    }, cssBlocksForAll("light"));

    const light = rolesFor(scheme, "light");
    const read = (name: string) =>
      page.evaluate(
        (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
        name
      );
    expect((await read("--background")).toLowerCase()).toBe(light.background.toLowerCase());
    expect((await read("--foreground")).toLowerCase()).toBe(light.foreground.toLowerCase());
    expect((await read("--card")).toLowerCase()).toBe(light.surface.toLowerCase());
    // The light page is lighter than its words, and they read on it.
    expect(contrastRatio(light.foreground, light.background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
});
