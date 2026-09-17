import { defineConfig, devices } from "@playwright/test";

const withTrailingSlash = (url: string) => (url.endsWith("/") ? url : `${url}/`);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    // A prototype is built with NEXT_PUBLIC_BASE_PATH and served under it, so the suite
    // has to ask for the same paths the deployed site will. Reading the same variable the
    // build read keeps `preview` and this config from drifting into a suite that tests a
    // URL nothing serves. Unset (the template's own CI), this is the bare localhost root.
    //
    // The TRAILING SLASH is load-bearing, and so is every `page.goto("./…")` in tests/.
    // Playwright resolves with `new URL(path, baseURL)`, where a leading-slash path
    // replaces the base's whole path: `new URL("/", ".../newapp/unbroken")` is
    // `http://localhost:3000/`, which under a base path is a 404. Relative paths against
    // a slash-terminated base are the only combination that works for both.
    baseURL: withTrailingSlash(
      process.env.PLAYWRIGHT_BASE_URL ||
        `http://localhost:3000${process.env.NEXT_PUBLIC_BASE_PATH || ""}`
    ),
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
        // Must be the path that is actually served: under a base path the site root is
        // a 404, so waiting on it would either hang or declare readiness against the
        // wrong thing.
        url: `http://localhost:3000${process.env.NEXT_PUBLIC_BASE_PATH || ""}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
