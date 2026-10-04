import { test, expect, type Page } from "@playwright/test";
import { STORAGE_KEY } from "../lib/reading-diary";

const catalogue = { docs: [{ key: "/works/OL123W", title: "A catalogue story", author_name: ["Test Author"] }] };
async function openStarter(page: Page, id = "prince") {
  await page.locator(`[data-book-id="${id}"]`).getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function correct(page: Page) {
  for (let i = 0; i < 3; i++) await page.locator(`input[name="question-${i}"][value="${i}"]`).check();
}
async function addStarter(page: Page) {
  await openStarter(page); await correct(page);
  await page.getByRole("button", { name: "Complete quiz & add book", exact: true }).click();
  await expect(page.locator("[data-diary-entry]")).toHaveCount(1);
}

test("incomplete, wrong, cancelled and successful quizzes; reload, answers, download and delete", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("[data-diary-entry]")).toHaveCount(0);
  await openStarter(page);
  const save = page.getByRole("button", { name: "Complete quiz & add book", exact: true });
  await expect(save).toBeDisabled();
  for (let i = 0; i < 3; i++) await page.locator(`input[name="question-${i}"][value="0"]`).check();
  await save.click();
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("Some answers need another look");
  await expect(page.locator("[data-diary-entry]")).toHaveCount(0);
  await page.getByRole("button", { name: "Close quiz", exact: true }).click();
  await expect(page.locator("[data-diary-entry]")).toHaveCount(0);
  await addStarter(page);
  await expect(page.getByRole("status")).toContainText("Book added");
  await expect(page.locator('[data-book-id="prince"]').getByRole("button")).toBeDisabled();
  await page.reload();
  await expect(page.locator("[data-diary-entry]")).toHaveCount(1);
  await page.getByRole("button", { name: "Read my answers" }).click();
  await expect(page.getByRole("dialog")).toContainText("A rose");
  await page.getByRole("button", { name: "Close quiz", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download diary", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe("reading-diary.json");
  await page.goto("./sk");
  await expect(page.locator("html")).toHaveAttribute("lang", "sk");
  await expect(page.getByRole("heading", { name: "Môj čitateľský denník" })).toBeVisible();
  await expect(page.locator("[data-diary-entry]")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Odstrániť: The Little Prince", exact: true }).click();
  await expect(page.locator("[data-diary-entry]")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Odstrániť: The Little Prince", exact: true }).click();
  await expect(page.locator("[data-diary-entry]")).toHaveCount(0);
  await page.reload(); await expect(page.locator("[data-diary-entry]")).toHaveCount(0);
});
test("external search requires ungraded content answers and keeps the metadata", async ({ page }) => {
  const queries: string[] = [];
  await page.route("https://openlibrary.org/search.json?**", async (route) => { queries.push(new URL(route.request().url()).searchParams.get("q")!); await route.fulfill({ json: catalogue }); });
  await page.goto("./");
  await expect.poll(() => queries.length).toBe(0);
  await page.getByLabel("Title, author or ISBN").fill("A catalogue story");
  await page.getByRole("button", { name: "Search catalogue", exact: true }).click();
  await page.locator('[data-book-id="/works/OL123W"]').getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText("these answers are not graded");
  const save = page.getByRole("button", { name: "Complete quiz & add book", exact: true });
  await expect(save).toBeDisabled();
  for (let i = 1; i <= 3; i++) await page.getByLabel(`Question ${i}`, { exact: true }).fill("short");
  await save.click(); await expect(page.locator("[data-diary-entry]")).toHaveCount(0);
  for (let i = 1; i <= 3; i++) await page.getByLabel(`Question ${i}`, { exact: true }).fill(`In the story the main character finds a lost friend. Answer ${i}.`);
  await page.getByLabel("My rating", { exact: true }).selectOption("4");
  await save.click();
  await expect(page.locator("[data-diary-entry]")).toContainText("A catalogue story");
  await expect(page.locator("[data-diary-entry]")).toContainText("not graded");
  expect(queries).toEqual(["A catalogue story"]);
  await page.reload(); await expect(page.locator("[data-diary-entry]")).toContainText("Test Author");
});
test("catalogue failures and empty results leave starters usable", async ({ page }) => {
  await page.route("https://openlibrary.org/search.json?**", (route) => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("./");
  await page.getByRole("button", { name: "Search catalogue", exact: true }).click();
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("at least 2 characters");
  await page.getByLabel("Title, author or ISBN").fill("Some book");
  await page.getByRole("button", { name: "Search catalogue", exact: true }).click();
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("catalogue is unavailable");
  await page.unroute("https://openlibrary.org/search.json?**");
  await page.route("https://openlibrary.org/search.json?**", (route) => route.fulfill({ json: { docs: [] } }));
  await page.getByRole("button", { name: "Search catalogue", exact: true }).click();
  await expect(page.getByText("No books found.", { exact: false })).toBeVisible();
  await addStarter(page);
});
for (const scenario of ["corrupt", "denied", "quota", "stale"] as const) test(`storage ${scenario} never claims a successful save`, async ({ page }) => {
  if (scenario === "corrupt") await page.addInitScript((key) => localStorage.setItem(key, "{broken"), STORAGE_KEY);
  if (scenario === "denied") await page.addInitScript((key) => { const get = Storage.prototype.getItem; Storage.prototype.getItem = function(k) { if(k === key) throw new Error("denied"); return get.call(this,k); }; }, STORAGE_KEY);
  if (scenario === "quota") await page.addInitScript((key) => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if(k === key) throw new Error("full"); return set.call(this,k,v); }; }, STORAGE_KEY);
  await page.goto("./");
  if (scenario === "corrupt" || scenario === "denied") {
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("could not be loaded");
    await expect(page.locator('[data-book-id="prince"]').getByRole("button")).toBeDisabled();
    if (scenario === "corrupt") expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe("{broken");
  } else {
    await openStarter(page); await correct(page);
    if (scenario === "stale") await page.evaluate(key => localStorage.setItem(key, '{"version":1,"entries":[]}'), STORAGE_KEY);
    await page.getByRole("button", { name: "Complete quiz & add book", exact: true }).click();
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText("Could not save");
    await expect(page.locator("[data-diary-entry]")).toHaveCount(0);
    await expect(page.locator('input[name="question-2"][value="2"]')).toBeChecked();
  }
});
test("responsive English and Slovak UI has no horizontal overflow", async ({ page }) => {
  for (const path of ["./", "./sk"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('[data-book-id="prince"]').getByRole("button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
  }
});
