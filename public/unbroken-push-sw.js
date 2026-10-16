// Scope is this prototype only. No fetch handler or cached personal data.
const base = new URL("./", self.location.href);
const fallback = new URL("checkin?today=1#daily-form", base).href;
function target(value) {
  try {
    const url = new URL(value, base);
    if (url.origin === base.origin && ["checkin", "sk/checkin"].some((path) => url.pathname === `${base.pathname}${path}`)) {
      url.search = "?today=1";
      url.hash = "daily-form";
      return url.href;
    }
  } catch { /* Invalid targets fall back to today's form. */ }
  return fallback;
}
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json()?.data || {}; } catch { /* Still show every received push. */ }
  event.waitUntil(self.registration.showNotification(data.title || "Unbroken", {
    body: data.body || "", tag: data.tag || "unbroken-daily",
    icon: new URL("icons/icon-192.png", base).href,
    data: { url: target(data.url) },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = target(event.notification.data?.url);
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    const existing = windows.find((client) => client.url.startsWith(base.href));
    if (existing) {
      try { const navigated = await existing.navigate(url); if (navigated) return navigated.focus(); } catch { /* Open below. */ }
    }
    return self.clients.openWindow(url);
  }));
});
