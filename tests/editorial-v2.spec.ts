import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { config, contentFor, landingPresentation } from "../lib/prototype-config";
import { existsSync } from "node:fs";
import { BRAND_LETTERS, brandHref, stripRows } from "../lib/editorial";
import { SHOWCASE, showcaseFor, showcaseHref, showcaseImage } from "../lib/showcase";
import { getProductSlug } from "../lib/demo-slug";
import { uiCopy } from "./ui-copy";

/**
 * The editorial page, second round (2026-10-26, PR D): the brand block "Built by TOKENWISE"
 * that closes the page, the two-row strip (since 2026-10-27 the showcase of tokenwise's
 * products, a fixed element on every prototype), the device switcher on the hero frame,
 * the floating icon tiles around the headline and the `bold` tone. `editorial.spec.ts`
 * keeps guarding the first round; this file guards what is new.
 */

const copy = contentFor(config);
const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const editorial = landingPresentation(config) === "editorial";
const tone = config.patterns.landing?.tone ?? "light";
const slug = process.env.NEXT_PUBLIC_PRODUCT_SLUG || process.env.NEXT_PUBLIC_DEMO_SLUG || null;
const icons = Array.from(new Set((copy.landing?.features ?? []).flatMap((f) => (f.icon ? [f.icon] : [])))).length;

async function opacityOf(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
}

test.describe("editorial v2 — brand block, strip, devices, tiles, tone", () => {
  test.skip(!editorial, "this config does not use the editorial presentation");

  test("built by tokenwise: one link closes the page, nine letters spread across the width", async ({ page }, info) => {
    test.skip(!sections.includes("cta"), "no closing section");
    await page.goto("./");
    const mark = page.locator('[data-section="cta"] [data-brand-mark]');
    await expect(mark).toHaveCount(1);
    expect(await mark.evaluate((el) => el.tagName)).toBe("A");
    const href = (await mark.getAttribute("href"))!;
    expect(href.startsWith("https://tokenwise.sk/")).toBe(true);
    expect(href).toContain("utm_source=prototype");
    if (slug) expect(href).toContain(`utm_content=${slug}`);
    expect(await mark.getAttribute("rel")).toContain("noopener");
    await expect(mark.locator("[data-brand-kicker]")).toHaveText(uiCopy.footer!.builtBy!);
    await expect(mark.locator("[data-brand-letter]")).toHaveCount(BRAND_LETTERS.length);
    await expect(mark.locator("[data-brand-letters]")).toHaveAttribute("aria-hidden", "true");
    expect((await mark.textContent()) ?? "").toContain("tokenwise.sk");
    // The app's name is no longer set as a giant wordmark — the footer and the hero name it.
    await expect(page.locator("[data-wordmark]")).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const letters = (await mark.locator("[data-brand-letters]").boundingBox())!;
    const section = (await page.locator('[data-section="cta"]').boundingBox())!;
    const footer = (await page.getByRole("contentinfo").boundingBox())!;
    expect(letters.y + letters.height).toBeLessThanOrEqual(footer.y + 1);
    if (info.project.name !== "mobile") expect(letters.width).toBeGreaterThanOrEqual(section.width * 0.85);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  });

  test("the showcase strip: two rows of tokenwise's products looping in opposite directions, every tile a link, pictures shipped", async ({ page }) => {
    test.skip(!sections.includes("features"), "no features section");
    await page.goto("./");
    const strip = page.locator('[data-section="features"] [data-strip]');
    await expect(strip).toHaveCount(1);
    await expect(strip).toHaveAttribute("aria-label", uiCopy.showcase!.label!);
    const shown = showcaseFor(slug);
    const [a, b] = stripRows(shown);
    await expect(strip.locator('[data-strip-row="a"] [data-strip-tile]')).toHaveCount(a.length * 2);
    await expect(strip.locator('[data-strip-row="b"] [data-strip-tile]')).toHaveCount(b.length * 2);
    // The first copy of a row is the accessible one; the echo is filler for the loop.
    await expect(strip.locator("[data-showcase]")).toHaveCount(shown.length);
    const echoes = strip.locator("[data-strip-echo]");
    await expect(echoes).toHaveCount(2);
    await expect(echoes.first()).toHaveAttribute("aria-hidden", "true");
    expect(await strip.locator("[data-strip-echo] a").evaluateAll((els) => els.every((el) => el.getAttribute("tabindex") === "-1"))).toBe(true);
    await expect(strip.locator("svg")).toHaveCount(0);
    await expect(page.locator('[data-section="features"] h2')).toHaveCount(1);
    const first = strip.locator('[data-showcase="factory-web"]');
    await expect(first).toHaveAttribute("href", showcaseHref(SHOWCASE[0]!, slug));
    await expect(first).toHaveAttribute("target", "_blank");
    expect(await first.getAttribute("rel")).toContain("noopener");
    await expect(first).toContainText("tokenwise.sk");
    const kinds = (uiCopy.showcase as unknown as { kinds: Record<string, string> }).kinds;
    await expect(first.locator(".editorial-strip-eyebrow")).toHaveText(kinds["factory-web"]!);
    for (const item of shown) {
      const res = await page.request.get(`.${showcaseImage("", item)}`);
      expect(res.status(), item.key).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/webp");
    }
    const directions = await strip.locator("[data-strip-row]").evaluateAll((rows) => rows.map((r) => getComputedStyle(r).animationDirection));
    expect(directions).toEqual(["normal", "reverse"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  });

  test("the strip never widens the page: 640, 768 and 1024px, where the gutter is wider than the section's padding", async ({ page }, info) => {
    test.skip(!sections.includes("features") || info.project.name === "mobile", "desktop viewports only");
    for (const width of [640, 768, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("./");
      await page.locator("[data-strip]").waitFor();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}px`).toBeLessThanOrEqual(width);
    }
  });

  test("the strip stands still under reduced motion", async ({ page }) => {
    test.skip(!sections.includes("features"), "no strip in this config");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const names = await page.locator("[data-strip-row]").evaluateAll((rows) => rows.map((r) => getComputedStyle(r).animationName));
    expect(names).toEqual(["none", "none"]);
  });

  test("device switcher: three tabs on the frame, the phone narrows it, the hero keeps its one action", async ({ page }, info) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const frame = page.locator('[data-section="hero"] [data-hero-frame]');
    if ((await frame.count()) === 0) {
      await expect(page.locator("[data-device-tabs]")).toHaveCount(0);
      return;
    }
    const tabs = frame.locator('[data-device-tabs] [role="tab"]');
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(0)).toHaveText(uiCopy.landing!.deviceDesktop!);
    await expect(tabs.nth(2)).toHaveText(uiCopy.landing!.devicePhone!);
    await expect(frame.locator("[data-frame-meta]")).toContainText(String(new Date().getFullYear()));
    if (info.project.name === "mobile") {
      await expect(tabs.first()).toBeHidden();
      return;
    }
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(frame).toHaveAttribute("data-device", "desktop");
    const wide = (await frame.boundingBox())!.width;
    await tabs.nth(2).click();
    await expect(frame).toHaveAttribute("data-device", "phone");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect.poll(async () => (await frame.boundingBox())!.width).toBeLessThan(400);
    expect(wide).toBeGreaterThan(600);
    await tabs.nth(0).click();
    await expect(frame).toHaveAttribute("data-device", "desktop");
    await expect(page.locator('[data-section="hero"] a')).toHaveCount(1);
  });

  test("floating icon tiles: up to four feature icons around the headline on a desktop, none on a phone", async ({ page }, info) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    const expected = (await hero.locator("[data-hero-object]").count()) ? 0 : Math.min(4, icons);
    const tilesOnPage = hero.locator("[data-floating-tile]");
    await expect(tilesOnPage).toHaveCount(expected);
    if (expected === 0) return;
    await expect(tilesOnPage.first()).toHaveAttribute("aria-hidden", "true");
    if (info.project.name === "mobile") await expect(tilesOnPage.first()).toBeHidden();
    else await expect(tilesOnPage.first()).toBeVisible();
  });

  test("reduced motion: tiles, letters and strip are still, everything at opacity 1", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const names = await page.locator("[data-floating-tile], [data-brand-letter]").evaluateAll((els) => els.map((el) => getComputedStyle(el).animationName));
    expect(names.every((n) => n === "none")).toBe(true);
    const opacities = await opacityOf(page, "[data-brand-letter], [data-floating-tile], [data-reveal]");
    expect(opacities.every((o) => o === "1")).toBe(true);
  });

  test("tone: the page carries the configured tone, and bold sets the headline in uppercase", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    await expect(page.locator("[data-presentation]")).toHaveAttribute("data-tone", tone);
    const transform = await page.locator('[data-section="hero"] h1').evaluate((el) => getComputedStyle(el).textTransform);
    expect(transform).toBe(tone === "bold" ? "uppercase" : "none");
  });
});

test.describe("editorial v2 (pure)", () => {
  test("brandHref points at tokenwise.sk with the prototype's slug as utm_content", () => {
    expect(brandHref("faunatrack")).toBe("https://tokenwise.sk/?utm_source=prototype&utm_medium=brand-mark&utm_content=faunatrack");
    expect(brandHref(null)).toBe("https://tokenwise.sk/?utm_source=prototype&utm_medium=brand-mark");
    expect([...BRAND_LETTERS].join("")).toBe("TOKENWISE");
  });

  test("the showcase: nine live products, unique keys, https links, a shipped picture each, split in two rows", () => {
    expect(SHOWCASE).toHaveLength(9);
    expect(new Set(SHOWCASE.map((i) => i.key)).size).toBe(SHOWCASE.length);
    for (const item of SHOWCASE) {
      expect(item.href.startsWith("https://")).toBe(true);
      expect(existsSync(`public${showcaseImage("", item)}`), item.key).toBe(true);
    }
    expect(stripRows(SHOWCASE).map((r) => r.length)).toEqual([5, 4]);
    expect(showcaseHref(SHOWCASE[0]!, "faunatrack")).toBe("https://tokenwise.sk/?utm_source=prototype&utm_medium=showcase&utm_content=faunatrack");
    expect(showcaseHref(SHOWCASE[2]!, null)).toBe("https://wellnesspodhajska-63bcd.web.app/en?utm_source=prototype&utm_medium=showcase");
    expect(showcaseImage("/newapp/x", SHOWCASE[0]!)).toBe("/newapp/x/showcase/factory-web.webp");
  });

  test("a product never advertises itself: its own tile leaves the strip, every other stays in order", () => {
    expect(showcaseFor(null)).toEqual(SHOWCASE);
    expect(showcaseFor("faunatrack")).toEqual(SHOWCASE);
    const own = showcaseFor("law-expert");
    expect(own.map((i) => i.key)).toEqual(SHOWCASE.filter((i) => i.key !== "law-expert").map((i) => i.key));
    expect(stripRows(own).map((r) => r.length)).toEqual([4, 4]);
  });

  test("the product slug: a standalone product's own name first, else the demo tenant's slug", () => {
    const saved = { product: process.env.NEXT_PUBLIC_PRODUCT_SLUG, demo: process.env.NEXT_PUBLIC_DEMO_SLUG };
    try {
      process.env.NEXT_PUBLIC_PRODUCT_SLUG = "";
      process.env.NEXT_PUBLIC_DEMO_SLUG = "";
      expect(getProductSlug()).toBeNull();
      process.env.NEXT_PUBLIC_DEMO_SLUG = "rohace";
      expect(getProductSlug()).toBe("rohace");
      process.env.NEXT_PUBLIC_PRODUCT_SLUG = "cv-matcher";
      expect(getProductSlug()).toBe("cv-matcher");
    } finally {
      process.env.NEXT_PUBLIC_PRODUCT_SLUG = saved.product ?? "";
      process.env.NEXT_PUBLIC_DEMO_SLUG = saved.demo ?? "";
    }
  });

  test("the schema offers the tone to the content call", () => {
    const schema = JSON.parse(readFileSync("prototype.schema.json", "utf-8"));
    expect(schema.patterns.landing.properties.tone.enum).toEqual(["light", "bold"]);
    expect(schema.patterns.landing.properties.tone.description).toMatch(/sport/);
  });
});
