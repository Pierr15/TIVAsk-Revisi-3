import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "p1-escalations.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 45000,
  outputDir: "test-results/p1",
  globalTeardown: "./e2e/p1-teardown.ts",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    channel: "chrome",
  },
  // All API calls in these tests are intercepted; no backend/database is started.
  webServer: {
    command: "node scripts/p1-ui-server.cjs",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 30000,
    env: { NEXT_TELEMETRY_DISABLED: "1" },
  },
});
