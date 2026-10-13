import { test, expect } from "@playwright/test";

/**
 * The workspace in a browser, over a fixed seed (firm, today = 13 Oct 2026) and the real
 * components — the same harness the research workflow uses. Each test loads a fresh seed.
 */

test("the overview shows the day's numbers, the agenda and the overdue deadline", async ({ page }) => {
  await page.goto("/workspace/dashboard");
  await expect(page.getByRole("heading", { name: /Dobrý deň, Jana/ })).toBeVisible();
  await expect(page.getByText("Otvorené spisy")).toBeVisible();
  await expect(page.getByText("Lehoty do 7 dní")).toBeVisible();
  await expect(page.getByText("1 po termíne")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agenda — najbližších 7 dní" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Kováč — vrátenie zálohy.*Pojednávanie/ }).first()).toBeVisible();
  await expect(page.getByText("Vyjadrenie k odvolaniu protistrany").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vyťaženie tímu (4 týždne)" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("intake: an opposing party already on file is flagged, the matter opens, a statutory deadline is computed", async ({ page }) => {
  await page.goto("/workspace/matters");
  await expect(page.getByText("2026/0031")).toBeVisible();
  await page.getByRole("button", { name: "Nový spis" }).click();
  await page.getByLabel("Názov").fill("Nová vec — zmluvná pokuta");
  await page.getByLabel("Protistrana").fill("bautech slovakia s.r.o.");
  await expect(page.getByText(/Pozor — konflikt záujmov/)).toBeVisible();
  await expect(page.getByText(/BauTech Slovakia, s. r. o. — protistrana v spise 2026\/0031/)).toBeVisible();
  await page.getByLabel("Protistrana").fill("Úplne Nová Firma, a. s.");
  await expect(page.getByText(/Bez nálezu/)).toBeVisible();
  await page.getByRole("button", { name: "Uložiť" }).click();
  await expect(page.getByRole("heading", { name: "Nová vec — zmluvná pokuta" })).toBeVisible();
  await expect(page.getByText("2026/0051 · Občianske právo · Súdny spor")).toBeVisible();
  await page.getByRole("tab", { name: /^Lehoty/ }).click();
  await page.getByRole("button", { name: "Pridať lehotu" }).first().click();
  await page.getByLabel("Druh lehoty").selectOption("appealCsp");
  await page.getByLabel("Začiatok plynutia").fill("2026-10-09");
  await expect(page.locator("[data-deadline-preview]")).toContainText("26. 10.");
  await page.getByRole("button", { name: "Pridať lehotu" }).last().click();
  await expect(page.getByText("§ 362 ods. 1 CSP").first()).toBeVisible();
  await expect(page.getByRole("tab", { name: /^Lehoty 1/ })).toBeVisible();
});

test("the deadline calculator moves a weekend end to Monday and names the statute", async ({ page }) => {
  await page.goto("/workspace/deadlines");
  await page.getByLabel("Druh lehoty").selectOption("appealCsp");
  await page.getByLabel("Začiatok plynutia").fill("2026-10-09");
  await expect(page.locator("[data-deadline-result]")).toHaveText(/po 26\. 10\./);
  await expect(page.locator("#calculator").getByText(/sobotu, nedeľu alebo sviatok/)).toBeVisible();
  await expect(page.getByText("§ 362 ods. 1 CSP").first()).toBeVisible();
  await page.getByLabel("Druh lehoty").selectOption("complaintCriminal");
  await page.getByLabel("Začiatok plynutia").fill("2026-04-02");
  await expect(page.locator("[data-deadline-result]")).toHaveText(/9\. 4\./);
});

test("the hearing binder tracks readiness as the checklist and evidence change", async ({ page }) => {
  await page.goto("/workspace/hearings?id=h1");
  await expect(page.getByRole("heading", { name: "Kováč — vrátenie zálohy za vozidlo (odstúpenie od zmluvy)" })).toBeVisible();
  const bar = page.getByRole("progressbar", { name: "Pripravenosť" }).first();
  await expect(bar).toHaveAttribute("aria-valuenow", "63");
  await page.getByLabel("Vytlačiť e-mailovú komunikáciu s predajcom (12 strán)").check();
  await expect(bar).toHaveAttribute("aria-valuenow", "72");
  await page.getByRole("tab", { name: /Otázky na výsluch/ }).click();
  await page.getByRole("button", { name: "Pridať otázku" }).click();
  await page.getByLabel("Otázka").fill("Kedy ste klientovi oznámili, že vozidlo nebude dodané?");
  await page.getByRole("button", { name: "Pridať otázku" }).last().click();
  await expect(page.getByText("Kedy ste klientovi oznámili, že vozidlo nebude dodané?")).toBeVisible();
  await page.getByRole("tab", { name: /Svedkovia/ }).click();
  await expect(page.getByText("Peter Mikuš")).toBeVisible();
});

test("billing: the tariff adds up acts and overhead, and an invoice is issued from unbilled entries", async ({ page }) => {
  await page.goto("/workspace/billing?tab=tariff");
  await expect(page.locator("[data-tariff-total]")).toHaveText(/809,40/);
  await expect(page.locator("[data-court-fee]")).toHaveText(/484,00/);
  await page.getByLabel("Elektronické podanie").uncheck();
  await expect(page.locator("[data-court-fee]")).toHaveText(/534,00/);
  await page.goto("/workspace/billing?tab=invoices&keep=1");
  await page.getByLabel("Vyberte spis s nefakturovanými úkonmi").selectOption("k8");
  await page.getByRole("button", { name: "Vystaviť faktúru" }).click();
  await expect(page.getByText("2026/0053 · Delta Pharm, s. r. o.")).toBeVisible();
  await expect(page.getByText("Koncept").first()).toBeVisible();
});

test("clients: completing due diligence marks the client verified", async ({ page }) => {
  await page.goto("/workspace/clients?id=c6");
  await expect(page.getByRole("heading", { name: "Bytové družstvo Ružinov" })).toBeVisible();
  for (const label of ["Identifikácia klienta (doklad totožnosti / výpis z registra)", "Overenie identifikácie", "Konečný užívateľ výhod", "Preverenie — politicky exponovaná osoba, sankčné zoznamy", "Účel a povaha obchodu"]) {
    await page.getByLabel(label).check();
  }
  await expect(page.getByRole("progressbar", { name: "Identifikácia a AML" })).toHaveAttribute("aria-valuenow", "100");
  await expect(page.getByRole("button", { name: /Bytové družstvo Ružinov/ })).toContainText("Overený");
});

test("the solo seed hides team features and the pages stay within a phone's width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace/team?kind=solo");
  await expect(page.getByRole("heading", { name: "Pracujete ako samostatný advokát" })).toBeVisible();
  for (const route of ["dashboard", "matters", "calendar", "deadlines", "hearings", "billing", "documents", "clients"]) {
    await page.goto(`/workspace/${route}?kind=solo`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
  }
});
