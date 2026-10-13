import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";

/**
 * law-expert (OTH-91): what can be checked without signing in. The research page itself
 * sits behind Google sign-in, which this suite cannot perform — its logic is pinned in
 * `law-expert-logic.spec.ts` and the live page by the smoke run after publishing.
 */

test.describe("law-expert research", () => {
  test("a signed-out visitor who opens a workspace page is sent to sign in", async ({ page }) => {
    for (const route of ["research", "matters", "deadlines", "billing"]) {
      await page.goto(`./${route}`);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("…and an English visitor stays in English", async ({ page }) => {
    await page.goto("./en/research");
    await expect(page).toHaveURL(/\/en\/login$/);
  });

  test("the call to action leads to the workspace overview", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator('[data-section="cta"] a')).toHaveAttribute("href", /\/dashboard$/);
  });

  test("…in the language of the page it is on", async ({ page }) => {
    await page.goto("./en");
    await expect(page.locator('[data-section="cta"] a')).toHaveAttribute("href", /\/en\/dashboard$/);
  });

  test("the landing names both audiences and the hero carries the workspace preview", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator('[data-section="useCases"]')).toContainText("Samostatný advokát");
    await expect(page.locator('[data-section="useCases"]')).toContainText("Advokátska kancelária");
    await expect(page.locator("[data-workspace-preview]")).toHaveCount(1);
  });

  test("the landing page promises only what the app does, and names its source", () => {
    for (const locale of config.locales) {
      const features = config.content[locale]!.landing!.features ?? [];
      const text = features.map((f) => `${f.title} ${f.description}`).join(" ");
      expect(text, locale).toContain("InfoSúd");
      // The old copy promised a "single-view output" and "consolidated opinions" nothing built.
      expect(text.toLowerCase(), locale).not.toMatch(/single-view|consolidat|konsolid/);
      // Nothing the workspace does not do: no client portal, e-signature, e-filing or accounting.
      expect(text.toLowerCase(), locale).not.toMatch(/portál|portal|podpis|signature|e-schránk|účtovníctv|accounting/);
    }
  });
});
