import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COLOR_SCHEME_IDS, PALETTES, nextSchemeId, rolesFor } from "@tokenwise/shared-ui/theming";
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

const SITE = "https://tokenwise.sk";

test.describe("header identity", () => {
  // Founder decision 2026-09-28: a prototype's header is tokenwise.sk's, 1:1 — the site's
  // logo and nav, every link absolute to tokenwise.sk (the prototype is on another origin).
  // The customer's name lives in the footer, the <title> and the page itself.
  test("the header is tokenwise.sk's: its logo leads to the site", async ({ page }) => {
    await page.goto("./");
    const logo = page.getByRole("banner").getByRole("link", { name: "tokenwise.sk" });
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute("href", `${SITE}/`);
    await expect(page.getByRole("banner").getByRole("link", { name: config.appName, exact: true })).toHaveCount(0);
  });

  test("on a desktop the bar carries tokenwise.sk's nav, pointing at the site", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("./");
    const nav = page.getByRole("banner").getByRole("navigation", { name: "Main" });
    for (const [label, path] of [
      ["Articles", "/articles"],
      ["Arena", "/compare"],
      ["Projects", "/projects"],
      ["Ideas", "/ideas"],
      ["How It Works", "/how-it-works"],
      ["Privacy", "/privacy"],
      ["Contact", "/?scene=9"],
    ] as const) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("href", `${SITE}${path}`);
    }
  });

  test("on a phone the same nav is in the menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog.getByRole("link", { name: "Articles", exact: true })).toHaveAttribute("href", `${SITE}/articles`);
    await expect(dialog.getByRole("link", { name: "Contact", exact: true })).toHaveAttribute("href", `${SITE}/?scene=9`);
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
    await expect(page.getByRole("banner").getByRole("link", { name: "tokenwise.sk" })).toBeVisible();
    await expect(changeColour(page)).toBeVisible();
  });
});

test.describe("Change colour", () => {
  test("is one button, not a palette picker", async ({ page }) => {
    await page.goto("./");
    await expect(changeColour(page)).toHaveCount(1);
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

  test("on a phone the header stays one row, however long the logo", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    await page
      .getByRole("banner")
      .getByRole("link", { name: "tokenwise.sk" })
      .evaluate((el) => {
        el.querySelector("span")!.textContent =
          "An Extremely Long Customer Application Name That Keeps Going";
      });

    await expect(changeColour(page)).toBeInViewport({ ratio: 1 });
    const box = await page.getByRole("banner").boundingBox();
    expect(box!.height).toBeLessThan(80);
  });

  test("in every language the button's name opens with the plain phrase", () => {
    // The button shows a colour wheel and no words (2026-09-28), so `changeColourLabel` is
    // its only name. It opens with the plain phrase — what a voice-control user says to a
    // colour wheel — before the palette's name and place in the cycle.
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

// Founder decision 2026-09-28: every control right of the nav is an icon, like the cart —
// a colour wheel, "Aa", the cart, the figure. No "Change colour", no font name, no "Sign in"
// in the bar at any width; the words are in each control's accessible name.
test.describe("icon-only controls", () => {
  for (const width of [390, 1280]) {
    test(`carry no words in the bar at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("./");
      const bar = page.getByRole("banner");

      await expect(changeColour(page)).toHaveText("");
      await expect(bar.getByRole("button", { name: /^Cart/ })).toHaveText("");
      if (width >= 1024) {
        // "Aa" is the icon, set in the face on screen; the face's name is only in the label.
        const font = bar.getByRole("button", { name: /^Change font: / });
        await expect(font).toHaveText("Aa");
      }
      if (config.patterns.authGoogle) {
        const signIn = bar.getByRole("link", { name: "Sign in", exact: true });
        await expect(signIn).toHaveAttribute("aria-label", "Sign in");
        await expect(signIn).toHaveText("");
      }
    });
  }
});

test.describe("sign-in control", () => {

  test("is absent when the prototype has no sign-in", async ({ page }) => {
    test.skip(Boolean(config.patterns.authGoogle), "authGoogle enabled in this config");
    await page.goto("./");
    await expect(
      page.getByRole("banner").getByRole("link", { name: /sign in/i })
    ).toHaveCount(0);
  });
});
