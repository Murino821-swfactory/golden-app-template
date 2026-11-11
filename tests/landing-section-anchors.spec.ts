import { test, expect } from "@playwright/test";
import { config } from "../lib/prototype-config";

const sections = config.patterns.landing?.sections ?? [];

test("every rendered landing section owns one stable id and a scroll offset", async ({ page }) => {
  await page.goto("./");
  for (const id of sections) {
    const target = page.locator(`[id="${id}"]`);
    await expect(target).toHaveCount(1);
    await expect(target).toHaveAttribute("data-section", id);
    expect(await target.evaluate((element) => parseFloat(getComputedStyle(element).scrollMarginTop))).toBeGreaterThan(0);
  }
});

test("section hashes reveal their chapter in both story and document presentations", async ({ page }, info) => {
  if (info.project.name === "chromium") await page.setViewportSize({ width: 1440, height: 900 });
  // Load the first hash with the document so Next's initial router state includes it.
  // Changing it before hydration finishes can be overwritten by router initialization.
  await page.goto(`./#${sections.at(-1) ?? ""}`);
  for (const id of [...sections].reverse()) {
    const target = page.locator(`[id="${id}"]`);
    // A landing that hydrates slowly gets one late scroll back to the hash it loaded with,
    // after the hash already names the next section (realitny-makler, 2026-10-27). Setting
    // the same hash again is no navigation, so a retry clears it first; every section must
    // still be reached by its own hash.
    //
    // The reveal check lives INSIDE the retry so the re-navigation above actually fires
    // until the chapter is shown. `toBeInViewport` cannot stand in for it: the story
    // presentation stacks every chapter at the same absolute box inside a sticky stage, so
    // a hidden chapter's box is in the viewport exactly like the active one's — a late
    // router scroll that flips the active chapter back leaves the target in viewport but
    // `visibility: hidden`, and a retry that only checks in-viewport never recovers
    // (composed/story under full parallel load, T-345, 2026-11-06). Assert visibility here
    // (story's reveal) and in-viewport (document's reveal); every section must satisfy both.
    await expect(async () => {
      await page.evaluate((hash) => {
        if (location.hash === `#${hash}`) history.replaceState(history.state, "", location.pathname + location.search);
        location.hash = hash;
      }, id);
      await expect(target).toBeInViewport({ timeout: 1_000 });
      await expect(target).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    await expect(target).toBeVisible();
    await expect(target.locator("xpath=..")).not.toHaveAttribute("inert", "");
  }
});

test("section ids are present in the exported document without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL!);
    for (const id of sections) {
      await expect(page.locator(`[id="${id}"][data-section="${id}"]`)).toHaveCount(1);
    }
  } finally {
    await context.close();
  }
});
