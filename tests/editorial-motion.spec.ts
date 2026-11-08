import { test, expect } from "@playwright/test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { config, contentFor, landingPresentation } from "../lib/prototype-config";
import { MOTION_BUDGET_BYTES, MOTION_LOOPS, MOTION_SMALL_QUERY, motionLoop } from "../lib/editorial";

/**
 * Editorial motion, third round (T-340, 2026-11-05: after framer.com, vercel.com, linear.app
 * and apple.com's MacBook Pro display page): light loops rendered in Blender behind the hero's
 * headline and the closing band — neutral light on black, tinted by the palette in CSS — and a
 * light that runs along the hero frame's edge (Framer's prompt box). Since T-369 the loops are
 * the stage scene's (`stage-field`, `stage-slab`; `tests/editorial-stage.spec.ts` covers what the
 * stage adds); since T-374 the close carries the T-340 ribbons (`closing-light`) again.
 * `editorial.spec.ts` and `editorial-v2.spec.ts` keep guarding the earlier rounds.
 */

const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const landing = contentFor(config).landing;
const editorial = landingPresentation(config) === "editorial";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
/** The file a loop's `<source>` names on this screen: the half-width one on a phone (T-369). */
const shown = (small: boolean, source: { src: string; small: string }) => (small ? source.small : source.src);
const SRC = "/newapp/test/hero-image/AAAAAAAAAAAAAAAAAAAA.jpg";
const PIXEL = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64"
);

test.describe("editorial motion — light loops and the running edge", () => {
  test.skip(!editorial, "this config does not use the editorial presentation");

  test("hero light: the backlight loop behind the headline — decoration, tinted by the palette, playing", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const light = hero.locator("[data-hero-light]");
    await expect(light).toHaveCount(1);
    await expect(light).toHaveAttribute("aria-hidden", "true");
    const loop = motionLoop(BASE, "stage-field");
    const video = light.locator("video");
    await expect(video).toHaveAttribute("poster", loop.poster);
    // The sources arrive once the screen is known (no `<source>` in the static HTML).
    const small = await page.evaluate((query) => window.matchMedia(query).matches, MOTION_SMALL_QUERY);
    await expect(video.locator("source")).toHaveCount(loop.sources.length);
    expect(await video.locator("source").evaluateAll((els) => els.map((el) => [el.getAttribute("src"), el.getAttribute("type")]))).toEqual(
      loop.sources.map((s) => [shown(small, s), s.type])
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

  test("hero light: an AI image owns the hero — no light beside an object", async ({ page }) => {
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

  test("closing: the light ribbons behind the band, under its words", async ({ page }) => {
    test.skip(!sections.includes("cta"), "no closing section");
    await page.goto("./");
    const band = page.locator('[data-section="cta"] .editorial-band');
    const light = band.locator("[data-closing-light]");
    await expect(light).toHaveCount(1);
    await expect(light).toHaveAttribute("aria-hidden", "true");
    const small = await page.evaluate((query) => window.matchMedia(query).matches, MOTION_SMALL_QUERY);
    await expect(light.locator("video source").first()).toHaveAttribute("src", shown(small, motionLoop(BASE, "closing-light").sources[0]!));
    expect(await light.evaluate((el) => getComputedStyle(el).zIndex)).toBe("-1");
    expect(await band.evaluate((el) => getComputedStyle(el).isolation)).toBe("isolate");
    await band.scrollIntoViewIfNeeded();
    await expect.poll(() => light.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  });
});

/**
 * The Apple round (T-340, founder 2026-11-06, after apple.com/macbook-pro/proled-xdr-display):
 * Apple's motion, driven by CSS alone — a `view()` timeline flips a registered custom property
 * and a container style query turns that flip into a timed transition, so a group arrives in
 * 0.24–0.32 s with delays of 0.08 / 0.16 / 0.2 s on Apple's two curves; the manifesto holds
 * still while its words light up (Apple's Display), How it works pins on a desktop and switches
 * its active step (Apple's Performance), and the footer's index links arrive with `link-in`.
 */
const firstEntry = (list: string) => list.split(",")[0]!.trim();

test.describe("editorial motion — the Apple round", () => {
  test.skip(!editorial, "this config does not use the editorial presentation");

  test("staggered fade-in: a group arrives in turn, 0.08 / 0.16 / 0.2 s, opacity and position on the ease-out", async ({ page }) => {
    test.skip(!sections.includes("features") || !landing?.features, "no bento");
    await page.goto("./");
    const bento = page.locator('[data-section="features"] [data-bento]');
    await expect(bento).toHaveAttribute("data-stagger");
    const cards = bento.locator("> li");
    const timing = await cards.evaluateAll((els) =>
      els.slice(0, 3).map((el) => {
        const cs = getComputedStyle(el);
        return { delay: cs.transitionDelay, duration: cs.transitionDuration, ease: cs.transitionTimingFunction, property: cs.transitionProperty };
      })
    );
    expect(timing.map((t) => firstEntry(t.delay))).toEqual(["0.08s", "0.16s", "0.2s"].slice(0, timing.length));
    expect(timing[0]!.property.startsWith("opacity, translate")).toBe(true);
    expect(timing[0]!.duration.startsWith("0.28s, 0.32s")).toBe(true);
    expect(timing[0]!.ease.startsWith("cubic-bezier(0.33, 1, 0.68, 1)")).toBe(true);
    // Out of view the group waits; brought into view it arrives.
    const faq = page.locator('[data-section="faq"] [data-stagger] > [data-reveal]').first();
    if (sections.includes("faq") && (await faq.count())) {
      expect(await faq.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
      await faq.scrollIntoViewIfNeeded();
      await expect.poll(() => faq.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    }
  });

  test("curves: Apple's ease-in-out for UI state and its ease-out for arrivals — no third curve", () => {
    const css = readFileSync(resolve(__dirname, "../components/editorial/editorial.css"), "utf-8");
    expect(css).toMatch(/--editorial-ease: cubic-bezier\(0\.4, 0, 0\.6, 1\);/);
    expect(css).toMatch(/--editorial-ease-out: cubic-bezier\(0\.33, 1, 0\.68, 1\);/);
    expect(css.match(/cubic-bezier\(/g)).toHaveLength(2);
  });

  test("Display: the manifesto holds still while its words light up", async ({ page }) => {
    test.skip(!sections.includes("features") || !landing?.manifesto, "no manifesto");
    await page.goto("./");
    const pin = page.locator("[data-manifesto-pin]");
    await expect(pin).toHaveCount(1);
    const manifesto = pin.locator("[data-manifesto]");
    expect(await manifesto.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    const top = await pin.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const height = await pin.evaluate((el) => el.getBoundingClientRect().height);
    const vh = await page.evaluate(() => window.innerHeight);
    expect(height).toBeGreaterThan(vh * 1.5);
    const lit = () => manifesto.locator("[data-word]").evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity === "1").length);
    const at = async (f: number) => {
      await page.evaluate((y) => window.scrollTo(0, y), top + (height - vh) * f);
      await page.waitForTimeout(150);
      return { lit: await lit(), y: (await manifesto.boundingBox())!.y };
    };
    const early = await at(0.1);
    const late = await at(0.9);
    expect(late.lit).toBeGreaterThan(early.lit);
    expect(Math.abs(late.y - early.y)).toBeLessThan(2);
  });

  test("Performance: on a desktop How it works pins and switches its active step as the page scrolls", async ({ page }, info) => {
    test.skip(!sections.includes("howItWorks") || !landing?.howItWorks, "no steps");
    await page.goto("./");
    const pin = page.locator("[data-steps-pin]");
    await expect(pin).toHaveCount(1);
    const steps = pin.locator("ol > li");
    const n = landing!.howItWorks!.steps.length;
    await expect(pin.locator("ol")).toHaveAttribute("data-steps", String(n));
    const stage = pin.locator("[data-steps-stage]");
    if (info.project.name === "mobile") {
      expect(await stage.evaluate((el) => getComputedStyle(el).position)).not.toBe("sticky");
      return;
    }
    expect(await stage.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
    const top = await pin.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const height = await pin.evaluate((el) => el.getBoundingClientRect().height);
    const vh = await page.evaluate(() => window.innerHeight);
    expect(height).toBeGreaterThan(vh * 1.5);
    // The lit step, once the 0.3 s crossfade has settled: exactly one at full opacity, the rest dimmed.
    const lit = async () => {
      const o = await steps.evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
      return o.filter((v) => v === "1").length === 1 && o.every((v) => v === "1" || Number(v) <= 0.3) ? o.indexOf("1") : -1;
    };
    const scrollTo = (f: number) => page.evaluate((y) => window.scrollTo(0, y), top + (height - vh) * f);
    await scrollTo(0.05);
    await expect.poll(lit).toBe(0);
    await scrollTo(1.5 / n);
    await expect.poll(lit).toBe(1);
    await scrollTo(0.98);
    await expect.poll(lit).toBe(n - 1);
  });

  test("index: the footer's links arrive with link-in — 4 px from above, 0.32 s, 20 ms apart after 0.28 s", async ({ page }) => {
    await page.goto("./");
    const index = page.locator("footer [data-index]");
    await expect(index).toHaveCount(1);
    const links = index.locator("> a");
    const first = links.first();
    expect(await first.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
    expect(await first.evaluate((el) => getComputedStyle(el).translate)).toBe("0px -4px");
    const delays = await links.evaluateAll((els) => els.slice(0, 3).map((el) => getComputedStyle(el).transitionDelay.split(",")[0]!.trim()));
    expect(delays).toEqual(["0.28s", "0.3s", "0.32s"]);
    expect(await first.evaluate((el) => getComputedStyle(el).transitionDuration.split(",")[0]!.trim())).toBe("0.32s");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => links.last().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  });

  test("reduced motion: nothing waits, nothing pins — every group, step, word and link at rest", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const opacities = await page.locator("[data-stagger] > [data-reveal], footer [data-index] > a, [data-steps-pin] ol > li, [data-word]").evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).opacity)
    );
    expect(opacities.every((o) => o === "1")).toBe(true);
    for (const sel of ["[data-steps-stage]", "[data-manifesto]"]) {
      const el = page.locator(sel);
      if (await el.count()) expect(await el.evaluate((e) => getComputedStyle(e).position)).not.toBe("sticky");
    }
  });
});

test.describe("editorial motion (pure)", () => {
  test("motionLoop: WebM before MP4 under the base path, a phone file beside each, and a still for the poster", () => {
    expect(motionLoop("/newapp/x", "stage-field")).toEqual({
      poster: "/newapp/x/motion/stage-field.webp",
      sources: [
        { src: "/newapp/x/motion/stage-field.webm", type: "video/webm", small: "/newapp/x/motion/stage-field-sm.webm" },
        { src: "/newapp/x/motion/stage-field.mp4", type: "video/mp4", small: "/newapp/x/motion/stage-field-sm.mp4" },
      ],
    });
    expect(motionLoop("", "closing-light").poster).toBe("/motion/closing-light.webp");
  });

  test("every loop ships its three files inside the budget, and a phone file weighs at most 60 % of its full one", () => {
    const path = (p: string) => resolve(__dirname, "../public", `.${p}`);
    for (const name of MOTION_LOOPS) {
      const loop = motionLoop("", name);
      const files = [loop.poster, ...loop.sources.map((s) => s.src)].map(path);
      for (const file of files) expect(existsSync(file), file).toBe(true);
      const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
      expect(bytes, `${name}: ${bytes} bytes`).toBeLessThanOrEqual(MOTION_BUDGET_BYTES);
      for (const source of loop.sources) {
        expect(existsSync(path(source.small)), source.small).toBe(true);
        expect(statSync(path(source.small)).size, source.small).toBeLessThanOrEqual(statSync(path(source.src)).size * 0.6);
      }
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
