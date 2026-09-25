import { defineConfig, devices } from "@playwright/test";
process.loadEnvFile(".env.local");
export default defineConfig({
  testDir: "./tests/live-research",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 360000,
  use: {
    baseURL: process.env.RESEARCH_TEST_URL ?? "http://localhost:3000",
    channel: "chrome",
    trace: "off",
    actionTimeout: 20000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
