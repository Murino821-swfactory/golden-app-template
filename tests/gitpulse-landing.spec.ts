import { test, expect } from "@playwright/test";
import { config, contentFor } from "../lib/prototype-config";
import { LANDING_COPY, landingCopy } from "../lib/landing/copy";
import { GALLERY } from "../lib/landing/gallery";
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

test("gallery: six live projects as pictures that load, link out and swipe on a phone", async ({ page }, info) => {
  await page.goto("./");
  const gallery = page.locator('[data-section="features"] [data-gallery]');
  await expect(gallery.locator("[data-kicker]")).toHaveText(words.gallery.kicker);
  const cards = gallery.locator("[data-gallery-card]");
  await expect(cards).toHaveCount(GALLERY.length);
  for (let i = 0; i < GALLERY.length; i++) {
    const img = cards.nth(i).locator("img");
    await expect(img).toHaveAttribute("alt", new RegExp(`^${GALLERY[i]!.project.name}`));
    const src = (await img.getAttribute("src"))!;
    expect((await page.request.get(new URL(src, page.url()).href)).status(), src).toBe(200);
    await expect(cards.nth(i).locator("a")).toHaveAttribute("target", "_blank");
  }
  if (info.project.name === "mobile") {
    // A strip that scrolls sideways inside itself — never the page.
    const track = gallery.locator("ul");
    expect(await track.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  }
});

test("manifesto is split into words for the scroll reveal, and reads whole without motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  const manifesto = page.locator("[data-manifesto]");
  const spoken = words.manifesto.lead.split(" ").length + words.manifesto.body.split(" ").length;
  await expect(manifesto.locator("[data-word]")).toHaveCount(spoken);
  await expect(manifesto.locator("p")).toHaveText(`${words.manifesto.lead} ${words.manifesto.body}`);
  expect(await manifesto.locator("[data-word]").first().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  expect(await page.locator("[data-reveal]").first().evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("the wordmark ends above the footer, not under it", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const wordmark = (await page.locator("[data-wordmark]").boundingBox())!;
  const footer = (await page.getByRole("contentinfo").boundingBox())!;
  expect(wordmark.y + wordmark.height).toBeLessThanOrEqual(footer.y + 1);
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
    for (const copy of Object.values(LANDING_COPY)) expect(copy.gallery.title(6, 21)).not.toContain("!");
  });

  test("the gallery names only projects the snapshot knows, with a picture each", () => {
    expect(GALLERY).toHaveLength(6);
    for (const item of GALLERY) {
      expect(item.image).toMatch(new RegExp(`/landing/${item.project.key}\\.webp$`));
      expect(item.host).not.toMatch(/^https?:/);
    }
  });
});
