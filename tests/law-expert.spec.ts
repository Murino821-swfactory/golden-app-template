import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";

/**
 * law-expert (OTH-91): what can be checked without signing in. The research page itself
 * sits behind Google sign-in, which this suite cannot perform — its logic is pinned in
 * `law-expert-logic.spec.ts` and the live page by the smoke run after publishing.
 */

test.describe("law-expert research", () => {
  test("a signed-out visitor who opens the research page is sent to sign in", async ({ page }) => {
    await page.goto("./research");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("…and a Slovak visitor stays in Slovak", async ({ page }) => {
    await page.goto("./sk/research");
    await expect(page).toHaveURL(/\/sk\/login$/);
  });

  test("the call to action leads to the research page", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator('[data-section="cta"] a')).toHaveAttribute("href", /\/research$/);
  });

  test("…in the language of the page it is on", async ({ page }) => {
    await page.goto("./sk");
    await expect(page.locator('[data-section="cta"] a')).toHaveAttribute("href", /\/sk\/research$/);
  });

  test("the landing page promises only what the app does, and names its source", () => {
    for (const locale of config.locales) {
      const features = config.content[locale]!.landing!.features ?? [];
      const text = features.map((f) => `${f.title} ${f.description}`).join(" ");
      expect(text, locale).toContain("InfoSúd");
      // The old copy promised a "single-view output" and "consolidated opinions" nothing built.
      expect(text.toLowerCase(), locale).not.toMatch(/single-view|consolidat|konsolid/);
    }
  });
});
