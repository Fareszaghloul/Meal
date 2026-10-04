import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1, // both projects write to the same test dates against one database
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3101",
    trace: "retain-on-failure",
    reducedMotion: "reduce",
  },
  webServer: {
    command: "node scripts/start-test-server.mjs",
    url: "http://localhost:3101",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
