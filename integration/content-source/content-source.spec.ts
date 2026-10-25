import { test, expect, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import { gitpulseCopy } from "../../lib/gitpulse/copy";

/**
 * A content item's source, added from a phone: the real dashboard, grid, record dialog and
 * source picker against the Firestore and Storage emulators running factory-web's real rules.
 */

const SLUG = "gitpulse-studio";
const UID = "content-source-user";
const documents = "http://127.0.0.1:8789/v1/projects/rules-test/databases/(default)/documents";
const objects = "http://127.0.0.1:9189/v0/b/rules-test.appspot.com/o";
const root = `demos/${SLUG}/users/${UID}`;
const owner = { Authorization: "Bearer owner" };
const copy = gitpulseCopy("en").source;
const grid = en.dataGrid;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function write(path: string, fields: object) {
  const response = await fetch(`${documents}/${path}`, { method: "PATCH", headers: { ...owner, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
  expect(response.ok, await response.text()).toBe(true);
}

/** The visitor's records as stored: title → `repository` value. */
async function stored(): Promise<Record<string, string>> {
  const response = await fetch(`${documents}/${root}/records`, { headers: owner });
  expect(response.ok).toBe(true);
  const body = (await response.json()) as { documents?: { fields: { values: { mapValue: { fields: Record<string, { stringValue?: string }> } } } }[] };
  return Object.fromEntries((body.documents ?? []).map((d) => {
    const values = d.fields.values.mapValue.fields;
    return [values.title?.stringValue ?? "", values.repository?.stringValue ?? ""];
  }));
}

async function objectExists(path: string): Promise<boolean> {
  const response = await fetch(`${objects}/${encodeURIComponent(path)}`, { headers: owner });
  return response.status === 200;
}

const uploadPath = (value: string) => {
  const match = /^(video|image|audio|markdown):([a-f0-9]{32})\/(.+)$/.exec(value);
  expect(match, value).not.toBeNull();
  return `${root}/uploads/${match![2]}/${match![3]}`;
};

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => { throw error; });
  const reset = await fetch("http://127.0.0.1:8789/emulator/v1/projects/rules-test/databases/(default)/documents", { method: "DELETE" });
  expect(reset.ok).toBe(true);
  await write(`prototypes-index/${SLUG}`, { prototypeId: { stringValue: "gitpulse-prototype" } });
  // A record the publish bar wrote before sources existed.
  await write(root, { count: { integerValue: "1" }, last: { stringValue: "legacy" } });
  await write(`${root}/records/legacy`, {
    values: { mapValue: { fields: {
      title: { stringValue: "21 live projects" }, week: { stringValue: "2026-10-12" }, repository: { stringValue: "tokenwise.sk/projects" },
      type: { stringValue: "Instagram" }, status: { stringValue: "Published" },
    } } },
    createdAt: { timestampValue: "2026-10-17T10:00:00Z" }, updatedAt: { timestampValue: "2026-10-17T10:00:00Z" },
  });
});

async function openAdd(page: Page) {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: grid.addAction.replace("{entity}", "content item") }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Title").fill(`Item ${Date.now()}`);
  await dialog.getByLabel("Week Of").fill("2026-10-26");
  await dialog.getByLabel("Content Type").selectOption("Instagram");
  await dialog.getByLabel("Status").selectOption("Draft");
  return dialog;
}

test("a video picked on the phone is uploaded, stored and shown in the grid", async ({ page }) => {
  const dialog = await openAdd(page);
  await dialog.getByLabel("Title").fill("Launch clip");
  await dialog.getByRole("radio", { name: copy.kinds.video }).check();
  await expect(dialog.getByText(copy.choose.video)).toBeVisible();
  await dialog.locator('input[type="file"]').setInputFiles({ name: "IMG 0042.MOV", mimeType: "video/quicktime", buffer: Buffer.alloc(64 * 1024, 7) });
  await expect(dialog.locator("[data-source-name]")).toHaveText("IMG 0042.MOV");
  await expect(dialog.locator("video")).toHaveCount(1);
  // Mobile first: however long the sheet grows, Save stays on screen without scrolling.
  const save = dialog.getByRole("button", { name: grid.save, exact: true });
  const box = await save.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  await save.click();
  await expect(dialog).toHaveCount(0);

  const value = (await stored())["Launch clip"]!;
  expect(value).toMatch(/^video:[a-f0-9]{32}\/IMG-0042\.MOV$/);
  expect(await objectExists(uploadPath(value))).toBe(true);
  const shown = page.locator('[data-pattern="data-grid"] [data-source-kind="video"]:visible');
  await expect(shown).toHaveText(/IMG-0042\.MOV/);
});

test("a link and a repository are stored as text, a bad link is refused", async ({ page }) => {
  let dialog = await openAdd(page);
  await dialog.getByLabel("Title").fill("Blog link");
  await dialog.getByRole("radio", { name: copy.kinds.url }).check();
  await dialog.getByLabel(copy.urlLabel).fill("example.com/post");
  await dialog.getByRole("button", { name: grid.save, exact: true }).click();
  await expect(dialog.getByText(copy.errors.url)).toBeVisible();
  await dialog.getByLabel(copy.urlLabel).fill("https://example.com/blog/post");
  await dialog.getByRole("button", { name: grid.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);

  dialog = await openAdd(page);
  await dialog.getByLabel("Title").fill("Repo week");
  await dialog.getByLabel(copy.repoLabel).fill("acme/app");
  await dialog.getByRole("button", { name: grid.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);

  const values = await stored();
  expect(values["Blog link"]).toBe("https://example.com/blog/post");
  expect(values["Repo week"]).toBe("acme/app");
  await expect(page.locator('[data-source-kind="url"]:visible')).toHaveText(/example\.com\/blog\/post/);
});

test("an empty source and a file the tile does not take are refused before any upload", async ({ page }) => {
  const dialog = await openAdd(page);
  await dialog.getByRole("radio", { name: copy.kinds.image }).check();
  await dialog.getByRole("button", { name: grid.save, exact: true }).click();
  await expect(dialog.getByText(grid.errorRequired.replace("{field}", "Source"))).toBeVisible();
  await dialog.locator('input[type="file"]').setInputFiles({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") });
  await expect(dialog.getByText(copy.errors.type)).toBeVisible();
  await expect(dialog.locator("[data-source-name]")).toHaveCount(0);
});

test("Markdown and sound previews, then both are stored", async ({ page }) => {
  let dialog = await openAdd(page);
  await dialog.getByLabel("Title").fill("Release notes");
  await dialog.getByRole("radio", { name: copy.kinds.markdown }).check();
  // Android reports .md as application/octet-stream.
  await dialog.locator('input[type="file"]').setInputFiles({ name: "notes.md", mimeType: "application/octet-stream", buffer: Buffer.from("# Week 43\n\nShipped the source picker.") });
  await expect(dialog.getByText("Shipped the source picker.")).toBeVisible();
  await dialog.getByRole("button", { name: grid.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);

  dialog = await openAdd(page);
  await dialog.getByLabel("Title").fill("Voice note");
  await dialog.getByRole("radio", { name: copy.kinds.audio }).check();
  await dialog.locator('input[type="file"]').setInputFiles({ name: "voice.m4a", mimeType: "audio/x-m4a", buffer: Buffer.alloc(2048, 1) });
  await expect(dialog.locator("audio")).toHaveCount(1);
  await dialog.getByRole("button", { name: grid.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);

  const values = await stored();
  expect(values["Release notes"]).toMatch(/^markdown:[a-f0-9]{32}\/notes\.md$/);
  expect(values["Voice note"]).toMatch(/^audio:[a-f0-9]{32}\/voice\.m4a$/);
  expect(await objectExists(uploadPath(values["Release notes"]!))).toBe(true);
  expect(await objectExists(uploadPath(values["Voice note"]!))).toBe(true);
});

test("an unreachable bucket fails the save with a message instead of hanging", async ({ page }, info) => {
  // 2026-10-26: with no default bucket the preflight is refused, the SDK sees a network error
  // and — by default — retries for ~17 minutes at "Uploading 0 %".
  test.skip(info.project.name !== "mobile", "the retry budget is the same on every viewport");
  test.setTimeout(150_000);
  await page.route("http://127.0.0.1:9189/**", (route) => route.abort("failed"));
  const dialog = await openAdd(page);
  await dialog.getByLabel("Title").fill("Offline clip");
  await dialog.getByRole("radio", { name: copy.kinds.video }).check();
  await dialog.locator('input[type="file"]').setInputFiles({ name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(64 * 1024, 3) });
  const save = dialog.getByRole("button", { name: grid.save, exact: true });
  await save.click();
  await expect(dialog.getByRole("alert")).toHaveText(copy.errors.upload, { timeout: 100_000 });
  await expect(save).toBeEnabled();
  expect((await stored())["Offline clip"]).toBeUndefined();
});

async function openRecord(page: Page, title: string) {
  const mobile = page.viewportSize()!.width < 640;
  const gridEl = page.locator('[data-pattern="data-grid"]');
  if (mobile) await gridEl.locator("ul").getByRole("button", { name: new RegExp(title) }).click();
  else await gridEl.getByRole("row").filter({ hasText: title }).getByRole("button", { name: grid.edit, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("replacing a file frees the old one, deleting the record frees the last", async ({ page }) => {
  let dialog = await openAdd(page);
  await dialog.getByLabel("Title").fill("Cover");
  await dialog.getByRole("radio", { name: copy.kinds.image }).check();
  await dialog.locator('input[type="file"]').setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG });
  await dialog.getByRole("button", { name: grid.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const first = uploadPath((await stored())["Cover"]!);
  expect(await objectExists(first)).toBe(true);

  // Editing shows the stored file with a way to open it.
  dialog = await openRecord(page, "Cover");
  await expect(dialog.getByRole("radio", { name: copy.kinds.image })).toBeChecked();
  await expect(dialog.locator("[data-source-name]")).toHaveText("cover.png");
  await expect(dialog.getByRole("link", { name: copy.open })).toHaveAttribute("href", /127\.0\.0\.1:9189/);
  await dialog.locator('input[type="file"]').setInputFiles({ name: "cover-v2.png", mimeType: "image/png", buffer: PNG });
  await dialog.getByRole("button", { name: grid.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const second = uploadPath((await stored())["Cover"]!);
  expect(second).not.toBe(first);
  expect(second.endsWith("/cover-v2.png")).toBe(true);
  await expect.poll(() => objectExists(first)).toBe(false);
  expect(await objectExists(second)).toBe(true);

  dialog = await openRecord(page, "Cover");
  await dialog.getByRole("button", { name: grid.delete, exact: true }).click();
  await dialog.getByRole("button", { name: grid.confirmDeleteAction, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => objectExists(second)).toBe(false);
});

test("a record written before sources existed opens as a repository and saves unchanged", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator('[data-source-kind="repository"]:visible')).toHaveText(/tokenwise\.sk\/projects/);
  const dialog = await openRecord(page, "21 live projects");
  await expect(dialog.getByRole("radio", { name: copy.kinds.repository })).toBeChecked();
  await expect(dialog.getByLabel(copy.repoLabel)).toHaveValue("tokenwise.sk/projects");
  await dialog.getByRole("button", { name: grid.save, exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect((await stored())["21 live projects"]).toBe("tokenwise.sk/projects");
});

test("the picker speaks Czech on /cs", async ({ page }) => {
  const cs = gitpulseCopy("cs").source;
  await page.goto("/cs/dashboard");
  await page.locator('[data-pattern="data-grid"]').getByRole("button").first().waitFor();
  await page.getByRole("button", { name: /Přidat|Add/ }).first().click();
  const dialog = page.getByRole("dialog");
  for (const kind of ["repository", "video", "image", "audio", "markdown", "url"] as const) {
    await expect(dialog.getByRole("radio", { name: cs.kinds[kind] })).toBeVisible();
  }
  await expect(dialog.getByText("Zdroj")).toBeVisible();
});
