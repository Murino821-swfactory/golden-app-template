import { test, expect } from "@playwright/test";
import { config, contentFor } from "../lib/prototype-config";
import { landingActionHref } from "../lib/landing-action";

test("landing next step follows the configured action, including customer routes", () => {
  expect(landingActionHref({ landing: { sections: ["hero"] }, cta: { href: "/analyze" } })).toBe("/analyze");
  expect(landingActionHref({ landing: { sections: ["hero", "contact"] }, contactForm: {} })).toBe("#contact");
  expect(landingActionHref({ landing: { sections: ["hero"] }, authGoogle: {} })).toBe("/login");
  expect(landingActionHref({ landing: { sections: ["hero"] }, dashboard: {} })).toBe("/dashboard");
  // An unused contact pattern does not mean that a contact section is rendered.
  expect(landingActionHref({ landing: { sections: ["hero"] }, contactForm: {} })).toBeNull();
});

test("the hero offers the customer's configured next step", async ({ page }) => {
  test.skip(!config.patterns.landing?.sections.includes("hero"), "no hero in this config");
  await page.goto("./");
  const action = page.locator('[data-section="hero"] a');
  const href = landingActionHref(config.patterns);
  if (!href) {
    await expect(action).toHaveCount(0);
    return;
  }
  await expect(action).toHaveCount(1);
  const renderedHref = await action.getAttribute("href");
  expect(renderedHref).toBe(href.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${href}` : href);
  if (contentFor(config).cta) await expect(action).toHaveText(contentFor(config).cta!.label);
});

test("landing anchor CTAs have real targets", async ({ page }) => {
  await page.goto("./");
  const missing = await page.locator('[data-section] a[href^="#"]').evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")!).filter((href) => href.length > 1 && !document.getElementById(href.slice(1)))
  );
  expect(missing).toEqual([]);
  if (config.patterns.landing?.sections.includes("contact")) {
    await expect(page.locator("#contact")).toHaveCount(1);
    await page.evaluate(() => { window.location.hash = "contact"; });
    await expect(page.locator("#contact")).toBeInViewport();
  }
});
