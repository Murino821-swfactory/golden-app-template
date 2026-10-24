import { test, expect } from "@playwright/test";
import { config, contentFor } from "../lib/prototype-config";
import { LANDING_COPY, landingCopy } from "../lib/landing/copy";
import { CHANNELS } from "../lib/studio/channels";

/**
 * The GitPulse Studio landing in its editorial form (2026-10-23): one long document in
 * the order of the Indoobit case study on mdx.so — eyebrow pills, a hero that ends in the
 * studio itself, a bento of what you get, a manifesto, a glowing line through the four
 * steps, FAQ cards and a closing band under a giant wordmark. The copy still comes from
 * `prototype.config.json`; only the presentational words live in `lib/landing/copy.ts`.
 *
 * `landing-v2.spec.ts` and `smoke.spec.ts` keep guarding the contract every prototype
 * shares (section order, headings, step and FAQ counts); this file guards what is this
 * page's own.
 */

const copy = contentFor(config);
const words = landingCopy(config.defaultLocale);

test("the landing is a long document, not a sticky stage", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./");
  await expect(page.locator("[data-landing-mode]")).toHaveAttribute("data-landing-mode", "document");
  expect(config.patterns.landing?.presentation).toBe("document");
});

test("hero: eyebrow, one action and the studio itself under the headline", async ({ page }) => {
  await page.goto("./");
  const hero = page.locator('[data-section="hero"]');
  await expect(hero.locator("[data-eyebrow]")).toHaveText(words.hero.eyebrow);
  await expect(hero.locator("h1")).toHaveText(copy.landing!.headline!);
  // One next step (landing-action.spec.ts); the fold-cut studio is the invitation to scroll.
  await expect(hero.locator("a")).toHaveCount(1);
  await expect(hero.getByRole("link", { name: copy.cta!.label })).toHaveAttribute("href", /\/studio$/);

  // The product, not a product shot: real figures, real projects, the five destinations.
  const preview = hero.locator("[data-studio-preview]");
  await expect(preview).toBeVisible();
  for (const channel of CHANNELS) await expect(preview.getByText(channel.label, { exact: true })).toBeVisible();
  expect(await preview.locator("[data-preview-project]").count()).toBeGreaterThanOrEqual(3);
  await expect(preview.locator("[data-preview-figure]")).toHaveCount(3);
  // The template's sample-record preview stays off — this prototype has no sample records.
  await expect(page.locator("[data-product-preview]")).toHaveCount(0);
});

test("features: a bento with one wide card, numerals, and the manifesto after it", async ({ page }) => {
  await page.goto("./");
  const section = page.locator('[data-section="features"]');
  await expect(section.locator("[data-eyebrow]")).toHaveText(words.features.eyebrow);
  const cards = section.locator("[data-bento] > li");
  await expect(cards).toHaveCount(copy.landing!.features!.length);
  await expect(cards.first()).toHaveAttribute("data-span", "wide");
  await expect(cards.first().locator("[data-numeral]")).toHaveText("01");
  await expect(section.locator("[data-manifesto]")).toContainText(words.manifesto.lead);
  // One h2 only — the manifesto is a paragraph, so the shared heading test keeps holding.
  await expect(section.locator("h2")).toHaveCount(1);
});

test("how it works: a glowing line drawn through the steps", async ({ page }) => {
  await page.goto("./");
  const section = page.locator('[data-section="howItWorks"]');
  await expect(section.locator("[data-eyebrow]")).toHaveText(words.howItWorks.eyebrow);
  await expect(section.locator("svg[data-glow-line] path")).toHaveCount(1);
  const steps = section.locator("li");
  await expect(steps).toHaveCount(copy.landing!.howItWorks!.steps.length);
  await expect(steps.nth(1).locator("[data-numeral]")).toHaveText("02");
});

test("faq: cards that open, with the eyebrow and the heading beside them", async ({ page }) => {
  await page.goto("./");
  const section = page.locator('[data-section="faq"]');
  await expect(section.locator("[data-eyebrow]")).toHaveText(words.faq.eyebrow);
  const first = section.locator("details").first();
  await first.locator("summary").click();
  await expect(first).toHaveAttribute("open", "");
  await expect(first.locator("p")).toBeVisible();
});

test("closing band ends in the wordmark, which is decoration", async ({ page }) => {
  await page.goto("./");
  const band = page.locator('[data-section="cta"]');
  await expect(band.locator("h2")).toHaveText(copy.cta!.title!);
  const wordmark = band.locator("[data-wordmark]");
  await expect(wordmark).toHaveText(config.appName);
  await expect(wordmark).toHaveAttribute("aria-hidden", "true");
});

test("the Czech document speaks Czech in its own words too", async ({ page }) => {
  test.skip(!config.locales.includes("cs"), "no Czech locale");
  await page.goto("./cs");
  await expect(page.locator('[data-section="hero"] [data-eyebrow]')).toHaveText(LANDING_COPY.cs.hero.eyebrow);
  await expect(page.locator('[data-section="features"] [data-manifesto]')).toContainText(LANDING_COPY.cs.manifesto.lead);
});

test("nothing is wider than a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator('[data-section="hero"] [data-studio-preview]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test.describe("landing copy (pure)", () => {
  test("every language has the same words, and no exclamation marks", () => {
    const keys = (o: unknown): string[] =>
      typeof o === "object" && o !== null
        ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (typeof v === "object" && v !== null ? keys(v).map((s) => `${k}.${s}`) : [k]))
        : [];
    expect(keys(LANDING_COPY.cs).sort()).toEqual(keys(LANDING_COPY.en).sort());
    expect(JSON.stringify(LANDING_COPY)).not.toContain("!");
  });
});
