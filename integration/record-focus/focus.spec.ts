import { test, expect, type Locator, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import sk from "../../messages/sk.json";
import de from "../../messages/de.json";
import { RECORD_LIMIT } from "../../lib/records";

const documents = "http://127.0.0.1:8788/v1/projects/rules-test/databases/(default)/documents";
const root = "demos/record-focus-regression/users/record-keyboard-user";
async function write(path: string, fields: object) {
  const response = await fetch(`${documents}/${path}`, { method: "PATCH", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  expect(response.ok, await response.text()).toBe(true);
}
async function stored(path = root) {
  const response = await fetch(`${documents}/${path}`, { headers: { Authorization: "Bearer owner" } });
  expect(response.ok).toBe(true);
  return (await response.json()).fields;
}
async function seed(count = 3) {
  const response = await fetch("http://127.0.0.1:8788/emulator/v1/projects/rules-test/databases/(default)/documents", { method: "DELETE" });
  expect(response.ok).toBe(true);
  await write("prototypes-index/record-focus-regression", { prototypeId: { stringValue: "record-focus-prototype" } });
  await write(root, { count: { integerValue: String(count) }, last: { stringValue: "record-0" } });
  for (let i = 0; i < count; i++) {
    await write(`${root}/records/record-${i}`, {
      values: { mapValue: { fields: { name: { stringValue: `Synthetic route ${i}` }, mode: { stringValue: "Bus" }, lengthKm: { integerValue: "24" }, active: { booleanValue: true } } } },
      createdAt: { timestampValue: new Date(Date.UTC(2026, 9, 21, 10, 0, count - i)).toISOString() },
      updatedAt: { timestampValue: "2026-10-21T10:00:00Z" },
    });
  }
}
function opener(page: Page, name: string, board: boolean, mobile: boolean, edit: string) {
  const grid = page.locator('[data-pattern="data-grid"]');
  if (board) return grid.locator("[data-board]").getByRole("button", { name: new RegExp(name) });
  if (mobile) return grid.locator("ul").getByRole("button", { name: new RegExp(name) });
  return grid.getByRole("row").filter({ hasText: name }).getByRole("button", { name: edit, exact: true });
}
async function open(control: Locator, page: Page) {
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  await control.focus();
  await control.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(() => page.getByRole("dialog").evaluate(el => el.contains(document.activeElement))).toBe(true);
}
async function closedAt(page: Page, target: Locator) {
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(target).toBeFocused();
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", error => { throw error; });
  await seed();
});
for (const [locale, messages] of Object.entries({ en, sk, de })) {
  const copy = messages.dataGrid;
  const entity = locale === "sk" ? "trasa" : "route";
  const addName = copy.addAction.replace("{entity}", entity);
  const route = locale === "en" ? "/dashboard" : `/${locale}/dashboard`;
  for (const board of [true, false]) {
    test(`${locale} ${board ? "board" : "rows"}: Escape, Cancel, save, deletion and containment`, async ({ page }, testInfo) => {
      const mobile = testInfo.project.name === "mobile";
      await page.goto(route);
      const grid = page.locator('[data-pattern="data-grid"]');
      await grid.getByRole("button", { name: board ? copy.viewBoard : copy.viewTable, exact: true }).click();
      const card = (name: string) => opener(page, name, board, mobile, copy.edit);
      const first = card("Synthetic route 0");
      await open(first, page);
      // Traverse both tab boundaries; the real Radix focus trap must hold.
      for (const key of ["Tab", "Shift+Tab"]) {
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press(key);
          await expect.poll(() => page.getByRole("dialog").evaluate(el => el.contains(document.activeElement))).toBe(true);
        }
      }
      await page.keyboard.press("Escape");
      await closedAt(page, first);
      await page.keyboard.press("Tab");
      await expect(card("Synthetic route 1")).toBeFocused();
      await open(first, page);
      await page.getByRole("dialog").getByRole("button", { name: copy.cancel, exact: true }).click();
      await closedAt(page, first);
      await open(first, page);
      await page.locator("#field-name").fill("Updated synthetic route");
      await page.getByRole("dialog").getByRole("button", { name: copy.save, exact: true }).click();
      await closedAt(page, card("Updated synthetic route"));
      expect((await stored(`${root}/records/record-0`)).values.mapValue.fields.name.stringValue).toBe("Updated synthetic route");
      expect((await stored()).count.integerValue).toBe("3");
      await page.reload();
      if (board) await expect(grid.getByRole("button", { name: copy.viewBoard, exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(card("Updated synthetic route")).toBeVisible();
      // Delete middle -> next; delete last -> previous; delete sole record -> Add.
      for (const [name, fallback] of [["Synthetic route 1", "Synthetic route 2"], ["Synthetic route 2", "Updated synthetic route"], ["Updated synthetic route", null]]) {
        await open(card(name!), page);
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: copy.delete, exact: true }).click();
        await dialog.getByRole("button", { name: copy.confirmDeleteAction, exact: true }).click();
        await closedAt(page, fallback ? card(fallback) : grid.getByRole("button", { name: addName, exact: true }));
      }
      expect((await stored()).count.integerValue).toBe("0");
      await page.reload();
      await expect(grid.getByText(copy.empty.replace("{entity}", entity), { exact: true })).toBeVisible();
    });
  }
  test(`${locale}: Add cancel/escape/save and required validation restore Add`, async ({ page }) => {
    await page.goto(route);
    const grid = page.locator('[data-pattern="data-grid"]');
    const add = grid.getByRole("button", { name: addName, exact: true });
    await open(add, page);
    await page.keyboard.press("Escape");
    await closedAt(page, add);
    await open(add, page);
    await page.getByRole("dialog").getByRole("button", { name: copy.cancel, exact: true }).click();
    await closedAt(page, add);
    await open(add, page);
    await page.getByRole("dialog").getByRole("button", { name: copy.save, exact: true }).click();
    await expect(page.locator("#field-name")).toHaveAttribute("aria-invalid", "true");
    expect((await stored()).count.integerValue).toBe("3");
    await page.locator("#field-name").fill("Added synthetic route");
    await page.getByRole("dialog").getByRole("button", { name: copy.save, exact: true }).click();
    await closedAt(page, add);
    expect((await stored()).count.integerValue).toBe("4");
    await page.reload();
    await expect(grid.getByText("Added synthetic route", { exact: true }).filter({ visible: true })).toBeVisible();
  });
  test(`${locale}: saving the final allowed record preserves the cap and a logical focus target`, async ({ page }) => {
    await seed(RECORD_LIMIT - 1);
    await page.goto(route);
    const grid = page.locator('[data-pattern="data-grid"]');
    const add = grid.getByRole("button", { name: addName, exact: true });
    await open(add, page);
    await page.locator("#field-name").fill("Final allowed synthetic route");
    await page.getByRole("dialog").getByRole("button", { name: copy.save, exact: true }).click();
    // Add becomes disabled at the cap: Search is the documented fallback.
    await closedAt(page, grid.getByRole("searchbox"));
    await expect(add).toBeDisabled();
    await expect(grid.getByRole("status")).toContainText(String(RECORD_LIMIT));
    expect((await stored()).count.integerValue).toBe(String(RECORD_LIMIT));
    await page.reload();
    await expect(add).toBeDisabled();
  });
  test(`${locale}: a delayed refresh restores Add when an edit no longer matches Search`, async ({ page }, testInfo) => {
    await page.goto(route);
    const grid = page.locator('[data-pattern="data-grid"]');
    const add = grid.getByRole("button", { name: addName, exact: true });
    await expect(add).toBeEnabled();
    await grid.getByRole("searchbox").fill("Synthetic route 0");
    await open(opener(page, "Synthetic route 0", false, testInfo.project.name === "mobile", copy.edit), page);
    await page.evaluate(() => { window.recordFocusTest.holdReads = true; });
    await page.locator("#field-name").fill("Filtered out after save");
    await page.getByRole("dialog").getByRole("button", { name: copy.save, exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.recordFocusTest.releaseReads.length)).toBeGreaterThan(0);
    await expect(add).toBeDisabled();
    await page.evaluate(() => {
      window.recordFocusTest.holdReads = false;
      window.recordFocusTest.releaseReads.splice(0).forEach(release => release());
    });
    await closedAt(page, add);
    await expect(grid.getByText(copy.noMatches, { exact: true })).toBeVisible();
    expect((await stored(`${root}/records/record-0`)).values.mapValue.fields.name.stringValue).toBe("Filtered out after save");
    expect((await stored()).count.integerValue).toBe("3");
  });
}
