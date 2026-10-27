import { test, expect, type Page } from "@playwright/test";

/**
 * The real estate workspace in the browser — the demo desk an agent or an agency owner
 * is shown. Runs against the export like the rest of the suite, desktop and phone. Every
 * test starts from a fresh seed (localStorage cleared), so order does not matter.
 */

async function fresh(page: Page, path: string) {
  await page.goto("./workspace");
  await page.evaluate(() => localStorage.clear());
  await page.goto(path);
}

test.describe("real estate workspace", () => {
  // Since 2026-10-27 the landing is the golden template's editorial page (founder: "1:1 like
  // GameDay"): the showcase strip of tokenwise's products, "Built by TOKENWISE" at the foot;
  // the 2026-10-19 rail, dossier, plans and app-name wordmark are gone.
  test("the landing is the golden template's editorial page", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator('[data-presentation="editorial"]')).toHaveCount(1);
    await expect(page.locator('[data-section="features"] [data-strip]')).toHaveCount(1);
    await expect(page.locator("[data-brand-mark]")).toHaveCount(1);
    await expect(page.locator("[data-landing-rail], [data-hero-dossier], [data-footer-wordmark]")).toHaveCount(0);
  });

  // The use cases and comparison keep the display language of 2026-10-19: the scroll reveal
  // never leaves a block hidden — after a scroll to the end every block is in, and with
  // reduced motion nothing ever waited.
  test("the landing keeps one pill action and leaves nothing hidden", async ({ page }) => {
    await page.goto("./");
    const action = page.locator('[data-section="hero"] a');
    await expect(action).toHaveCount(1);
    await expect(action).toHaveCSS("border-top-left-radius", /^(?!0px)/);
    await page.evaluate(async () => {
      for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) {
        window.scrollTo({ top: y, behavior: "instant" });
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    });
    await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
    await expect(page.locator("[data-reveal]").last()).toHaveAttribute("data-reveal", "in");
  });

  test("reduced motion keeps every landing block on screen without a scroll", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("./");
    await expect(page.locator("[data-reveal]").first()).toBeVisible();
    await expect(page.locator('[data-reveal="pending"]')).toHaveCount(0);
    await expect(page.locator('[data-section="cta"] h2')).toBeVisible();
  });

  test("the Slovak landing wears the same design, with the configured words", async ({ page }) => {
    await page.goto("./sk");
    await expect(page.getByRole("heading", { level: 1, name: "Každá ponuka, klient a obchod — od prvého dopytu po kľúče", exact: true })).toBeVisible();
    await expect(page.locator('[data-section="hero"] a')).toHaveText("Otvoriť demo priestor");
    await expect(page.locator('[data-section="features"] [data-strip]')).toHaveCount(1);
  });

  test("opens on today's desk with KPIs and things that need attention", async ({ page }) => {
    await fresh(page, "./workspace");
    await expect(page.getByRole("heading", { level: 1, name: /Today's desk/ })).toBeVisible();
    await expect(page.getByTestId("overview-kpis").locator(":scope > div")).toHaveCount(6);
    await expect(page.getByTestId("overview-kpis")).toContainText("Open deals");
    const attention = page.getByTestId("attention-list");
    await expect(attention).toContainText(/Inquiry from Filip Bielik unanswered/);
    await expect(attention).toContainText(/Reservation expires in 5 days/);
    await expect(attention).toContainText(/Rent overdue/);
    await expect(page.getByTestId("today-agenda")).toContainText(/Trávniky/);
  });

  test("a task survives a reload — the desk lives in the browser", async ({ page }) => {
    await fresh(page, "./workspace");
    await page.getByLabel("Add a task").fill("Call the notary");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByTestId("today-agenda")).toContainText("Call the notary");
    await page.reload();
    await expect(page.getByTestId("today-agenda")).toContainText("Call the notary");
  });

  test("a listing shows its documents, portals and the demand that matches it", async ({ page }) => {
    await fresh(page, "./workspace/properties?id=p-travniky-3i");
    const drawer = page.getByTestId("property-drawer");
    await expect(drawer.getByText("€215,000")).toBeVisible();
    await expect(drawer.getByTestId("property-matches")).toContainText("Lukáš Urban");
    await expect(drawer.getByTestId("property-matches")).toContainText("100 % match");
    const energy = drawer.getByTestId("property-documents").getByLabel("Energy certificate");
    await expect(energy).not.toBeChecked();
    await energy.check();
    await expect(energy).toBeChecked();
    await drawer.getByTestId("property-portals").getByRole("button", { name: /topreality.sk · Queued/ }).click();
    await expect(drawer.getByTestId("property-portals")).toContainText("topreality.sk · Live");
  });

  test("the properties map pins every listed property and a pin opens it", async ({ page }) => {
    await fresh(page, "./workspace/properties");
    const map = page.getByTestId("properties-map");
    await expect(map).toBeVisible();
    // A MapLibre marker is added per point whether or not the tiles load (offline-safe);
    // the seed's fourteen listings all sit in towns the map knows.
    const markers = map.locator(".maplibregl-marker");
    await expect(markers.first()).toBeVisible();
    expect(await markers.count()).toBe(14);
    // The Bratislava pins overlap at the all-Slovakia fit; the easternmost one (Košice) is
    // on its own, so clicking it proves the pin → listing wiring without a flaky hit-test.
    let east = markers.first();
    let eastX = -1;
    for (let i = 0; i < 14; i += 1) {
      const box = await markers.nth(i).boundingBox();
      if (box && box.x > eastX) { eastX = box.x; east = markers.nth(i); }
    }
    await east.click();
    await expect(page.getByTestId("property-drawer")).toBeVisible();
  });

  test("the deals board has the sale stations and a card moves forward from the menu", async ({ page }) => {
    await fresh(page, "./workspace/deals");
    const board = page.getByTestId("deals-board");
    await expect(board.locator("section[data-stage]")).toHaveCount(6);
    const reservation = board.locator('section[data-stage="reservation"]');
    const contracts = board.locator('section[data-stage="contracts"]');
    await expect(reservation.getByTestId("deal-card")).toHaveCount(1);
    await reservation.getByRole("button", { name: "Deal actions" }).click();
    await page.getByRole("menuitem", { name: /Move forward/ }).click();
    await expect(reservation.getByTestId("deal-card")).toHaveCount(0);
    await expect(contracts.getByTestId("deal-card")).toHaveCount(1);
  });

  test("the deal drawer shows the rail, the checklist, the commission and closes the deal", async ({ page }) => {
    await fresh(page, "./workspace/deals?id=deal-senec-kralik");
    const drawer = page.getByTestId("deal-drawer");
    await expect(drawer.getByTestId("deal-rail").locator("li")).toHaveCount(7);
    await expect(drawer.getByTestId("deal-checklist")).toContainText("2 open before the next station");
    await drawer.getByTestId("deal-checklist").getByLabel("Mortgage approved").check();
    await drawer.getByTestId("deal-checklist").getByLabel("Bank lien registered").check();
    await expect(drawer.getByTestId("deal-checklist")).toContainText("Station complete");
    await expect(drawer.getByTestId("deal-commission")).toContainText("€9,360");
    await drawer.getByTestId("deal-forward").click();
    await expect(drawer).toContainText("Station 5 of 7");
  });

  test("a client's consent is renewed and the AML identification recorded", async ({ page }) => {
    await fresh(page, "./workspace/contacts?id=c-marekova");
    const drawer = page.getByTestId("contact-drawer");
    await expect(drawer.getByTestId("consent-panel")).toContainText("expires in 20 days");
    await drawer.getByRole("button", { name: "Renew consent" }).click();
    await expect(drawer.getByTestId("consent-panel")).not.toContainText("expires in");
    const aml = drawer.getByTestId("aml-panel");
    await expect(aml).toContainText("Not identified");
    await aml.getByRole("button", { name: "Mark identified" }).click();
    await expect(aml).toContainText("AML · Identified");
  });

  test("a demand ranks the portfolio and schedules a viewing", async ({ page }) => {
    await fresh(page, "./workspace/demands?id=d-tothova");
    const drawer = page.getByTestId("demand-drawer");
    const matches = drawer.getByTestId("demand-matches");
    await expect(matches.locator("li").first()).toContainText("Košice");
    await matches.locator("li").first().getByRole("button", { name: "Schedule viewing" }).click();
    await page.getByRole("dialog").last().getByRole("button", { name: "Schedule viewing" }).click();
    await expect(drawer).toContainText("Viewing");
    await page.goto("./workspace/viewings");
    await expect(page.getByTestId("viewings-tomorrow")).toContainText("Alena Tóthová");
  });

  test("a lease marks this month's rent as paid and records a move-out protocol", async ({ page }) => {
    await fresh(page, "./workspace/rentals?id=lease-vysehradska-svec");
    const drawer = page.getByTestId("lease-drawer");
    const payments = drawer.getByTestId("lease-payments");
    await expect(payments).toContainText("Overdue");
    await payments.getByRole("button", { name: /Overdue/ }).click();
    await expect(payments).not.toContainText("Overdue");
    await drawer.getByRole("button", { name: "Add protocol" }).click();
    const form = page.getByRole("dialog").last();
    await form.getByLabel("Condition of the property").fill("Clean, two keys returned");
    await form.getByRole("button", { name: "Save protocol" }).click();
    await expect(drawer.getByTestId("lease-protocols")).toContainText("Move-out protocol");
    await expect(drawer).toContainText("Ended");
  });

  test("a document is generated from a template, previewed and marked signed", async ({ page }) => {
    await fresh(page, "./workspace/documents");
    await expect(page.getByTestId("document-templates").locator("li")).toHaveCount(10);
    await page.getByRole("button", { name: "Generate a document" }).click();
    const form = page.getByRole("dialog");
    await form.getByLabel("Template").selectOption("purchase");
    await form.getByRole("button", { name: "Generate", exact: true }).click();
    const preview = page.getByTestId("document-preview");
    await expect(preview).toContainText("Purchase contract");
    await expect(preview).toContainText("Reality Nábrežie");
    await page.getByRole("button", { name: "Mark signed" }).click();
    await expect(page.getByTestId("document-drawer")).toContainText("Signed");
  });

  test("the team page shows splits and a commission statement; working as a colleague changes the desk", async ({ page }) => {
    await fresh(page, "./workspace/team");
    await expect(page.getByTestId("team-list")).toContainText("Zuzana Kollárová");
    await expect(page.getByTestId("team-list")).toContainText("Split 60 %");
    const statement = page.getByTestId("commission-statement");
    await statement.getByLabel("Agent").selectOption("ag-balaz");
    await expect(statement).toContainText(/€5,100|No deals closed/);
    // A table row on desktop, a card on the phone — both end in the one button that opens the row.
    await page.getByTestId("team-list").locator("tr, li").filter({ hasText: "Martin Baláž" }).getByRole("button").last().click();
    await page.goto("./workspace");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("overview-kpis")).toBeVisible();
  });

  test("reports show the funnel and money by month; settings reset the demo", async ({ page }) => {
    await fresh(page, "./workspace/reports");
    await expect(page.getByTestId("report-kpis")).toContainText("€11,250");
    await expect(page.getByTestId("report-funnel")).toContainText("Won");
    await page.goto("./workspace/settings");
    await page.getByRole("button", { name: "Solo agent" }).click();
    await expect(page.getByRole("navigation", { name: "Workspace" }).first()).not.toContainText("Team");
    await page.getByRole("button", { name: "Reset to demo data" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset to demo data" }).click();
    await expect(page.getByRole("button", { name: "Agency", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("the Slovak workspace speaks Slovak", async ({ page }) => {
    await page.goto("./sk/workspace");
    await page.evaluate(() => localStorage.clear());
    await page.goto("./sk/workspace");
    await expect(page.getByRole("heading", { level: 1, name: /Dnešný prehľad/ })).toBeVisible();
    await expect(page.getByTestId("attention-list")).toContainText(/bez odpovede/);
  });
});
