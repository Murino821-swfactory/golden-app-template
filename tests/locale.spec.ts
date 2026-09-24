import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOCALES, config, contentFor } from "../lib/prototype-config";
import { localePath, routeFromPathname } from "../lib/locale-routing";

/**
 * A prototype must render every language it was paid to write.
 *
 * `demo/cv-matcher` declared `["en","sk"]`, the content call wrote complete Slovak copy and
 * zod enforced its completeness — and `tokenwise.sk/newapp/cv-matcher/sk/` answered 404,
 * because `i18n/request.ts` held `const locale = "en"`. Everything below fails on that
 * build: there was one document, in one language, with no alternates.
 *
 * The routing half runs only on a multi-language config — `fixtures/multilingual.config.json`
 * in CI. The bundle and menu checks run on every config, because they are about the
 * template rather than about one prototype.
 */

const secondary = config.locales.find((locale) => locale !== config.defaultLocale);

/** Playwright resolves paths against a slash-terminated base, so every goto stays relative
 * — see the note in playwright.config.ts. `/sk` becomes `./sk`. */
function pathFor(locale: string, route = "/"): string {
  const path = localePath(locale, route);
  return path === "/" ? "./" : `.${path}`;
}

async function descriptionOf(page: import("@playwright/test").Page): Promise<string | null> {
  return page.locator('meta[name="description"]').getAttribute("content");
}

test.describe("the languages the template ships", () => {
  test("every declared locale has a bundle, and every bundle is declared", () => {
    // Both directions. An id in `LOCALES` with no bundle renders the template's English
    // chrome under the customer's foreign copy; a bundle no id names is a translation
    // nobody can select. The list used to name eight languages while `messages/` held one.
    const bundles = readdirSync(resolve(__dirname, "../messages"))
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""));

    expect([...bundles].sort()).toEqual([...LOCALES].sort());
  });

  test("every bundle carries every key English carries", () => {
    const keysOf = (value: unknown, prefix = ""): string[] =>
      Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        child !== null && typeof child === "object"
          ? keysOf(child, `${prefix}${key}.`)
          : [`${prefix}${key}`]
      );
    const read = (id: string) =>
      JSON.parse(readFileSync(resolve(__dirname, `../messages/${id}.json`), "utf-8"));

    const english = keysOf(read("en")).sort();
    for (const id of LOCALES) {
      expect(keysOf(read(id)).sort(), `messages/${id}.json does not match en.json`).toEqual(
        english
      );
    }
  });

  test("the locale list reaches the published schema", () => {
    // The harness reads `prototype.schema.json` out of the clone, never this module, so a
    // language that lives only in TypeScript is one no prototype will ever be offered.
    const doc = JSON.parse(
      readFileSync(resolve(__dirname, "../prototype.schema.json"), "utf-8")
    ) as { menu?: { locales?: string[] } };

    expect(doc.menu?.locales).toEqual([...LOCALES]);
  });
});

test.describe("routing", () => {
  test.skip(() => !secondary, "this config ships one language");

  test("the bare URL renders the default language", async ({ page }) => {
    await page.goto("./");

    await expect(page.locator("html")).toHaveAttribute("lang", config.defaultLocale);
    expect(await descriptionOf(page)).toBe(
      contentFor(config, config.defaultLocale).description
    );
  });

  test("the prefixed URL renders the second language's copy", async ({ page }) => {
    await page.goto(pathFor(secondary!));

    await expect(page.locator("html")).toHaveAttribute("lang", secondary!);
    expect(await descriptionOf(page)).toBe(contentFor(config, secondary!).description);

    // The customer's own words, not just the chrome — the whole point of paying for a
    // second language. Both documents were identical before locale routing.
    const headline = contentFor(config, secondary!).landing?.headline;
    if (headline) await expect(page.getByRole("heading", { name: headline })).toBeVisible();
  });

  test("both documents list every declared language as an alternate", async ({ page }) => {
    for (const locale of config.locales) {
      await page.goto(pathFor(locale));

      const alternates = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((nodes) =>
          nodes.map((node) => [
            node.getAttribute("hreflang"),
            node.getAttribute("href"),
          ])
        );

      expect(
        alternates.map(([id]) => id).sort(),
        `${locale} does not declare its translations`
      ).toEqual([...config.locales].sort());

      // The default language's alternate must be the BARE path. Pointing it at the
      // prefixed duplicate would hand a search engine the copy instead of the URL the
      // customer was actually given.
      const hrefs = Object.fromEntries(alternates);
      expect(hrefs[config.defaultLocale]).not.toMatch(
        new RegExp(`/${config.defaultLocale}/?$`)
      );
      expect(hrefs[secondary!]).toMatch(new RegExp(`/${secondary!}/?$`));
    }
  });

  test("switching language keeps the visitor on the page they were reading", async ({
    page,
  }) => {
    test.skip(!config.patterns.authGoogle, "no second route in this config to stay on");

    await page.goto("./login");
    await page.getByRole("navigation", { name: /language|jazyk/i }).getByText(secondary!, { exact: true }).click();

    await expect(page.locator("html")).toHaveAttribute("lang", secondary!);
    expect(routeFromPathname(new URL(page.url()).pathname.replace(
      process.env.NEXT_PUBLIC_BASE_PATH || "",
      ""
    ))).toBe("/login");
  });
});

test("a single-language prototype renders no switcher at all", async ({ page }) => {
  test.skip(Boolean(secondary), "this config ships more than one language");

  await page.goto("./");
  // Not "hidden" — absent. A control offering one choice is chrome with nothing behind it.
  await expect(page.getByRole("navigation")).toHaveCount(0);
});

test("the Change colour button speaks the page's language", async ({ page }) => {
  test.skip(!config.locales.includes("sk"), "this config has no Slovak");
  await page.goto(pathFor("sk"));
  await expect(
    page.getByRole("banner").getByRole("button", { name: /^Zmeniť farbu/ })
  ).toHaveText("Zmeniť farbu");
});
