import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser", timeout: 30000, forbidOnly: true, retries: 0, workers: 1, reporter: "line",
  use: { baseURL: process.env.ACCEPTANCE_WEB_URL, channel: "msedge", headless: true, trace: "retain-on-failure" },
});
