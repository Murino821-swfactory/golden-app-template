import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "law-expert-workflow.spec.ts", workers: 1,
  use: { baseURL: "http://127.0.0.1:3107", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 14"], browserName: "chromium" } },
  ],
  webServer: { command: "node scripts/law-expert-test-server.mjs", url: "http://127.0.0.1:3107", timeout: 30_000 },
});
