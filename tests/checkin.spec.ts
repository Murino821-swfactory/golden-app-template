import { test, expect, type Page } from "@playwright/test";

/**
 * OTH-84 — the daily check-in on its public page, against the static export. The log lives
 * in localStorage, so every test starts from a clean origin (Playwright gives each test a
 * fresh context).
 */

const pillar = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test.describe("Daily check-in", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./checkin");
    await expect(pillar(page, "Work")).toBeVisible();
  });

  test("shows the five pillars, none done yet", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Daily check-in" })).toBeVisible();
    for (const name of ["Work", "Fitness", "Mind", "Relationships", "Habits"]) {
      await expect(pillar(page, name)).toHaveAttribute("aria-pressed", "false");
    }
    await expect(page.getByTestId("day-progress")).toHaveText("0 of 5 done");
  });

  test("one tap checks a pillar, starts its streak, and survives a reload", async ({ page }) => {
    await pillar(page, "Work").click();
    await expect(pillar(page, "Work")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("streak-work")).toHaveText("1-day streak, best 1");
    await expect(page.getByTestId("day-progress")).toHaveText("1 of 5 done");

    await page.reload();
    await expect(pillar(page, "Work")).toHaveAttribute("aria-pressed", "true");

    await pillar(page, "Work").click();
    await expect(pillar(page, "Work")).toHaveAttribute("aria-pressed", "false");
  });

  test("yesterday is its own day, and checking it extends today's streak", async ({ page }) => {
    await pillar(page, "Mind").click();
    await page.getByRole("button", { name: "Yesterday" }).click();
    await expect(pillar(page, "Mind")).toHaveAttribute("aria-pressed", "false");
    await pillar(page, "Mind").click();

    await page.getByRole("button", { name: "Today" }).click();
    await expect(page.getByTestId("streak-mind")).toHaveText("2-day streak, best 2");
  });

  test("the calendar picks any past day and refuses the future", async ({ page }) => {
    const input = page.getByLabel("Pick a date");
    const max = await input.getAttribute("max");
    expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await input.fill("2026-01-15");
    await expect(page.getByTestId("selected-day")).toContainText("January 15");
  });

  test("keeps a note for the day", async ({ page }) => {
    const note = page.getByLabel("Note for this day");
    await note.fill("Long walk after work.");
    await note.blur();
    await page.reload();
    await expect(page.getByLabel("Note for this day")).toHaveValue("Long walk after work.");
  });

  test("scores consistency and draws the week and the month", async ({ page }) => {
    await pillar(page, "Work").click();
    await pillar(page, "Habits").click();
    await expect(page.getByTestId("consistency-7")).toHaveText("6%"); // 2 of 35
    await expect(page.getByRole("img", { name: /Week balance/ })).toBeVisible();

    const todayCell = page.getByTestId("heat-today");
    await expect(todayCell).toHaveAttribute("aria-label", /2 of 5/);
  });

  test("a day in the month grid opens that day", async ({ page }) => {
    const cells = page.locator("[data-heat-day]:not([disabled])");
    const first = cells.first();
    const key = await first.getAttribute("data-heat-day");
    await first.click();
    const [, m, d] = key!.split("-");
    const monthName = new Date(2000, Number(m) - 1, 1).toLocaleString("en-US", { month: "long" });
    await expect(page.getByTestId("selected-day")).toContainText(`${monthName} ${Number(d)}`);
  });

  test("has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.reload();
    await pillar(page, "Fitness").click();
    await page.waitForLoadState("networkidle");
    expect(errors.filter((e) => !e.includes("Firebase"))).toHaveLength(0);
  });
});

test("the landing CTA opens the check-in instead of a missing page", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Start your first check-in" }).first().click();
  await expect(page).toHaveURL(/\/checkin\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Daily check-in" })).toBeVisible();
});
