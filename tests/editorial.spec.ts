import { test, expect, type Page } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { FONT_IDS, fontById } from "@tokenwise/shared-ui/theming";
import { config, contentFor, landingPresentation, DEFAULT_PRESENTATION, PRESENTATIONS } from "../lib/prototype-config";
import { bentoSpan, heroNamePlacement, heroObjectKind, splitDisplay } from "../lib/editorial";
import { parsePublicState, parseStatus } from "../lib/hero-image";

/**
 * The editorial presentation (2026-10-26, sw-factory decision "premium prototype design"):
 * every new prototype opens as one long page after the reference landings the founder
 * chose (mdx.so, its Indoobit case study) — an eyebrow pill, a display headline set light
 * with one phrase in weight, one action, the product itself in a lit frame rising from the
 * fold, a bento of features with numerals, a manifesto that lights up word by word, a
 * glowing line through the steps, FAQ cards and a closing band under a giant wordmark. All
 * of it in the palette's tokens (Change colour repaints it), in the configured face (Change
 * font keeps the shape), and with scroll-driven CSS motion that degrades to its finished
 * state. `landing-v2`, `landing-action`, `hero-image`, `smoke` and `seo` keep guarding the
 * contract every presentation shares; this file guards what is the editorial page's own.
 */

const copy = contentFor(config);
const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const editorial = landingPresentation(config) === "editorial";
const landing = copy.landing;
const SRC = "/newapp/test/hero-image/AAAAAAAAAAAAAAAAAAAA.jpg";
const PIXEL = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);

async function fontSize(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
}

test.describe("editorial presentation", () => {
  test.skip(!editorial, "this config does not use the editorial presentation");

  test("it is the default, and renders as one long document", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("./");
    await expect(page.locator("[data-presentation]")).toHaveAttribute("data-presentation", "editorial");
    await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "document");
    await expect(page.locator("[data-story-navigation]")).toHaveCount(0);
  });

  test("hero: an eyebrow pill, the display headline, the subheadline and one action", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    await expect(hero.locator("[data-eyebrow]")).toHaveText(landing?.eyebrow ?? config.appName);
    const h1 = hero.locator("h1");
    await expect(h1).toHaveText(landing!.headline!);
    // One phrase carries the weight — the one emphasis the palette rule leaves.
    await expect(h1.locator("[data-display-emphasis]")).toHaveCount(1);
    await expect(hero.locator("p").first()).toHaveText(landing!.subheadline!);
    await expect(hero.locator("[data-app-name]")).toHaveCount(1);
    await expect(hero.locator("[data-app-name]")).toHaveText(config.appName);
  });

  test("hero object: the product itself in a lit frame — records, else offers, else no frame", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    const frame = page.locator('[data-section="hero"] [data-hero-frame]');
    const samples = config.patterns.dataGrid ? (copy.dataGrid?.sampleRecords?.length ?? 0) : 0;
    const offers = config.patterns.listings?.items.length ?? 0;
    const kind = heroObjectKind({ samples, offers });
    if (kind === "preview") {
      await expect(frame.locator("[data-product-preview]")).toHaveCount(1);
      await expect(frame.locator("[data-hero-offer]")).toHaveCount(0);
    } else if (kind === "offers") {
      await expect(frame.locator("[data-hero-offer]")).toHaveCount(Math.min(3, offers));
      await expect(frame.locator("[data-product-preview]")).toHaveCount(0);
      await expect(frame.locator("[data-hero-offer] [data-offer-title]").first()).toHaveText(
        copy.listings!.items[config.patterns.listings!.items[0]!.id]!.title
      );
    } else {
      await expect(frame).toHaveCount(0);
    }
    // The frame never adds a link: the hero's one action stays its only one.
    await expect(frame.locator("a")).toHaveCount(0);
  });

  test("hero object: an AI image placed as an object sits beside the words, not behind them", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.route("**/hero-image.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, src: SRC, placement: "object" }) })
    );
    await page.route("**/hero-image/*.jpg", (route) => route.fulfill({ status: 200, contentType: "image/jpeg", body: PIXEL }));
    await page.goto("./");
    const hero = page.locator('[data-section="hero"]');
    await expect(hero.locator("[data-hero-object] img")).toHaveCount(1);
    await expect(hero.locator("[data-hero-object] img")).toHaveAttribute("alt", "");
    await expect(hero.locator("[data-hero-image]")).toHaveCount(0);
  });

  test("features: a bento with numerals, and the manifesto after it when configured", async ({ page }) => {
    test.skip(!sections.includes("features") || !landing?.features, "no configured features");
    await page.goto("./");
    const section = page.locator('[data-section="features"]');
    const cards = section.locator("[data-bento] > li");
    const count = landing!.features!.length;
    await expect(cards).toHaveCount(count);
    await expect(cards.first()).toHaveAttribute("data-span", bentoSpan(0, count).wide ? "wide" : "one");
    await expect(cards.first().locator("[data-numeral]")).toHaveText("01");
    await expect(section.locator("h2")).toHaveCount(1);
    const manifesto = section.locator("[data-manifesto]");
    if (landing?.manifesto) {
      await expect(manifesto).toContainText(landing.manifesto.lead);
      const spoken = landing.manifesto.lead.split(" ").length + landing.manifesto.body.split(" ").length;
      await expect(manifesto.locator("[data-word]")).toHaveCount(spoken);
      await expect(manifesto.locator("p")).toHaveText(`${landing.manifesto.lead} ${landing.manifesto.body}`);
    } else {
      await expect(manifesto).toHaveCount(0);
    }
  });

  test("how it works: a glowing line drawn through numbered steps", async ({ page }) => {
    test.skip(!sections.includes("howItWorks"), "section not enabled");
    await page.goto("./");
    const section = page.locator('[data-section="howItWorks"]');
    await expect(section.locator("svg[data-glow-line] path")).toHaveCount(1);
    const steps = section.locator("li");
    await expect(steps).toHaveCount(landing!.howItWorks!.steps.length);
    await expect(steps.nth(1).locator("[data-numeral]")).toHaveText("02");
  });

  test("faq: cards that open, each a native details", async ({ page }) => {
    test.skip(!sections.includes("faq"), "section not enabled");
    await page.goto("./");
    const first = page.locator('[data-section="faq"] details').first();
    await expect(first.locator("[data-plus]")).toHaveCount(1);
    await first.locator("summary").click();
    await expect(first).toHaveAttribute("open", "");
    await expect(first.locator("p")).toBeVisible();
  });

  test("closing band under the wordmark, which ends whole above the footer", async ({ page }) => {
    test.skip(!sections.includes("cta"), "section not enabled");
    await page.goto("./");
    const wordmark = page.locator('[data-section="cta"] [data-wordmark]');
    await expect(wordmark).toHaveText(config.appName);
    await expect(wordmark).toHaveAttribute("aria-hidden", "true");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const box = (await wordmark.boundingBox())!;
    const footer = (await page.getByRole("contentinfo").boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(footer.y + 1);
  });

  test("reduced motion: everything is at its finished state at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    const opacities = await page.locator("[data-reveal], [data-word], [data-section='hero'] h1").evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).opacity)
    );
    expect(opacities.length).toBeGreaterThan(0);
    expect(opacities.every((o) => o === "1")).toBe(true);
  });

  test("nothing is wider than a phone, and the headline is display-sized on both", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(await fontSize(page, '[data-section="hero"] h1')).toBeGreaterThanOrEqual(40);
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await fontSize(page, '[data-section="hero"] h1')).toBeGreaterThanOrEqual(64);
  });

  test("the configured face is what a first visit is set in", async ({ page }) => {
    const font = config.patterns.landing?.font ?? "inter";
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-font", font);
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family).toContain(fontById(font).name);
  });
});

test.describe("editorial (pure)", () => {
  test("editorial is the default presentation when the config names none", () => {
    expect(DEFAULT_PRESENTATION).toBe("editorial");
    expect(PRESENTATIONS).toEqual(["editorial", "story", "document"]);
    const base = { patterns: { landing: { sections: ["hero"] } } } as never;
    expect(landingPresentation(base)).toBe("editorial");
    expect(landingPresentation({ patterns: { landing: { sections: ["hero"], presentation: "story" } } } as never)).toBe("story");
    expect(landingPresentation({ patterns: {} } as never)).toBe("editorial");
  });

  test("the schema offers the presentation, the font and the two copy slots to the content call", () => {
    const schema = JSON.parse(readFileSync("prototype.schema.json", "utf-8"));
    expect(schema.patterns.landing.properties.presentation.enum).toEqual(["editorial", "story", "document"]);
    expect(schema.patterns.landing.properties.font.enum).toEqual([...FONT_IDS]);
    expect(schema.patterns.landing.properties.font.description).toMatch(/inter/);
    expect(schema.content.landing.properties.eyebrow.maxLength).toBe(40);
    expect(schema.content.landing.properties.manifesto.properties.lead.maxLength).toBe(90);
    expect(schema.content.landing.properties.manifesto.properties.body.maxLength).toBe(280);
    // Neither is required: the production gate keeps accepting a composition without them.
    expect(schema.content.landing.required ?? []).not.toContain("eyebrow");
    expect(schema.menu.sections.requiredCopy.hero).toEqual(["landing.headline", "landing.subheadline"]);
  });

  test("bentoSpan fills every row: the first card is wide except in a row of three", () => {
    expect(bentoSpan(0, 6)).toEqual({ wide: true, className: "sm:col-span-2 lg:col-span-2" });
    expect(bentoSpan(3, 6).wide).toBe(true);
    expect(bentoSpan(4, 6).wide).toBe(true);
    expect(bentoSpan(1, 6).wide).toBe(false);
    expect(bentoSpan(0, 3).wide).toBe(false);
    expect(bentoSpan(0, 4).wide).toBe(true);
    expect(bentoSpan(3, 4).wide).toBe(true);
    expect(bentoSpan(0, 5).wide).toBe(true);
    expect(bentoSpan(1, 5).wide).toBe(false);
  });

  test("splitDisplay gives one phrase the weight and never changes the words", () => {
    const join = (s: ReturnType<typeof splitDisplay>) => s.before + s.emphasis + s.after;
    for (const text of ["Know where every vehicle is", "Ship code — publish the story", "Every book you read counts: all of them", "Clear books", "One configuration. A working prototype."]) {
      expect(join(splitDisplay(text))).toBe(text);
    }
    expect(splitDisplay("Ship code — publish the story")).toEqual({ before: "", emphasis: "Ship code", after: " — publish the story" });
    expect(splitDisplay("One configuration. A working prototype.")).toEqual({ before: "", emphasis: "One configuration.", after: " A working prototype." });
    expect(splitDisplay("Every book you read counts: all of them")).toEqual({ before: "", emphasis: "Every book you read counts:", after: " all of them" });
    expect(splitDisplay("Know where every vehicle is")).toEqual({ before: "Know where every ", emphasis: "vehicle is", after: "" });
    expect(splitDisplay("Clear books")).toEqual({ before: "", emphasis: "Clear books", after: "" });
  });

  test("heroObjectKind prefers the records, then the offers, then nothing", () => {
    expect(heroObjectKind({ samples: 3, offers: 5 })).toBe("preview");
    expect(heroObjectKind({ samples: 0, offers: 5 })).toBe("offers");
    expect(heroObjectKind({ samples: 0, offers: 0 })).toBe("none");
  });

  test("heroNamePlacement names the app exactly once: in the frame, in the eyebrow, or hidden", () => {
    expect(heroNamePlacement({ hasFrame: true, customEyebrow: true })).toBe("frame");
    expect(heroNamePlacement({ hasFrame: true, customEyebrow: false })).toBe("frame");
    expect(heroNamePlacement({ hasFrame: false, customEyebrow: false })).toBe("eyebrow");
    expect(heroNamePlacement({ hasFrame: false, customEyebrow: true })).toBe("hidden");
  });

  test("hero-image state carries an optional placement; background stays the default shape", () => {
    expect(parsePublicState({ visible: true, src: SRC, placement: "object" })).toEqual({ visible: true, src: SRC, placement: "object" });
    expect(parsePublicState({ visible: true, src: SRC, placement: "weird" })).toEqual({ visible: true, src: SRC });
    expect(parsePublicState({ visible: true, src: SRC })).toEqual({ visible: true, src: SRC });
    expect(parseStatus({ role: "admin", visible: true, src: SRC, placement: "object" })?.placement).toBe("object");
    expect(parseStatus({ role: "admin", visible: true, src: SRC })?.placement).toBeUndefined();
  });

  test("the editorial sections and styles write no colour of their own — only palette tokens", () => {
    const root = resolve(__dirname, "..");
    const files = readdirSync(join(root, "components/editorial")).map((name) => join(root, "components/editorial", name));
    files.push(join(root, "lib/editorial.ts"));
    for (const file of files) {
      const source = readFileSync(file, "utf-8");
      expect(source, `${file} writes a hex colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source, `${file} writes an rgb()/hsl() colour`).not.toMatch(/\b(rgb|hsl)a?\(/);
    }
  });
});
