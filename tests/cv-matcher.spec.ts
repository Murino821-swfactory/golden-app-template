import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const fixture = (extension: string) => resolve(`tests/fixtures/cv/resume.${extension}`);

/**
 * OTH-85 — the CV matcher on its public page. The export is what ships, so this runs
 * against `out/` like the rest of the suite. English is the build's locale.
 */

test.describe("CV matcher", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./analyze");
  });

  test("starts empty and says what to do", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Match a CV to a job" })).toBeVisible();
    await expect(page.getByText("Paste both texts, or load a sample")).toBeVisible();
  });

  test("a sample fills both panels and scores them in one click", async ({ page }) => {
    await page.getByRole("button", { name: "Load sample: Frontend Developer" }).click();

    await expect(page.getByLabel("CV", { exact: true })).toHaveValue(/Jana Novak/);
    await expect(page.getByLabel("Job posting", { exact: true })).toHaveValue(/Frontend Developer/);
    await expect(page.getByTestId("match-score")).toHaveText("52%");
    await expect(page.getByTestId("match-tier")).toHaveText("Partial match");

    const matched = page.getByRole("list", { name: "Matched skills" });
    const missing = page.getByRole("list", { name: "Missing skills" });
    await expect(matched.getByText("React", { exact: true })).toBeVisible();
    await expect(missing.getByText("TypeScript", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recommendations" })).toBeVisible();
    await expect(page.getByText("Add to the CV")).toBeVisible();
  });

  test("the three samples land in the three tiers", async ({ page }) => {
    const tier = page.getByTestId("match-tier");
    await page.getByRole("button", { name: "Load sample: Backend Developer" }).click();
    await expect(tier).toHaveText("Strong match");
    await page.getByRole("button", { name: "Load sample: Product Manager" }).click();
    await expect(tier).toHaveText("Weak match");
  });

  test("the score follows what is typed", async ({ page }) => {
    await page.getByLabel("CV", { exact: true }).fill("React and TypeScript");
    await page.getByLabel("Job posting", { exact: true }).fill("React, TypeScript, GraphQL, Docker");
    await expect(page.getByTestId("match-score")).toHaveText("50%");

    await page.getByRole("button", { name: "Clear CV" }).click();
    await expect(page.getByText("Paste both texts, or load a sample")).toBeVisible();
  });

  test("exports the report as Markdown", async ({ page }) => {
    await page.getByRole("button", { name: "Load sample: Frontend Developer" }).click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export Markdown" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("cv-match-report.md");
    const body = await readFile((await download.path())!, "utf-8");
    expect(body).toContain("# CV match report");
    expect(body).toContain("52%");
  });

  test("offers file and LinkedIn import next to the CV box", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Upload CV file (PDF, DOC, DOCX)" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Import from LinkedIn/ })).toBeVisible();
  });

  test("the LinkedIn button opens guided export instructions", async ({ page }) => {
    await page.getByRole("button", { name: /Import from LinkedIn/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Import from LinkedIn")).toBeVisible();
    await expect(dialog.getByText("Click More → Save to PDF")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Upload LinkedIn PDF" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("an unsupported file is refused with a clear message", async ({ page }) => {
    await page.getByTestId("cv-file-input").setInputFiles({
      name: "headshot.png",
      mimeType: "image/png",
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
    await expect(page.getByRole("alert").filter({ hasText: "Only PDF" })).toHaveText("Only PDF, DOC and DOCX files are supported.");
    // The CV box stays empty and the tool is still usable.
    await expect(page.getByLabel("CV", { exact: true })).toHaveValue("");
  });

  for (const extension of ["pdf", "doc", "docx"]) {
    test(`imports real ${extension.toUpperCase()} text and recomputes the match`, async ({ page }) => {
      const uploads: string[] = [];
      page.on("request", request => {
        if (request.method() !== "GET" && request.method() !== "HEAD") uploads.push(request.url());
      });
      await page.getByLabel("Job posting", { exact: true }).fill("React, TypeScript, Docker, GraphQL");
      await page.getByTestId("cv-file-input").setInputFiles(fixture(extension));
      await expect(page.getByLabel("CV", { exact: true })).toHaveValue(/Jana Nováková/, { timeout: 15000 });
      await expect(page.getByTestId("match-score")).toHaveText("100%");
      expect(uploads).toEqual([]);
    });
  }

  test("imports a LinkedIn PDF through the dialog", async ({ page }) => {
    await page.getByRole("button", { name: /Import from LinkedIn/ }).click();
    await page.getByTestId("linkedin-file-input").setInputFiles(fixture("pdf"));
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15000 });
    await expect(page.getByLabel("CV", { exact: true })).toHaveValue(/React and TypeScript/);
  });

  test("a corrupt document preserves the existing CV and allows a retry", async ({ page }) => {
    await page.getByLabel("CV", { exact: true }).fill("Existing candidate text");
    await page.getByTestId("cv-file-input").setInputFiles({
      name: "broken.doc", mimeType: "application/msword", buffer: Buffer.from("not a Word document"),
    });
    await expect(page.getByRole("alert").filter({ hasText: "Could not read" })).toContainText("Could not read the file");
    await expect(page.getByLabel("CV", { exact: true })).toHaveValue("Existing candidate text");
    await page.getByTestId("cv-file-input").setInputFiles(fixture("doc"));
    await expect(page.getByLabel("CV", { exact: true })).toHaveValue(/Jana Nováková/);
  });

  test("imports a dropped DOCX without navigating away", async ({ page }) => {
    const bytes = Array.from(await readFile(fixture("docx")));
    const transfer = await page.evaluateHandle(bytes => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([Uint8Array.from(bytes)], "resume.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }));
      return transfer;
    }, bytes);
    await page.getByLabel("CV", { exact: true }).dispatchEvent("drop", { dataTransfer: transfer });
    await expect(page.getByLabel("CV", { exact: true })).toHaveValue(/Jana Nováková/);
    await expect(page).toHaveURL(/\/analyze\/?$/);
  });

  test("imports in Slovak with localized LinkedIn instructions", async ({ page }) => {
    await page.goto("./sk/analyze");
    await page.getByRole("button", { name: /Importovať z LinkedIn/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Uložiť ako PDF");
    await page.getByTestId("linkedin-file-input").setInputFiles(fixture("pdf"));
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15000 });
    await expect(page.getByLabel("Životopis", { exact: true })).toHaveValue(/Jana Nováková/);
  });

  test("has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.reload();
    await page.getByRole("button", { name: "Load sample: Backend Developer" }).click();
    await page.waitForLoadState("networkidle");
    expect(errors.filter((e) => !e.includes("Firebase"))).toHaveLength(0);
  });
});

test("the landing CTA opens the analyzer instead of a missing page", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Analyze your first CV" }).first().click();
  await expect(page).toHaveURL(/\/analyze\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Match a CV to a job" })).toBeVisible();
});
