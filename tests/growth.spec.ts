import { test, expect, type Page } from "@playwright/test";
import { GROWTH_COPY } from "../lib/growth/copy";
import { WEEK_SLOTS } from "../lib/growth/plan";
import { BIO_MAX, CHECKLIST_IDS, HIGHLIGHT_IDS } from "../lib/growth/profile";
import { config } from "../lib/prototype-config";
import { STUDIO_COPY, studioLocale } from "../lib/studio/copy";

/**
 * The growth plan on the exported site: the four panels, a publish from the plan that
 * ticks the slot and shows up in the report, the profile kit, the report's numbers and
 * download, the leads' sequence, the Czech page and the landing's new sections. The
 * rules themselves are in growth-logic.spec.ts.
 */

const copy = GROWTH_COPY[studioLocale(config.defaultLocale)];
const studio = STUDIO_COPY[studioLocale(config.defaultLocale)];

async function openGrowth(page: Page, path = "./growth") {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: copy.title })).toBeVisible();
  return errors;
}

test("opens on this week's plan with seven slots and the first one in the publish bar", async ({ page }) => {
  const errors = await openGrowth(page);
  for (const id of ["plan", "profile", "report", "leads"] as const) await expect(page.getByRole("tab", { name: copy.tabs[id] })).toBeVisible();
  await expect(page.getByRole("tab", { name: copy.tabs.plan })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("plan-week")).toHaveText(/\d{4}-\d{2}-\d{2}/);
  const slots = page.getByTestId("plan-slot");
  await expect(slots).toHaveCount(WEEK_SLOTS.length);
  await expect(slots.first()).toContainText(copy.days[0]!);
  // The first slot is in the bar before anything is picked.
  await expect(slots.first().getByRole("button")).toHaveText(copy.plan.picked);
  await expect(page.getByTestId("publish-preview")).toBeVisible();
  await expect(page.getByTestId("publish-button")).toBeEnabled();
  await expect(page.getByLabel(studio.publish.caption)).toHaveValue(/tokenwise\.sk/);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("a planned slot goes out through the bar, is ticked off, and is counted in the report", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.addInitScript(() => {
    (window as unknown as { __opened: string[] }).__opened = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { __opened: string[] }).__opened.push(String(url));
      return {} as Window;
    };
  });
  await openGrowth(page);
  const slot = page.getByTestId("plan-slot").nth(1);
  const ideaId = await slot.getAttribute("data-idea");
  await expect(slot).toHaveAttribute("data-done", "false");
  await slot.getByRole("button", { name: copy.plan.pick }).click();
  await expect(slot.getByRole("button")).toHaveText(copy.plan.picked);
  await expect(page.getByLabel(studio.publish.caption)).toHaveValue(new RegExp(copy.plan.ideas[ideaId!]!.hook.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  await page.getByRole("radio", { name: "Facebook" }).click();
  await expect(page.getByTestId("publish-button")).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.getByTestId("publish-button").click();
  expect((await download).suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-plan-facebook\.png$/);
  await expect(page.getByRole("status")).toHaveText(studio.publish.outcome.opened);
  await expect(slot).toHaveAttribute("data-done", "true");

  await page.getByRole("tab", { name: copy.tabs.report }).click();
  await expect(page.getByTestId("produced-list")).toContainText(copy.kinds[WEEK_SLOTS[1]!.kind]);
  await expect(page.getByTestId("produced-list")).toContainText("1");

  // The receipt is this browser's: the slot stays ticked after a reload.
  await page.reload();
  await expect(page.getByTestId("plan-slot").nth(1)).toHaveAttribute("data-done", "true");
});

test("the profile kit: bios within the limit, five highlights, a checklist that remembers", async ({ page }) => {
  await openGrowth(page);
  await page.getByRole("tab", { name: copy.tabs.profile }).click();
  const bios = page.getByTestId("bio");
  await expect(bios).toHaveCount(copy.profile.bios.length);
  for (const text of await page.getByTestId("bio-length").allTextContents()) {
    expect(Number(text.split("/")[0])).toBeLessThanOrEqual(BIO_MAX);
  }
  await expect(page.getByTestId("highlight")).toHaveCount(HIGHLIGHT_IDS.length);
  await expect(page.getByTestId("checklist-item")).toHaveCount(CHECKLIST_IDS.length);

  const first = page.getByTestId("checklist-item").first();
  await first.check();
  await expect(first).toBeChecked();
  await page.reload();
  await page.getByRole("tab", { name: copy.tabs.profile }).click();
  await expect(page.getByTestId("checklist-item").first()).toBeChecked();

  // A highlight goes to the bar as a story.
  await page.getByTestId("highlight").first().getByRole("button", { name: copy.profile.openAsStory }).click();
  await expect(page.getByLabel(studio.publish.caption)).toHaveValue(new RegExp(copy.profile.highlights[HIGHLIGHT_IDS[0]]!.title));
});

test("the report takes the week's numbers, judges the goals and downloads as Markdown", async ({ page }) => {
  await openGrowth(page);
  await page.getByRole("tab", { name: copy.tabs.report }).click();
  await expect(page.getByTestId("report-range")).toHaveText(/\d{4}-\d{2}-\d{2} – \d{4}-\d{2}-\d{2}/);
  await expect(page.getByTestId("report-panel")).toContainText(copy.report.empty);

  const report = page.getByTestId("report-panel");
  await report.getByLabel(copy.report.reach, { exact: true }).fill("1200");
  await report.getByLabel(copy.report.registrations, { exact: true }).first().fill("6");
  const rows = page.getByTestId("goal-row");
  await expect(rows.nth(1)).toHaveAttribute("data-met", "true"); // reach 1200 ≥ 1000
  await expect(rows.nth(2)).toHaveAttribute("data-met", "true"); // registrations 6 ≥ 5
  await expect(rows.nth(0)).toHaveAttribute("data-met", "false"); // nothing published
  await expect(page.getByTestId("suggestion")).toContainText("1200");

  const download = page.waitForEvent("download");
  await page.getByTestId("report-download").click();
  expect((await download).suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-weekly-report\.md$/);

  // The numbers are this browser's.
  await page.reload();
  await page.getByRole("tab", { name: copy.tabs.report }).click();
  await expect(page.getByTestId("report-panel").getByLabel(copy.report.reach, { exact: true })).toHaveValue("1200");
});

test("a lead gets its sequence: the welcome is due at once and can be ticked off", async ({ page }) => {
  await openGrowth(page);
  await page.getByRole("tab", { name: copy.tabs.leads }).click();
  const panel = page.getByTestId("leads-panel");
  await expect(panel).toContainText(copy.leads.empty);

  await page.getByTestId("lead-save").click();
  await expect(panel.getByRole("alert")).toHaveText(copy.leads.invalid);

  await panel.getByRole("textbox", { name: copy.leads.name, exact: true }).fill("Ana");
  await panel.getByRole("textbox", { name: copy.leads.email, exact: true }).fill("ana@example.com");
  await panel.getByRole("radio", { name: copy.leads.sources.account }).click();
  await page.getByTestId("lead-save").click();
  const lead = page.getByTestId("lead");
  await expect(lead).toHaveCount(1);
  await expect(lead).toContainText("ana@example.com");
  const due = lead.getByTestId("due-step");
  await expect(due).toHaveCount(1);
  await expect(due).toContainText(copy.leads.stepKinds.welcome);
  await expect(due.getByRole("link", { name: copy.leads.send })).toHaveAttribute("href", /^mailto:ana%40example\.com\?subject=/);

  await due.getByTestId("mark-sent").click();
  await expect(lead.getByTestId("due-step")).toHaveCount(0);
  await expect(lead).toContainText(copy.leads.nothingDue);
  await expect(lead).toContainText(`${copy.leads.sent}: welcome`);
});

test("the Czech page speaks Czech", async ({ page }) => {
  const cs = GROWTH_COPY.cs;
  await page.goto("./cs/growth");
  await expect(page.getByRole("heading", { level: 1, name: cs.title })).toBeVisible();
  await expect(page.getByRole("tab", { name: cs.tabs.leads })).toBeVisible();
  await expect(page.getByTestId("plan-slot").first()).toContainText(cs.days[0]!);
});

test("the landing explains the steps and answers the questions before the call to action", async ({ page }) => {
  const landing = config.content[config.defaultLocale]?.landing;
  expect(landing?.howItWorks && landing.faq).toBeTruthy();
  await page.goto("./");
  const steps = page.locator('[data-section="howItWorks"] li');
  await expect(steps).toHaveCount(landing!.howItWorks!.steps.length);
  const faq = page.locator('[data-section="faq"] details');
  await expect(faq).toHaveCount(landing!.faq!.items.length);
  // The story landing keeps inactive chapters out of view; the answers are in the document regardless.
  for (const item of landing!.faq!.items) {
    await expect(page.locator('[data-section="faq"]')).toContainText(item.question);
    await expect(page.locator('[data-section="faq"]')).toContainText(item.answer);
  }
});
