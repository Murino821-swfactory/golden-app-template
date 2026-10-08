import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";

// These tests exercise form behavior in the accessible document shell. Story navigation
// and reaching this same form on desktop are covered in landing-story.spec.ts.
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

/**
 * `NEXT_PUBLIC_DEMO_SLUG` is unset for this template's own CI build (and for local
 * `npm run dev`) — the contact endpoint identifies a prototype by slug, so with no slug
 * there is nothing for a submission to be delivered to. The pre-fix form ignored that
 * entirely: it accepted a full submission and sent nothing
 * (`onSubmit={(event) => event.preventDefault()}`), leaving the visitor believing their
 * message had gone out. This suite is the regression test for that: it fails on the
 * pre-fix code (a "submit" that neither disables nor requests anything would pass a naive
 * "no request" check) and passes only once the form is visibly, actually inert.
 */

test.describe("contact form — no demo slug", () => {
  // The factory's smoke gate builds and serves every prototype WITH its slug
  // (`loadDemoEnv` in sw-factory), so the form there is live by design and this suite has
  // nothing to say. Without this skip, every prototype that enables `contactForm` failed
  // its smoke gate on these four tests while the template's own CI (no slug) stayed green.
  test.skip(
    Boolean(process.env.NEXT_PUBLIC_DEMO_SLUG),
    "NEXT_PUBLIC_DEMO_SLUG is set — the form is configured, so the not-configured state cannot appear"
  );

  test("renders the disabled, not-configured state", async ({ page }) => {
    test.skip(!config.patterns.contactForm, "contactForm pattern not enabled in this config");

    await page.goto("./");
    const section = page.locator('[data-section="contact"]');

    await expect(section.getByRole("status")).toContainText(/isn't configured/i);
    await expect(section.locator("#contact-email")).toBeDisabled();
    await expect(section.locator("#contact-message")).toBeDisabled();
    await expect(section.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  test("submitting issues no request", async ({ page }) => {
    test.skip(!config.patterns.contactForm, "contactForm pattern not enabled in this config");

    let requested = false;
    await page.route("**/api/prototype-contact", (route) => {
      requested = true;
      void route.fulfill({ json: { ok: true } });
    });

    await page.goto("./");
    const section = page.locator('[data-section="contact"]');

    // The controls are genuinely disabled, not merely styled to look that way. `force`
    // bypasses Playwright's own actionability wait — which would otherwise time out
    // trying to interact with a disabled element — so the assertion below is "even a
    // forced interaction does nothing", not "Playwright never tried".
    await section.locator("#contact-email").fill("visitor@example.com", { force: true });
    await section
      .locator("#contact-message")
      .fill("Testing that the disabled form sends nothing.", { force: true });
    await section.getByRole("button", { name: /send/i }).click({ force: true });

    // No success/error transition to await — the whole point is that nothing happens.
    // Give any (wrongly) in-flight request a chance to land before asserting its absence.
    await page.waitForLoadState("networkidle");

    expect(requested).toBe(false);
    await expect(section.getByRole("status")).toContainText(/isn't configured/i);
  });
});

test.describe("owner contact card", () => {
  test.skip(!config.patterns.contactForm, "contactForm pattern not enabled in this config");

  test("the shipped static card is empty: no card, no error", async ({ page }) => {
    const res = await page.request.get("owner-contact.json");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({});
    await page.goto("./");
    await expect(page.locator("[data-owner-card]")).toHaveCount(0);
  });

  test("a published card shows only the filled fields, with working links", async ({ page }) => {
    await page.route("**/owner-contact.json", (route) =>
      route.fulfill({ json: { firstName: "Jana", lastName: "Nováková", phone: "+421 900 123 456" } })
    );
    await page.goto("./");
    const card = page.locator("[data-owner-card]");
    await expect(card).toContainText("Jana Nováková");
    await expect(card.locator('a[href="tel:+421900123456"]')).toBeVisible();
    await expect(card.locator('a[href^="mailto:"]')).toHaveCount(0);
    await expect(card.locator('a[href*="google.com/maps"]')).toHaveCount(0);
  });

  test("the visitor form offers an optional name; an anonymous visitor sees no owner controls", async ({ page }) => {
    await page.goto("./");
    const name = page.locator("#contact-name");
    await expect(name).toHaveAttribute("autocomplete", "name");
    await expect(name).not.toHaveAttribute("required", "");
    await expect(page.locator("[data-owner-controls]")).toHaveCount(0);
  });
});
