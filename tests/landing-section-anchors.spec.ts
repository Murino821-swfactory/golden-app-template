import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";

const sections = config.patterns.landing?.sections ?? [];

test("every rendered landing section owns one stable id and a scroll offset", async ({ page }) => {
  await page.goto("./");
  for (const id of sections) {
    const target = page.locator(`[id="${id}"]`);
    await expect(target).toHaveCount(1);
    await expect(target).toHaveAttribute("data-section", id);
    expect(await target.evaluate((element) => parseFloat(getComputedStyle(element).scrollMarginTop))).toBeGreaterThan(0);
  }
});

test("section hashes reveal their chapter in both story and document presentations", async ({ page }, info) => {
  if (info.project.name === "chromium") await page.setViewportSize({ width: 1440, height: 900 });
  // Load the first hash with the document so Next's initial router state includes it.
  // Changing it before hydration finishes can be overwritten by router initialization.
  await page.goto(`./#${sections.at(-1) ?? ""}`);
  for (const id of [...sections].reverse()) {
    await page.evaluate((hash) => { location.hash = hash; }, id);
    const target = page.locator(`[id="${id}"]`);
    await expect(target).toBeInViewport();
    await expect(target).toBeVisible();
    await expect(target.locator("xpath=..")).not.toHaveAttribute("inert", "");
  }
});

test("section ids are present in the exported document without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL!);
    for (const id of sections) {
      await expect(page.locator(`[id="${id}"][data-section="${id}"]`)).toHaveCount(1);
    }
  } finally {
    await context.close();
  }
});
