import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: [
    {
      command: "npm run dev --workspace=backend",
      url: "http://localhost:3001/api/health",
      reuseExistingServer: !process.env.CI,
      env: {
        DISABLE_WHATSAPP: "true",
        PORT: "3001",
      },
      timeout: 30000,
    },
    {
      command: "npm run start --workspace=frontend",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
