import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "parking.spec.ts", workers: 1, retries: 0, reporter: "list",
  outputDir: "../../playwright/.cache/parking",
  use: { baseURL: "http://127.0.0.1:3190", trace: "retain-on-failure", timezoneId: "Europe/Bratislava" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: { command: "node integration/parking/server.mjs", cwd: "../..", url: "http://127.0.0.1:3190", reuseExistingServer: false, timeout: 60000 },
});
