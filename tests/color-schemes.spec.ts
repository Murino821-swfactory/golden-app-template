import { test, expect } from "@playwright/test";
import {
  COLOR_SCHEME_IDS,
  RAMPS,
  deriveRoles,
  rolesFor,
  contrastRatio,
  relativeLuminance,
  WCAG_AA_TEXT,
} from "../lib/color-schemes";
import { config } from "../lib/prototype-config";

/**
 * The contrast floor under the deterministic palette rule.
 *
 * The rule picks roles mechanically and does not know intent, so this suite is what stops
 * an unreadable palette from reaching a customer. It is pure — no browser, no server — and
 * runs in the same command as the smoke suite so there is one gate to keep green.
 */

test.describe("colour schemes", () => {
  for (const id of COLOR_SCHEME_IDS) {
    test(`${id}: body text meets WCAG AA on its background`, () => {
      const roles = rolesFor(id);
      const ratio = contrastRatio(roles.foreground, roles.background);
      expect(
        ratio,
        `${id}: ${roles.foreground} on ${roles.background} is ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });

    test(`${id}: background is the darkest colour in the ramp (dark-only)`, () => {
      const roles = rolesFor(id);
      const darkest = Math.min(...RAMPS[id].map(relativeLuminance));
      expect(relativeLuminance(roles.background.slice(1))).toBeCloseTo(darkest, 10);
    });

    test(`${id}: every role is a distinct colour from the ramp`, () => {
      const roles = rolesFor(id);
      const values = Object.values(roles).map((v) => v.slice(1));
      expect(new Set(values).size).toBe(values.length);
      for (const v of values) {
        expect(RAMPS[id]).toContain(v);
      }
    });
  }

  test("derivation is deterministic — same ramp, same roles", () => {
    for (const id of COLOR_SCHEME_IDS) {
      expect(deriveRoles(RAMPS[id])).toEqual(deriveRoles(RAMPS[id]));
    }
  });

  test("a ramp too short to fill the roles is rejected, not silently padded", () => {
    expect(() => deriveRoles(["000000", "ffffff"])).toThrow(/at least 4 colours/);
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
