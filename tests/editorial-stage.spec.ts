import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, contentFor, landingPresentation } from "../lib/prototype-config";
import { MOTION_SMALL_QUERY, motionLoop } from "../lib/editorial";

/**
 * The stage — the backlight (T-368, 2026-11-07, after apple.com's ProLED XDR page; the founder's
 * pick among three proposals, made the editorial page itself by T-369): `components/editorial/stage.css`.
 * What it adds over the light loops of T-340 (`editorial-motion.spec.ts`): the device in the first
 * feature card, the frame's screen switching on, the manifesto on a bright panel, the cards
 * flaring like dimming zones, the orb rising behind the close — and the phone's half-width files.
 */

const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const landing = contentFor(config).landing;
const editorial = landingPresentation(config) === "editorial";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** The file a loop's first `<source>` names on this screen: the half-width one on a phone. */
const shown = (small: boolean, name: Parameters<typeof motionLoop>[1]) => (small ? motionLoop(BASE, name).sources[0]!.small : motionLoop(BASE, name).sources[0]!.src);

test.describe("editorial stage — the page", () => {
  test.skip(!editorial, "this config does not use the editorial presentation");

  test("the stage's loops: the backlight behind the headline, the device in the first card, the orb behind the close", async ({ page }) => {
    test.skip(!sections.includes("hero") || !sections.includes("cta"), "no hero or no close");
    await page.goto("./");
    const small = await page.evaluate((query) => window.matchMedia(query).matches, MOTION_SMALL_QUERY);
    const hero = page.locator('[data-section="hero"] [data-hero-light]');
    await expect(hero.locator("video source").first()).toHaveAttribute("src", shown(small, "stage-field"));
    const close = page.locator('[data-section="cta"] [data-closing-light]');
    await expect(close.locator("video source").first()).toHaveAttribute("src", shown(small, "stage-orb"));
    const card = page.locator("[data-bento] > li:first-child [data-card-light]");
    await expect(card).toHaveCount(sections.includes("features") ? 1 : 0);
    if (sections.includes("features")) {
      await expect(card).toHaveAttribute("aria-hidden", "true");
      await expect(card.locator("video source").first()).toHaveAttribute("src", shown(small, "stage-slab"));
      expect(await card.evaluate((el) => getComputedStyle(el).mixBlendMode)).toBe("screen");
    }
    await expect(page.locator("[data-steps-light]")).toHaveCount(0);
  });

  test("a phone plays the half-width files, a desktop the full ones", async ({ page }, info) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const video = page.locator('[data-section="hero"] [data-hero-light] video');
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
    const small = await page.evaluate((query) => window.matchMedia(query).matches, MOTION_SMALL_QUERY);
    expect(small).toBe(info.project.name === "mobile");
    const loop = motionLoop(BASE, "stage-field");
    expect(await video.evaluate((v: HTMLVideoElement) => new URL(v.currentSrc).pathname)).toBe(small ? loop.sources[0]!.small : loop.sources[0]!.src);
  });

  test("the frame's screen turns on after the frame rises; under reduced motion it is simply lit", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const screen = page.locator('[data-section="hero"] [data-hero-frame] .editorial-frame-screen');
    if ((await screen.count()) === 0) return;
    expect(await screen.evaluate((el) => getComputedStyle(el, "::after").animationName)).toBe("editorial-screen-on");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await screen.evaluate((el) => getComputedStyle(el, "::after").animationName)).toBe("none");
    expect(await screen.evaluate((el) => getComputedStyle(el, "::after").opacity)).toBe("0");
  });

  test("the manifesto sits on a bright panel — the ink turned into the paper — and the page is never wider than the screen", async ({ page }) => {
    test.skip(!sections.includes("features") || !landing?.manifesto, "no manifesto");
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

  test("the cards switch on like dimming zones once the group is seen", async ({ page }) => {
    test.skip(!sections.includes("features"), "no features");
    await page.goto("./");
    const card = page.locator("[data-bento] > li").first();
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).animationName)).toBe("editorial-zone-on");
    await expect.poll(() => card.locator(".editorial-numeral").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("editorial-numeral-on");
  });

  test("the orb rises behind the close as the band arrives", async ({ page }) => {
    test.skip(!sections.includes("cta"), "no close");
    await page.goto("./");
    const light = page.locator('[data-section="cta"] [data-closing-light]');
    expect(await light.evaluate((el) => getComputedStyle(el).animationName)).toBe("editorial-orb-rise");
    expect(await light.evaluate((el) => getComputedStyle(el).getPropertyValue("animation-timeline"))).toContain("view()");
  });

  test("reduced motion: every group at rest, no loop playing, the orb simply there", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const opacities = await page.locator("[data-reveal]").evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
    expect(opacities.every((o) => o === "1")).toBe(true);
    const playing = await page.locator(".editorial-light video").evaluateAll((els) => els.filter((v) => !(v as HTMLVideoElement).paused).length);
    expect(playing).toBe(0);
    const light = page.locator('[data-section="cta"] [data-closing-light]');
    if (await light.count()) expect(await light.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });
});

test.describe("editorial stage (pure)", () => {
  test("stage.css loads after editorial.css, whose light rules it refines, and brings no curve of its own", () => {
    const registry = readFileSync(resolve(__dirname, "../components/editorial/registry.ts"), "utf-8");
    const base = registry.indexOf('import "./editorial.css"');
    expect(base).toBeGreaterThan(-1);
    expect(registry.indexOf('import "./stage.css"')).toBeGreaterThan(base);
    const css = readFileSync(resolve(__dirname, "../components/editorial/stage.css"), "utf-8");
    expect(css).not.toMatch(/cubic-bezier\(/);
    // Every rule that refines editorial.css stands under the editorial root.
    for (const selector of [".editorial-light-hero", ".editorial-light-band", ".editorial-manifesto-pin", ".editorial-frame-screen"]) {
      expect(css, selector).toContain(`[data-presentation="editorial"] ${selector}`);
    }
  });
});
