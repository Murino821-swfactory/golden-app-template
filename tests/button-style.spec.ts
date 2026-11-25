import { test, expect, type Page } from "@playwright/test";
import {
  BUTTON_STYLE_IDS,
  COLOR_SCHEME_IDS,
  WCAG_AA_TEXT,
  buttonStyleById,
  nextButtonStyleId,
  type ButtonStyleId,
} from "@tokenwise/shared-ui/theming";
import { config, initialButtonStyle, parsePrototypeConfig } from "../lib/prototype-config";
import { landingActionHref } from "../lib/landing-action";
import { uiCopy, formatLabel, labelPrefix } from "./ui-copy";

/**
 * The look of the landing's action (founder, 2026-11-25: "the CTA button, the same way as the
 * font and the colour"). A visitor steps through the looks with one button in the header — as
 * they step through the palettes and the faces — the choice survives a reload without a flash,
 * and `prototype.config.json` still decides what a first visit sees. On the golden demo the
 * control pad carries the same step as a fourth key.
 */

const START = initialButtonStyle(config);
const POSITION = BUTTON_STYLE_IDS.indexOf(START) + 1;
const sections: readonly string[] = config.patterns.landing?.sections ?? [];
const ACTION = landingActionHref(config.patterns);
/** The sections that carry the page's action, when the page has one. */
const ACTION_SECTIONS = ACTION ? ["hero", "cta"].filter((id) => sections.includes(id)) : [];
const TRY = config.patterns.landing?.tryIt === true;

/** The smallest valid config — the cases below edit `theme` and the presentation. */
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

function withLanding(landing: Record<string, unknown>, theme: Record<string, unknown> = {}) {
  return parsePrototypeConfig({
    ...baseConfig(),
    theme: { colorScheme: "chartreuse-pastel-deep-teal-green", ...theme },
    patterns: { landing: { sections: ["hero", "cta"], ...landing }, cta: { href: "/login" } },
  });
}

function buttonControl(page: Page) {
  return page.getByRole("banner").getByRole("button", { name: labelPrefix(uiCopy.common.changeButtonLabel!.split("{name}")[0]!) });
}

function labelFor(id: ButtonStyleId): string {
  return formatLabel(uiCopy.common.changeButtonLabel!, {
    name: buttonStyleById(id).name,
    position: BUTTON_STYLE_IDS.indexOf(id) + 1,
    total: BUTTON_STYLE_IDS.length,
  });
}

/** The action is a shadcn button with `transition-all`: read it at rest, not mid-way. */
async function still(page: Page) {
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
}

test.describe("the action's look — the config", () => {
  test("a config names a look of the table, or none", () => {
    for (const id of BUTTON_STYLE_IDS) expect(withLanding({}, { button: id }).theme.button).toBe(id);
    expect(withLanding({}).theme.button).toBeUndefined();
    expect(() => withLanding({}, { button: "blob" })).toThrow(/theme\.button/);
    // An inherited JavaScript property is not a look.
    expect(() => withLanding({}, { button: "constructor" })).toThrow(/theme\.button/);
  });

  // The looks are named after what the pages already drew, so a config that names none — every
  // config before 2026-11-25 — opens exactly as it did: a pill on the editorial page, the
  // rounded button of the shared sections under story and document.
  test("a config that names none opens in the look its presentation always drew", () => {
    expect(initialButtonStyle(withLanding({}))).toBe("pill");
    expect(initialButtonStyle(withLanding({ presentation: "editorial" }))).toBe("pill");
    expect(initialButtonStyle(withLanding({ presentation: "story" }))).toBe("rounded");
    expect(initialButtonStyle(withLanding({ presentation: "document" }))).toBe("rounded");
  });

  test("a named look wins in every presentation", () => {
    for (const presentation of ["editorial", "story", "document"]) {
      expect(initialButtonStyle(withLanding({ presentation }, { button: "outline" }))).toBe("outline");
    }
  });
});

test.describe("the action's look — the page", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a first visit wears the configured look, and the landing's actions are marked", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-button", START);
    // One action per section that carries one — and nothing else on the page wears the look.
    for (const id of ACTION_SECTIONS) await expect(page.locator(`[data-section="${id}"] a[data-cta]`), id).toHaveCount(1);
    await expect(page.locator("[data-cta]")).toHaveCount(ACTION_SECTIONS.length);
  });

  test("is one button in the header, not a picker", async ({ page }) => {
    await page.goto("./");
    await expect(buttonControl(page)).toHaveCount(1);
    await expect(buttonControl(page)).toBeVisible();
    const box = (await buttonControl(page).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  // On the sign-in page, like the palette and the font walks: the cycle is the header's.
  test("one click steps to the next look, the whole cycle wraps", async ({ page }) => {
    await page.goto("login");
    let expected = START;
    for (let i = 0; i < BUTTON_STYLE_IDS.length; i++) {
      await buttonControl(page).click();
      expected = nextButtonStyleId(expected);
      await expect(page.locator("html")).toHaveAttribute("data-button", expected);
    }
    expect(expected).toBe(START);
  });

  test("its accessible name says which look is on screen and where it sits", async ({ page }) => {
    await page.goto("./");
    await expect(buttonControl(page)).toHaveAttribute("aria-label", labelFor(START));
    expect(labelFor(START)).toContain(`${POSITION}`);
    await buttonControl(page).click();
    await expect(buttonControl(page)).toHaveAttribute("aria-label", labelFor(nextButtonStyleId(START)));
  });

  test("every look draws the landing's action its own way", async ({ page }) => {
    test.skip(ACTION_SECTIONS.length === 0, "this landing has no action");
    await page.goto("./");
    await still(page);
    const action = page.locator("a[data-cta]").first();
    const drawn = new Map<ButtonStyleId, string>();
    let look = START;
    for (let i = 0; i < BUTTON_STYLE_IDS.length; i++) {
      await expect(page.locator("html")).toHaveAttribute("data-button", look);
      const style = await action.evaluate((el) => {
        const s = getComputedStyle(el);
        return { radius: parseFloat(s.borderTopLeftRadius), height: el.getBoundingClientRect().height, background: s.backgroundColor, edge: s.borderTopColor, ink: s.color };
      });
      if (look === "pill" || look === "outline") expect(style.radius, look).toBeGreaterThanOrEqual(style.height / 2);
      if (look === "rounded" || look === "soft") expect(style.radius, look).toBe(10);
      if (look === "square") expect(style.radius, look).toBe(0);
      drawn.set(look, `${style.radius >= style.height / 2 ? "full" : style.radius}|${style.background}|${style.edge}|${style.ink}`);
      await buttonControl(page).click();
      look = nextButtonStyleId(look);
    }
    expect(new Set(drawn.values()).size, JSON.stringify([...drawn])).toBe(BUTTON_STYLE_IDS.length);
    // Every action of the page wears the same look.
    const radii = await page.locator("a[data-cta]").evaluateAll((els) => els.map((el) => getComputedStyle(el).borderTopLeftRadius));
    expect(new Set(radii).size).toBe(1);
  });

  test("the choice survives a reload and is in place before the header is parsed", async ({ page }) => {
    await page.goto("./");
    await buttonControl(page).click();
    const next = nextButtonStyleId(START);
    await expect(page.locator("html")).toHaveAttribute("data-button", next);

    // Records html[data-button] at the moment the parser inserts the <header> — before React
    // has run at all. A value there proves there is no flash of the default look.
    await page.addInitScript(() => {
      new MutationObserver((records, observer) => {
        for (const r of records) {
          for (const node of r.addedNodes) {
            if (node instanceof HTMLElement && node.tagName === "HEADER") {
              (window as unknown as { __buttonAtHeader: string }).__buttonAtHeader =
                document.documentElement.dataset.button ?? "";
              observer.disconnect();
            }
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-button", next);
    expect(
      await page.evaluate(() => (window as unknown as { __buttonAtHeader: string }).__buttonAtHeader)
    ).toBe(next);
    await expect(buttonControl(page)).toHaveAttribute("aria-label", labelFor(next));
  });

  test("an unknown stored look falls back to the default", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("button", "blob"));
    await page.goto("./");
    await expect(page.locator("html")).toHaveAttribute("data-button", START);
  });

  // Every look on every palette: the action's words against what they stand on. The filled looks
  // set the accent's own ink on the accent; outline and soft set the page's ink on a ground of
  // the palette — read from the browser, because a mix is the browser's (`color-mix`). The two
  // looks that bring a ground of their own are held to AA under the pointer as well; the filled
  // ones keep the hover the template's button always had (the accent thinned by a fifth).
  test("every look keeps the action's words readable on every palette (WCAG AA)", async ({ page }) => {
    await page.goto("login");
    const failures = await page.evaluate(
      ({ schemes, looks, floor }) => {
        const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        /** Any CSS colour, laid over `under`, as the sRGB the screen shows. */
        const shown = (color: string, under?: string): [number, number, number] => {
          ctx.clearRect(0, 0, 1, 1);
          if (under) {
            ctx.fillStyle = under;
            ctx.fillRect(0, 0, 1, 1);
          }
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          return [r!, g!, b!];
        };
        const luminance = ([r, g, b]: [number, number, number]) => {
          const lin = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
          return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        };
        const ratio = (a: [number, number, number], b: [number, number, number]) => {
          const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
          return (hi + 0.05) / (lo + 0.05);
        };
        const probe = document.createElement("a");
        probe.setAttribute("data-cta", "");
        probe.textContent = "Get started";
        document.body.append(probe);
        const html = document.documentElement;
        const before = { scheme: html.dataset.scheme, button: html.dataset.button };
        const failed: string[] = [];
        for (const scheme of schemes) {
          html.dataset.scheme = scheme;
          const page = getComputedStyle(document.body).backgroundColor;
          for (const look of looks) {
            html.dataset.button = look;
            const style = getComputedStyle(probe);
            const ink = shown(style.color);
            const states = [["rest", style.backgroundColor]];
            if (look === "outline" || look === "soft") {
              probe.style.backgroundColor = "var(--shared-button-bg-hover)";
              states.push(["hover", getComputedStyle(probe).backgroundColor]);
              probe.style.backgroundColor = "";
            }
            for (const [state, ground] of states) {
              const contrast = ratio(ink, shown(ground!, page));
              // A little slack for the canvas's 8-bit rounding of a mixed colour.
              if (contrast < floor - 0.05) failed.push(`${scheme} / ${look} / ${state}: ${contrast.toFixed(2)}`);
            }
          }
        }
        html.dataset.scheme = before.scheme;
        html.dataset.button = before.button;
        probe.remove();
        return failed;
      },
      { schemes: [...COLOR_SCHEME_IDS], looks: [...BUTTON_STYLE_IDS], floor: WCAG_AA_TEXT }
    );
    expect(failures).toEqual([]);
  });
});

test.describe("the action's look — at 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the look lives in the menu, beside the font, and steps from there", async ({ page }) => {
    await page.goto("./");
    await expect(buttonControl(page)).toBeHidden();
    await page.getByRole("button", { name: uiCopy.common.openMenu! }).click();
    const dialog = page.getByRole("dialog", { name: uiCopy.common.menu! });
    const row = dialog.getByRole("button", { name: labelPrefix(uiCopy.common.changeButtonLabel!.split("{name}")[0]!) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(uiCopy.common.button!);
    await expect(row).toContainText(buttonStyleById(START).name);
    await row.click();
    await expect(page.locator("html")).toHaveAttribute("data-button", nextButtonStyleId(START));
    await expect(row).toContainText(buttonStyleById(nextButtonStyleId(START)).name);
  });
});

test.describe("the action's look — the golden demo's control pad", () => {
  test("a fourth key steps the look of the page's action, in the visitor's browser only", async ({ page }) => {
    test.skip(!TRY, "no try-it keys in this config");
    // What a key could send: a write, or a call to the factory. (The landing's own action
    // prefetches its page with GET/HEAD; that is not the key's doing.)
    const requests: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD"].includes(request.method()) || new URL(request.url()).pathname.includes("/api/")) requests.push(`${request.method()} ${request.url()}`);
    });
    await page.goto("./");
    const frame = page.locator('[data-section="hero"] [data-hero-frame]');
    test.skip((await frame.count()) === 0, "this hero has no product frame, so it has no pad");
    await still(page);
    const key = frame.locator("[data-try-pad] button[data-try='button']");
    await expect(key).toHaveCount(1);
    await expect(key).toHaveText(uiCopy.common.changeButton!);
    expect((await key.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // The pad still fits the frame: no key pushed out of it, no sideways scroll.
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

    const action = page.locator('[data-section="hero"] a[data-cta]');
    const before = await action.evaluate((el) => getComputedStyle(el).borderTopLeftRadius + getComputedStyle(el).backgroundColor);
    await key.click();
    await expect(page.locator("html")).toHaveAttribute("data-button", nextButtonStyleId(START));
    expect(await action.evaluate((el) => getComputedStyle(el).borderTopLeftRadius + getComputedStyle(el).backgroundColor)).not.toBe(before);
    // The whole cycle from the pad, back to where the page opened.
    for (let i = 1; i < BUTTON_STYLE_IDS.length; i++) await key.click();
    await expect(page.locator("html")).toHaveAttribute("data-button", START);
    // A key, not a link, and nothing was sent anywhere.
    await expect(frame.locator("a")).toHaveCount(0);
    expect(requests).toEqual([]);
  });

  // The idea chat's launcher floats in the window's bottom right corner — where the pad's last
  // key lands on a phone. With four keys in the row it lay over that key's word, so a stage that
  // carries a pad ends a little higher (`stage.css`). Checked where the stage's own height sets
  // the pad's place: on a shorter window the hero's copy does, and the first scroll clears the key.
  test("on a phone the pad's last key stands clear of the idea chat's launcher", async ({ page }) => {
    test.skip(!TRY, "no try-it keys in this config");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("./");
    const key = page.locator("[data-hero-frame] [data-try-pad] button[data-try='button']");
    test.skip((await key.count()) === 0, "this hero has no product frame, so it has no pad");
    const launcher = page.locator("[data-idea-launcher]");
    test.skip((await launcher.count()) === 0, "this page has no idea chat");
    // At rest: the frame rises into place on load (28px, `editorial-fold`), so ask until it has.
    await expect
      .poll(async () => {
        const [k, l] = [(await key.boundingBox())!, (await launcher.boundingBox())!];
        const apart = k.x + k.width <= l.x || l.x + l.width <= k.x || k.y + k.height <= l.y || l.y + l.height <= k.y;
        return apart ? "apart" : `key ${JSON.stringify(k)} under launcher ${JSON.stringify(l)}`;
      })
      .toBe("apart");
  });
});
