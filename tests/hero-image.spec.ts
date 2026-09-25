import { test, expect, type Page } from "@playwright/test";
import { config } from "../lib/prototype-config";
import {
  heroControlsView,
  parsePublicState,
  parseStatus,
  type HeroControlsInput,
} from "../lib/hero-image";

/**
 * The AI hero background (sw-factory spec 2026-09-25-prototype-hero-image-design.md).
 *
 * Two halves. The pure half pins the controls' state table and the response parsers —
 * the signed-in path cannot be driven end to end here (Google Sign-In needs secrets), so
 * this is where it is held. The browser half fakes `hero-image.json` with `page.route`
 * and checks what every anonymous visitor sees.
 */

const heroEnabled = Boolean(config.patterns.landing?.sections.includes("hero"));

// A 1×1 JPEG, so the faked image actually decodes and `onLoad` fires.
const PIXEL = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);
const SRC = "/newapp/test/hero-image/AAAAAAAAAAAAAAAAAAAA.jpg";

// ── the controls' table (spec §5.3) ──

const base: HeroControlsInput = {
  role: "owner",
  hasImage: false,
  visible: false,
  generation: "idle",
  ownerCanGenerate: true,
  confirming: false,
  timedOut: false,
};

const labels = (input: Partial<HeroControlsInput>) =>
  heroControlsView({ ...base, ...input }).buttons.map((b) => b.label);

test.describe("heroControlsView", () => {
  test("no image, idle: generate; the creator confirms the single try first", () => {
    expect(labels({})).toEqual(["generate"]);
    expect(labels({ confirming: true })).toEqual(["confirm"]);
    expect(labels({ role: "admin" })).toEqual(["generate"]);
    expect(labels({ role: "admin", confirming: true })).toEqual(["generate"]);
  });

  test("pending: one disabled, busy button for both roles; a timeout says reload", () => {
    for (const role of ["owner", "admin"] as const) {
      const view = heroControlsView({ ...base, role, generation: "pending" });
      expect(view.buttons).toEqual([{ action: "generate", label: "generating", disabled: true, busy: true }]);
      expect(heroControlsView({ ...base, role, generation: "pending", timedOut: true })).toEqual({
        message: "slow",
        buttons: [],
      });
    }
  });

  test("an image, visible or hidden: the toggle; only the founder regenerates", () => {
    expect(labels({ hasImage: true, visible: true })).toEqual(["hide"]);
    expect(labels({ hasImage: true, visible: false })).toEqual(["show"]);
    expect(labels({ role: "admin", hasImage: true, visible: true })).toEqual(["hide", "regenerate"]);
    expect(labels({ role: "admin", hasImage: true, visible: false })).toEqual(["show", "regenerate"]);
  });

  test("failed: the creator keeps the try and may retry; the founder too", () => {
    expect(heroControlsView({ ...base, generation: "failed" })).toEqual({
      message: "failedRetry",
      buttons: [{ action: "generate", label: "retry" }],
    });
    expect(heroControlsView({ ...base, role: "admin", generation: "failed" })).toEqual({
      message: "failed",
      buttons: [{ action: "generate", label: "retry" }],
    });
  });

  test("a creator out of requests without an image: no button, a plain message", () => {
    expect(heroControlsView({ ...base, ownerCanGenerate: false })).toEqual({
      message: "unavailable",
      buttons: [],
    });
    expect(heroControlsView({ ...base, ownerCanGenerate: false, generation: "failed" })).toEqual({
      message: "unavailable",
      buttons: [],
    });
  });
});

test.describe("hero-image response parsers", () => {
  test("public state: only a visible, same-origin src is taken", () => {
    expect(parsePublicState({ visible: true, src: SRC })).toEqual({ visible: true, src: SRC });
    expect(parsePublicState({ visible: false, src: SRC })).toEqual({ visible: false });
    expect(parsePublicState({ visible: true, src: "https://evil.example/x.jpg" })).toEqual({ visible: false });
    expect(parsePublicState({ visible: true, src: "//evil.example/x.jpg" })).toEqual({ visible: false });
    expect(parsePublicState("nonsense")).toEqual({ visible: false });
    expect(parsePublicState(null)).toEqual({ visible: false });
  });

  test("status: a role is required; everything else defaults safe", () => {
    expect(parseStatus({ role: null })).toBeNull();
    expect(parseStatus({ role: "owner", generation: "weird" })).toEqual({
      role: "owner",
      visible: false,
      generation: "idle",
      ownerCanGenerate: false,
    });
  });
});

// ── what an anonymous visitor sees ──

async function fakeState(page: Page, answer: { status?: number; body: string }) {
  await page.route("**/hero-image.json", (route) =>
    route.fulfill({ status: answer.status ?? 200, contentType: "application/json", body: answer.body })
  );
  await page.route("**/hero-image/*.jpg", (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: PIXEL })
  );
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function heroBoxes(page: Page) {
  const hero = page.locator('[data-section="hero"]');
  const boxes = await Promise.all(
    [hero.locator("h1"), hero.locator("p").first(), hero.getByRole("link").first()].map((l) => l.boundingBox())
  );
  return boxes.map((b) => (b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null));
}

test.describe("the hero background, as a visitor sees it", () => {
  test.skip(!heroEnabled, "hero section not enabled in this config");

  test("the shipped state file is a 200 with no image", async ({ page }) => {
    const res = await page.request.get("./hero-image.json");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ visible: false });
  });

  test("visible: the image fills the hero behind the text, no controls, and moves nothing", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto("./");
    await page.waitForLoadState("networkidle");
    const without = await heroBoxes(page);
    await expect(page.locator("[data-hero-image]")).toHaveCount(0);

    await fakeState(page, { body: JSON.stringify({ visible: true, src: SRC }) });
    await page.goto("./");
    const img = page.locator("[data-hero-image]");
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute("alt", "");
    await expect(img).toHaveCSS("opacity", "1");
    await page.waitForLoadState("networkidle");

    expect(await heroBoxes(page)).toEqual(without);

    const hero = await page.locator('[data-section="hero"]').boundingBox();
    const layer = await img.boundingBox();
    expect(layer && hero && Math.round(layer.width)).toBe(hero && Math.round(hero.width));
    await expect(page.locator("[data-hero-image-controls]")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("hidden: no image", async ({ page }) => {
    await fakeState(page, { body: JSON.stringify({ visible: false }) });
    await page.goto("./");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("[data-hero-image]")).toHaveCount(0);
  });

  test("a broken or missing state file leaves the plain hero and a clean console", async ({ page }) => {
    for (const answer of [{ body: "{not json" }, { status: 404, body: "Not found" }]) {
      const errors = collectErrors(page);
      await fakeState(page, answer);
      await page.goto("./");
      await page.waitForLoadState("networkidle");
      await expect(page.locator("[data-hero-image]")).toHaveCount(0);
      await expect(page.locator('[data-section="hero"] h1')).toBeVisible();
      // Chrome itself logs "Failed to load resource" for the faked 404 — that line is the
      // browser reporting the network, not this code. Production never answers 404 here
      // (the function answers 200 on every read, the static file exists everywhere else).
      expect(errors.filter((e) => !e.includes("Failed to load resource"))).toEqual([]);
      await page.unroute("**/hero-image.json");
    }
  });
});
