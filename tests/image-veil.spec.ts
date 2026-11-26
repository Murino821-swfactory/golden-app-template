import { test, expect, type Page } from "@playwright/test";
import { heroFilm } from "../lib/hero-film";
import { config, landingPresentation } from "../lib/prototype-config";
import { uiCopy, formatLabel, labelPrefix } from "./ui-copy";

/**
 * The veil over the hero's picture, on or off (founder, 2026-11-26: "a configuration that turns
 * the layer used today on and off; it does not touch the transparency"). The veil is the layer of
 * the page's own ground that keeps the words readable over a film or a still scene
 * (`.editorial-film::after`). One button in the header switches it; a first visit has it on, as
 * the page has always been drawn; off, the picture shows in its own colours down to the short
 * strip where it runs into the page. The transparency's button (0 to 100 % in tens) is a second,
 * separate layer: neither control moves the other.
 */

type Veil = "on" | "off";

const sections: readonly string[] = config.patterns.landing?.sections ?? [];
/** A page whose hero opens on a picture: a film or, after "Change image", a still scene. */
const PICTURE =
  landingPresentation(config) === "editorial" && sections.includes("hero") && heroFilm(config.patterns.landing?.film) !== null;

/** Where the fade into the page starts when the veil is off — the AI hero image's strip. */
const FADE_START = 80;

function control(page: Page) {
  return page.getByRole("banner").locator('[data-shared-control="veil"]');
}

function transparency(page: Page) {
  return page.getByRole("banner").locator('[data-shared-control="image"]');
}

function stateName(state: Veil): string {
  return state === "on" ? uiCopy.common.imageVeilOn! : uiCopy.common.imageVeilOff!;
}

function labelFor(state: Veil): string {
  return formatLabel(uiCopy.common.changeImageVeilLabel!, { name: stateName(state) });
}

/** Put the page in the state a returning visitor's browser stored. */
async function openWith(page: Page, stored: Record<string, string>, path = "./") {
  await page.addInitScript((values) => {
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, stored);
  await page.goto(path);
}

/** The veil over the picture as its colour stops: [position in %, opacity of the page's ground]. */
function veilStops(page: Page): Promise<[number, number][]> {
  return page.locator(".editorial-film").evaluate((film) => {
    const image = getComputedStyle(film, "::after").backgroundImage;
    const stops: [number, number][] = [];
    for (const match of image.matchAll(/((?:rgba?|oklab|oklch|lab|lch|color)\([^)]*\))\s+([\d.]+)%/g)) {
      const colour = match[1]!;
      const slash = colour.match(/\/\s*([\d.]+)\s*\)$/);
      const alpha = slash ? Number(slash[1]) : colour.startsWith("rgba(") ? Number(colour.slice(5, -1).split(",")[3]) : 1;
      stops.push([Number(match[2]), alpha]);
    }
    return stops;
  });
}

/** The transparency's layer: how much of the page's ground lies over the picture. */
function wash(page: Page) {
  return page.locator(".editorial-film").evaluate((film) => getComputedStyle(film, "::before").opacity);
}

test.describe("the image veil — the header", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a first visit has the veil on, as the page has always drawn it", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-image-veil", "on");
  });

  test("is one button in the header, right after the transparency's", async ({ page }) => {
    await page.goto("./");
    await expect(control(page)).toHaveCount(1);
    await expect(control(page)).toBeVisible();
    const box = (await control(page).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    const order = await page
      .getByRole("banner")
      .locator("[data-shared-control]")
      .evaluateAll((els) => els.filter((el) => (el as HTMLElement).offsetParent !== null).map((el) => el.getAttribute("data-shared-control")));
    expect(order.indexOf("veil")).toBe(order.indexOf("image") + 1);
    expect(order.slice(0, 3)).toEqual(["palette", "font", "appearance"]);
  });

  test("one click turns it off, the next on again, and its name says the state on screen", async ({ page }) => {
    await page.goto("./");
    await expect(control(page)).toHaveAttribute("aria-label", labelFor("on"));
    await control(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-image-veil", "off");
    await expect(control(page)).toHaveAttribute("aria-label", labelFor("off"));
    await control(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-image-veil", "on");
    await expect(control(page)).toHaveAttribute("aria-label", labelFor("on"));
  });

  test("the choice survives a reload and is in place before the header is parsed", async ({ page }) => {
    await page.goto("./");
    await control(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-image-veil", "off");

    // Records the attribute at the moment the parser inserts the <header>, before React runs:
    // a value there proves the veil never flashes on first.
    await page.addInitScript(() => {
      new MutationObserver((records, observer) => {
        for (const r of records) {
          for (const node of r.addedNodes) {
            if (node instanceof HTMLElement && node.tagName === "HEADER") {
              (window as unknown as { __veilAtHeader: string }).__veilAtHeader = document.documentElement.dataset.imageVeil ?? "";
              observer.disconnect();
            }
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-image-veil", "off");
    expect(await page.evaluate(() => (window as unknown as { __veilAtHeader: string }).__veilAtHeader)).toBe("off");
    await expect(control(page)).toHaveAttribute("aria-label", labelFor("off"));
  });

  test("an unknown stored state falls back to on", async ({ page }) => {
    await openWith(page, { imageVeil: "maybe" });
    await expect(page.locator("html")).toHaveAttribute("data-image-veil", "on");
  });

  test("neither control moves the other: the veil and the transparency are stored apart", async ({ page }) => {
    await page.goto("./");
    await transparency(page).click();
    await transparency(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-image-transparency", "20");
    await control(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-image-veil", "off");
    await expect(page.locator("html")).toHaveAttribute("data-image-transparency", "20");
    await transparency(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-image-transparency", "30");
    await expect(page.locator("html")).toHaveAttribute("data-image-veil", "off");
    expect(await page.evaluate(() => [localStorage.getItem("imageVeil"), localStorage.getItem("imageTransparency")])).toEqual(["off", "30"]);
  });
});

test.describe("the image veil — the hero's picture", () => {
  test.use({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  test.skip(!PICTURE, "this config's hero opens on no picture");

  test("on, the veil lies over the picture as it always has", async ({ page }) => {
    await page.goto("./");
    const stops = await veilStops(page);
    expect(stops.length).toBeGreaterThanOrEqual(3);
    // Densest behind the header and the headline: most of the page's ground at the top.
    expect(stops[0]![1]).toBeGreaterThan(0.5);
    expect(stops.filter(([at]) => at < FADE_START).every(([, alpha]) => alpha > 0)).toBe(true);
  });

  /** Off: no stop above the last strip carries any of the page's ground, and the strip still
   * runs into the page, so the hero does not end on a hard edge. */
  function expectClear(stops: [number, number][]) {
    const above = stops.filter(([at]) => at <= FADE_START);
    expect(above.length, JSON.stringify(stops)).toBeGreaterThan(0);
    expect(above.every(([, alpha]) => alpha === 0), JSON.stringify(stops)).toBe(true);
    expect(stops.at(-1), JSON.stringify(stops)).toEqual([100, 1]);
  }

  for (const appearance of ["dark", "light"] as const) {
    test(`off, nothing lies over the picture above the strip where it runs into the page (${appearance})`, async ({ page }) => {
      await openWith(page, { imageVeil: "off", appearance });
      expectClear(await veilStops(page));
    });
  }

  test("off, a still scene shows in its own colours too", async ({ page }) => {
    await openWith(page, { imageVeil: "off" });
    const hero = page.locator('[data-section="hero"]');
    await hero.locator("[data-hero-try] button[data-try='image']").click();
    await expect(hero.locator("[data-hero-film]")).toHaveAttribute("data-hero-kind", "still");
    expectClear(await veilStops(page));
  });

  test("the transparency lays the same share of the ground with the veil on or off", async ({ page }) => {
    for (const veil of ["on", "off"] as const) {
      for (const [step, opacity] of [["0", "0"], ["50", "0.5"], ["100", "1"]] as const) {
        await openWith(page, { imageVeil: veil, imageTransparency: step });
        await expect(page.locator("html")).toHaveAttribute("data-image-veil", veil);
        await expect(page.locator("html")).toHaveAttribute("data-image-transparency", step);
        expect(await wash(page), `${veil}, ${step} %`).toBe(opacity);
      }
    }
  });

  test("off at 0 %: no layer of the page's ground over the picture above its last strip", async ({ page }) => {
    await openWith(page, { imageVeil: "off", imageTransparency: "0" });
    expect(await wash(page)).toBe("0");
    expect((await veilStops(page)).filter(([at, alpha]) => at <= FADE_START && alpha > 0)).toEqual([]);
  });
});

test.describe("the image veil — at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("it lives in the menu, after the transparency, and toggles from there", async ({ page }) => {
    await page.goto("./");
    await expect(control(page)).toBeHidden();
    await page.getByRole("button", { name: uiCopy.common.openMenu! }).click();
    const dialog = page.getByRole("dialog", { name: uiCopy.common.menu! });
    const row = dialog.getByRole("button", { name: labelPrefix(uiCopy.common.changeImageVeilLabel!.split("{name}")[0]!) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(uiCopy.common.imageVeil!);
    await expect(row).toContainText(stateName("on"));
    const rows = await dialog.locator("[data-shared-control]").evaluateAll((els) => els.map((el) => el.getAttribute("data-shared-control")));
    expect(rows.indexOf("veil")).toBe(rows.indexOf("image") + 1);
    await row.click();
    await expect(page.locator("html")).toHaveAttribute("data-image-veil", "off");
    await expect(row).toContainText(stateName("off"));
  });
});
