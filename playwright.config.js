import { defineConfig, devices } from "@playwright/test";

const FOUNDRY_URL = process.env.FOUNDRY_URL ?? "http://foundryvtt:30000";

export default defineConfig({
  testDir: "./tests/e2e/specs",
  fullyParallel: false,
  // All specs share a single Foundry world, actor set, and GM user. Running
  // spec files in parallel (the default across workers) causes them to fight
  // over that shared state, so force a single worker for true serial execution.
  workers: 1,
  // Generous global ceiling: booting Foundry to game.ready can take up to ~60s
  // in CI, and this timeout also governs beforeAll/afterAll hooks. Tests return
  // well before this in the common case.
  timeout: 120_000,
  use: {
    baseURL: FOUNDRY_URL,
    actionTimeout: 60_000,
    storageState: "tests/e2e/.auth/state.json",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 }, // Foundry requires ≥ 1366×768
        launchOptions: {
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-webgl",
            "--disable-webgl2",
          ],
        },
      },
    },
  ],
  globalSetup: "./tests/e2e/global-setup.js",
  outputDir: "test-results/e2e",
  reporter: [["list"], ["html", { outputFolder: "test-results/html" }]],
});
