import { test, expect, type Page } from "@playwright/test";
import { config } from "../lib/prototype-config";

/**
 * A customer's texts on the golden demo (founder, 2026-11-27): a preview link
 * `?preview=<token>` asks the site's API for the words the model wrote and shows them in the
 * golden demo's own structure — no build. The page waits for them unseen, so the demo's own
 * words never flash first, and a failed or invalid answer leaves the demo as it is.
 *
 * The API is factory-web's; here it is played by `page.route`.
 */

const TOKEN = "Pw7_previewToken-0001x";
const HEADLINE = "Annahomes finds your next flat";
const APP_NAME = "Anna Reality";
const API = "**/api/prototype-preview/**";

function customerTexts() {
  const en = structuredClone(config.content.en);
  en.landing!.headline = HEADLINE;
  return { appName: APP_NAME, content: { en } };
}

async function answer(page: Page, body: unknown, { status = 200, delayMs = 0 } = {}) {
  const asked: string[] = [];
  await page.route(API, async (route) => {
    asked.push(new URL(route.request().url()).pathname);
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
  return asked;
}

const headline = (page: Page) => page.locator("main h1").first();

test.describe("a customer's texts on the golden demo", () => {
  test.skip(config.patterns.landing?.tryIt !== true, "only the golden demo takes a customer's texts");

  test("a preview link shows the customer's words and name", async ({ page }) => {
    const asked = await answer(page, customerTexts());
    await page.goto(`./?preview=${TOKEN}`);
    await expect(page.locator("html")).toHaveAttribute("data-customer-texts", "ready");
    await expect(headline(page)).toHaveText(HEADLINE);
    await expect(page.locator("footer")).toContainText(APP_NAME);
    expect(asked).toEqual([`/api/prototype-preview/${TOKEN}`]);
  });

  test("the page waits for the words unseen, then shows them", async ({ page }) => {
    await answer(page, customerTexts(), { delayMs: 1_500 });
    await page.goto(`./?preview=${TOKEN}`);
    await expect(page.locator("html")).toHaveAttribute("data-customer-texts", "loading");
    await expect(page.locator("main")).toHaveCSS("visibility", "hidden");
    await expect(page.locator("html")).toHaveAttribute("data-customer-texts", "ready");
    await expect(page.locator("main")).toHaveCSS("visibility", "visible");
    await expect(headline(page)).toHaveText(HEADLINE);
  });

  test("without a preview link nothing is asked and the demo keeps its words", async ({ page }) => {
    const asked = await answer(page, customerTexts());
    await page.goto("./");
    await expect(headline(page)).toHaveText(config.content.en.landing!.headline!);
    await expect(page.locator("main")).toHaveCSS("visibility", "visible");
    expect(await page.locator("html").getAttribute("data-customer-texts")).toBeNull();
    expect(asked).toEqual([]);
  });

  test("a token that is not one is never sent", async ({ page }) => {
    const asked = await answer(page, customerTexts());
    await page.goto("./?preview=short");
    await expect(headline(page)).toHaveText(config.content.en.landing!.headline!);
    expect(asked).toEqual([]);
  });

  test("a failed answer leaves the demo as it is, visible", async ({ page }) => {
    await answer(page, { error: "not found" }, { status: 404 });
    await page.goto(`./?preview=${TOKEN}`);
    await expect(page.locator("html")).toHaveAttribute("data-customer-texts", "failed");
    await expect(page.locator("main")).toHaveCSS("visibility", "visible");
    await expect(headline(page)).toHaveText(config.content.en.landing!.headline!);
  });

  test("words that may not be shown leave the demo as it is", async ({ page }) => {
    const invalid = customerTexts();
    invalid.content.en.landing!.headline = "   ";
    await answer(page, invalid);
    await page.goto(`./?preview=${TOKEN}`);
    await expect(page.locator("html")).toHaveAttribute("data-customer-texts", "failed");
    await expect(page.locator("main")).toHaveCSS("visibility", "visible");
    await expect(headline(page)).toHaveText(config.content.en.landing!.headline!);
    await expect(page.locator("footer")).toContainText(config.appName);
  });
});
