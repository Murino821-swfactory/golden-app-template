import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("push worker confines links to Unbroken and opens today's form on click", async () => {
  const handlers: Record<string, (event: unknown) => void> = {};
  const notifications: { title: string; options: { data: { url: string } } }[] = [];
  const opened: string[] = [];
  const base = "https://apps.tokenwise.sk/newapp/unbroken/";
  runInNewContext(readFileSync("public/unbroken-push-sw.js", "utf8"), { URL, self: {
    location: { href: `${base}unbroken-push-sw.js` },
    addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
    registration: { showNotification: async (title: string, options: { data: { url: string } }) => { notifications.push({ title, options }); } },
    clients: { matchAll: async () => [], openWindow: async (url: string) => { opened.push(url); } },
  } });
  let pending: Promise<unknown> | undefined;
  for (const url of ["https://evil.example/checkin", "https://apps.tokenwise.sk/admin", `${base}checkin?day=2020-01-01`]) {
    handlers.push({ data: { json: () => ({ data: { title: "Daily reminder", url } }) }, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
    const notification = notifications.at(-1)!;
    expect(notification.options.data.url).toBe(`${base}checkin?today=1#daily-form`);
    handlers.notificationclick({ notification: { data: notification.options.data, close() {} }, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
  }
  expect(opened).toHaveLength(3);
  expect(opened[0]).toBe(`${base}checkin?today=1#daily-form`);
});
