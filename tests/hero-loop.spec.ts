import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";

/**
 * Without an AI image the hero stands over this prototype's own scene, the map on the desk (T-384), and its
 * files come from under the prototype's base path (`/newapp/<slug>`): a root-relative `/motion/…` is
 * apps.tokenwise.sk's 404 there — the poster and the loop failed on the first publish until `LoopVideo` added
 * the base path.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

test("the hero scene's poster and loop load from under the base path", async ({ page }) => {
  test.skip(!config.patterns.landing?.sections.includes("hero"), "no hero");
  await page.goto("./");
  const video = page.locator('[data-section="hero"] video[data-hero-video]');
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute("poster", `${BASE}/motion/hero-scene.webp`);
  await expect.poll(() => video.getAttribute("src")).toMatch(new RegExp(`^${BASE}/motion/hero-scene(-sm)?\\.mp4$`));
  for (const file of [(await video.getAttribute("poster"))!, (await video.getAttribute("src"))!]) {
    const res = await page.request.get(new URL(file, page.url()).toString());
    expect(res.status(), file).toBe(200);
  }
});
