import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config, contentFor, landingPresentation } from "../lib/prototype-config";
import { MOTION_LOOPS, motionLoop } from "../lib/editorial";
import { SCENES, pinProgress, sceneFrom, sceneLoops } from "../lib/scene";

/**
 * The three motion proposals (T-368, 2026-11-07, after apple.com's ProLED XDR page): `stage`,
 * `beam` and `glass`, each a whole language for the editorial page (`lib/scene.ts`,
 * `components/editorial/scenes.css`). A build names one in `NEXT_PUBLIC_EDITORIAL_SCENE`; the
 * page cases below run against such a build and read the same variable. A build without it is
 * the editorial page of T-340, and the first case proves it carries no scene at all.
 */

const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const landing = contentFor(config).landing;
const editorial = landingPresentation(config) === "editorial";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const scene = sceneFrom(process.env.NEXT_PUBLIC_EDITORIAL_SCENE);
const loops = sceneLoops(scene);

test.describe("editorial scenes — the page", () => {
  test.skip(!editorial, "this config does not use the editorial presentation");

  test("the root carries the scene the build was given, and none otherwise", async ({ page }) => {
    await page.goto("./");
    const root = page.locator("[data-presentation]");
    if (scene) await expect(root).toHaveAttribute("data-scene", scene);
    else expect(await root.getAttribute("data-scene")).toBeNull();
  });

  test("the scene's loops stand behind the headline and the close, tinted like every light", async ({ page }) => {
    test.skip(!sections.includes("hero") || !sections.includes("cta"), "no hero or no close");
    await page.goto("./");
    const hero = page.locator('[data-section="hero"] [data-hero-light]');
    await expect(hero.locator("video source").first()).toHaveAttribute("src", motionLoop(BASE, loops.hero).sources[0]!.src);
    expect(await hero.evaluate((el) => getComputedStyle(el).mixBlendMode)).toBe("screen");
    const close = page.locator('[data-section="cta"] [data-closing-light]');
    await expect(close.locator("video source").first()).toHaveAttribute("src", motionLoop(BASE, loops.closing).sources[0]!.src);
    await expect(page.locator("[data-card-light]")).toHaveCount(loops.card && sections.includes("features") ? 1 : 0);
    await expect(page.locator("[data-steps-light]")).toHaveCount(loops.steps && sections.includes("howItWorks") && landing?.howItWorks ? 1 : 0);
  });

  test("stage: the manifesto sits on a bright panel — the ink turned into the paper", async ({ page }) => {
    test.skip(scene !== "stage" || !landing?.manifesto, "not the stage scene, or no manifesto");
    await page.goto("./");
    const panel = page.locator("[data-manifesto-pin]");
    await expect(panel).toHaveClass(/editorial-bright/);
    const [paper, ink] = await panel.evaluate((el) => {
      const section = el.closest("[data-section]")!;
      return [getComputedStyle(el).backgroundColor, getComputedStyle(section).color];
    });
    expect(paper).toBe(ink);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  });

  test("beam: the steps' clip is scrubbed by the pin on a desktop and plays once elsewhere; still under reduced motion", async ({ page }, info) => {
    test.skip(scene !== "beam" || !sections.includes("howItWorks") || !landing?.howItWorks, "not the beam scene, or no steps");
    await page.goto("./");
    const clip = page.locator("[data-steps-light]");
    await expect(clip).toHaveAttribute("aria-hidden", "true");
    await expect(clip).toHaveAttribute("data-scrub", "");
    const video = clip.locator("video");
    await page.locator("[data-steps-pin]").scrollIntoViewIfNeeded();
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
    if (info.project.name === "mobile") {
      // No pin on a phone: the clip plays through once.
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
    } else {
      // The pin: the clip holds the time the scroll gives it, and never plays on its own.
      await page.evaluate(() => {
        const pin = document.querySelector("[data-steps-pin]")!;
        window.scrollTo(0, window.scrollY + pin.getBoundingClientRect().top + pin.getBoundingClientRect().height * 0.5);
      });
      await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(0);
      expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.locator("[data-steps-pin]").scrollIntoViewIfNeeded();
    expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBe(0);
  });

  test("glass: the FAQ is a bright pane, and the page is never wider than the screen", async ({ page }) => {
    test.skip(scene !== "glass" || !sections.includes("faq"), "not the glass scene, or no FAQ");
    await page.goto("./");
    await expect(page.locator('[data-section="faq"]')).toHaveClass(/editorial-bright/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  });

  test("every scene: reduced motion leaves every group at rest, nothing pinned, no loop playing", async ({ page }) => {
    test.skip(!scene, "no scene");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const opacities = await page.locator("[data-reveal]").evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.every((o) => o === "1")).toBe(true);
    const playing = await page.locator(".editorial-light video").evaluateAll((els) => els.filter((v) => !(v as HTMLVideoElement).paused).length);
    expect(playing).toBe(0);
  });
});

test.describe("editorial scenes (pure)", () => {
  test("sceneFrom accepts the three names and nothing else", () => {
    for (const name of SCENES) expect(sceneFrom(name)).toBe(name);
    expect(sceneFrom(undefined)).toBeNull();
    expect(sceneFrom("")).toBeNull();
    expect(sceneFrom("Stage")).toBeNull();
  });

  test("without a scene the loops are T-340's; every scene's loops are shipped loops with a scene beside them", () => {
    expect(sceneLoops(null)).toEqual({ hero: "hero-light", closing: "closing-light", card: null, steps: null });
    for (const name of SCENES) {
      const chosen = sceneLoops(name);
      for (const loop of [chosen.hero, chosen.closing, chosen.card, chosen.steps]) {
        if (!loop) continue;
        expect(MOTION_LOOPS, loop).toContain(loop);
        expect(existsSync(resolve(__dirname, `../scripts/motion/${loop}.py`)), loop).toBe(true);
      }
      expect(chosen.hero).not.toBe("hero-light");
    }
  });

  test("pinProgress: 0 at the top of the runway, 1 at its end, none where nothing pins", () => {
    expect(pinProgress({ runwayTop: 0, runwayHeight: 2400, stageHeight: 800, stickyTop: 0 })).toBe(0);
    expect(pinProgress({ runwayTop: -800, runwayHeight: 2400, stageHeight: 800, stickyTop: 0 })).toBe(0.5);
    expect(pinProgress({ runwayTop: -1600, runwayHeight: 2400, stageHeight: 800, stickyTop: 0 })).toBe(1);
    expect(pinProgress({ runwayTop: -3000, runwayHeight: 2400, stageHeight: 800, stickyTop: 0 })).toBe(1);
    expect(pinProgress({ runwayTop: 300, runwayHeight: 2400, stageHeight: 800, stickyTop: 72 })).toBe(0);
    expect(pinProgress({ runwayTop: 100, runwayHeight: 800, stageHeight: 800, stickyTop: 0 })).toBeNull();
  });
});
