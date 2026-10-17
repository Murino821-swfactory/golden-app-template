import { test, expect, type Page } from "@playwright/test";
import { config } from "../lib/prototype-config";
import { CHANNELS, FORMAT_SIZES } from "../lib/studio/channels";
import { STUDIO_COPY, studioLocale } from "../lib/studio/copy";

/**
 * GitPulse Studio on the exported site: the three scenes, the five destinations and one
 * desktop publish, end to end. The rules themselves are in studio-logic.spec.ts.
 *
 * Firestore is not configured in a local or gated build, so the projects scene must fall
 * back to its snapshot; with Firebase present it reads the live list — both are accepted.
 */

const copy = STUDIO_COPY[studioLocale(config.defaultLocale)];

async function openStudio(page: Page, path = "./studio") {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
  return errors;
}

test("opens on the live projects, with cards, five destinations and a rendered preview", async ({ page }) => {
  const errors = await openStudio(page);
  await expect(page.getByRole("tab", { name: copy.tabs.projects })).toHaveAttribute("aria-selected", "true");
  const scene = page.getByTestId("projects-scene");
  await expect(scene).toHaveAttribute("data-source", /live|snapshot/);
  expect(await scene.locator("li").count()).toBeGreaterThan(5);
  await expect(scene.getByRole("link", { name: new RegExp(`^${copy.projects.visit}`) }).first()).toHaveAttribute("target", "_blank");

  for (const ch of CHANNELS) await expect(page.getByRole("radio", { name: ch.label })).toBeVisible();
  await expect(page.getByRole("radio", { name: "tokenwise.sk" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("publish-preview")).toBeVisible();
  await expect(page.getByTestId("publish-button")).toBeEnabled();
  await expect(page.getByTestId("publish-button")).toHaveText(copy.publish.publishTo("tokenwise.sk"));

  // The page fits the viewport — mobile first.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("the history sorts eras by commits, busiest first, and can be put back in order", async ({ page }) => {
  await openStudio(page);
  await page.getByRole("tab", { name: copy.tabs.history }).click();
  const eras = page.getByTestId("era");
  await expect(eras.first()).toBeVisible();
  const counts = (await eras.evaluateAll((nodes) => nodes.map((n) => Number(n.getAttribute("data-commits"))))) as number[];
  expect(counts.length).toBeGreaterThanOrEqual(15);
  for (let i = 1; i < counts.length; i++) expect(counts[i - 1]).toBeGreaterThanOrEqual(counts[i]);
  expect(counts[0]).toBe(179);

  await page.getByRole("button", { name: copy.history.byTime }).click();
  await expect(eras.first()).toContainText("I");
  expect(Number(await eras.first().getAttribute("data-commits"))).toBe(49);

  // The GitHub mode asks for a repository and refuses a malformed one without a request.
  await page.getByRole("button", { name: copy.history.github }).click();
  await page.getByLabel(copy.history.repoLabel).fill("not a slug");
  await page.getByRole("button", { name: copy.history.load }).click();
  // Scoped: Next's route announcer is a second role="alert" on every page.
  await expect(page.getByTestId("history-scene").getByRole("alert")).toHaveText(copy.history.errors.invalid);
});

test("the game stage draws, keeps a HUD, and a reset returns to level 1", async ({ page }) => {
  await openStudio(page);
  await page.getByRole("tab", { name: copy.tabs.game }).click();
  const canvas = page.getByTestId("game-canvas");
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThan(200);
  await expect(page.getByTestId("game-hud")).toContainText(copy.game.level);
  await expect(page.getByTestId("game-hud")).toContainText(copy.game.shipped);
  // Something is painted: the stage is not a blank canvas.
  const painted = await canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const ctx = c.getContext("2d");
    if (!ctx) return 0;
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4 * 97) if (data[i] + data[i + 1] + data[i + 2] > 60) lit++;
    return lit;
  });
  expect(painted).toBeGreaterThan(0);
  await page.getByRole("button", { name: copy.game.reset }).click();
  await expect(page.getByTestId("game-hud")).toContainText("1");
  // The publish bar words the score card for this scene.
  await expect(page.getByLabel(copy.publish.caption)).toHaveValue(/#shipit/);
});

test("choosing a destination re-words the caption within its limit and resizes the preview", async ({ page }) => {
  await openStudio(page);
  await page.getByRole("radio", { name: "Instagram" }).click();
  const size = FORMAT_SIZES.square;
  await expect(page.getByText(copy.publish.format(size.width, size.height))).toBeVisible();
  const caption = page.getByLabel(copy.publish.caption);
  const text = await caption.inputValue();
  expect(text.length).toBeLessThanOrEqual(2200);
  expect(text).toContain("https://tokenwise.sk/projects");
  expect(text).toContain("#tokenwise");
  await expect(page.getByTestId("publish-button")).toHaveText(copy.publish.publishTo("Instagram"));

  // An edit sticks until the destination changes.
  await caption.fill("my own words");
  await page.getByRole("tab", { name: copy.tabs.history }).click();
  await expect(caption).toHaveValue("my own words");
  await page.getByRole("radio", { name: "TikTok" }).click();
  await expect(caption).not.toHaveValue("my own words");
  await expect(page.getByText(copy.publish.format(FORMAT_SIZES.portrait.width, FORMAT_SIZES.portrait.height))).toBeVisible();
});

test("publishing on a desktop opens the profile, saves the image and logs the publish", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(String(url));
      return {} as Window;
    };
  });
  await openStudio(page);
  await page.getByRole("radio", { name: "Facebook" }).click();
  await expect(page.getByTestId("publish-button")).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.getByTestId("publish-button").click();
  expect((await download).suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-projects-facebook\.png$/);
  const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
  expect(opened).toHaveLength(1);
  expect(opened[0]).toMatch(/^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
  await expect(page.getByRole("status")).toHaveText(copy.publish.outcome.opened);
  await expect(page.getByTestId("publish-log").locator("li")).toHaveCount(1);
  await expect(page.getByTestId("publish-log")).toContainText("facebook");

  // The receipt survives a reload: it lives in this browser.
  await page.reload();
  await expect(page.getByTestId("publish-log").locator("li")).toHaveCount(1);
});

test("the landing sends visitors to the studio", async ({ page }) => {
  test.skip(config.patterns.cta?.href !== "/studio", "this config does not point its CTA at the studio");
  await page.goto("./");
  const hero = page.locator('[data-section="hero"] a').first();
  await expect(hero).toHaveAttribute("href", `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/studio`);
});

test("the second language has its own studio", async ({ page }) => {
  const secondary = config.locales.find((l) => l !== config.defaultLocale);
  test.skip(!secondary, "single-language config");
  const other = STUDIO_COPY[studioLocale(secondary!)];
  await page.goto(`./${secondary}/studio`);
  await expect(page.getByRole("tab", { name: other.tabs.projects })).toBeVisible();
  await expect(page).toHaveTitle(`${other.title} — ${config.appName}`);
  await expect(page.locator("html")).toHaveAttribute("lang", secondary!);
});
