import { test, expect, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import sk from "../../messages/sk.json";
import de from "../../messages/de.json";

const documents = "http://127.0.0.1:8787/v1/projects/rules-test/databases/(default)/documents";
const messagePath = "demos/inbox-regression/contactMessages/inquiry";
const body = "Synthetic inquiry: please keep this message visible.";
async function write(path: string, fields: object) {
  const result = await fetch(`${documents}/${path}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  expect(result.ok, await result.text()).toBe(true);
}
async function owner(email = "owner@example.test") { await write("prototypes/inbox-prototype", { email: { stringValue: email } }); }
async function stored() {
  const response = await fetch(`${documents}/${messagePath}`, { headers: { Authorization: "Bearer owner" } });
  expect(response.ok).toBe(true);
  return (await response.json()).fields;
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test.beforeEach(async () => {
  await owner();
  await write("prototypes-index/inbox-regression", { prototypeId: { stringValue: "inbox-prototype" } });
  await write(messagePath, { email: { stringValue: "visitor@example.test" }, name: { stringValue: "Synthetic visitor" }, message: { stringValue: body }, createdAt: { timestampValue: "2026-10-14T10:00:00Z" }, readAt: { nullValue: null } });
});

for (const [locale, copy] of Object.entries({ en: en.inbox, sk: sk.inbox, de: de.inbox })) {
  const route = locale === "en" ? "/messages" : `/${locale}/messages`;
  for (const failure of ["permission-denied", "unavailable"]) {
    test(`${locale}: ${failure} keeps unread and content, announces failure, and retries`, async ({ page }) => {
      await page.goto(route);
      const summary = page.locator("summary");
      await expect(summary).toContainText(copy.unread);
      if (failure === "permission-denied") await owner("changed-owner@example.test");
      else await page.evaluate(() => { window.inboxTest.unavailable = true; });
      // Native keyboard activation must continue to open the inquiry.
      await summary.focus();
      await summary.press("Enter");
      await expect(page.getByText(body, { exact: true })).toBeVisible();
      await expect(page.getByRole("alert")).toContainText(/\S/);
      await expect(summary).toContainText(copy.unread);
      expect((await stored()).readAt).toEqual({ nullValue: null });
      await noOverflow(page);
      // The error and retry must use this language, not a raw key or English fallback.
      const localized = copy as typeof copy & { markReadError: string; retryMarkRead: string };
      await expect(page.getByRole("alert")).toContainText(localized.markReadError);
      const retry = page.getByRole("button", { name: localized.retryMarkRead, exact: true });
      await expect(retry).toBeVisible();
      await owner();
      await page.evaluate(() => { window.inboxTest.unavailable = false; });
      await retry.click();
      await expect(summary).not.toContainText(copy.unread);
      await expect(page.getByRole("alert")).toHaveCount(0);
      expect((await stored()).readAt.timestampValue).toBeTruthy();
      await expect(page.getByText(body, { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.locator("summary")).toContainText("Synthetic visitor");
      await expect(page.locator("summary")).not.toContainText(copy.unread);
      await noOverflow(page);
    });
  }
  test(`${locale}: permitted write persists and a pending write stays unread`, async ({ page }) => {
    await page.goto(route);
    const summary = page.locator("summary");
    await expect(summary).toContainText(copy.unread);
    await page.evaluate(() => { window.inboxTest.hold = true; });
    await summary.click();
    await expect.poll(() => page.evaluate(() => window.inboxTest.calls)).toBe(1);
    await expect(summary).toContainText(copy.unread);
    expect((await stored()).readAt).toEqual({ nullValue: null });
    // Closing/reopening while pending must not start a second write.
    await summary.press("Space");
    await expect(page.locator("details")).not.toHaveAttribute("open", "");
    await summary.press("Space");
    await expect(page.locator("details")).toHaveAttribute("open", "");
    expect(await page.evaluate(() => window.inboxTest.calls)).toBe(1);
    await page.evaluate(() => window.inboxTest.release?.());
    await expect(summary).not.toContainText(copy.unread);
    expect((await stored()).readAt.timestampValue).toBeTruthy();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.reload();
    await expect(page.locator("summary")).toContainText("Synthetic visitor");
    await expect(page.locator("summary")).not.toContainText(copy.unread);
    await noOverflow(page);
  });
}
