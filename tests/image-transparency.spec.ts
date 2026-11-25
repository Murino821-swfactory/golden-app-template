import { test, expect, type Page } from "@playwright/test";
import {
  DEFAULT_IMAGE_TRANSPARENCY,
  IMAGE_TRANSPARENCY_STEPS,
  nextImageTransparency,
  type ImageTransparency,
} from "@tokenwise/shared-ui/theming";
import { heroFilm } from "../lib/hero-film";
import { config, landingPresentation } from "../lib/prototype-config";
import { uiCopy, formatLabel, labelPrefix } from "./ui-copy";

/**
 * The transparency of the hero's picture (founder, 2026-11-25: "a new button in the header's
 * menu that sets the picture's transparency from 0 to 100 % in tens"). One button in the header,
 * beside the colour, the font, dark/light and the action's look: each click makes the picture
 * ten per cent more transparent, after 100 % it is back at 0 %. The step survives a reload
 * without a flash. 0 % is the picture as the page draws it; at 100 % none of it is left and the
 * words stand on the page's own ground.
 */

const START = DEFAULT_IMAGE_TRANSPARENCY;
const sections: readonly string[] = config.patterns.landing?.sections ?? [];
/** A page whose hero opens on a picture: a film or, after "Change image", a still scene. */
const PICTURE =
  landingPresentation(config) === "editorial" && sections.includes("hero") && heroFilm(config.patterns.landing?.film) !== undefined;

function control(page: Page) {
  return page
    .getByRole("banner")
    .getByRole("button", { name: labelPrefix(uiCopy.common.changeImageTransparencyLabel!.split("{value}")[0]!) });
}

function labelFor(step: ImageTransparency): string {
  return formatLabel(uiCopy.common.changeImageTransparencyLabel!, {
    value: step,
    position: IMAGE_TRANSPARENCY_STEPS.indexOf(step) + 1,
    total: IMAGE_TRANSPARENCY_STEPS.length,
  });
}

/** Put the page on `step` the way a returning visitor's browser does. */
async function openOn(page: Page, step: ImageTransparency, path = "./") {
  await page.addInitScript((value) => localStorage.setItem("imageTransparency", value), step);
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-image-transparency", step);
}

test.describe("the picture's transparency — the header", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a first visit shows the picture as the page draws it: 0 %", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-image-transparency", START);
    expect(START).toBe("0");
  });

  test("is one button in the header, not a slider", async ({ page }) => {
    await page.goto("./");
    await expect(control(page)).toHaveCount(1);
    await expect(control(page)).toBeVisible();
    const box = (await control(page).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  test("it stands after the action's look, with the things a visitor restyles", async ({ page }) => {
    await page.goto("./");
    const order = await page
      .getByRole("banner")
      .locator("[data-shared-control]")
      .evaluateAll((els) => els.filter((el) => (el as HTMLElement).offsetParent !== null).map((el) => el.getAttribute("data-shared-control")));
    expect(order.indexOf("image")).toBe(order.indexOf("button") + 1);
    // The first three stay as they were: colour, font, dark/light.
    expect(order.slice(0, 3)).toEqual(["palette", "font", "appearance"]);
  });

  // On the sign-in page, like the other walks: the cycle is the header's.
  test("one click adds ten per cent, and after 100 % it is back at 0 %", async ({ page }) => {
    await page.goto("login");
    let expected: ImageTransparency = START;
    for (let i = 0; i < IMAGE_TRANSPARENCY_STEPS.length; i++) {
      await control(page).click();
      expected = nextImageTransparency(expected);
      await expect(page.locator("html")).toHaveAttribute("data-image-transparency", expected);
    }
    expect(expected).toBe(START);
  });

  test("its accessible name says the step on screen and where it sits", async ({ page }) => {
    await page.goto("./");
    await expect(control(page)).toHaveAttribute("aria-label", labelFor(START));
    expect(labelFor(START)).toContain("0 %");
    await control(page).click();
    await expect(control(page)).toHaveAttribute("aria-label", labelFor("10"));
    expect(labelFor("10")).toContain("10 %");
  });

  test("the icon fades with the picture: full at 0 %, an empty frame at 100 %", async ({ page }) => {
    for (const [step, ink] of [["0", "1"], ["30", "0.7"], ["100", "0"]] as const) {
      await openOn(page, step);
      await expect(control(page).locator("[data-image-ink]")).toHaveCSS("opacity", ink);
    }
  });

  test("the choice survives a reload and is in place before the header is parsed", async ({ page }) => {
    await page.goto("./");
    await control(page).click();
    await control(page).click();
    await expect(page.locator("html")).toHaveAttribute("data-image-transparency", "20");

    // Records the attribute at the moment the parser inserts the <header>, before React runs:
    // a value there proves the picture never flashes at 0 % first.
    await page.addInitScript(() => {
      new MutationObserver((records, observer) => {
        for (const r of records) {
          for (const node of r.addedNodes) {
            if (node instanceof HTMLElement && node.tagName === "HEADER") {
              (window as unknown as { __imageAtHeader: string }).__imageAtHeader =
                document.documentElement.dataset.imageTransparency ?? "";
              observer.disconnect();
            }
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-image-transparency", "20");
    expect(await page.evaluate(() => (window as unknown as { __imageAtHeader: string }).__imageAtHeader)).toBe("20");
    await expect(control(page)).toHaveAttribute("aria-label", labelFor("20"));
  });

  test("an unknown stored step falls back to 0 %", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("imageTransparency", "55"));
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-image-transparency", START);
  });
});

test.describe("the picture's transparency — the hero's picture", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.skip(!PICTURE, "this config's hero opens on no picture");

  /** What lies over the picture: a layer of the page's own ground, and how much of it. */
  function wash(page: Page) {
    return page.locator(".editorial-film").evaluate((film) => {
      const layer = getComputedStyle(film, "::before");
      return { opacity: layer.opacity, ground: layer.backgroundColor, page: getComputedStyle(document.body).backgroundColor };
    });
  }

  test("each step lays that much of the page's own ground over the picture", async ({ page }) => {
    for (const [step, opacity] of [["0", "0"], ["10", "0.1"], ["50", "0.5"], ["100", "1"]] as const) {
      await openOn(page, step);
      const layer = await wash(page);
      expect(layer.opacity, step).toBe(opacity);
      expect(layer.ground, step).toBe(layer.page);
    }
  });

  test("a click on the header's button changes the picture on screen", async ({ page }) => {
    await page.goto("./");
    expect((await wash(page)).opacity).toBe("0");
    await control(page).click();
    await expect.poll(async () => (await wash(page)).opacity).toBe("0.1");
  });

  test("at 100 % the words and the action still stand, on the page's own ground", async ({ page }) => {
    await openOn(page, "100");
    await expect(page.locator('[data-section="hero"] h1')).toBeVisible();
    expect((await wash(page)).opacity).toBe("1");
  });
});

test.describe("the picture's transparency — at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("it lives in the menu, with the font and the look, and steps from there", async ({ page }) => {
    await page.goto("./");
    await expect(control(page)).toBeHidden();
    await page.getByRole("button", { name: uiCopy.common.openMenu! }).click();
    const dialog = page.getByRole("dialog", { name: uiCopy.common.menu! });
    const row = dialog.getByRole("button", { name: labelPrefix(uiCopy.common.changeImageTransparencyLabel!.split("{value}")[0]!) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(uiCopy.common.imageTransparency!);
    await expect(row).toContainText("0 %");
    await row.click();
    await expect(page.locator("html")).toHaveAttribute("data-image-transparency", "10");
    await expect(row).toContainText("10 %");
  });
});
