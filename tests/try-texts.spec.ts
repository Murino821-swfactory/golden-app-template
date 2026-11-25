import { test, expect, type Page } from "@playwright/test";
import { config, landingPresentation } from "../lib/prototype-config";
import { uiCopy } from "./ui-copy";

/**
 * "Change texts" opens the whole page (founder, 2026-11-24: the button "must give the possibility
 * to edit any text that is shown on the whole landing page"). Until then it opened the headline
 * and the subheadline (hero) and the heading and the cards (features); every other line — the
 * eyebrow, the actions, the product frame, use cases, comparison, steps, questions and their
 * answers, offers, the form's labels, the closing band, the footer — stayed as configured.
 *
 * The rule is read off the page, not off a list of sections: every run of words the page shows,
 * outside the page's own controls, sits in a line the visitor can type into. A section added
 * later is covered the day it renders. As before, all of it stays in the visitor's browser.
 */

const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const editorial = landingPresentation(config) === "editorial";
const TRY = config.patterns.landing?.tryIt === true;
const EDITABLE = "[contenteditable='plaintext-only']";
const TEXTS = "[data-hero-try] button[data-try='texts']";

/** The words the page shows that the visitor cannot type into. The test's own reading of "any
 * text on the page": every rendered run of words outside the controls — the try-it keys (the two
 * bars and each feature card's own picture key) and the dock, the header's tools, dialogs, form
 * fields, the map. */
function outOfReach(page: Page): Promise<string[]> {
  return page.evaluate((editable) => {
    const CONTROLS =
      "[data-try-bar], [data-try-key], [data-try-dock], [data-shared-control], header button, [role='dialog'], [data-pattern='map-base'], input, textarea, select, script, style, noscript, svg, .sr-only";
    const missed: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      const words = node.nodeValue?.trim();
      if (!parent || !words) continue;
      if (parent.closest(CONTROLS) || parent.getClientRects().length === 0) continue;
      if (!parent.closest(editable)) missed.push(words);
    }
    return missed;
  }, EDITABLE);
}

async function retype(page: Page, words: string) {
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(words);
}

test.describe("\"Change texts\" — every text on the page", () => {
  test.skip(!editorial || !sections.includes("hero"), "no editorial hero in this config");

  test("a customer's page has no editable line and no dock", async ({ page }) => {
    test.skip(TRY, "this config turns the try-it buttons on");
    await page.goto("./");
    await expect(page.locator("[contenteditable]")).toHaveCount(0);
    await expect(page.locator("[data-try-dock]")).toHaveCount(0);
  });

  test("one press opens every text the page shows, in every section and in the footer", async ({ page }) => {
    test.skip(!TRY, "no try-it buttons in this config");
    await page.goto("./");
    // The reading itself is sound: before the press the page is full of words nobody can type into.
    expect((await outOfReach(page)).length).toBeGreaterThan(10);
    await page.locator(TEXTS).click();
    await expect.poll(() => outOfReach(page)).toEqual([]);
    for (const id of sections) {
      await expect(page.locator(`[data-section="${id}"] ${EDITABLE}`), id).not.toHaveCount(0);
    }
    await expect(page.locator(`footer ${EDITABLE}`)).not.toHaveCount(0);
    // A closed answer is a text of the page too: the questions open while the visitor edits.
    if (sections.includes("faq")) {
      const answer = page.locator('[data-section="faq"] details p').first();
      await expect(answer).toBeVisible();
      await expect(answer).toHaveAttribute("contenteditable", "plaintext-only");
    }
    // The page's own controls stay controls: the keys that started this, and the header's tools.
    await expect(page.locator(`[data-try-bar] ${EDITABLE}`)).toHaveCount(0);
    await expect(page.locator(`[data-shared-control] ${EDITABLE}, [data-shared-control]${EDITABLE}`)).toHaveCount(0);
    // So does each feature card's own "Change image" key: a try-it key, not a text of the page.
    if (sections.includes("features")) {
      const keys = page.locator('[data-section="features"] [data-bento] button[data-try="image"]');
      await expect(keys).not.toHaveCount(0);
      await expect(page.locator(`[data-bento] button[data-try="image"]${EDITABLE}, [data-bento] button[data-try="image"] ${EDITABLE}`)).toHaveCount(0);
    }
  });

  test("both buttons show the one state, and the dock is the way out once the keys are out of sight", async ({ page }) => {
    test.skip(!TRY, "no try-it buttons in this config");
    await page.goto("./");
    const dock = page.locator("[data-try-dock]");
    const hero = page.locator(TEXTS);
    await expect(dock).toHaveCount(0);
    await hero.click();
    await expect(hero).toHaveAttribute("aria-pressed", "true");
    if (sections.includes("features")) {
      await expect(page.locator('[data-section="features"] button[data-try="texts"]')).toHaveAttribute("aria-pressed", "true");
    }
    // Beside the key that was just pressed the dock would only say the same twice.
    await expect(hero).toBeInViewport();
    await expect(dock).toHaveCount(0);
    // Far from the keys, at the foot of the page, it is the way out — and it hides no line: the
    // last text of the page scrolls clear of it.
    const last = page.locator(`footer ${EDITABLE}`).last();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(dock).toBeInViewport();
    await expect(dock).toContainText(uiCopy.landing!.tryTextsDock!);
    const line = (await last.boundingBox())!;
    expect(line.y + line.height).toBeLessThanOrEqual((await dock.boundingBox())!.y);
    const done = dock.getByRole("button", { name: uiCopy.landing!.tryTextsDone! });
    expect((await done.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await done.click();
    await expect(dock).toHaveCount(0);
    await expect(hero).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[contenteditable]")).toHaveCount(0);
  });

  test("a link and a button are words while the visitor types, and act again after Done", async ({ page }) => {
    test.skip(!TRY, "no try-it buttons in this config");
    const api: string[] = [];
    const errors: string[] = [];
    page.on("request", (req) => {
      if (new URL(req.url()).pathname.includes("/api/")) api.push(req.url());
    });
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto("./");
    const landing = page.url();
    await page.locator(TEXTS).click();

    // The hero's action is a link: a click puts the caret in it and goes nowhere.
    const action = page.locator('[data-section="hero"] .editorial-hero-copy a');
    if ((await action.count()) > 0) {
      await action.click();
      await retype(page, "Book a table");
      await expect(action).toHaveText("Book a table");
      await expect(action.locator("svg")).toHaveCount(1);
    }
    // So is a link of the footer.
    const link = page.locator("footer nav a").first();
    await link.click();
    await retype(page, "Our menu");
    await expect(link).toHaveText("Our menu");
    expect(page.url()).toBe(landing);

    // A filter of the offers is a button: it does not filter, and a space is a space.
    const filters = page.locator('[data-section="listings"] button[aria-pressed]');
    const cards = page.locator('[data-section="listings"] [data-listing]');
    const filtering = sections.includes("listings") && (await filters.count()) > 1;
    const before = filtering ? await cards.count() : 0;
    if (filtering) {
      await filters.nth(1).click();
      await retype(page, "Flats to rent");
      await expect(filters.nth(1)).toHaveText("Flats to rent");
      await expect(filters.nth(1)).toHaveAttribute("aria-pressed", "false");
      await expect(cards).toHaveCount(before);
    }
    // A closed answer, opened for the editing.
    const answer = page.locator('[data-section="faq"] details p').first();
    if (sections.includes("faq")) {
      await answer.click();
      await retype(page, "We bake at five every morning.");
      // Enter ends the line, as in the headline.
      await page.keyboard.press("Enter");
      await expect(answer).not.toBeFocused();
    }

    await page.locator("[data-try-dock] button").click();
    await expect(page.locator("[contenteditable]")).toHaveCount(0);
    // What the visitor wrote stays; the page is a page again.
    await expect(link).toHaveText("Our menu");
    if ((await action.count()) > 0) await expect(action).toHaveText("Book a table");
    if (filtering) {
      await expect(filters.nth(1)).toHaveText("Flats to rent");
      await filters.nth(1).click();
      await expect(filters.nth(1)).toHaveAttribute("aria-pressed", "true");
      expect(await cards.count()).toBeLessThan(before);
    }
    if (sections.includes("faq")) {
      const first = page.locator('[data-section="faq"] details').first();
      // The questions the editing opened are closed again, with the visitor's answer inside.
      await expect(first).not.toHaveAttribute("open", /.*/);
      await first.locator("summary").click();
      await expect(answer).toHaveText("We bake at five every morning.");
    }
    expect(page.url()).toBe(landing);
    expect(api).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("an emptied line gets its words back, an icon stays where it stood, and the page keeps its own nodes", async ({ page }) => {
    test.skip(!TRY, "no try-it buttons in this config");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    // The map's tiles come from a CDN; this test only needs its button.
    await page.route(/basemaps\.cartocdn\.com/, (route) => route.abort());
    await page.goto("./");
    await page.locator(TEXTS).click();

    // Emptied and left: the configured words come back, so the line can be found again.
    const closing = page.locator('[data-section="cta"] h2');
    if (sections.includes("cta")) {
      const configured = await closing.innerText();
      await closing.click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.press("Backspace");
      await expect(closing).toHaveText("");
      await page.keyboard.press("Enter");
      await expect(closing).toHaveText(configured);
    }

    // A line with an icon: emptied and retyped, the icon is still there, before the words.
    const map = page.locator('[data-section="listings"] button[aria-expanded]');
    const mapped = sections.includes("listings") && (await map.count()) > 0;
    if (mapped) {
      await map.click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.press("Backspace");
      await page.keyboard.type("Where is it");
      await page.keyboard.press("Enter");
      await expect(map).toHaveText("Where is it");
      await expect(map).toHaveAttribute("aria-expanded", "false");
      expect(await map.evaluate((el) => el.firstElementChild?.tagName.toLowerCase() === "svg" && el.firstChild === el.firstElementChild)).toBe(true);
    }

    await page.locator("[data-try-dock] button").click();
    if (mapped) {
      // The button acts again, and its new label is written by the page into its own node:
      // the typing left no second copy of the words beside it.
      await map.click();
      await expect(map).toHaveAttribute("aria-expanded", "true");
      await expect(map).toHaveText(uiCopy.listings!.hideMap!);
      await expect(map.locator("svg")).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });
});
