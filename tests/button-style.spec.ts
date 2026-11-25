import { test, expect, type Page } from "@playwright/test";
import {
  BUTTON_STYLE_IDS,
  COLOR_SCHEME_IDS,
  DEFAULT_BUTTON_STYLE,
  PRESS_HOLD_MS,
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
 * font and the colour" — and, the same day: "five different visuals and an animation after the
 * click; a different corner is not enough; no arrows"). A visitor steps through five looks with
 * one button in the header — as they step through the palettes and the faces — the choice
 * survives a reload without a flash, and `prototype.config.json` still decides what a first visit
 * sees. Each look is a character of its own and answers the click in its own way; the click waits
 * a moment for that answer and then goes through. On the golden demo the control pad carries the
 * same step as a fourth key.
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

/** Read the action at rest, not mid-way through a transition. */
async function still(page: Page) {
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important}" });
}

/** Set the look as the header's button would, without the click. */
async function wear(page: Page, look: ButtonStyleId) {
  await page.evaluate((id) => {
    document.documentElement.dataset.button = id;
    window.dispatchEvent(new Event("button-change"));
  }, look);
}

/** What a look puts on the action — everything a visitor could tell two looks apart by. */
function drawn(page: Page, pressed = false) {
  return page.locator("a[data-cta]").first().evaluate((el, pressed) => {
    if (pressed) el.setAttribute("data-pressed", "");
    const s = getComputedStyle(el);
    const before = getComputedStyle(el, "::before");
    const after = getComputedStyle(el, "::after");
    const height = el.getBoundingClientRect().height;
    const read = {
      corner: parseFloat(s.borderTopLeftRadius) >= height / 2 ? "full" : s.borderTopLeftRadius,
      ground: s.backgroundColor,
      ink: s.color,
      edge: s.borderTopColor,
      shadow: s.boxShadow,
      blur: s.backdropFilter,
      weight: s.fontWeight,
      line: `${s.textDecorationLine} ${s.textDecorationThickness} ${s.textUnderlineOffset}`,
      shift: s.translate,
      ring: before.backgroundImage,
      motion: `${before.animationName}|${after.animationName}`,
    };
    if (pressed) el.removeAttribute("data-pressed");
    return read;
  }, pressed);
}

test.describe("the action's look — the config", () => {
  test("a config names a look of the table, or none", () => {
    for (const id of BUTTON_STYLE_IDS) expect(withLanding({}, { button: id }).theme.button).toBe(id);
    expect(withLanding({}).theme.button).toBeUndefined();
    expect(() => withLanding({}, { button: "blob" })).toThrow(/theme\.button/);
    // An inherited JavaScript property is not a look.
    expect(() => withLanding({}, { button: "constructor" })).toThrow(/theme\.button/);
  });

  test("a config that names none opens in the first look, whatever its presentation", () => {
    expect(DEFAULT_BUTTON_STYLE).toBe(BUTTON_STYLE_IDS[0]);
    for (const presentation of [undefined, "editorial", "story", "document"]) {
      expect(initialButtonStyle(withLanding(presentation ? { presentation } : {}))).toBe(DEFAULT_BUTTON_STYLE);
    }
  });

  test("a named look wins in every presentation", () => {
    for (const presentation of ["editorial", "story", "document"]) {
      expect(initialButtonStyle(withLanding({ presentation }, { button: "orbit" }))).toBe("orbit");
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

  // Founder, 2026-11-25: the arrows go. The action is its words.
  test("the action carries no arrow: its words and nothing else", async ({ page }) => {
    test.skip(ACTION_SECTIONS.length === 0, "this landing has no action");
    await page.goto("./");
    await expect(page.locator("[data-cta] svg")).toHaveCount(0);
    for (const text of await page.locator("a[data-cta]").allInnerTexts()) expect(text).not.toMatch(/[→↗➔›»]/);
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

  test("the header's icon is drawn in the look on screen", async ({ page }) => {
    await page.goto("./");
    await still(page);
    const glyph = buttonControl(page).locator(".shared-button-glyph");
    const icons = new Set<string>();
    for (const look of BUTTON_STYLE_IDS) {
      await wear(page, look);
      icons.add(
        await glyph.evaluate((el) => {
          const s = getComputedStyle(el);
          return [s.borderRadius, s.backgroundColor, s.backgroundImage, s.boxShadow, s.borderTopColor, s.borderLeftColor].join("|");
        })
      );
    }
    expect(icons.size).toBe(BUTTON_STYLE_IDS.length);
  });

  // The founder's word on the first five: a different corner is not a different look.
  test("every look draws the action its own way — more than a different corner", async ({ page }) => {
    test.skip(ACTION_SECTIONS.length === 0, "this landing has no action");
    await page.goto("./");
    await still(page);
    const looks = new Map<ButtonStyleId, Awaited<ReturnType<typeof drawn>>>();
    for (const look of BUTTON_STYLE_IDS) {
      await wear(page, look);
      looks.set(look, await drawn(page));
    }
    const whole = [...looks.values()].map((l) => JSON.stringify({ ...l, motion: "" }));
    expect(new Set(whole).size, whole.join("\n")).toBe(BUTTON_STYLE_IDS.length);
    const cornerless = [...looks.values()].map((l) => JSON.stringify({ ...l, corner: "", motion: "" }));
    expect(new Set(cornerless).size, cornerless.join("\n")).toBe(BUTTON_STYLE_IDS.length);
    // What each one is: a pool of light, a slab on a hard shadow, frosted glass, a running light
    // round a dark capsule, a stroke of marker under bare words.
    expect(looks.get("glow")!.shadow).not.toBe("none");
    expect(looks.get("block")!.corner).toBe("0px");
    expect(looks.get("block")!.shift).not.toBe("none");
    expect(looks.get("glass")!.blur).toContain("blur");
    expect(looks.get("orbit")!.ring).toContain("conic-gradient");
    expect(looks.get("marker")!.line).toContain("underline");
    expect(looks.get("marker")!.shadow).toBe("none");
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

  // Every look on every palette: the action's words against what they stand on, at rest and in
  // the state the click leaves it in while it is held. Read from the browser, because a mix is
  // the browser's (`color-mix`). A look that brings no ground of its own (the marker at rest)
  // stands on the page.
  test("every look keeps the action's words readable on every palette (WCAG AA)", async ({ page }) => {
    await page.goto("login");
    await still(page);
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
            for (const state of ["rest", "pressed"]) {
              probe.toggleAttribute("data-pressed", state === "pressed");
              const style = getComputedStyle(probe);
              // Under the words: the action's own ground — or the stroke of marker a look lays
              // behind them (an underline drawn up over the line of text).
              const marked = style.textDecorationLine.includes("underline") && parseFloat(style.textUnderlineOffset) < 0;
              const ground = shown(marked ? style.textDecorationColor : style.backgroundColor, page);
              const contrast = ratio(shown(style.color), ground);
              // A little slack for the canvas's 8-bit rounding of a mixed colour.
              if (contrast < floor - 0.05) failed.push(`${scheme} / ${look} / ${state}: ${contrast.toFixed(2)}`);
            }
            probe.removeAttribute("data-pressed");
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

  // A look sets its own shadow and edge, which is where the button's focus ring was drawn.
  test("keyboard focus is visible on every look", async ({ page }) => {
    test.skip(ACTION_SECTIONS.length === 0, "this landing has no action");
    await page.goto("./");
    const action = page.locator("a[data-cta]").first();
    for (const look of BUTTON_STYLE_IDS) {
      await wear(page, look);
      await action.focus();
      // Leave and come back by keyboard, so the focus is the visible kind.
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(action).toBeFocused();
      const outline = await action.evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
      });
      expect(outline.style, look).not.toBe("none");
      expect(outline.width, look).toBeGreaterThanOrEqual(2);
    }
  });
});

test.describe("the action's look — the click", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  type Click = { at: number; pressed: boolean };
  /** Every click that reaches the page's action, with its time — recorded above the package. */
  async function recordClicks(page: Page) {
    await page.addInitScript(() => {
      const log: { at: number; pressed: boolean }[] = [];
      (window as unknown as { __ctaClicks: typeof log }).__ctaClicks = log;
      window.addEventListener(
        "click",
        (event) => {
          const action = event.target instanceof Element ? event.target.closest("[data-cta]") : null;
          if (action) log.push({ at: performance.now(), pressed: action.hasAttribute("data-pressed") });
        },
        true
      );
    });
  }
  const clicks = (page: Page) => page.evaluate(() => (window as unknown as { __ctaClicks: Click[] }).__ctaClicks);
  /** The header has installed the click's answer. Before that — a page still loading its
   * scripts — a click is an ordinary click. */
  const ready = (page: Page) => page.locator("html[data-shared-press]").waitFor({ state: "attached" });

  test("each look answers the click in its own way", async ({ page }) => {
    test.skip(ACTION_SECTIONS.length === 0, "this landing has no action");
    await page.goto("./");
    await still(page);
    const answers = new Set<string>();
    for (const look of BUTTON_STYLE_IDS) {
      await wear(page, look);
      const rest = await drawn(page);
      const pressed = await drawn(page, true);
      // The click changes what the visitor sees…
      expect(JSON.stringify(pressed), look).not.toBe(JSON.stringify(rest));
      // …and what changes is the look's own: which of its parts move, shift or fill.
      const changed = (Object.keys(rest) as (keyof typeof rest)[]).filter((key) => rest[key] !== pressed[key]);
      answers.add(`${changed.join(",")}|${pressed.motion}`);
    }
    expect(answers.size, [...answers].join("\n")).toBe(BUTTON_STYLE_IDS.length);
  });

  test("a click plays the look's answer first and then goes through", async ({ page }) => {
    test.skip(ACTION_SECTIONS.length === 0, "this landing has no action");
    await recordClicks(page);
    await page.goto("./");
    await ready(page);
    const startUrl = page.url();
    // In one turn of the page: the click, and what it left behind.
    const held = await page.locator("a[data-cta]").first().evaluate((el) => {
      (el as HTMLElement).click();
      return { pressed: el.hasAttribute("data-pressed"), url: location.href };
    });
    expect(held.pressed).toBe(true);
    expect(held.url).toBe(startUrl);
    // Then it goes where the action leads.
    if (ACTION!.startsWith("#")) await expect(page).toHaveURL(new RegExp(`${ACTION}$`));
    else if (ACTION!.startsWith("/")) await expect(page).toHaveURL(new RegExp(`${ACTION!.slice(1)}/?$`));
    await expect.poll(async () => (await clicks(page)).length).toBe(2);
    const log = await clicks(page);
    // The second click is the first one let through: after the hold, the answer still playing.
    expect(log[1]!.at - log[0]!.at).toBeGreaterThanOrEqual(PRESS_HOLD_MS - 20);
    expect(log[1]!.pressed).toBe(true);
  });

  test("a second click while the first is held does not go through twice", async ({ page }) => {
    test.skip(ACTION_SECTIONS.length === 0, "this landing has no action");
    await recordClicks(page);
    await page.goto("./");
    await ready(page);
    await page.locator("a[data-cta]").first().evaluate((el) => {
      (el as HTMLElement).click();
      (el as HTMLElement).click();
    });
    await page.waitForTimeout(PRESS_HOLD_MS * 3);
    // Two presses and one click let through — not two.
    expect(await clicks(page)).toHaveLength(3);
  });

  test("with reduced motion nothing is animated and the click goes straight through", async ({ page }) => {
    test.skip(ACTION_SECTIONS.length === 0, "this landing has no action");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await recordClicks(page);
    await page.goto("./");
    await ready(page);
    for (const look of BUTTON_STYLE_IDS) {
      await wear(page, look);
      expect((await drawn(page)).motion, look).toBe("none|none");
      expect((await drawn(page, true)).motion, look).toBe("none|none");
    }
    const pressed = await page.locator("a[data-cta]").first().evaluate((el) => {
      (el as HTMLElement).click();
      return el.hasAttribute("data-pressed");
    });
    expect(pressed).toBe(false);
    expect(await clicks(page)).toHaveLength(1);
  });

  // Ctrl/⌘-click opens a tab, Shift-click a window: those are the browser's, untouched.
  test("a click with a modifier key is left to the browser", async ({ page }) => {
    test.skip(ACTION_SECTIONS.length === 0, "this landing has no action");
    await page.goto("./");
    await ready(page);
    const result = await page.locator("a[data-cta]").first().evaluate((el) => {
      let reached = false;
      const stop = (event: Event) => {
        reached = true;
        event.preventDefault();
      };
      // On the action itself: only a click the package let pass gets this far.
      el.addEventListener("click", stop);
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true, button: 0 }));
      el.removeEventListener("click", stop);
      return { reached, pressed: el.hasAttribute("data-pressed") };
    });
    expect(result).toEqual({ reached: true, pressed: false });
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

  test("no look pushes the page sideways", async ({ page }) => {
    await page.goto("./");
    for (const look of BUTTON_STYLE_IDS) {
      await wear(page, look);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), look).toBeLessThanOrEqual(0);
    }
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

    const before = JSON.stringify(await drawn(page));
    await key.click();
    await expect(page.locator("html")).toHaveAttribute("data-button", nextButtonStyleId(START));
    expect(JSON.stringify(await drawn(page))).not.toBe(before);
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
