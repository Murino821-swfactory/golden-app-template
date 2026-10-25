import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "content-source.spec.ts", workers: 1, retries: 0, reporter: "list",
  outputDir: "../../playwright/.cache/content-source",
  use: { baseURL: "http://127.0.0.1:3189", trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: { command: "node integration/content-source/server.mjs", cwd: "../..", url: "http://127.0.0.1:3189", reuseExistingServer: false, timeout: 120000,
    // SIGTERM lets server.mjs stop the Firebase CLI, which stops its emulators.
    gracefulShutdown: { signal: "SIGTERM", timeout: 15000 } },
});
