import { test, expect } from "@playwright/test";
const facts = "Páchateľ rozbil okno uzamknutej garáže a odniesol bicykel. Je to vlámanie?";

test("problem → verified comparison → save without a case number → reopen → notes → repeat", async ({ page }) => {
  await page.goto("/research");
  await page.getByLabel("Právna otázka a okolnosti prípadu").fill(facts);
  await page.getByRole("button", { name: "Nájsť a porovnať rozhodnutia" }).click();
  await expect(page.getByRole("heading", { name: "Podobnosť a rozdiely" })).toBeVisible();
  await expect(page.getByText("Odlišná procesná fáza a dostupné dôkazy.")).toBeVisible();
  await expect(page.getByText("Súd preskúmal otázku zavinenia pri vniknutí do uzavretého priestoru.")).toBeVisible();
  await expect(page.getByText(/výpadok — výsledky sú neúplné/)).toBeVisible();
  await expect(page.getByLabel("Číslo veci")).toHaveCount(0);
  await page.getByRole("checkbox", { name: /1Tdo\/47\/2026/ }).check();
  await page.getByLabel("Názov rešerše").fill("Garáž — otázka vlámania");
  await page.getByRole("button", { name: "Uložiť celú rešerš" }).click();
  await page.getByRole("link", { name: "Otvoriť dashboard" }).click();
  await page.getByRole("button", { name: /Garáž — otázka vlámania/ }).click();
  await expect(page.getByText(facts, { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Otvoriť rozhodnutie (PDF)" })).toHaveAttribute("href", "https://www.nsud.sk/data/att/5a8/874346.283215.pdf");
  await page.getByLabel("Moje poznámky").fill("Overiť procesnú fázu a zavinenie.");
  await page.getByRole("button", { name: "Uložiť poznámky" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Poznámky uložené" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Garáž — otázka vlámania/ }).click();
  await expect(page.getByLabel("Moje poznámky")).toHaveValue("Overiť procesnú fázu a zavinenie.");
  expect(await page.evaluate(() => sessionStorage.getItem("model-calls"))).toBe("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Upraviť zadanie a hľadať znova" }).click();
  await expect(page.getByLabel("Právna otázka a okolnosti prípadu")).toHaveValue(facts);
  expect(await page.evaluate(() => sessionStorage.getItem("model-calls"))).toBe("1");
  await page.getByRole("button", { name: "Nájsť a porovnať rozhodnutia" }).click();
  await expect(page.getByRole("heading", { name: "Podobnosť a rozdiely" })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("model-calls"))).toBe("2");
});

test("manual filtered search is saved with selected decisions and can be repeated", async ({ page }) => {
  await page.goto("/research");
  await page.getByRole("tab", { name: "Vyhľadať rozhodnutia" }).click();
  await page.getByLabel("Slová", { exact: true }).fill("krádež");
  await page.getByRole("tabpanel", { name: "Vyhľadať rozhodnutia" }).getByLabel("Typ súdu", { exact: true }).selectOption("Najvyšší súd SR");
  await page.getByRole("button", { name: "Hľadať", exact: true }).click();
  await page.getByLabel("Vybrať pre ďalšiu prácu").check();
  await page.getByLabel("Názov rešerše").fill("Manuálne rozhodnutia NS SR");
  await page.getByRole("button", { name: "Uložiť celú rešerš" }).click();
  await page.getByRole("link", { name: "Otvoriť dashboard" }).click();
  await page.getByRole("button", { name: /Manuálne rozhodnutia NS SR/ }).click();
  await expect(page.getByRole("heading", { name: "Váš výber" })).toBeVisible();
  await page.getByRole("link", { name: "Upraviť zadanie a hľadať znova" }).click();
  await expect(page.getByRole("tab", { name: "Vyhľadať rozhodnutia" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Slová", { exact: true })).toHaveValue("krádež");
  await expect(page.getByRole("tabpanel", { name: "Vyhľadať rozhodnutia" }).getByLabel("Typ súdu", { exact: true })).toHaveValue("Najvyšší súd SR");
  expect(await page.evaluate(() => sessionStorage.getItem("model-calls"))).toBeNull();
});

test("krádež and § 212 keep NS SR in the search with a visible full-text limit", async ({ page }) => {
  await page.goto("/research");
  await page.getByRole("tab", { name: "Vyhľadať rozhodnutia" }).click();
  await page.getByLabel("Slová", { exact: true }).fill("krádež");
  await page.getByRole("tabpanel", { name: "Vyhľadať rozhodnutia" }).getByLabel("§ Trestného zákona").fill("212");
  await page.getByRole("button", { name: "Hľadať", exact: true }).click();
  await expect(page.getByRole("article").getByText("NS SR OpenData")).toBeVisible();
  await expect(page.getByText(/§ 212 overený ako textová zmienka/)).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("last-search")!))).toMatchObject({ q: "krádež", paragraph: "212" });
});

test("English workflow includes an optional memo and keeps it after reloading", async ({ page }) => {
  await page.goto("/research?lang=en");
  await page.getByLabel("Legal issue and circumstances").fill(facts);
  await page.getByLabel("Include a cited memo").check();
  await page.getByRole("button", { name: "Find and compare decisions" }).click();
  await expect(page.getByText("Podložené stanovisko.", { exact: true })).toBeVisible();
  await page.getByLabel("Research title").fill("Saved English memo");
  await page.getByRole("button", { name: "Save full research" }).click();
  await page.goto("/dashboard?lang=en");
  await page.getByRole("button", { name: /Saved English memo/ }).click();
  await expect(page.getByText("Podložené stanovisko.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("test-archive")!)[0].snapshot.memo.memo.blocks[0].citations.length)).toBe(1);
  await page.getByRole("button", { name: "Delete research" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText(/No saved research yet/)).toBeVisible();
});

test("a rejected write is never reported as saved", async ({ page }) => {
  await page.goto("/research?save-fails=1");
  await page.getByLabel("Právna otázka a okolnosti prípadu").fill(facts);
  await page.getByRole("button", { name: "Nájsť a porovnať rozhodnutia" }).click();
  await page.getByRole("button", { name: "Uložiť celú rešerš" }).click();
  await expect(page.getByRole("alert")).toContainText("Uloženie sa nepodarilo");
  await expect(page.getByRole("link", { name: "Otvoriť dashboard" })).toHaveCount(0);
});
