import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COLOR_SCHEME_IDS, PALETTES, nextSchemeId, rolesFor } from "../lib/color-schemes";
import { LOCALES, config } from "../lib/prototype-config";

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

const START = config.theme.colorScheme;

function changeColour(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: /^Change colour/ });
}

function readBackground(page: Page): Promise<string> {
  return page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--background").trim()
  );
}

function labelFor(id: (typeof COLOR_SCHEME_IDS)[number]): string {
  const position = COLOR_SCHEME_IDS.indexOf(id) + 1;
  return `Change colour — ${PALETTES[id].name}, ${position} of ${COLOR_SCHEME_IDS.length}`;
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

  // The header carries the colour button and the sign-in control, so a page without it
  // is a page where the visitor cannot change the palette or get back out. It used to live
  // in the (public) route group, which meant exactly that on /login and /dashboard.
  test("the sign-in page carries the same header", async ({ page }) => {
    test.skip(!config.patterns.authGoogle, "authGoogle not enabled in this config");
    await page.goto("./login");
    await expect(
      page.getByRole("banner").getByRole("link", { name: config.appName })
    ).toBeVisible();
    await expect(changeColour(page)).toBeVisible();
  });
});

test.describe("Change colour", () => {
  test("is one button, not a palette picker", async ({ page }) => {
    await page.goto("./");
    await expect(changeColour(page)).toHaveText("Change colour");
    await expect(page.getByRole("radiogroup")).toHaveCount(0);
  });

  test("a click moves to the next palette and repaints the page", async ({ page }) => {
    await page.goto("./");
    expect((await readBackground(page)).toLowerCase()).toBe(
      rolesFor(START).background.toLowerCase()
    );

    await changeColour(page).click();

    const next = nextSchemeId(START);
    await expect(page.locator("html")).toHaveAttribute("data-scheme", next);
    expect((await readBackground(page)).toLowerCase()).toBe(
      rolesFor(next).background.toLowerCase()
    );
  });

  test("one click per palette walks the whole list and lands back at the start", async ({ page }) => {
    await page.goto("./");
    let expected = START;
    for (let i = 0; i < COLOR_SCHEME_IDS.length; i++) {
      await changeColour(page).click();
      expected = nextSchemeId(expected);
      await expect(page.locator("html")).toHaveAttribute("data-scheme", expected);
    }
    expect(expected).toBe(START);
  });

  test("its accessible name says which palette is on screen and where it sits", async ({ page }) => {
    await page.goto("./");
    await expect(changeColour(page)).toHaveAttribute("aria-label", labelFor(START));
    await changeColour(page).click();
    await expect(changeColour(page)).toHaveAttribute("aria-label", labelFor(nextSchemeId(START)));
  });

  test("the choice survives a reload", async ({ page }) => {
    await page.goto("./");
    await changeColour(page).click();
    const next = nextSchemeId(START);
    await expect(page.locator("html")).toHaveAttribute("data-scheme", next);

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-scheme", next);
    expect((await readBackground(page)).toLowerCase()).toBe(
      rolesFor(next).background.toLowerCase()
    );
  });

  test("a visitor who never chose sees the scheme the customer picked", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-scheme", START);
  });

  // Every visitor of a prototype built before 2026-09-24 who ever clicked a swatch has one
  // of the four retired ids in localStorage.
  test("a palette stored before the fifteen existed falls back to the customer's", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("scheme", "green"));
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-scheme", START);
    await expect(changeColour(page)).toHaveAttribute("aria-label", labelFor(START));
  });

  test("on a phone the header stays one row, however long the app's name", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    await page
      .getByRole("banner")
      .getByRole("link", { name: config.appName })
      .evaluate((el) => {
        el.textContent = "An Extremely Long Customer Application Name That Keeps Going";
      });

    await expect(changeColour(page)).toHaveText("Change colour");
    await expect(changeColour(page)).toBeInViewport({ ratio: 1 });
    const box = await page.getByRole("banner").boundingBox();
    expect(box!.height).toBeLessThan(80);
  });

  test("in every language the button's name starts with its visible text", () => {
    // WCAG 2.5.3 (label in name): a voice-control user says what they see.
    for (const id of LOCALES) {
      const common = JSON.parse(
        readFileSync(resolve(__dirname, `../messages/${id}.json`), "utf-8")
      ).common as Record<string, string>;
      expect(common.changeColourLabel!.startsWith(common.changeColour!), id).toBe(true);
      for (const param of ["{name}", "{position}", "{total}"]) {
        expect(common.changeColourLabel, `${id} lacks ${param}`).toContain(param);
      }
    }
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
