import { test, expect, type Page } from "@playwright/test";
import { config } from "../lib/prototype-config";
import { localePath } from "../lib/locale-routing";
import { uiCopy, labelPrefix } from "./ui-copy";

/**
 * The language control is an icon among the header's icons, and a click opens a popup with the
 * languages to choose from (founder, 2026-11-25: "add a language switcher icon the way colours
 * and font are changed; a click shows a popup with the choice of languages").
 *
 * Until then the bar read `EN ▾` — the one control right of the logo that was set in words —
 * and the golden demo declared one language, so on tokenwise.sk/demo/golden there was no
 * language control at all.
 *
 * The page tests run on a config that declares more than one language (the golden demo, `full`,
 * `multilingual`). What a single-language prototype shows — nothing — and that a choice keeps
 * the visitor on the page they were reading stay in tests/locale.spec.ts.
 */

const MULTI = config.locales.length > 1;
const TRY = config.patterns.landing?.tryIt === true;
const secondary = config.locales.find((locale) => locale !== config.defaultLocale);

function trigger(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: labelPrefix(`${uiCopy.common.language!}:`) });
}

function popup(page: Page) {
  return page.getByRole("banner").getByRole("navigation", { name: uiCopy.common.language! });
}

test("the golden demo is offered in more than one language, so its header has the control", () => {
  test.skip(!TRY, "only the golden demo (tryIt) is where a visitor comes to try the controls");
  expect(config.locales.length).toBeGreaterThan(1);
});

test.describe("the language icon and its popup", () => {
  test.skip(() => !MULTI, "this config ships one language");
  test.use({ viewport: { width: 1280, height: 800 } });

  test("an icon and nothing else, between the font and the cart", async ({ page }) => {
    await page.goto("./");
    const button = trigger(page);
    await expect(button).toBeVisible();
    // No words in the bar: the name is the aria-label, like the colour wheel's and Aa's.
    await expect(button).toHaveText("");
    await expect(button.locator("svg")).toHaveCount(1);

    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);

    const banner = page.getByRole("banner");
    const font = (await banner.locator('[data-shared-control="font"]').boundingBox())!;
    const cart = (await banner.locator('[data-shared-control="cart"]').boundingBox())!;
    expect(font.x).toBeLessThan(box.x);
    expect(box.x).toBeLessThan(cart.x);
  });

  test("a click opens a popup: its title, every declared language named in itself, the one on screen marked", async ({ page }) => {
    await page.goto("./");
    await expect(popup(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "false");

    await trigger(page).click();
    await expect(popup(page)).toBeVisible();
    await expect(trigger(page)).toHaveAttribute("aria-expanded", "true");
    // The icon carries no word, so the popup says what is being chosen.
    await expect(popup(page).getByText(uiCopy.common.language!, { exact: true })).toBeVisible();

    await expect(popup(page).getByRole("link")).toHaveCount(config.locales.length);
    for (const id of config.locales) {
      const link = popup(page).locator(`a[hreflang="${id}"]`);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("lang", id);
      // The endonym ("Slovenčina") first, never the bare code: a visitor on the wrong language
      // has to be able to read the way out of it. The code beside it is for the eye only.
      const name = ((await link.locator("span").first().textContent()) ?? "").trim();
      expect(name.length, `${id} has no name`).toBeGreaterThan(2);
      await expect(link).toHaveAccessibleName(name);
      if (id !== config.defaultLocale) {
        expect(new URL((await link.getAttribute("href"))!, page.url()).pathname).toMatch(
          new RegExp(`${localePath(id)}/?$`)
        );
      }
    }

    const current = popup(page).locator('a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("hreflang", config.defaultLocale);
    // Marked for the eye too, not only for a screen reader.
    await expect(current.locator("svg")).toHaveCount(1);
  });

  test("Escape closes it and gives the focus back to the icon; so does a click outside", async ({ page }) => {
    await page.goto("./");
    await trigger(page).click();
    await expect(popup(page)).toBeVisible();
    // From inside the list: the focused link is about to be hidden, so the focus needs a home.
    await page.keyboard.press("Tab");
    await expect(popup(page).getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(popup(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();

    await trigger(page).click();
    await expect(popup(page)).toBeVisible();
    await page.mouse.click(8, 600);
    await expect(popup(page)).toBeHidden();
  });

  test("it fits the window it opens in", async ({ page }) => {
    // Eight languages are 352px of rows; a short window scrolls the list, never the page.
    await page.setViewportSize({ width: 1280, height: 420 });
    await page.goto("./");
    await trigger(page).click();
    const box = (await popup(page).boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(420);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(1280);
  });

  test("choosing a language opens the page in it, and the popup then marks that one", async ({ page }) => {
    await page.goto("./");
    await trigger(page).click();
    await popup(page).locator(`a[hreflang="${secondary!}"]`).click();

    await expect(page.locator("html")).toHaveAttribute("lang", secondary!);
    // By its marker, not by its name: the header now speaks the chosen language.
    const list = page.getByRole("banner").locator('[data-shared-control="language"] nav');
    await expect(list).toBeHidden();
    await expect(list.locator('a[aria-current="page"]')).toHaveAttribute("hreflang", secondary!);
  });
});

test.describe("below 1024px", () => {
  test.skip(() => !MULTI, "this config ships one language");
  test.use({ viewport: { width: 390, height: 844 } });

  test("the bar keeps its icons and the menu lists every language", async ({ page }) => {
    await page.goto("./");
    await expect(trigger(page)).toBeHidden();
    await page.getByRole("button", { name: uiCopy.common.openMenu! }).click();
    const list = page
      .getByRole("dialog", { name: uiCopy.common.menu! })
      .getByRole("navigation", { name: uiCopy.common.language! });
    await expect(list.getByRole("link")).toHaveCount(config.locales.length);
    await expect(list.locator('a[aria-current="page"]')).toHaveAttribute("hreflang", config.defaultLocale);
  });
});
