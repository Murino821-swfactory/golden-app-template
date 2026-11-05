import { test, expect } from "@playwright/test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { config, landingPresentation } from "../lib/prototype-config";
import { MOTION_BUDGET_BYTES, MOTION_LOOPS, motionLoop } from "../lib/editorial";

/**
 * Editorial motion, third round (T-340, 2026-11-05: after framer.com, vercel.com, linear.app
 * and apple.com's MacBook Pro display page). Two light loops rendered in Blender — the eclipse
 * behind the hero's headline and the light ribbons behind the closing band — shipped as
 * neutral light on black and tinted by the palette in CSS, and a light that runs along the
 * hero frame's edge (Framer's prompt box). `editorial.spec.ts` and `editorial-v2.spec.ts`
 * keep guarding the earlier rounds.
 */

const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const editorial = landingPresentation(config) === "editorial";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const SRC = "/newapp/test/hero-image/AAAAAAAAAAAAAAAAAAAA.jpg";
const PIXEL = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64"
);

test.describe("editorial motion — light loops and the running edge", () => {
  test.skip(!editorial, "this config does not use the editorial presentation");

  test("hero light: the eclipse loop behind the headline — decoration, tinted by the palette, playing", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const light = hero.locator("[data-hero-light]");
    await expect(light).toHaveCount(1);
    await expect(light).toHaveAttribute("aria-hidden", "true");
    const loop = motionLoop(BASE, "hero-light");
    const video = light.locator("video");
    await expect(video).toHaveAttribute("poster", loop.poster);
    expect(await video.locator("source").evaluateAll((els) => els.map((el) => [el.getAttribute("src"), el.getAttribute("type")]))).toEqual(
      loop.sources.map((s) => [s.src, s.type])
    );
    expect(await video.evaluate((v: HTMLVideoElement) => [v.muted, v.loop, v.playsInline])).toEqual([true, true, true]);
    // Neutral light on black, screened onto the page; the tint layer gives it the palette's hue.
    expect(await light.evaluate((el) => getComputedStyle(el).mixBlendMode)).toBe("screen");
    expect(await light.evaluate((el) => getComputedStyle(el, "::after").mixBlendMode)).toBe("color");
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
    // Under the words, never over them, and the hero keeps its one action.
    expect(await light.evaluate((el) => getComputedStyle(el).zIndex)).toBe("-1");
    await expect(light.locator("a, button")).toHaveCount(0);
    // Where the corona crosses the letters both are the accent: the words carry a halo of the
    // page's own background so they stay readable on the light.
    expect(await hero.locator("h1").evaluate((el) => getComputedStyle(el).textShadow)).not.toBe("none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  });

  test("hero light: reduced motion shows the still and never downloads the loop", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    const fetched: string[] = [];
    page.on("request", (req) => {
      if (/\/motion\/[^/]+\.(webm|mp4)$/.test(new URL(req.url()).pathname)) fetched.push(req.url());
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const video = page.locator('[data-section="hero"] [data-hero-light] video');
    await expect(video).toHaveCount(1);
    await page.waitForTimeout(800);
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    expect(fetched).toEqual([]);
    expect(await page.locator("[data-hero-light]").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });

  test("hero light: an AI image owns the hero — no eclipse beside an object", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.route("**/hero-image.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, src: SRC, placement: "object" }) })
    );
    await page.route("**/hero-image/*.jpg", (route) => route.fulfill({ status: 200, contentType: "image/jpeg", body: PIXEL }));
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    await expect(hero.locator("[data-hero-object] img")).toHaveCount(1);
    await expect(hero.locator("[data-hero-light]")).toHaveCount(0);
  });

  test("the loops rest when they leave the screen", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const video = page.locator('[data-section="hero"] [data-hero-light] video');
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });

  test("the hero frame: a light runs along its edge; under reduced motion the edge is still", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const frame = page.locator('[data-section="hero"] [data-hero-frame]');
    if ((await frame.count()) === 0) return;
    const run = frame.locator("[data-frame-run]");
    await expect(run).toHaveCount(1);
    await expect(run).toHaveAttribute("aria-hidden", "true");
    expect(await run.evaluate((el) => getComputedStyle(el, "::before").animationName)).toBe("editorial-run");
    // A ring, not a cone: the padding box is cut out of the conic gradient, so the light only
    // ever touches the border. Without the exclusion the whole frame fills with a wedge of light.
    expect(await run.evaluate((el) => getComputedStyle(el, "::before").maskComposite)).toContain("exclude");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await run.evaluate((el) => getComputedStyle(el).display)).toBe("none");
  });

  test("closing: light ribbons behind the band, under its words", async ({ page }) => {
    test.skip(!sections.includes("cta"), "no closing section");
    await page.goto("./");
    const band = page.locator('[data-section="cta"] .editorial-band');
    const light = band.locator("[data-closing-light]");
    await expect(light).toHaveCount(1);
    await expect(light).toHaveAttribute("aria-hidden", "true");
    await expect(light.locator("video source").first()).toHaveAttribute("src", motionLoop(BASE, "closing-light").sources[0]!.src);
    expect(await light.evaluate((el) => getComputedStyle(el).zIndex)).toBe("-1");
    expect(await band.evaluate((el) => getComputedStyle(el).isolation)).toBe("isolate");
    await band.scrollIntoViewIfNeeded();
    await expect.poll(() => light.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  });
});

test.describe("editorial motion (pure)", () => {
  test("motionLoop: WebM before MP4 under the base path, and a still for the poster", () => {
    expect(motionLoop("/newapp/x", "hero-light")).toEqual({
      poster: "/newapp/x/motion/hero-light.webp",
      sources: [
        { src: "/newapp/x/motion/hero-light.webm", type: "video/webm" },
        { src: "/newapp/x/motion/hero-light.mp4", type: "video/mp4" },
      ],
    });
    expect(motionLoop("", "closing-light").poster).toBe("/motion/closing-light.webp");
  });

  test("every loop ships its three files, and together they stay inside the budget", () => {
    for (const name of MOTION_LOOPS) {
      const loop = motionLoop("", name);
      const files = [loop.poster, ...loop.sources.map((s) => s.src)].map((p) => resolve(__dirname, "../public", `.${p}`));
      for (const file of files) expect(existsSync(file), file).toBe(true);
      const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
      expect(bytes, `${name}: ${bytes} bytes`).toBeLessThanOrEqual(MOTION_BUDGET_BYTES);
    }
  });

  test("the tint is the palette's second accent, blended as colour — the render brings only light", () => {
    const css = readFileSync(resolve(__dirname, "../components/editorial/editorial.css"), "utf-8");
    expect(css).toMatch(/\.editorial-light::after \{[^}]*background: var\(--highlight, var\(--primary\)\);[^}]*mix-blend-mode: color;/);
    expect(css).toMatch(/\.editorial-light \{[^}]*mix-blend-mode: screen;/);
    // The ribbons dim where the band's words sit.
    expect(css).toMatch(/\.editorial-light-band \{[^}]*mask-image: radial-gradient/);
  });

  test("the Blender scenes that render the loops are kept beside the template", () => {
    for (const name of MOTION_LOOPS) {
      expect(existsSync(resolve(__dirname, `../scripts/motion/${name}.py`)), name).toBe(true);
    }
  });
});
