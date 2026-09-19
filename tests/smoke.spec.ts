import { test, expect } from "@playwright/test";
import { config, contentFor } from "../lib/prototype-config";

/**
 * Smoke suite asserts the CUSTOMER'S app, not this template's identity.
 *
 * It used to assert `toHaveTitle(/Golden App/)` against a hardcoded layout title (P3).
 * That gate punished the one thing a prototype must do: name itself. Every assertion here
 * is now derived from `prototype.config.json`, so the same suite passes for the template's
 * own config and for any prototype built from it.
 */

const landing = config.patterns.landing;
const cta = config.patterns.cta;
// Copy is per-locale now; one build still ships one document, in the default locale.
const copy = contentFor(config);

test.describe("Smoke tests", () => {
  test("landing page carries the configured identity", async ({ page }) => {
    await page.goto("./");
    await expect(page).toHaveTitle(config.appName);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      copy.description
    );
  });

  test("landing renders exactly the configured sections, in order", async ({ page }) => {
    test.skip(!landing, "landing pattern not enabled in this config");
    await page.goto("./");

    const rendered = await page.locator("[data-section]").evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-section"))
    );
    expect(rendered).toEqual(landing!.sections);
  });

  test("CTA shows the configured label", async ({ page }) => {
    test.skip(!cta, "cta pattern not enabled in this config");
    await page.goto("./");
    await expect(page.getByRole("link", { name: copy.cta!.label }).first()).toBeVisible();
  });

  test("landing page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("./");
    await page.waitForLoadState("networkidle");

    // Firebase warnings are expected when the demo has no live project wired up.
    const unexpectedErrors = errors.filter(
      (e) => !e.includes("Firebase") && !e.includes("firebaseConfig")
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test("login page accessible", async ({ page }) => {
    test.skip(!config.patterns.authGoogle, "authGoogle pattern not enabled in this config");
    await page.goto("./login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("URL section params cannot override the section lock", async ({ page }) => {
    test.skip(!landing, "landing pattern not enabled in this config");
    // testimonials/pricing/faq are locked out of the model's choice (validateComposition)
    // because they have no content slice and would render this repo's placeholder copy.
    // The renderer must honour that lock too, not just the harness that assigned sections.
    await page.goto("./?sections=testimonials,pricing,faq");

    const rendered = await page.locator("[data-section]").evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-section"))
    );
    expect(rendered).toEqual(landing!.sections);
  });
});
