import { test, expect, type Page } from "@playwright/test";
import { COLOR_SCHEME_IDS, PALETTES, type ColorSchemeId } from "@tokenwise/shared-ui/theming";
import { config } from "../lib/prototype-config";
import { formatLabel, uiCopy } from "./ui-copy";

/**
 * The golden demo's tour of looks (founder, 2026-11-26: "as the visitor scrolls down the golden
 * demo, every new section changes to a random combination of colour, transparency, font, CTA and
 * dark & light mode; the language stays").
 *
 * When a section arrives from below — its top rises past the middle of the window — while the
 * visitor scrolls by hand, the page puts on another look: another palette, face, look of the
 * action and step of the picture's transparency, and the other side. It is shown, not kept: no
 * storage, a reload opens on the page's own look, and tokenwise.sk (the same origin) never
 * inherits it. Scrolling up, or a jump that is not a scroll by hand, changes nothing; the
 * visitor's own pick ends the tour; under reduced motion there is none. Only the golden demo
 * (`patterns.landing.tryIt`) tours its looks — a customer's prototype never does.
 */

const TRY = config.patterns.landing?.tryIt === true;
const SECTIONS: readonly string[] = config.patterns.landing?.sections ?? [];
const KEYS = ["scheme", "font", "appearance", "button", "imageTransparency"] as const;
type Look = Record<(typeof KEYS)[number], string>;
/** Hydration under a full parallel run can take longer than an assertion's default 5 s. */
const HYDRATED = { timeout: 15_000 };

/** The look on screen, read off `<html>` (dark is the page without the light mark). */
function lookOnScreen(page: Page): Promise<Look> {
  return page.evaluate(() => {
    const d = document.documentElement.dataset;
    return {
      scheme: d.scheme ?? "",
      font: d.font ?? "",
      appearance: d.appearance === "light" ? "light" : "dark",
      button: d.button ?? "",
      imageTransparency: d.imageTransparency ?? "",
    };
  });
}

/** Scroll by hand — the wheel, over the page's margin — until section `id`'s top stands at a
 * third of the window. */
async function wheelTo(page: Page, id: string) {
  const { height } = page.viewportSize()!;
  const top = await page.locator(`[data-section="${id}"]`).evaluate((el) => el.getBoundingClientRect().top);
  await page.mouse.move(4, height / 2);
  await page.mouse.wheel(0, top - height / 3);
}

/** Wait until the page has stopped scrolling and the observers have had their frames. */
async function settle(page: Page) {
  let last = Number.NaN;
  await expect
    .poll(
      async () => {
        const y = await page.evaluate(() => window.scrollY);
        const still = y === last;
        last = y;
        return still;
      },
      { intervals: [150] }
    )
    .toBe(true);
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 50))))
  );
}

async function changedFrom(page: Page, before: Look): Promise<Look> {
  await expect.poll(async () => (await lookOnScreen(page)).scheme, { timeout: 10_000 }).not.toBe(before.scheme);
  return lookOnScreen(page);
}

function paletteLabel(id: string): string {
  return formatLabel(uiCopy.common.changeColourLabel!, {
    name: PALETTES[id as ColorSchemeId].name,
    position: COLOR_SCHEME_IDS.indexOf(id as ColorSchemeId) + 1,
    total: COLOR_SCHEME_IDS.length,
  });
}

test.describe("the tour of looks — the golden demo", () => {
  test.skip(!TRY, "only the golden demo (tryIt) tours its looks");

  test.beforeEach(async ({ page }) => {
    await page.goto("./");
    // The tour says it is listening once the page has hydrated.
    await expect(page.locator("html")).toHaveAttribute("data-look-tour", "", HYDRATED);
  });

  test("each new section scrolled into by hand shows another look — all five change, the language stays", async ({ page }) => {
    const html = page.locator("html");
    const lang = await html.getAttribute("lang");
    const path = new URL(page.url()).pathname;
    let before = await lookOnScreen(page);
    for (const id of SECTIONS.slice(1, 4)) {
      await wheelTo(page, id);
      const now = await changedFrom(page, before);
      for (const key of KEYS) expect(now[key], `${id}: ${key}`).not.toBe(before[key]);
      before = now;
    }
    await expect(html).toHaveAttribute("lang", lang!);
    expect(new URL(page.url()).pathname).toBe(path);
  });

  test("the look is shown, not kept: the header follows it, storage stays empty, a reload opens on the page's own", async ({ page }) => {
    const own = await lookOnScreen(page);
    await wheelTo(page, SECTIONS[1]!);
    const shown = await changedFrom(page, own);
    const banner = page.getByRole("banner");
    await expect(banner.locator('[data-shared-control="palette"]')).toHaveAttribute("aria-label", paletteLabel(shown.scheme));
    await expect(banner.locator("[data-image-icon]").first()).toHaveAttribute("data-image-icon", shown.imageTransparency);
    const stored = await page.evaluate((keys) => keys.map((key) => localStorage.getItem(key)), [...KEYS]);
    expect(stored).toEqual(KEYS.map(() => null));
    await page.reload();
    expect(await lookOnScreen(page)).toEqual(own);
  });

  test("scrolling up, or a jump that is not a scroll by hand, leaves the look alone", async ({ page }) => {
    const own = await lookOnScreen(page);
    // A jump — a link to a section, a script — is not the visitor scrolling.
    await page.locator(`[data-section="${SECTIONS[2]}"]`).evaluate((el) => el.scrollIntoView());
    await settle(page);
    expect(await lookOnScreen(page)).toEqual(own);
    // Down into the next section by hand: another look.
    await wheelTo(page, SECTIONS[3]!);
    const shown = await changedFrom(page, own);
    // Back up by hand, past two sections: the look stays.
    await page.mouse.wheel(0, -2 * page.viewportSize()!.height);
    await settle(page);
    expect(await lookOnScreen(page)).toEqual(shown);
  });

  test("the visitor's own pick ends the tour and is kept", async ({ page }) => {
    const html = page.locator("html");
    const own = await lookOnScreen(page);
    await wheelTo(page, SECTIONS[1]!);
    const shown = await changedFrom(page, own);
    await page.getByRole("banner").locator('[data-shared-control="palette"]').click();
    await expect(html).not.toHaveAttribute("data-look-tour", "");
    const picked = await lookOnScreen(page);
    expect(picked.scheme).not.toBe(shown.scheme);
    expect(await page.evaluate(() => localStorage.getItem("scheme"))).toBe(picked.scheme);
    await wheelTo(page, SECTIONS[2]!);
    await settle(page);
    expect(await lookOnScreen(page)).toEqual(picked);
  });
});

test("under reduced motion the golden demo keeps its look while scrolling", async ({ page }) => {
  test.skip(!TRY, "only the golden demo (tryIt) tours its looks");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  // Hydrated: the header's press hold is installed whatever the motion preference.
  await expect(page.locator("html")).toHaveAttribute("data-shared-press", "", HYDRATED);
  const own = await lookOnScreen(page);
  await wheelTo(page, SECTIONS[1]!);
  await settle(page);
  expect(await lookOnScreen(page)).toEqual(own);
  await expect(page.locator("html")).not.toHaveAttribute("data-look-tour", "");
});

test("a customer's prototype has no tour: scrolling by hand never changes its look", async ({ page }) => {
  test.skip(TRY, "the golden demo tours its looks");
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-shared-press", "", HYDRATED);
  const own = await lookOnScreen(page);
  await page.mouse.move(4, page.viewportSize()!.height / 2);
  await page.mouse.wheel(0, 2 * page.viewportSize()!.height);
  await settle(page);
  expect(await lookOnScreen(page)).toEqual(own);
  await expect(page.locator("html")).not.toHaveAttribute("data-look-tour", "");
});
