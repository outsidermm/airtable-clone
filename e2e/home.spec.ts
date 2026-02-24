import { test, expect } from "@playwright/test";

test.describe("Home / Landing Page", () => {
  test("loads successfully and shows marketing content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Airtable|Lyra/i);
  });

  test("navigation bar is visible", async ({ page }) => {
    await page.goto("/");
    // The page should render some top-level navigation
    const nav = page.locator("nav, header").first();
    await expect(nav).toBeVisible();
  });

  test("has a sign-in affordance", async ({ page }) => {
    await page.goto("/");
    // Should have some form of sign-in button or link
    const signIn = page
      .getByRole("link", { name: /sign in|log in|get started/i })
      .or(page.getByRole("button", { name: /sign in|log in|get started/i }));
    await expect(signIn.first()).toBeVisible();
  });

  test("responds to 404 gracefully", async ({ page }) => {
    const response = await page.goto("/nonexistent-page-xyz");
    // Should return 404 or redirect; not 500
    expect(response?.status()).not.toBe(500);
  });
});
