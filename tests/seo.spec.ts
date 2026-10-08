import { test, expect } from "@playwright/test";
import { config, contentFor } from "../lib/prototype-config";
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
  const out = llmsText();
  for (const record of contentFor(config).dataGrid?.sampleRecords ?? []) {
    for (const value of Object.values(record)) if (typeof value === "string" && value.length > 10) expect(out).not.toContain(value);
  }
});
