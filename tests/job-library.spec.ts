import { test, expect } from "@playwright/test";
import { defaultJobRoles, JOB_LIBRARY_KEY, parseSavedRoles } from "../lib/job-library";
import { analyzeCv } from "../lib/cv-analyzer";

test("default roles provide usable descriptions in both languages", () => {
  for (const locale of ["en", "sk"] as const) {
    const roles = defaultJobRoles(locale);
    expect(roles).toHaveLength(10);
    expect(new Set(roles.map(role => role.id)).size).toBe(10);
    expect(new Set(roles.map(role => role.category))).toEqual(new Set(["ai", "data", "aws"]));
    for (const role of roles) {
      const analysis = analyzeCv("Python, SQL, AWS, Git", role.description)!;
      expect(analysis.method).toBe("skills");
      expect(analysis.matched.length + analysis.missing.length).toBeGreaterThanOrEqual(3);
    }
  }
});

test("stored data rejects corruption, collisions and oversized content", () => {
  expect(parseSavedRoles(null)).toEqual([]);
  for (const raw of ["not json", '{"version":2,"roles":[]}', '{"version":1,"roles":[{"id":"ml-engineer"}]}']) {
    expect(() => parseSavedRoles(raw)).toThrow();
  }
  const role = { id: "custom:example", title: "Platform Engineer", category: "aws", description: "AWS and Terraform" };
  expect(parseSavedRoles(JSON.stringify({ version: 1, roles: [role] }))).toEqual([role]);
  expect(() => parseSavedRoles(JSON.stringify({ version: 1, roles: [role, role] }))).toThrow();
  expect(() => parseSavedRoles(JSON.stringify({ version: 1, roles: [{ ...role, description: "x".repeat(50_001) }] }))).toThrow();
});

test.describe("job library", () => {
  test.beforeEach(async ({ page }) => { await page.goto("./analyze"); });

  test("searches 10 defaults and loads a role without changing the CV", async ({ page }) => {
    const select = page.getByLabel("Choose a role", { exact: true });
    await expect(select.locator("option")).toHaveCount(11);
    await page.getByLabel("CV", { exact: true }).fill("Python, SQL, machine learning, Git");
    await page.getByLabel("Job posting", { exact: true }).fill("My current posting");
    await select.selectOption("ml-engineer");
    await expect(page.getByLabel("Job posting", { exact: true })).toHaveValue("My current posting");
    await page.getByRole("button", { name: "Use role description" }).click();
    await expect(page.getByLabel("Job posting", { exact: true })).toHaveValue(/Machine Learning Engineer/);
    await expect(page.getByLabel("CV", { exact: true })).toHaveValue("Python, SQL, machine learning, Git");
    await expect(page.getByTestId("match-score")).toBeVisible();
    await page.getByLabel("Search roles", { exact: true }).fill("AWS");
    await expect(select.locator("option")).toHaveCount(4);
    await page.getByLabel("Search roles", { exact: true }).fill("does not exist");
    await expect(page.getByText("No roles match your search.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Use role description" })).toBeDisabled();
  });

  test("creates, reloads, edits and deletes a custom role while preserving defaults", async ({ page }) => {
    await page.getByLabel("Role title", { exact: true }).fill("Platform Engineer");
    await page.getByLabel("Role category", { exact: true }).selectOption("aws");
    await page.getByLabel("Job posting", { exact: true }).fill("AWS, Terraform and Kubernetes required.");
    await page.getByRole("button", { name: "Save current posting as a role" }).click();
    await expect(page.getByText("Role saved in this browser.", { exact: true })).toBeVisible();
    await page.reload();
    const select = page.getByLabel("Choose a role", { exact: true });
    await expect(select.locator("option")).toHaveCount(12);
    await select.selectOption({ label: "Platform Engineer" });
    await page.getByRole("button", { name: "Use role description" }).click();
    await expect(page.getByLabel("Job posting", { exact: true })).toHaveValue("AWS, Terraform and Kubernetes required.");
    await page.getByLabel("Role title", { exact: true }).fill("Senior Platform Engineer");
    await page.getByLabel("Job posting", { exact: true }).fill("AWS, Terraform, Kubernetes and Python required.");
    await page.getByRole("button", { name: "Update saved role" }).click();
    await page.reload();
    await select.selectOption({ label: "Senior Platform Engineer" });
    await page.getByRole("button", { name: "Use role description" }).click();
    await expect(page.getByLabel("Job posting", { exact: true })).toHaveValue(/and Python/);
    await page.getByRole("button", { name: "Delete saved role" }).click();
    await expect(select.locator("option")).toHaveCount(11);
    await expect(page.getByLabel("Job posting", { exact: true })).toHaveValue(/and Python/);
    await page.reload();
    await expect(select.locator("option")).toHaveCount(11);
  });

  test("validates empty input and handles broken storage without overwriting it", async ({ page }) => {
    await page.getByRole("button", { name: "Save current posting as a role" }).click();
    await expect(page.getByRole("region", { name: "Job title library" }).getByRole("alert")).toContainText("Enter a role title");
    await page.evaluate(key => localStorage.setItem(key, "damaged"), JOB_LIBRARY_KEY);
    await page.reload();
    await expect(page.getByRole("region", { name: "Job title library" }).getByRole("alert")).toContainText("could not be read or saved");
    await page.getByLabel("Choose a role", { exact: true }).selectOption("aws-cloud-engineer");
    await page.getByRole("button", { name: "Use role description" }).click();
    await page.getByRole("button", { name: "Save current posting as a role" }).click();
    expect(await page.evaluate(key => localStorage.getItem(key), JOB_LIBRARY_KEY)).toBe("damaged");
  });

  test("a refused storage write reports failure and keeps the posting", async ({ page }) => {
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException("Quota exceeded", "QuotaExceededError"); }; });
    await page.getByLabel("Role title", { exact: true }).fill("Custom role");
    await page.getByLabel("Job posting", { exact: true }).fill("Python and AWS");
    await page.getByRole("button", { name: "Save current posting as a role" }).click();
    await expect(page.getByRole("region", { name: "Job title library" }).getByRole("alert")).toContainText("could not be read or saved");
    await expect(page.getByLabel("Job posting", { exact: true })).toHaveValue("Python and AWS");
    await expect(page.getByLabel("Choose a role", { exact: true }).locator("option")).toHaveCount(11);
  });

  test("Slovak roles load Slovak descriptions and fit a mobile viewport", async ({ page }) => {
    await page.goto("./sk/analyze");
    await expect(page.getByRole("heading", { name: "Knižnica pracovných pozícií" })).toBeVisible();
    await page.getByLabel("Vyberte rolu", { exact: true }).selectOption("data-analyst");
    await page.getByRole("button", { name: "Použiť popis roly" }).click();
    await expect(page.getByLabel("Pracovná ponuka", { exact: true })).toHaveValue(/Meňte firemné dáta/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
