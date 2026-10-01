import { test, expect } from "@playwright/test";
import { config, contentFor } from "../lib/prototype-config";
import { faqJsonLd } from "../lib/faq-jsonld";

const copy = contentFor(config);
const sections: readonly string[] = config.patterns.landing?.sections ?? [];

test.describe("landing v2 — features and closing band", () => {
  test("features use the configured heading and draw an svg per configured icon", async ({ page }) => {
    test.skip(!sections.includes("features") || !copy.landing?.features, "no configured features");
    await page.goto("./");
    const section = page.locator('[data-section="features"]');
    if (copy.landing?.featuresHeading) await expect(section.locator("h2")).toHaveText(copy.landing.featuresHeading);
    const withIcon = copy.landing!.features!.filter((f) => f.icon).length;
    await expect(section.locator("svg")).toHaveCount(withIcon);
  });

  test("the closing band speaks the customer's words when configured", async ({ page }) => {
    test.skip(!sections.includes("cta") || !copy.cta?.title, "no configured closing title");
    await page.goto("./");
    const band = page.locator('[data-section="cta"]');
    await expect(band.locator("h2")).toHaveText(copy.cta!.title!);
    if (copy.cta?.subtitle) await expect(band).toContainText(copy.cta.subtitle);
  });
});

test.describe("faqJsonLd (pure)", () => {
  test("round-trips to a schema.org FAQPage", () => {
    const doc = JSON.parse(faqJsonLd([{ question: "Q?", answer: "A." }]));
    expect(doc["@type"]).toBe("FAQPage");
    expect(doc.mainEntity[0]).toEqual({ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A." } });
  });
  test("model-written text can never close the <script> it sits in", () => {
    const out = faqJsonLd([{ question: "<b>?", answer: "</script><script>alert(1)</script>" }]);
    expect(out).not.toContain("<");
    expect(JSON.parse(out).mainEntity[0].acceptedAnswer.text).toBe("</script><script>alert(1)</script>");
  });
});

test.describe("landing v2 — hero, how it works, faq", () => {
  test("the hero names the app", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    await page.goto("./");
    await expect(page.locator("[data-app-name]")).toHaveText(config.appName);
  });

  test("the hero previews the app iff the grid has sample records", async ({ page }) => {
    test.skip(!sections.includes("hero"), "no hero");
    const expected = Boolean(config.patterns.dataGrid && copy.dataGrid?.sampleRecords?.length);
    await page.goto("./");
    await expect(page.locator("[data-product-preview]")).toHaveCount(expected ? 1 : 0);
    if (expected) await expect(page.locator("[data-product-preview] li")).toHaveCount(3);
  });

  test("how it works shows the configured steps in order", async ({ page }) => {
    test.skip(!sections.includes("howItWorks"), "section not enabled");
    await page.goto("./");
    const steps = page.locator('[data-section="howItWorks"] li');
    await expect(steps).toHaveCount(copy.landing!.howItWorks!.steps.length);
    await expect(steps.first()).toContainText(copy.landing!.howItWorks!.steps[0]!.title);
  });

  test("faq renders every item and a parseable FAQPage with the same questions", async ({ page }) => {
    test.skip(!sections.includes("faq"), "section not enabled");
    await page.goto("./");
    const faq = page.locator('[data-section="faq"]');
    await expect(faq.locator("details")).toHaveCount(copy.landing!.faq!.items.length);
    const ld = JSON.parse((await faq.locator('script[type="application/ld+json"]').textContent())!);
    expect(ld.mainEntity.map((q: { name: string }) => q.name)).toEqual(copy.landing!.faq!.items.map((i) => i.question));
  });
});
