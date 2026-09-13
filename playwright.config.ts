import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      // `devices["iPhone 14"]` carries `defaultBrowserType: "webkit"`, which
      // Playwright uses to pick the browser when `browserName` isn't set —
      // that would require a WebKit binary CI never installs (chromium only).
      // Force chromium explicitly; keep the iPhone 14 viewport/UA for the
      // 390x844 mobile-first viewport used across SW Factory.
      use: { ...devices["iPhone 14"], browserName: "chromium" },
    },
  ],
  // The gate must test WHAT SHIPS. A prototype is deployed as a Next static export
  // (`output: "export"`), so the suite runs against `out/`, not against `npm run dev`.
  // Testing the dev server meant two things: a whole class of export-only bugs — the ones
  // that produce a white screen on Firebase Hosting — could pass the gate, and the first
  // hit to a route paid for an on-demand compile, which under parallel load exceeded the
  // expect timeout and made the suite flaky.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run preview",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
