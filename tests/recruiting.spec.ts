import { test, expect, type Page } from "@playwright/test";

/**
 * The recruiting workspace in the browser — the demo desk a headhunter is shown. Runs
 * against the export like the rest of the suite, desktop and phone. Every test starts
 * from a fresh seed (localStorage cleared), so order does not matter.
 */

async function fresh(page: Page, path: string) {
  await page.goto("./workspace");
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
}

test.describe("recruiting workspace", () => {
  test("opens on the demo desk with KPIs and things that need attention", async ({ page }) => {
    await fresh(page, "./workspace");
    await expect(page.getByRole("heading", { level: 1, name: /today's desk/ })).toBeVisible();
    const tiles = page.getByTestId("overview-kpis").locator(":scope > div");
    await expect(tiles).toHaveCount(6);
    await expect(page.getByTestId("overview-kpis")).toContainText("Open jobs");
    await expect(page.getByTestId("overview-kpis")).toContainText("4");
    await expect(page.getByText(/consent expires within 30 days/)).toBeVisible();
    await expect(page.getByText(/interview today|interviews today/)).toBeVisible();
    await expect(page.getByText(/not moved for a week/)).toBeVisible();
  });

  test("a task survives a reload — the desk lives in the browser", async ({ page }) => {
    await fresh(page, "./workspace");
    await page.getByLabel("Add task").fill("Call the new client");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Call the new client")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Call the new client")).toBeVisible();
  });

  test("the pipeline shows six stages and a card can be moved forward", async ({ page }) => {
    await fresh(page, "./workspace/pipeline");
    const board = page.getByTestId("pipeline-board");
    await expect(board.locator("section[data-stage]")).toHaveCount(6);
    const sourced = board.locator('section[data-stage="sourced"]');
    const screening = board.locator('section[data-stage="screening"]');
    await expect(sourced.getByTestId("pipeline-card")).toHaveCount(1);
    const screeningBefore = await screening.getByTestId("pipeline-card").count();
    await sourced.getByRole("button", { name: "Application actions" }).click();
    await page.getByRole("menuitem", { name: /Move forward/ }).click();
    await expect(sourced.getByTestId("pipeline-card")).toHaveCount(0);
    await expect(screening.getByTestId("pipeline-card")).toHaveCount(screeningBefore + 1);
  });

  test("an application drawer scores with the matcher and books a placement", async ({ page }) => {
    await fresh(page, "./workspace/pipeline?app=app-kovacova-pm");
    const drawer = page.getByRole("dialog");
    await expect(drawer).toContainText("Lucia Kováčová · Product Manager");
    await expect(drawer.getByText("Not scored")).toBeVisible();
    await drawer.getByRole("button", { name: "Score with the matcher" }).click();
    await expect(drawer.getByText(/\d+% match/).first()).toBeVisible();

    await drawer.getByRole("button", { name: "Create placement" }).click();
    const placement = page.getByRole("dialog").filter({ hasText: "Create placement" });
    await placement.getByLabel("Agreed salary (gross, yearly)").fill("52000");
    await placement.getByLabel("Fee %").fill("20");
    await expect(placement).toContainText("10,400");
    await placement.getByRole("button", { name: "Place candidate" }).click();
    await expect(page.getByRole("dialog").first()).toContainText("Placed");
  });

  test("a candidate's consent can be renewed and the candidate added to a job", async ({ page }) => {
    await fresh(page, "./workspace/candidates?id=cand-vargova");
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("heading", { name: "Katarína Vargová" })).toBeVisible();
    const consent = drawer.getByTestId("consent-panel");
    await expect(consent).toContainText("expires in 20 days");
    await consent.getByRole("button", { name: "Renew consent" }).click();
    await expect(consent).not.toContainText("expires in");
    await expect(consent).toContainText("Consent granted");

    // The first open job she is not in yet: the backend role (she already sits in Data Engineer).
    await drawer.getByRole("button", { name: "Add to pipeline" }).click();
    await expect(drawer.getByRole("button", { name: /Senior Backend Engineer/ })).toBeVisible();
  });

  test("a new candidate is created from an uploaded CV with fields pre-filled", async ({ page }) => {
    await fresh(page, "./workspace/candidates");
    await page.getByRole("button", { name: "Add candidate" }).click();
    await page.getByTestId("candidate-cv-input").setInputFiles("tests/fixtures/cv/resume.pdf");
    const form = page.getByRole("dialog");
    await expect(form.getByLabel("First name")).toHaveValue("Jana", { timeout: 15000 });
    await expect(form.getByLabel("Skills", { exact: true })).toHaveValue(/React/);
    await form.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: /Jana Nováková/ })).toBeVisible();
  });

  test("a job finds matches in the pool and adds one to its pipeline", async ({ page }) => {
    await fresh(page, "./workspace/jobs?id=job-devops");
    const drawer = page.getByRole("dialog");
    await drawer.getByRole("button", { name: "Find matches" }).click();
    const matches = drawer.getByTestId("job-matches");
    // D. Mlynár was rejected for this job, so he is "in process" and not offered again.
    await expect(matches).not.toContainText("Dávid Mlynár");
    await expect(matches.locator("li").first()).toContainText(/\d+% match/);
    const pipelineBefore = await drawer.getByTestId("job-pipeline").locator("li").count();
    await matches.locator("li").first().getByRole("button", { name: "Add" }).click();
    await expect(drawer.getByTestId("job-pipeline").locator("li")).toHaveCount(pipelineBefore + 1);
  });

  test("an interview gets a scorecard", async ({ page }) => {
    await fresh(page, "./workspace/interviews");
    await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();
    await page.getByRole("button", { name: "Open scorecard" }).first().click();
    const card = page.getByRole("dialog");
    await expect(card).toContainText("Interview scorecard");
    for (const group of await card.getByRole("group", { name: /^Rating:/ }).all()) await group.getByRole("button", { name: "5" }).click();
    await card.getByRole("button", { name: "Strong yes" }).click();
    await expect(card).toContainText("Average: 5.0");
    await card.getByRole("button", { name: "Save scorecard" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Done").first()).toBeVisible();
  });

  test("reports draw the funnel and fees from the desk", async ({ page }) => {
    await fresh(page, "./workspace/reports");
    await expect(page.getByRole("heading", { name: "Funnel" })).toBeVisible();
    await expect(page.getByText("15 reached")).toBeVisible();
    await expect(page.getByText("Northwind Analytics s.r.o.").first()).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export placements (CSV)" }).click()]);
    expect(download.suggestedFilename()).toBe("placements.csv");
  });

  test("the workspace matcher saves a score onto the application", async ({ page }) => {
    await fresh(page, "./workspace/matcher");
    await page.getByLabel("Candidate from the workspace").selectOption("cand-horvathova");
    await page.getByLabel("Job from the workspace").selectOption("job-backend");
    await expect(page.getByTestId("match-score")).toHaveText(/\d+%/);
    await page.getByRole("button", { name: "Save score to the application" }).click();
    await expect(page.getByText("Score saved.")).toBeVisible();
  });

  test("settings export the workspace as JSON and can start empty", async ({ page }) => {
    await fresh(page, "./workspace/settings");
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export workspace (JSON)" }).click()]);
    expect(download.suggestedFilename()).toBe("cv-matcher-workspace.json");
    await page.getByRole("button", { name: "Start empty" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Start empty" }).click();
    await page.goto("./workspace/candidates");
    await expect(page.getByText("No candidates yet.")).toBeVisible();
  });

  test("the Slovak desk speaks Slovak", async ({ page }) => {
    await fresh(page, "./sk/workspace");
    await expect(page.getByRole("heading", { level: 1, name: /dnešný stôl/ })).toBeVisible();
    await expect(page.getByTestId("overview-kpis")).toContainText("Otvorené pozície");
    await page.goto("./sk/workspace/pipeline");
    await expect(page.getByTestId("pipeline-board").locator('section[data-stage="sourced"]')).toContainText("Vytipovaní");
  });

  test("every workspace page renders without console errors, on phone too", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await fresh(page, "./workspace");
    for (const route of ["pipeline", "candidates", "jobs", "clients", "interviews", "matcher", "reports", "settings"]) {
      await page.goto(`./workspace/${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.waitForLoadState("networkidle");
    expect(errors.filter((e) => !e.includes("Firebase"))).toHaveLength(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("landing", () => {
  test("the hero CTA opens the workspace and the second CTA the matcher", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("link", { name: "Open the demo workspace" }).first().click();
    await expect(page).toHaveURL(/\/workspace\/?$/);
    await page.goto("./");
    await page.getByRole("button", { name: "Try the CV matcher" }).click();
    await expect(page).toHaveURL(/\/workspace\/matcher\/?$/);
  });

  test("the dashboard sends a signed-out visitor to sign in, never to a dead page", async ({ page }) => {
    await page.goto("./dashboard");
    await expect(page).toHaveURL(/\/login\/?$/);
  });
});
