import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "focus.spec.ts", workers: 1, retries: 0, reporter: "list",
  // Keep trace artifacts separate from the static-export suite's output cleanup.
  outputDir: "../../playwright/.cache/record-focus",
  use: { baseURL: "http://127.0.0.1:3188", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: "node integration/record-focus/server.mjs", cwd: "../..", url: "http://127.0.0.1:3188", reuseExistingServer: false, timeout: 60000 },
});
