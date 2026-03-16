import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: ".",
  testMatch: /extension\.smoke\.spec\.mjs/,
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node fixture-server.mjs",
    cwd: __dirname,
    url: "http://127.0.0.1:4173/health",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
