import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
