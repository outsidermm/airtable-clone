import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * Auth strategy:
 *   global-setup.ts creates a test user + database session, writing the
 *   session cookie to playwright/.auth/user.json. Every spec that needs auth
 *   declares `test.use({ storageState: "playwright/.auth/user.json" })`.
 *   global-teardown.ts removes the test user (cascades to all their data).
 *
 * Test database:
 *   Tests run against the same DATABASE_URL as the dev server. All test
 *   data is created under the playwright-test@e2e.internal user, which is
 *   deleted in teardown. Developer data is never affected.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false, // keep false so shared test bases don't race
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Tests that need auth must add:
    //   test.use({ storageState: "playwright/.auth/user.json" })
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
