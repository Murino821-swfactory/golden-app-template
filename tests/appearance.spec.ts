import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  contrastRatio,
  nextAppearance,
  nextSchemeId,
  rolesFor,
  WCAG_AA_TEXT,
  type Appearance,
} from "@tokenwise/shared-ui/theming";
import { LOCALES, parsePrototypeConfig, config } from "../lib/prototype-config";
import { htmlAppearance } from "../lib/theme-appearance";
import { uiCopy, formatLabel, labelPrefix } from "./ui-copy";

/**
 * Dark or light is the VISITOR's choice (founder decision 2026-11-25: the dark-only rule is
 * dropped). The header carries a switch beside colour and font, every build ships both
 * variants of every palette, and the choice persists on the device like the palette and the
 * font do.
 *
 * `theme.appearance` in `prototype.config.json` stays, with a new meaning: it is what a
 * FIRST-TIME visitor sees (dark when the config names none) — exactly as `theme.colorScheme`
 * and `patterns.landing.font` are. Until 2026-11-25 it was a build-time project choice and a
 * build carried one variant (T-400, the light add-on).
 *
 * These tests fix the wire end to end: the config carries the first-visit appearance, the
 * shell turns it into the one class and the one attribute the page is themed by, and the
 * switch turns the whole page over and back.
 */

/** The smallest valid config — the appearance cases below edit `theme`. */
function baseConfig(): Record<string, unknown> {
  return {
    appName: "Trailhead",
    locales: ["en"],
    defaultLocale: "en",
    theme: { colorScheme: "chartreuse-pastel-deep-teal-green" },
    patterns: { landing: { sections: ["hero", "cta"] }, cta: { href: "/login" } },
    content: {
      en: {
        description: "Log the trails you walked.",
        landing: { headline: "Every trail you walk counts" },
        cta: { label: "Start logging" },
      },
    },
  };
}

test.describe("the appearance setting — what a first visit sees", () => {
  test("defaults to dark when the config names none", () => {
    const parsed = parsePrototypeConfig(baseConfig());
    expect(parsed.theme.appearance).toBe("dark");
  });

  test("a project may open in light", () => {
    const parsed = parsePrototypeConfig({
      ...baseConfig(),
      theme: { colorScheme: "chartreuse-pastel-deep-teal-green", appearance: "light" },
    });
    expect(parsed.theme.appearance).toBe("light");
  });

  test("an appearance that is neither dark nor light is rejected", () => {
    expect(() =>
      parsePrototypeConfig({
        ...baseConfig(),
        theme: { colorScheme: "chartreuse-pastel-deep-teal-green", appearance: "sepia" },
      })
    ).toThrow(/theme\.appearance/);
  });

  test("the shipped config opens dark", () => {
    expect(config.theme.appearance).toBe("dark");
  });
});

test.describe("the shell turns the setting into the document's theming", () => {
  test("dark keeps the `.dark` class and adds no attribute", () => {
    const a = htmlAppearance("dark");
    expect(a.darkClass).toBe(true);
    expect(a.dataAppearance).toBeUndefined();
  });

  test("light drops `.dark` so :root's light base shows, and marks the document for the light rules", () => {
    const a = htmlAppearance("light");
    expect(a.darkClass).toBe(false);
    expect(a.dataAppearance).toBe("light");
  });
});

const START: Appearance = config.theme.appearance;
const OTHER: Appearance = nextAppearance(START);
const SCHEME = config.theme.colorScheme;

function appearanceName(appearance: Appearance): string {
  return appearance === "dark" ? uiCopy.common.appearanceDark! : uiCopy.common.appearanceLight!;
}

function labelFor(appearance: Appearance): string {
  return formatLabel(uiCopy.common.changeAppearanceLabel!, { name: appearanceName(appearance) });
}

const SWITCH_NAME = labelPrefix(uiCopy.common.changeAppearanceLabel?.split("{name}")[0] ?? "\u0000");

function appearanceButton(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: SWITCH_NAME });
}

function read(page: Page, name: string): Promise<string> {
  return page.evaluate(
    (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim().toLowerCase(),
    name
  );
}

/** The document is themed `appearance`: the class, the mark, and the palette's own tokens. */
async function expectAppearance(page: Page, appearance: Appearance, scheme = SCHEME) {
  const html = page.locator("html");
  if (appearance === "dark") {
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
    await expect(html).not.toHaveAttribute("data-appearance", "light");
  } else {
    await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
    await expect(html).toHaveAttribute("data-appearance", "light");
  }
  const roles = rolesFor(scheme, appearance);
  expect(await read(page, "--background")).toBe(roles.background.toLowerCase());
  expect(await read(page, "--foreground")).toBe(roles.foreground.toLowerCase());
  expect(await read(page, "--card")).toBe(roles.surface.toLowerCase());
}

test.describe("the visitor's switch", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("is one button in the bar, beside colour and font", async ({ page }) => {
    await page.goto("./");
    await expect(appearanceButton(page)).toHaveCount(1);
    await expect(appearanceButton(page)).toBeVisible();
    // Font, then appearance: the three things a visitor restyles sit together.
    const order = await page
      .getByRole("banner")
      .locator("[data-shared-control]:visible")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-shared-control")));
    expect(order.slice(0, 3)).toEqual(["palette", "font", "appearance"]);
  });

  test("a first visit opens in the project's appearance", async ({ page }) => {
    await page.goto("./");
    await expectAppearance(page, START);
  });

  test("a click turns the whole page over, a second click turns it back", async ({ page }) => {
    await page.goto("./");
    await appearanceButton(page).click();
    await expectAppearance(page, OTHER);
    // Whichever side is up, the page is lighter or darker than its own words, and they read.
    const light = rolesFor(SCHEME, "light");
    expect(contrastRatio(light.foreground, light.background)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);

    await appearanceButton(page).click();
    await expectAppearance(page, START);
  });

  test("its accessible name says which appearance is on screen", async ({ page }) => {
    await page.goto("./");
    await expect(appearanceButton(page)).toHaveAttribute("aria-label", labelFor(START));
    await appearanceButton(page).click();
    await expect(appearanceButton(page)).toHaveAttribute("aria-label", labelFor(OTHER));
  });

  test("Change colour keeps working on the other side: the next palette arrives in the same appearance", async ({ page }) => {
    await page.goto("./");
    await appearanceButton(page).click();
    await page
      .getByRole("banner")
      .getByRole("button", { name: labelPrefix(uiCopy.common.changeColour!) })
      .click();
    const next = nextSchemeId(SCHEME);
    await expect(page.locator("html")).toHaveAttribute("data-scheme", next);
    await expectAppearance(page, OTHER, next);
  });

  test("the choice survives a reload and is in place before the header is parsed", async ({ page }) => {
    await page.goto("./");
    await appearanceButton(page).click();
    await expectAppearance(page, OTHER);

    // Records the document's theming at the moment the parser inserts the <header> — before
    // React has run at all. The chosen side there proves the other one never flashes.
    await page.addInitScript(() => {
      new MutationObserver((records, observer) => {
        for (const r of records) {
          for (const node of r.addedNodes) {
            if (node instanceof HTMLElement && node.tagName === "HEADER") {
              const html = document.documentElement;
              (window as unknown as { __appearanceAtHeader: string }).__appearanceAtHeader =
                `${html.dataset.appearance ?? ""}|${html.classList.contains("dark")}`;
              observer.disconnect();
            }
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();

    await expectAppearance(page, OTHER);
    expect(
      await page.evaluate(
        () => (window as unknown as { __appearanceAtHeader: string }).__appearanceAtHeader
      )
    ).toBe(`${OTHER}|${OTHER === "dark"}`);
    await expect(appearanceButton(page)).toHaveAttribute("aria-label", labelFor(OTHER));
  });

  test("an unknown stored appearance falls back to the project's", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("appearance", "sepia"));
    await page.goto("./");
    await expectAppearance(page, START);
    await expect(appearanceButton(page)).toHaveAttribute("aria-label", labelFor(START));
  });

  test("the sign-in page carries the switch too, and keeps the visitor's side", async ({ page }) => {
    test.skip(!config.patterns.authGoogle, "authGoogle not enabled in this config");
    await page.goto("./");
    await appearanceButton(page).click();
    await page.goto("./login");
    await expect(appearanceButton(page)).toBeVisible();
    await expectAppearance(page, OTHER);
  });
});

test.describe("a hero film on the light side", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  // The film lies under a veil of the page's ground. On the light side that ground is light
  // over footage shot at dusk, and the muted ink — measured against a card, not a picture —
  // no longer stands out, so the hero's second line takes the page's full ink there
  // (`stage.css`, keyed by the document's light mark).
  test("the hero's second line is muted on dark and in the page's full ink on light", async ({ page }) => {
    test.skip(!config.patterns.landing?.film, "this config names no hero film");
    const rgb = (hex: string) => {
      const n = parseInt(hex.replace("#", ""), 16);
      return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
    };
    const inkOn = (appearance: Appearance) => {
      const roles = rolesFor(SCHEME, appearance);
      return rgb(appearance === "light" ? roles.foreground : roles.muted);
    };
    await page.goto("./");
    const line = page.locator('[data-section="hero"] .editorial-hero-copy > p').first();
    await expect(line).toHaveCSS("color", inkOn(START));
    await appearanceButton(page).click();
    await expect(line).toHaveCSS("color", inkOn(OTHER));
  });
});

test.describe("the switch at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // Measured 2026-11-25: the logo needs 122px and four 44px controls leave it 128px at 360px —
  // a fifth control in the bar would cut the logo on every phone. So the switch sits where the
  // font does: in the menu, spelled out.
  test("it lives in the menu with the font, spelled out, and works from there", async ({ page }) => {
    await page.goto("./");
    await expect(appearanceButton(page)).toBeHidden();

    await page.getByRole("button", { name: uiCopy.common.openMenu! }).click();
    const dialog = page.getByRole("dialog", { name: uiCopy.common.menu! });
    const row = dialog.getByRole("button", { name: SWITCH_NAME });
    await expect(row).toBeVisible();
    await expect(row).toContainText(uiCopy.common.appearance!);
    await expect(row).toContainText(appearanceName(START));

    await row.click();
    await expectAppearance(page, OTHER);
    // The menu stays open and names the new side: the visitor sees what the tap did.
    await expect(row).toContainText(appearanceName(OTHER));
    const box = await row.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test("in every language the switch has a name, and a word for each appearance", () => {
  for (const id of LOCALES) {
    const common = JSON.parse(
      readFileSync(resolve(__dirname, `../messages/${id}.json`), "utf-8")
    ).common as Record<string, string>;
    for (const key of ["appearance", "changeAppearanceLabel", "appearanceDark", "appearanceLight"]) {
      expect(common[key], `${id} lacks common.${key}`).toBeTruthy();
    }
    expect(common.changeAppearanceLabel, `${id} lacks {name}`).toContain("{name}");
    expect(common.appearanceDark).not.toBe(common.appearanceLight);
  }
});
