import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  config,
  contentFor,
  isPresentationOnly,
  parsePrototypeConfig,
  parseProductionPrototypeConfig,
  PRODUCTION_REQUIRED_PATTERNS,
} from "../lib/prototype-config";
import { filterByCategory, formatPrice, listingCards, listingPoints, usedCategories } from "../lib/listings";
import { formatLabel, uiCopy } from "./ui-copy";

/** The listings pattern (phase A, 2026-10-09): illustrative offers from the config. */

const composed = () => JSON.parse(readFileSync("fixtures/composed.config.json", "utf8"));

/** A composed config with every production copy field filled, as production-copy.spec does. */
const production = () => {
  const cfg = composed();
  cfg.content.en.dashboard.intro = "Your records and the map of offers.";
  cfg.content.en.contactForm.intro = "Ask the owner about any offer.";
  cfg.content.en.dataGrid.sampleRecords = [
    { name: "Landing", kind: "Page", addedOn: "2026-10-08", selectable: true },
    { name: "Record editor", kind: "Control", addedOn: "2026-10-08", selectable: true },
    { name: "Records", kind: "Data", addedOn: "2026-10-08", selectable: true },
  ];
  return cfg;
};

test.describe("listings config", () => {
  test("the pattern and its landing section are enabled together, with copy", () => {
    const missingPattern = composed();
    delete missingPattern.patterns.listings;
    expect(() => parsePrototypeConfig(missingPattern)).toThrow(/enabled together/);
    const orphan = composed();
    orphan.patterns.landing.sections = orphan.patterns.landing.sections.filter((s: string) => s !== "listings");
    expect(() => parsePrototypeConfig(orphan)).toThrow(/enabled together/);
    const missingCopy = composed();
    delete missingCopy.content.en.listings;
    expect(() => parsePrototypeConfig(missingCopy)).toThrow(/has no copy/);
  });

  test("structure is checked: categories, attributes, currency, unique ids", () => {
    const cases: Array<[(cfg: ReturnType<typeof composed>) => void, RegExp]> = [
      [(cfg) => { cfg.patterns.listings.items[0].category = "castle"; }, /not one of categories/],
      [(cfg) => { cfg.patterns.listings.items[1].id = cfg.patterns.listings.items[0].id; }, /used twice/],
      [(cfg) => { delete cfg.patterns.listings.currency; }, /currency is missing/],
      [(cfg) => { cfg.patterns.listings.items[0].attributes.floors = 2; }, /not declared/],
      [(cfg) => { cfg.patterns.listings.items = cfg.patterns.listings.items.slice(0, 2); }, /listings/],
    ];
    for (const [breakIt, message] of cases) {
      const cfg = composed();
      breakIt(cfg);
      expect(() => parsePrototypeConfig(cfg)).toThrow(message);
    }
  });

  test("every category, attribute and offer needs copy in each language — own properties only", () => {
    const noCategory = composed();
    delete noCategory.content.en.listings.categoryLabels.house;
    expect(() => parsePrototypeConfig(noCategory)).toThrow(/category "house" has no label/);
    const noItem = composed();
    delete noItem.content.en.listings.items["offer-2"];
    expect(() => parsePrototypeConfig(noItem)).toThrow(/item "offer-2" has no copy/);
    const extra = composed();
    extra.content.en.listings.items["offer-9"] = { title: "Ghost", summary: "Nobody renders this." };
    expect(() => parsePrototypeConfig(extra)).toThrow(/not in patterns.listings.items/);
    const inherited = composed();
    inherited.patterns.listings.categories.push("constructor");
    expect(() => parsePrototypeConfig(inherited)).toThrow(/category "constructor" has no label/);
  });
});

test.describe("required patterns (production)", () => {
  test("a complete composition with listings, map, dashboard and sign-in passes", () => {
    expect(() => parseProductionPrototypeConfig(production())).not.toThrow();
  });

  // Founder decision 2026-10-10: the map is the model's choice, not a requirement — a
  // reading diary has no place to pin. Its offers then carry no location either.
  test("the map is optional: a composition without mapBase passes", () => {
    const cfg = production();
    delete cfg.patterns.mapBase;
    for (const item of cfg.patterns.listings.items) delete item.location;
    expect(PRODUCTION_REQUIRED_PATTERNS).not.toContain("mapBase");
    expect(() => parseProductionPrototypeConfig(cfg)).not.toThrow();
  });

  for (const id of PRODUCTION_REQUIRED_PATTERNS) {
    test(`production refuses a composition without ${id}`, () => {
      const cfg = production();
      delete cfg.patterns[id];
      if (id === "listings") {
        cfg.patterns.landing.sections = cfg.patterns.landing.sections.filter((s: string) => s !== "listings");
        delete cfg.content.en.listings;
      }
      if (id === "dashboard") delete cfg.content.en.dashboard;
      if (id === "dashboard" || id === "authGoogle") {
        // dataGrid requires both; drop it so the refusal is about the required pattern.
        delete cfg.patterns.dataGrid;
        delete cfg.content.en.dataGrid;
        cfg.patterns.cta.href = "#contact";
      }
      expect(() => parseProductionPrototypeConfig(cfg)).toThrow(new RegExp(`patterns\\.${id}: every prototype must enable it`));
    });
  }

  test("the factory's concept presentation (landing + cta only) is exempt", () => {
    const fallback = {
      appName: "Reading diary",
      locales: ["en"],
      defaultLocale: "en",
      theme: { colorScheme: "black-green-ruby-red" },
      patterns: { landing: { sections: ["hero", "features", "cta"] }, cta: { href: "#chapter-features" } },
      content: {
        en: {
          description: "Reading diary: notes about books",
          landing: { headline: "Reading diary", subheadline: "Notes about books", featuresHeading: "The idea", features: [{ title: "The idea", description: "Notes about books" }] },
          cta: { label: "Explore the idea", title: "A first presentation of Reading diary", subtitle: "Notes about books" },
        },
      },
    };
    expect(isPresentationOnly(fallback as never)).toBe(true);
    expect(() => parseProductionPrototypeConfig(fallback)).not.toThrow();
  });

  test("the ask-about button needs its label when the contact section is rendered", () => {
    const cfg = production();
    delete cfg.content.en.listings.inquireLabel;
    expect(() => parseProductionPrototypeConfig(cfg)).toThrow(/listings.inquireLabel/);
  });
});

test.describe("listings logic", () => {
  const cfg = parsePrototypeConfig(composed());
  const listings = cfg.patterns.listings!;
  const copy = contentFor(cfg).listings;

  test("cards merge structure and copy; points are the offers with a place", () => {
    const cards = listingCards(listings, copy);
    expect(cards.map((c) => c.id)).toEqual(["offer-1", "offer-2", "offer-3"]);
    expect(cards[0]).toMatchObject({ title: "Three-room flat near the centre", categoryLabel: "Apartment", status: "available", pricePeriod: "once" });
    expect(cards[0]!.facts).toEqual([
      { key: "area", label: "Area", value: 68, unit: "m²" },
      { key: "rooms", label: "Rooms", value: 3 },
    ]);
    expect(cards[1]!.status).toBe("reserved");
    expect(listingPoints(cards).map((p) => p.label)).toEqual(cards.map((c) => c.title));
  });

  test("filtering and used categories", () => {
    const cards = listingCards(listings, copy);
    expect(filterByCategory(cards, null)).toHaveLength(3);
    expect(filterByCategory(cards, "house").map((c) => c.id)).toEqual(["offer-2"]);
    expect(filterByCategory(cards, "castle")).toEqual([]);
    expect(usedCategories({ ...listings, categories: ["office", "land", "house", "apartment"] })).toEqual(["office", "house", "apartment"]);
  });

  test("prices are formatted for the language on screen", () => {
    expect(formatPrice(189000, "EUR", "en")).toBe("€189,000");
    expect(formatPrice(189000, "EUR", "sk").replace(/\s/g, " ")).toBe("189 000 €");
  });
});

test.describe("listings section", () => {
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

  test("renders every offer in each language, with the illustrative notice", async ({ page }) => {
    test.skip(!config.patterns.listings, "listings pattern not enabled in this config");
    for (const locale of config.locales) {
      await page.goto(locale === config.defaultLocale ? "./" : `./${locale}`);
      const copy = contentFor(config, locale).listings!;
      const section = page.locator('[data-section="listings"]');
      await expect(section.locator("h2")).toHaveText(copy.heading);
      await expect(section.locator("[data-listings-notice]")).toHaveText(copy.notice);
      await expect(section.locator("[data-listing]")).toHaveCount(config.patterns.listings!.items.length);
      for (const item of config.patterns.listings!.items) {
        await expect(section.locator(`[data-listing="${item.id}"] h3`)).toHaveText(copy.items[item.id]!.title);
      }
    }
  });

  test("a category filter narrows the cards and All restores them", async ({ page }) => {
    const listings = config.patterns.listings;
    test.skip(!listings || new Set(listings.items.map((i) => i.category)).size < 2, "fewer than two categories in use");
    await page.goto("./");
    const copy = contentFor(config).listings!;
    const section = page.locator('[data-section="listings"]');
    const first = listings!.items[0]!.category;
    await section.getByRole("button", { name: copy.categoryLabels[first], exact: true }).click();
    await expect(section.locator("[data-listing]")).toHaveCount(listings!.items.filter((i) => i.category === first).length);
    await section.getByRole("button", { name: uiCopy.listings.all, exact: true }).click();
    await expect(section.locator("[data-listing]")).toHaveCount(listings!.items.length);
  });

  test("the map is not loaded until the visitor asks for it", async ({ page }) => {
    test.skip(!config.patterns.listings || !config.patterns.mapBase, "listings with a map not enabled");
    let tiles = false;
    await page.route(/basemaps\.cartocdn\.com/, (route) => { tiles = true; void route.abort(); });
    await page.goto("./");
    await page.waitForLoadState("networkidle");
    expect(tiles).toBe(false);
    await expect(page.locator('[data-section="listings"] [data-pattern="map-base"]')).toHaveCount(0);
    await expect(page.locator('[data-section="listings"]').getByRole("button", { name: (uiCopy.listings as unknown as Record<string, string>).showMap })).toBeVisible();
  });

  test("asking about an offer carries it into the contact form, and it can be removed", async ({ page }) => {
    const copy = contentFor(config).listings;
    test.skip(!copy?.inquireLabel || !config.patterns.landing?.sections.includes("contact"), "no ask-about button in this config");
    await page.goto("./");
    const item = config.patterns.listings!.items.find((i) => i.status !== "unavailable")!;
    await page.locator(`[data-listing="${item.id}"]`).getByRole("link", { name: copy!.inquireLabel }).click();
    const regarding = page.locator("[data-contact-regarding]");
    await expect(regarding).toContainText(formatLabel(uiCopy.contact.regarding!, { title: copy!.items[item.id]!.title }));
    await regarding.getByRole("button", { name: uiCopy.contact.clearRegarding! }).click();
    await expect(regarding).toHaveCount(0);
  });
});
