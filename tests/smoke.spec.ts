import { test, expect } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Golden App/);
  });

  test("landing page has no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Filter out expected errors (e.g., Firebase not configured)
    const unexpectedErrors = errors.filter(
      (e) => !e.includes("Firebase") && !e.includes("firebaseConfig")
    );
    expect(unexpectedErrors).toHaveLength(0);
  });

  test("login page accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("playground params apply", async ({ page }) => {
    await page.goto("/?sections=hero,features&palette=forest");
    await expect(page.locator("[data-section='hero']")).toBeVisible();
    await expect(page.locator("[data-section='features']")).toBeVisible();
  });
});
