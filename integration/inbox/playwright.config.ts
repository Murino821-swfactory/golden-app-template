import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "inbox.spec.ts", workers: 1, retries: 0, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3187", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: "node integration/inbox/server.mjs", cwd: "../..", url: "http://127.0.0.1:3187", reuseExistingServer: false, timeout: 60000 },
});
