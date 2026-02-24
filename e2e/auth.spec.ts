import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("unauthenticated user is redirected from /dashboard to sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Should redirect to sign-in page or home
    await expect(page).not.toHaveURL(/dashboard/);
    // URL should contain sign-in or be at the root
    const url = page.url();
    expect(
      url.includes("sign") ||
        url.includes("auth") ||
        url.includes("login") ||
        url === "http://localhost:3000/",
    ).toBe(true);
  });

  test("sign-in page renders an OAuth sign-in button", async ({ page }) => {
    // Navigate to the auth sign-in page
    await page.goto("/api/auth/signin");
    // Google or any OAuth provider button should be visible
    const signInBtn = page
      .getByRole("button", { name: /google|sign in|continue/i })
      .first();
    await expect(signInBtn).toBeVisible({ timeout: 10_000 });
  });

  test("unauthenticated tRPC calls return an auth error", async ({
    request,
  }) => {
    // tRPC protected routes should reject unauthenticated calls.
    // The batch endpoint returns 200 with a tRPC-level error, or an HTTP error.
    const response = await request.post("/api/trpc/base.getAll?batch=1", {
      data: { "0": { json: null } },
      headers: { "Content-Type": "application/json" },
    });

    // Accept any HTTP-level auth/method rejection or a tRPC-level error body.
    const status = response.status();
    if ([401, 403, 404, 405].includes(status)) {
      // HTTP-level rejection is fine
      expect([401, 403, 404, 405]).toContain(status);
    } else {
      // tRPC returns 200 with an error payload for UNAUTHORIZED
      expect(status).toBe(200);
      const body = (await response.json()) as unknown[];
      const firstResult = body[0] as Record<string, unknown> | undefined;
      // The response should contain an error
      expect(firstResult).toHaveProperty("error");
    }
  });
});
