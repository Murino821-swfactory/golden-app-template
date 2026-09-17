import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { config, contentFor } from "../lib/prototype-config";

/**
 * Locale routing on a static export.
 *
 * `output: "export"` has no middleware, and next-intl's "default locale without a prefix"
 * mode is implemented BY middleware — so every language carries a prefix and the bare root
 * is a document that redirects. That root is the URL the customer is handed
 * (`tokenwise.sk/newapp/<slug>`), so it has to land somewhere real.
 *
 * Language is content, which is why it gets a URL rather than a toggle: a switcher that
 * only swapped strings would leave one indexable page for however many languages the
 * customer paid for, against golden rules 3 and 4.
 */

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  sk: "Slovenčina",
  cs: "Čeština",
  de: "Deutsch",
  pl: "Polski",
  es: "Español",
  fr: "Français",
  it: "Italiano",
};

const secondary = config.locales.filter((l) => l !== config.defaultLocale);

test.describe("routing", () => {
  test("the bare root lands on the customer's primary language", async ({ page }) => {
    await page.goto("./");
    await expect(page).toHaveURL(new RegExp(`/${config.defaultLocale}/?$`));
    await expect(page.locator("html")).toHaveAttribute("lang", config.defaultLocale);
  });

  test("every declared language has a page of its own", async ({ page }) => {
    for (const locale of config.locales) {
      const response = await page.goto(`./${locale}/`);
      expect(response?.status(), `${locale} must be served`).toBeLessThan(400);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
    }
  });

  test("each language renders its own copy, not the default's", async ({ page }) => {
    test.skip(secondary.length === 0, "this config ships one language");

    for (const locale of config.locales) {
      const headline = contentFor(config, locale).landing?.headline;
      if (!headline) continue;
      await page.goto(`./${locale}/`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(headline);
    }
  });

  test("search engines are told which language is which", async ({ page }) => {
    await page.goto(`./${config.defaultLocale}/`);
    for (const locale of config.locales) {
      await expect(
        page.locator(`link[rel="alternate"][hreflang="${locale}"]`)
      ).toHaveCount(1);
    }
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
  });
});

test.describe("language switcher", () => {
  test("offers exactly the languages this prototype was published in", async ({ page }) => {
    test.skip(secondary.length === 0, "this config ships one language");
    await page.goto(`./${config.defaultLocale}/`);

    const group = page.getByRole("banner").getByRole("group", { name: /language/i });
    await expect(group.getByRole("link")).toHaveCount(config.locales.length);
    for (const locale of config.locales) {
      await expect(group.getByRole("link", { name: LANGUAGE_NAMES[locale]! })).toBeVisible();
    }
  });

  test("picking a language changes the URL, not just the words", async ({ page }) => {
    test.skip(secondary.length === 0, "this config ships one language");
    const other = secondary[0]!;

    await page.goto(`./${config.defaultLocale}/`);
    await page
      .getByRole("banner")
      .getByRole("link", { name: LANGUAGE_NAMES[other]! })
      .click();

    await expect(page).toHaveURL(new RegExp(`/${other}/?$`));
    await expect(page.locator("html")).toHaveAttribute("lang", other);
  });

  test("a single-language prototype shows no switcher at all", async ({ page }) => {
    test.skip(secondary.length > 0, "this config ships more than one language");
    await page.goto(`./${config.defaultLocale}/`);
    await expect(
      page.getByRole("banner").getByRole("group", { name: /language/i })
    ).toHaveCount(0);
  });
});

/**
 * Message-bundle parity.
 *
 * A missing key does not fail a build — next-intl renders the key path and the page ships
 * with `common.signIn` where a button label should be. This is pure (no browser), so it
 * runs in the same command as everything else.
 */
test.describe("message bundles", () => {
  const LOCALE_IDS = ["en", "sk", "cs", "de", "pl", "es", "fr", "it"];

  function flatten(value: unknown, prefix = ""): string[] {
    if (value === null || typeof value !== "object") return [prefix];
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      flatten(v, prefix ? `${prefix}.${k}` : k)
    );
  }

  // Read rather than imported: a dynamic `import()` of JSON needs an import attribute in
  // this runtime, and a test that cannot run is worse than no test.
  const load = (locale: string) =>
    flatten(JSON.parse(readFileSync(`messages/${locale}.json`, "utf-8"))).sort();

  test("every language the template offers has a bundle with the same keys as English", () => {
    const en = load("en");
    for (const locale of LOCALE_IDS) {
      expect(load(locale), `messages/${locale}.json`).toEqual(en);
    }
  });
});
