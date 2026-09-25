import { test, expect, type Page } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { FONT_FAMILIES, FONT_IDS, nextFontId } from "@tokenwise/shared-ui/theming";
import sharedUiPackage from "../packages/shared-ui/package.json";
import { config } from "../lib/prototype-config";

/**
 * The header is `@tokenwise/shared-ui`'s (sw-factory spec 2026-09-25-shared-header-design.md).
 * These are the acceptance criteria the template can check on its own export: one header
 * and only that one, a 390px bar that fits, a font choice that survives a reload without a
 * flash, and a header that is actually styled.
 */

const ROOT = resolve(__dirname, "..");
const VERSION = sharedUiPackage.version;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (["node_modules", "packages", ".next", "out", "test-results", "playwright-report"].includes(name)) {
      return [];
    }
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx|jsx)$/.test(name) ? [path] : [];
  });
}

function fontButton(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: /^Change font/ });
}

// AC 1. Stated as landmarks, not as "no <header> in the source": a <header> inside <main>
// or <article> is a content heading block (the dashboard has one) and is not a banner. The
// criterion is that the page's ONE site header is the package's.
test("site chrome renders no header of its own — only the package does", () => {
  const chrome = [join(ROOT, "app/shell.tsx"), ...sources(join(ROOT, "components/layout"))];
  const offenders = chrome.filter((file) => /<header[\s>]/.test(readFileSync(file, "utf-8")));
  expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
});

test("every page has exactly one banner, and it is the shared header at this version", async ({ page }) => {
  const routes = ["./", ...(config.patterns.authGoogle ? ["./login", "./dashboard"] : [])];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.getByRole("banner"), route).toHaveCount(1);
    await expect(page.getByRole("banner"), route).toHaveAttribute("data-shared-ui", VERSION);
  }
});

// AC 2
test.describe("at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the bar fits without horizontal scroll and every control is at least 44×44", async ({ page }) => {
    await page.goto("./");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const controls = page.getByRole("banner").locator("button:visible, a:visible");
    const count = await controls.count();
    expect(count).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < count; i++) {
      const box = await controls.nth(i).boundingBox();
      const name = await controls.nth(i).getAttribute("aria-label");
      // The logo is text, not a control: it is allowed to be as wide as the name.
      if (box && name !== null) {
        expect(box.width, `${name} width`).toBeGreaterThanOrEqual(44);
        expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("a long app name truncates instead of pushing a control off screen", async ({ page }) => {
    await page.goto("./");
    const logo = page.getByRole("banner").getByRole("link", { name: config.appName });
    await logo.evaluate((el) => {
      el.querySelector("span")!.textContent =
        "An Extremely Long Customer Application Name That Keeps Going And Going";
    });
    await expect(page.getByRole("button", { name: "Open menu" })).toBeInViewport({ ratio: 1 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("font and languages live in the menu, and Escape returns focus to the toggle", async ({ page }) => {
    await page.goto("./");
    await expect(fontButton(page)).toBeHidden();
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /^Change font/ })).toBeVisible();
    if (config.locales.length > 1) {
      await expect(dialog.getByRole("navigation", { name: "Language" })).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(toggle).toBeFocused();
  });
});

// AC 3
test.describe("font", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a first visit is set in Inter", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-font", "inter");
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family).toContain("Inter");
  });

  test("one click steps to the next face, the whole cycle wraps", async ({ page }) => {
    await page.goto("./");
    let expected: (typeof FONT_IDS)[number] = "inter";
    for (let i = 0; i < FONT_IDS.length; i++) {
      await fontButton(page).click();
      expected = nextFontId(expected);
      await expect(page.locator("html")).toHaveAttribute("data-font", expected);
    }
    expect(expected).toBe("inter");
  });

  test("its accessible name says which face is on screen and where it sits", async ({ page }) => {
    await page.goto("./");
    await expect(fontButton(page)).toHaveAttribute("aria-label", "Change font: Inter (2 of 10)");
    await fontButton(page).click();
    const next = FONT_FAMILIES.find((f) => f.id === nextFontId("inter"))!;
    await expect(fontButton(page)).toHaveAttribute("aria-label", `Change font: ${next.name} (3 of 10)`);
  });

  test("the choice survives a reload and is in place before the header is parsed", async ({ page }) => {
    await page.goto("./");
    await fontButton(page).click();
    const next = nextFontId("inter");
    await expect(page.locator("html")).toHaveAttribute("data-font", next);

    // Records html[data-font] at the moment the parser inserts the <header> — before
    // React has run at all. A value there proves there is no flash of the default face.
    await page.addInitScript(() => {
      new MutationObserver((records, observer) => {
        for (const r of records) {
          for (const node of r.addedNodes) {
            if (node instanceof HTMLElement && node.tagName === "HEADER") {
              (window as unknown as { __fontAtHeader: string }).__fontAtHeader =
                document.documentElement.dataset.font ?? "";
              observer.disconnect();
            }
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-font", next);
    expect(
      await page.evaluate(() => (window as unknown as { __fontAtHeader: string }).__fontAtHeader)
    ).toBe(next);
  });

  test("an unknown stored font falls back to the default", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("font", "comic-sans"));
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-font", "inter");
  });
});

// AC 7
test("the header is styled, not bare markup (the package's classes were compiled)", async ({ page }) => {
  await page.goto("./");
  const header = page.locator("header[data-shared-ui]");
  expect(await header.evaluate((el) => getComputedStyle(el).backdropFilter)).not.toBe("none");
  expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
  const logoFont = await page
    .getByRole("banner")
    .getByRole("link", { name: config.appName })
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(logoFont).toContain("Big Shoulders");
});

test("the cart is always there and says it is empty", async ({ page }) => {
  await page.goto("./");
  const cart = page.getByRole("banner").getByRole("button", { name: "Cart, 0 items" });
  await expect(cart).toBeVisible();
  await cart.click();
  await expect(page.getByRole("status").filter({ hasText: "Your cart is empty" })).toBeVisible();
});
