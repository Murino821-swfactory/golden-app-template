import { test, expect } from "@playwright/test";
import { config, contentFor } from "../lib/prototype-config";

const copy = contentFor(config);
const sections: readonly string[] = config.patterns.landing?.sections ?? [];

test.describe("landing v2 — features and closing band", () => {
  test("features use the configured heading and draw an svg per configured icon", async ({ page }) => {
    test.skip(!sections.includes("features") || !copy.landing?.features, "no configured features");
    await page.goto("./");
    const section = page.locator('[data-section="features"]');
    if (copy.landing?.featuresHeading) await expect(section.locator("h2")).toHaveText(copy.landing.featuresHeading);
    const withIcon = copy.landing!.features!.filter((f) => f.icon).length;
    await expect(section.locator("svg")).toHaveCount(withIcon);
  });

  test("the closing band speaks the customer's words when configured", async ({ page }) => {
    test.skip(!sections.includes("cta") || !copy.cta?.title, "no configured closing title");
    await page.goto("./");
    const band = page.locator('[data-section="cta"]');
    await expect(band.locator("h2")).toHaveText(copy.cta!.title!);
    if (copy.cta?.subtitle) await expect(band).toContainText(copy.cta.subtitle);
  });
});
