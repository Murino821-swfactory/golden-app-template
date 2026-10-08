import { test, expect } from "@playwright/test";
import { inboxView, parseMessage, replyHref, unreadCount } from "../lib/messages";

test.describe("inbox logic", () => {
  test("parseMessage: e-mail and text are required; read = readAt set", () => {
    const at = { toDate: () => new Date("2026-09-29T10:00:00Z") };
    expect(parseMessage("m1", { email: "a@b.sk", message: "Hi there!", readAt: null, createdAt: at })).toEqual({
      id: "m1", email: "a@b.sk", message: "Hi there!", createdAt: new Date("2026-09-29T10:00:00Z"), read: false,
    });
    expect(parseMessage("m2", { email: "a@b.sk", message: "x", name: "Alex", readAt: at, createdAt: at })?.read).toBe(true);
    expect(parseMessage("m2", { email: "a@b.sk", message: "x", name: "Alex", readAt: at, createdAt: at })?.name).toBe("Alex");
    expect(parseMessage("m3", { message: "no sender" })).toBeNull();
  });
  test("inboxView: not configured, checking, forbidden, ready — never a Firestore call for a stranger", () => {
    expect(inboxView({ available: false, role: undefined })).toBe("not-configured");
    expect(inboxView({ available: true, role: undefined })).toBe("checking");
    expect(inboxView({ available: true, role: null })).toBe("forbidden");
    expect(inboxView({ available: true, role: "owner" })).toBe("ready");
    expect(inboxView({ available: true, role: "admin" })).toBe("ready");
  });
  test("replyHref and unreadCount", () => {
    const msg = { id: "m", email: "lead@example.com", message: "Hi", createdAt: new Date(0), read: false };
    expect(replyHref(msg, "Unbroken & Co")).toBe("mailto:lead@example.com?subject=Re%3A%20Unbroken%20%26%20Co");
    expect(unreadCount([msg, { ...msg, read: true }])).toBe(1);
  });
});

test("the messages page is in the export and shows no list to an anonymous visitor", async ({ page }) => {
  const res = await page.goto("messages/");
  expect(res?.status()).toBe(200);
  await expect(page.locator("[data-inbox-list]")).toHaveCount(0);
});
