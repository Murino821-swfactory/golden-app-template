import { test, expect } from "@playwright/test";
import { IDEA_API, IDEA_MAX, IDEA_MIN, ideaApiUrl, ideaChatView, ideaPayload, validateIdea } from "../lib/idea-chat";
import { uiCopy } from "./ui-copy";

/**
 * The idea chat (founder, 2026-10-27): a floating launcher on every page of a prototype
 * opens a small chat that asks the visitor for an improvement and files it with the app's
 * owner — as a task on their dashboard (factory-web `prototypeIdea`). Nothing is requested
 * before the visitor sends, and a build without a slug (local dev, the harness sandbox,
 * CI) says so instead of pretending.
 */

const slug = process.env.NEXT_PUBLIC_PRODUCT_SLUG || process.env.NEXT_PUBLIC_DEMO_SLUG || null;
const copy = uiCopy.ideaChat!;
const IDEA = "Add a monthly PDF export of my records, with the totals at the top.";

test.describe("idea chat — the floating chatbot", () => {
  test("a launcher on every page opens the chat, which greets with the owner's question", async ({ page }) => {
    for (const path of ["./", "./login"]) {
      await page.goto(path);
      const launcher = page.locator("[data-idea-launcher]");
      await expect(launcher).toHaveCount(1);
      await expect(launcher).toHaveAttribute("aria-label", copy.open!);
      await expect(launcher.locator("svg")).toHaveCount(1);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await launcher.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('[data-idea-bubble="bot"]').first()).toHaveText(copy.greeting!);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  });

  test("without a slug nothing is sent; with one, the idea posts to the API and the bot confirms", async ({ page }) => {
    let body: Record<string, unknown> | null = null;
    await page.route(`**${IDEA_API}`, (route) => {
      body = route.request().postDataJSON() as Record<string, unknown>;
      void route.fulfill({ json: { ok: true, filed: "task" } });
    });
    await page.goto("./");
    await page.locator("[data-idea-launcher]").click();
    const dialog = page.getByRole("dialog");
    const idea = dialog.locator("#idea-chat-text");
    const send = dialog.getByRole("button", { name: copy.send!, exact: true });
    if (!slug) {
      await expect(dialog.locator('[data-idea-bubble="bot"]').last()).toHaveText(copy.notConfigured!);
      await expect(idea).toBeDisabled();
      await expect(send).toBeDisabled();
      await send.click({ force: true });
      expect(body).toBeNull();
      return;
    }
    await expect(send).toBeDisabled();
    await idea.fill(IDEA);
    await expect(send).toBeEnabled();
    await send.click();
    await expect(dialog.locator('[data-idea-bubble="you"]')).toHaveText(IDEA);
    await expect(dialog.locator('[data-idea-bubble="bot"]').last()).toHaveText(copy.sent!);
    expect(body).toMatchObject({ slug, idea: IDEA, page: "/" });
  });
});

test.describe("idea chat (pure)", () => {
  test("validateIdea: too short, too long, or fine", () => {
    expect(validateIdea("short")).toBe("short");
    expect(validateIdea("x".repeat(IDEA_MIN))).toBeNull();
    expect(validateIdea("x".repeat(IDEA_MAX + 1))).toBe("long");
    expect(validateIdea("   \n  ")).toBe("short");
  });

  test("ideaChatView: the bot's last line and what the visitor may do, per state", () => {
    expect(ideaChatView({ slug: null, status: "idle", ideaValid: true })).toEqual({ bot: "notConfigured", canType: false, canSend: false });
    expect(ideaChatView({ slug: "x", status: "idle", ideaValid: false })).toEqual({ bot: "greeting", canType: true, canSend: false });
    expect(ideaChatView({ slug: "x", status: "idle", ideaValid: true })).toEqual({ bot: "greeting", canType: true, canSend: true });
    expect(ideaChatView({ slug: "x", status: "submitting", ideaValid: true })).toEqual({ bot: "greeting", canType: false, canSend: false });
    expect(ideaChatView({ slug: "x", status: "sent", ideaValid: true })).toEqual({ bot: "sent", canType: false, canSend: false });
    expect(ideaChatView({ slug: "x", status: "error", ideaValid: true })).toEqual({ bot: "error", canType: true, canSend: true });
    expect(ideaChatView({ slug: "x", status: "tooMany", ideaValid: true })).toEqual({ bot: "tooMany", canType: true, canSend: false });
  });

  test("ideaApiUrl: the site root's API on a prototype; a standalone product names tokenwise.sk's", () => {
    expect(ideaApiUrl(undefined)).toBe(IDEA_API);
    expect(ideaApiUrl("")).toBe(IDEA_API);
    expect(ideaApiUrl("https://tokenwise.sk/api/prototype-idea")).toBe("https://tokenwise.sk/api/prototype-idea");
  });

  test("ideaPayload: trimmed, the e-mail only when given, the page always", () => {
    expect(ideaPayload({ slug: "x", idea: `  ${IDEA} `, email: "  ", website: "", page: "/sk/dashboard" })).toEqual({
      slug: "x",
      idea: IDEA,
      website: "",
      page: "/sk/dashboard",
    });
    expect(ideaPayload({ slug: "x", idea: IDEA, email: " me@example.com ", website: "", page: "/" }).email).toBe("me@example.com");
  });
});
