import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";

const sections = config.patterns.landing?.sections ?? [];
const stageEnabled = sections.length > 1 && config.patterns.landing?.presentation !== "document";

test("native scroll changes chapters while the stage stays in place", async ({ page }, info) => {
  test.skip(!stageEnabled || info.project.name === "mobile", "desktop enhancement only");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");
  const root = page.locator("[data-landing-mode]");
  await expect(root).toHaveAttribute("data-landing-mode", "story");
  const inactiveVisibility = await page.locator('[data-story-panel][data-active="false"]').evaluateAll((panels) => panels.map((panel) => getComputedStyle(panel).visibility));
  expect(inactiveVisibility.every((value) => value === "hidden")).toBe(true);
  const stage = page.locator("[data-story-stage]");
  const before = await stage.boundingBox();
  await page.evaluate(() => window.scrollBy(0, document.querySelector<HTMLElement>("[data-story-stage]")!.clientHeight + 1));
  await expect(page.locator(`[data-story-panel="${sections[1]}"]`)).toHaveAttribute("data-active", "true");
  const after = await stage.boundingBox();
  expect(Math.abs(before!.y - after!.y)).toBeLessThan(2);
  await expect(page.locator(`[data-story-panel="${sections[0]}"]`)).toHaveAttribute("inert", "");
  await expect(page.locator("[data-story-navigation] button[aria-current]")).toHaveText("02");
});

test("keyboard chapter buttons reach the last chapter and the footer remains reachable", async ({ page }, info) => {
  test.skip(!stageEnabled || info.project.name === "mobile", "desktop enhancement only");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");
  const last = page.locator("[data-story-navigation] button").last();
  await last.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(`[data-story-panel="${sections.at(-1)}"]`)).toHaveAttribute("data-active", "true");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole("contentinfo")).toBeInViewport();
});

test("contact deep links reveal the form on the stage", async ({ page }, info) => {
  test.skip(!stageEnabled || !sections.includes("contact") || info.project.name === "mobile", "desktop contact chapter only");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./#contact");
  await expect(page.locator('[data-story-panel="contact"]')).toHaveAttribute("data-active", "true");
  await expect(page.locator("#contact-email")).toBeVisible();
});

test("reduced motion and short viewports keep every chapter in document flow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "document");
  await expect(page.locator("[data-story-panel][inert]")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1280, height: 600 });
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "document");
});

test("all text and FAQ answers are readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(test.info().project.use.baseURL!);
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "document");
  await expect(page.locator("[data-section]")).toHaveCount(sections.length);
  const faq = page.locator('[data-section="faq"] details').first();
  if (await faq.count()) { await faq.locator("summary").click(); await expect(faq.locator("p")).toBeVisible(); }
  await context.close();
});

test("mobile chapters do not overflow horizontally at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("./");
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "document");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
