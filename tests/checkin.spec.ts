import { test, expect, type Page } from "@playwright/test";

/**
 * OTH-84 — the daily check-in on its public page, against the static export. The log lives
 * in localStorage, so every test starts from a clean origin (Playwright gives each test a
 * fresh context). The 2026-10-13 motivation layer is covered below the original cases.
 */

const pillar = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

/** The browser's local calendar day `offset` days from today — the same clock the page reads. */
function localDay(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${String(d.getDate()).padStart(2, "0")}`;
}

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

  test("a note survives immediate page close without blur or a debounce delay", async ({ page, context }) => {
    await page.getByLabel("Note for this day").fill("Saved before closing");
    // Read storage immediately: no polling that could hide a deferred save.
    const saved = await page.evaluate(() => localStorage.getItem("unbroken:checkins:v1"));
    expect(saved).toContain("Saved before closing");
    const url = page.url();
    await page.close();
    const reopened = await context.newPage();
    await reopened.goto(url);
    await expect(reopened.getByLabel("Note for this day")).toHaveValue("Saved before closing");
  });

  test("notification link opens today and history switches between days and months", async ({ page }) => {
    await page.getByRole("button", { name: "Yesterday", exact: true }).click();
    await pillar(page, "Work").click();
    await page.goto("./checkin?today=1#daily-form");
    await expect(page.getByRole("button", { name: "Today", exact: true })).toHaveAttribute("aria-pressed", "true");
    const history = page.getByTestId("checkin-history");
    await expect(history.getByRole("columnheader", { name: "Note", exact: true })).toBeVisible();
    await history.getByRole("button", { name: "Months", exact: true }).click();
    await expect(history.locator("tbody tr")).toHaveCount(12);
    await history.getByRole("button", { name: "Previous month" }).click();
    await expect(history.getByRole("button", { name: "Next month" })).toBeEnabled();
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

  // ── Motivation layer (2026-10-13) ──

  test("a first visit explains the game, and the first tap earns XP at level Paper", async ({ page }) => {
    await expect(page.getByTestId("first-run")).toBeVisible();
    await expect(page.getByTestId("level-name")).toHaveText("Paper");
    await expect(page.getByTestId("xp")).toContainText("0 / 150 XP to Wood");
    await expect(page.getByTestId("focus")).toContainText("Start anywhere");
    await expect(page.getByTestId("badge-first-checkin")).toHaveAttribute("data-earned", "false");

    await pillar(page, "Work").click();
    await expect(page.getByTestId("first-run")).toHaveCount(0);
    await expect(page.getByTestId("xp")).toContainText("10 / 150 XP to Wood");
    await expect(page.getByTestId("xp")).toContainText("10 XP");
    await expect(page.getByTestId("badge-first-checkin")).toHaveAttribute("data-earned", "true");
    await expect(page.getByTestId("focus")).toContainText("Fitness got the least attention this week");
  });

  test("a full day celebrates with the bonus and the overall streak starts", async ({ page }) => {
    for (const name of ["Work", "Fitness", "Mind", "Relationships", "Habits"]) await pillar(page, name).click();
    await expect(page.getByTestId("celebration")).toContainText("+75 XP today");
    await expect(page.getByTestId("hero-streak")).toContainText("1 full day in a row");
    await expect(page.getByTestId("xp")).toContainText("75 XP");
    await expect(page.getByTestId("shields-all")).toContainText("0 shields");
  });

  test("three days in a row reach the first streak tier in the trophy case", async ({ page }) => {
    await pillar(page, "Work").click();
    await page.getByRole("button", { name: "Yesterday" }).click();
    await pillar(page, "Work").click();
    await page.getByLabel("Pick a date").fill(localDay(-2));
    await pillar(page, "Work").click();
    await page.getByRole("button", { name: "Today" }).click();
    await expect(page.getByTestId("streak-work")).toHaveText("3-day streak, best 3");
    await expect(page.getByTestId("tiers-work")).toHaveAttribute("data-tier", "3");
    await expect(page.getByTestId("tiers-mind")).toHaveAttribute("data-tier", "0");
  });

  test("coming back after a missed day is greeted, not punished", async ({ page }) => {
    await page.getByLabel("Pick a date").fill(localDay(-2));
    await pillar(page, "Mind").click();
    await page.reload();
    await expect(page.getByTestId("comeback")).toContainText("Welcome back.");
    await expect(page.getByTestId("comeback")).toContainText("One missed day won't break you.");
    await expect(page.getByTestId("badge-comeback")).toHaveAttribute("data-earned", "false");
    await pillar(page, "Mind").click();
    await expect(page.getByTestId("badge-comeback")).toHaveAttribute("data-earned", "true");
  });

  test("the share card is drawn from the visitor's numbers and can be downloaded", async ({ page }) => {
    await pillar(page, "Work").click();
    await page.getByTestId("share-open").click();
    const image = page.getByTestId("share-image");
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("src", /^blob:/);
    await expect(page.getByTestId("share-download")).toHaveAttribute("download", "unbroken-streak.png");
  });

  test("the daily reminder is a recurring calendar event, Google link and .ics file", async ({ page }) => {
    await page.getByTestId("reminder-open").click();
    const google = page.getByTestId("reminder-google");
    await expect(google).toHaveAttribute("href", /calendar\.google\.com\/calendar\/render\?/);
    await expect(google).toHaveAttribute("href", /recur=RRULE%3AFREQ%3DDAILY/);
    await expect(google).toHaveAttribute("href", /T080000/);
    await expect(page.getByTestId("reminder-ics")).toHaveAttribute("download", "unbroken-reminder.ics");
  });

  test("an anonymous visitor is told the log stays on the device and offered sign-in", async ({ page }) => {
    const status = page.getByTestId("cloud-status");
    await expect(status).toHaveAttribute("data-cloud", "off");
    await expect(status).toContainText("Saved on this device only.");
    await expect(status.getByRole("link", { name: "Sign in to sync across devices" })).toHaveAttribute("href", /\/login$/);
    await expect(page.getByTestId("recap")).toContainText("Your first weekly recap arrives");
  });

  test("the page can be pinned to a home screen", async ({ page }) => {
    const manifest = page.locator('link[rel="manifest"]');
    await expect(manifest).toHaveAttribute("href", /manifest\.webmanifest$/);
    const href = (await manifest.getAttribute("href"))!;
    const res = await page.request.get(href);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ name: "Unbroken", display: "standalone" });
    expect(body.start_url).toMatch(/\/checkin$/);
    const icon = await page.request.get(body.icons[0].src);
    expect(icon.status()).toBe(200);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-touch-icon\.png$/);
    await pillar(page, "Work").click();
    await expect(page.getByTestId("install-hint")).toBeVisible();
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(page.getByTestId("install-hint")).toHaveCount(0);
  });
});

test("the landing CTA opens the check-in instead of a missing page", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Start your first check-in" }).first().click();
  await expect(page).toHaveURL(/\/checkin\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Daily check-in" })).toBeVisible();
});
