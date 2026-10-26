import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { config, contentFor, landingPresentation } from "../lib/prototype-config";
import { BRAND_LETTERS, STRIP_MIN, brandHref, conceptTiles, conceptTilesFor, stripRows } from "../lib/editorial";
import { parseScreens } from "../lib/screens";
import { uiCopy } from "./ui-copy";

/**
 * The editorial page, second round (2026-10-26, PR D): the brand block "Built by TOKENWISE"
 * that closes the page, the two-row concept strip, the device switcher on the hero frame,
 * the floating icon tiles around the headline and the `bold` tone. `editorial.spec.ts`
 * keeps guarding the first round; this file guards what is new.
 */

const copy = contentFor(config);
const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const editorial = landingPresentation(config) === "editorial";
const tone = config.patterns.landing?.tone ?? "light";
const slug = process.env.NEXT_PUBLIC_DEMO_SLUG || null;
const tiles = conceptTilesFor(config, copy, config.defaultLocale, []);
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

  test("the concept strip: two rows of the product's own tiles, looping in opposite directions, decoration only", async ({ page }) => {
    test.skip(!sections.includes("features"), "no features section");
    await page.goto("./");
    const strip = page.locator('[data-section="features"] [data-strip]');
    if (tiles.length < STRIP_MIN) {
      await expect(strip).toHaveCount(0);
      return;
    }
    await expect(strip).toHaveCount(1);
    await expect(strip).toHaveAttribute("aria-hidden", "true");
    const [a, b] = stripRows(tiles);
    await expect(strip.locator('[data-strip-row="a"] [data-strip-tile]')).toHaveCount(a.length * 2);
    await expect(strip.locator('[data-strip-row="b"] [data-strip-tile]')).toHaveCount(b.length * 2);
    await expect(strip.locator("a")).toHaveCount(0);
    await expect(strip.locator("svg")).toHaveCount(0);
    await expect(page.locator('[data-section="features"] h2')).toHaveCount(1);
    const directions = await strip.locator("[data-strip-row]").evaluateAll((rows) => rows.map((r) => getComputedStyle(r).animationDirection));
    expect(directions).toEqual(["normal", "reverse"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  });

  test("the strip stands still under reduced motion", async ({ page }) => {
    test.skip(!sections.includes("features") || tiles.length < STRIP_MIN, "no strip in this config");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const names = await page.locator("[data-strip-row]").evaluateAll((rows) => rows.map((r) => getComputedStyle(r).animationName));
    expect(names).toEqual(["none", "none"]);
  });

  test("the shipped screens file is a 200 with no screens", async ({ page }) => {
    const res = await page.request.get("./_preview/screens.json");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ screens: [] });
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

  test("conceptTiles: screens when there are enough, else the product's words in order, at most ten", () => {
    const text = {
      offers: [{ eyebrow: "Flat", title: "Three-room flat", value: "€189,000" }],
      records: [{ eyebrow: "Route", title: "Airport express", value: "Bus" }],
      kpis: [{ eyebrow: "Dashboard", title: "Routes" }],
      features: [{ eyebrow: "", title: "Live map" }, { eyebrow: "", title: "Alerts" }],
      questions: [{ eyebrow: "", title: "Is it free?" }],
    };
    const t = conceptTiles(text);
    expect(t.map((x) => x.title)).toEqual(["Three-room flat", "Airport express", "Routes", "Live map", "Alerts", "Is it free?"]);
    const many = conceptTiles({ features: Array.from({ length: 14 }, (_, i) => ({ eyebrow: "", title: `F${i}` })) });
    expect(many).toHaveLength(10);
    const screens = Array.from({ length: 5 }, (_, i) => ({ src: `/newapp/x/_preview/screens/${i}.webp`, alt: `Screen ${i}` }));
    expect(conceptTiles({ ...text, screens }).every((x) => x.kind === "image")).toBe(true);
    expect(conceptTiles({ ...text, screens: screens.slice(0, 3) }).every((x) => x.kind === "text")).toBe(true);
    expect(stripRows(many).map((r) => r.length)).toEqual([5, 5]);
    expect(stripRows(t).map((r) => r.length)).toEqual([3, 3]);
    expect(STRIP_MIN).toBe(4);
  });

  test("conceptTilesFor reads the shipped config: offers first, then records, KPIs, features, questions", () => {
    const expectedFirst = config.patterns.listings
      ? copy.listings!.items[config.patterns.listings.items[0]!.id]!.title
      : copy.dataGrid?.sampleRecords?.length
        ? String(Object.values(copy.dataGrid.sampleRecords[0]!)[0])
        : (copy.landing?.features?.[0]?.title ?? copy.landing?.faq?.items[0]?.question);
    if (expectedFirst) expect(tiles[0]?.title).toBe(expectedFirst);
    expect(tiles.length).toBeLessThanOrEqual(10);
    expect(tiles.every((x) => x.kind === "text")).toBe(true);
  });

  test("parseScreens keeps only same-origin pictures and never throws", () => {
    expect(parseScreens({ screens: [{ src: "/newapp/x/_preview/screens/landing.webp", alt: "Landing" }] })).toEqual([
      { src: "/newapp/x/_preview/screens/landing.webp", alt: "Landing" },
    ]);
    expect(parseScreens({ screens: [{ src: "https://evil.example/x.webp", alt: "x" }, { src: "//evil.example/y.webp" }, { src: "/ok.webp" }] })).toEqual([{ src: "/ok.webp", alt: "" }]);
    expect(parseScreens("nonsense")).toEqual([]);
    expect(parseScreens(null)).toEqual([]);
  });

  test("the schema offers the tone to the content call", () => {
    const schema = JSON.parse(readFileSync("prototype.schema.json", "utf-8"));
    expect(schema.patterns.landing.properties.tone.enum).toEqual(["light", "bold"]);
    expect(schema.patterns.landing.properties.tone.description).toMatch(/sport/);
  });
});
