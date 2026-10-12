import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { config, contentFor, parsePrototypeConfig } from "../lib/prototype-config";

const composed = () => JSON.parse(readFileSync("fixtures/composed.config.json", "utf8"));

for (const id of ["useCases", "comparison"] as const) {
  test(`${id} refuses a section without its pattern and copy`, () => {
    const missingPattern = composed();
    delete missingPattern.patterns[id];
    expect(() => parsePrototypeConfig(missingPattern)).toThrow(/enabled together/);
    const missingCopy = composed();
    delete missingCopy.content.en[id];
    expect(() => parsePrototypeConfig(missingCopy)).toThrow(/has no copy/);
    const orphan = composed();
    orphan.patterns.landing.sections = orphan.patterns.landing.sections.filter((s: string) => s !== id);
    expect(() => parsePrototypeConfig(orphan)).toThrow(/enabled together/);
  });

  test(`${id} renders the configured text in each declared language`, async ({ page }) => {
    test.skip(!config.patterns[id], "pattern not enabled");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const locale of config.locales) {
      await page.goto(locale === config.defaultLocale ? "./" : `./${locale}`);
      const copy = contentFor(config, locale)[id]!;
      const section = page.locator(`[data-section="${id}"]`);
      await expect(section.locator("h2")).toHaveText(copy.heading);
      if (id === "useCases") {
        const items = contentFor(config, locale).useCases!.items;
        await expect(section.locator("li")).toHaveCount(items.length);
        for (const item of items) await expect(section).toContainText(item.action);
      } else {
        const rows = contentFor(config, locale).comparison!.rows;
        await expect(section.locator("article")).toHaveCount(rows.length);
        for (const row of rows) await expect(section).toContainText(row.after);
      }
    }
  });
}

test("duplicate sections cannot create repeated headings or anchor ids", () => {
  const broken = composed();
  broken.patterns.landing.sections.push("hero");
  expect(() => parsePrototypeConfig(broken)).toThrow(/unique/);
});
