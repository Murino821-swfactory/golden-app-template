import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";
import { COLOR_SCHEME_IDS, rolesFor } from "../lib/color-schemes";

/**
 * The header is the only chrome every prototype shows on every page, so it is also the
 * only place where "the template forgot whose app this is" is visible to the customer.
 *
 * Two of these tests exist because of a shipped defect: `header.tsx` and `footer.tsx` read
 * `useTranslations("common").appName`, which resolves from `messages/en.json` — the string
 * "Golden App" — and never look at `prototype.config.json`. Every prototype, whatever its
 * name, introduced itself as the template. `<title>` was correct, which is why the smoke
 * suite never noticed.
 */

const SCHEME_LABELS: Record<string, string> = {
  red: "Red",
  blue: "Blue",
  yellow: "Yellow",
  green: "Green",
};

/** A scheme the config does NOT ship as its default — so a click provably changes something. */
const OTHER_SCHEME = COLOR_SCHEME_IDS.find((id) => id !== config.theme.colorScheme)!;

function readBackground(page: import("@playwright/test").Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--background").trim()
  );
}

test.describe("header identity", () => {
  test("the header names the customer's app, not the template", async ({ page }) => {
    await page.goto("./");
    await expect(
      page.getByRole("banner").getByRole("link", { name: config.appName })
    ).toBeVisible();
  });

  test("the footer names the customer's app, not the template", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByRole("contentinfo")).toContainText(config.appName);
  });

  // The header carries the palette switcher and the sign-in control, so a page without it
  // is a page where the visitor cannot change the palette or get back out. It used to live
  // in the (public) route group, which meant exactly that on /login and /dashboard.
  test("the sign-in page carries the same header", async ({ page }) => {
    test.skip(!config.patterns.authGoogle, "authGoogle not enabled in this config");
    await page.goto("./login");
    await expect(
      page.getByRole("banner").getByRole("link", { name: config.appName })
    ).toBeVisible();
    await expect(
      page.getByRole("banner").getByRole("radiogroup", { name: /colour scheme/i })
    ).toBeVisible();
  });
});

test.describe("colour scheme switcher", () => {
  test("offers every scheme the template ships", async ({ page }) => {
    await page.goto("./");
    const group = page.getByRole("radiogroup", { name: /colour scheme/i });
    await expect(group).toBeVisible();
    await expect(group.getByRole("radio")).toHaveCount(COLOR_SCHEME_IDS.length);
  });

  test("picking a scheme repaints the page", async ({ page }) => {
    await page.goto("./");
    expect((await readBackground(page)).toLowerCase()).toBe(
      rolesFor(config.theme.colorScheme).background.toLowerCase()
    );

    await page
      .getByRole("radio", { name: SCHEME_LABELS[OTHER_SCHEME]! })
      .click();

    await expect(page.locator("html")).toHaveAttribute("data-scheme", OTHER_SCHEME);
    expect((await readBackground(page)).toLowerCase()).toBe(
      rolesFor(OTHER_SCHEME).background.toLowerCase()
    );
  });

  test("the choice survives a reload", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("radio", { name: SCHEME_LABELS[OTHER_SCHEME]! }).click();
    await expect(page.locator("html")).toHaveAttribute("data-scheme", OTHER_SCHEME);

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-scheme", OTHER_SCHEME);
    expect((await readBackground(page)).toLowerCase()).toBe(
      rolesFor(OTHER_SCHEME).background.toLowerCase()
    );
  });

  test("a visitor who never chose sees the scheme the customer picked", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute(
      "data-scheme",
      config.theme.colorScheme
    );
  });
});

test.describe("sign-in control", () => {
  test("keeps an accessible name when its label is hidden on a phone", async ({ page }) => {
    test.skip(!config.patterns.authGoogle, "authGoogle not enabled in this config");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");

    const signIn = page.getByRole("banner").getByRole("link", { name: "Sign in" });
    await expect(signIn).toHaveAttribute("aria-label", "Sign in");
    await expect(signIn.locator("span")).toBeHidden();
  });

  test("is absent when the prototype has no sign-in", async ({ page }) => {
    test.skip(Boolean(config.patterns.authGoogle), "authGoogle enabled in this config");
    await page.goto("./");
    await expect(
      page.getByRole("banner").getByRole("link", { name: /sign in/i })
    ).toHaveCount(0);
  });
});
