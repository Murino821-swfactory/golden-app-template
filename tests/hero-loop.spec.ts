import { test, expect } from "@playwright/test";
import { HERO_LOOP_SOURCE } from "../lib/hero-loop";
import { config } from "../lib/prototype-config";

/**
 * The hero's depth loop (T-384) plays over the AI image it was rendered from, and its files come from under the
 * prototype's base path (`/newapp/<slug>`): a root-relative `/motion/…` is apps.tokenwise.sk's 404 there, and the
 * hero stayed a still on the live demo until `LoopVideo` added the base path. `hero-image.json` is faked as in
 * hero-image.spec.ts.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
// A 1×1 JPEG, so the faked image decodes.
const PIXEL = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);

test("the hero loop over its AI image loads from under the base path", async ({ page }) => {
  test.skip(!config.patterns.landing?.sections.includes("hero"), "no hero");
  await page.route("**/hero-image.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, src: `${BASE}/hero-image/${HERO_LOOP_SOURCE}` }) })
  );
  await page.route("**/hero-image/*.jpg", (route) => route.fulfill({ status: 200, contentType: "image/jpeg", body: PIXEL }));
  await page.goto("./");
  const video = page.locator('[data-section="hero"] video[data-hero-video]');
  await expect(video).toHaveCount(1);
  await expect.poll(() => video.getAttribute("src")).toMatch(new RegExp(`^${BASE}/motion/hero-scene(-sm)?\\.mp4$`));
  const res = await page.request.get(new URL((await video.getAttribute("src"))!, page.url()).toString());
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("video/mp4");
});
