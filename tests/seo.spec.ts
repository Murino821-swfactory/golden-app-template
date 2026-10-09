import { test, expect } from "@playwright/test";
import { config, contentFor, parsePrototypeConfig } from "../lib/prototype-config";
import fullConfig from "../fixtures/full.config.json";
import { llmsText, publicUrl, siteOrigin } from "../lib/seo";

test("search and AI discovery use the rendered localized copy", async ({ page }) => {
  for (const locale of config.locales) {
    await page.goto(locale === config.defaultLocale ? "./" : `./${locale}`);
    const copy = contentFor(config, locale);
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute("content", copy.description);
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute("content", copy.description);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", publicUrl(locale));
    const graph = JSON.parse((await page.locator("[data-site-jsonld]").textContent())!)["@graph"];
    expect(graph.find((item: { "@type": string }) => item["@type"] === "WebPage")).toMatchObject({ description: copy.description, inLanguage: locale });
  }
  const llms = await page.request.get("llms.txt");
  expect(llms.status()).toBe(200);
  expect(await llms.text()).toBe(llmsText());
});

test("sitemap contains public locales and robots leaves AI crawlers open", async ({ request }) => {
  const sitemap = await request.get("sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  if (siteOrigin()) for (const locale of config.locales) expect(xml).toContain(`<loc>${publicUrl(locale)}</loc>`);
  expect(xml).not.toContain("/dashboard");
  expect(xml).not.toContain("/messages");
  const robots = await request.get("robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("User-Agent: *");
  expect(await robots.text()).not.toMatch(/GPTBot|ClaudeBot|PerplexityBot/);
});

test("private routes cannot inherit the landing canonical or index directive", async ({ page }) => {
  for (const route of ["login", "dashboard", "messages"]) {
    const response = await page.request.get(route);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('property="og:url"');
  }
});

test("GEO excludes unrendered sections and private sample records", () => {
  // Private records can legitimately share words with public FAQ copy. Unique
  // sentinels test the source of exported data without rejecting that public copy.
  const source = parsePrototypeConfig(structuredClone(fullConfig));
  source.patterns.landing!.sections = ["hero"];
  for (const locale of source.locales) {
    const copy = contentFor(source, locale);
    copy.landing!.headline = `Public headline ${locale}`;
    copy.landing!.features = [{ title: `HIDDEN_FEATURE_${locale}`, description: `HIDDEN_DESCRIPTION_${locale}` }];
    copy.dataGrid!.sampleRecords = [{ name: `PRIVATE_SAMPLE_${locale}` }];
  }
  const out = llmsText(source);
  for (const locale of source.locales) {
    expect(out).toContain(`Public headline ${locale}`);
    expect(out).not.toContain(`HIDDEN_FEATURE_${locale}`);
    expect(out).not.toContain(`HIDDEN_DESCRIPTION_${locale}`);
    expect(out).not.toContain(`PRIVATE_SAMPLE_${locale}`);
  }
});
