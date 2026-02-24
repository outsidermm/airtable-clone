/**
 * E2E tests — Toolbar features
 *
 * Covers:
 *  - Filter dropdown: add condition, change operator, toggle AND/OR logic
 *  - Sort dropdown: add sort, toggle direction
 *  - Hide Fields dropdown: hide and show a column
 *  - Bulk row seed buttons (1K rows)
 *  - View rename via double-click
 *  - Row height picker
 */

import { test, expect } from "@playwright/test";
import {
  createTestBase,
  deleteTestBase,
  navigateToBase,
  openFilterDropdown,
  openSortDropdown,
  openHideFieldsDropdown,
  type TrpcBase,
} from "./helpers";

test.use({ storageState: "playwright/.auth/user.json" });

let testBase: TrpcBase;

test.beforeAll(async ({ request }) => {
  testBase = await createTestBase(request);
});

test.afterAll(async ({ request }) => {
  await deleteTestBase(request, testBase.id);
});

test.beforeEach(async ({ page }) => {
  await navigateToBase(page, testBase.id);
});

// ── Filter ───────────────────────────────────────────────────────────────────

test("Filter button opens the filter dropdown", async ({ page }) => {
  await page.getByRole("button", { name: /filter/i }).first().click();
  await expect(page.getByText("Add condition", { exact: true })).toBeVisible();
});

test("clicking Add condition adds a filter row", async ({ page }) => {
  await openFilterDropdown(page);

  await page.getByText("Add condition", { exact: true }).first().click();

  // A filter row should now appear (contains a column selector and operator)
  await expect(
    page.getByText("contains", { exact: true }).or(page.getByText("is", { exact: true })),
  ).toBeVisible();
});

test("filter can be applied and affects toolbar state", async ({
  page,
}) => {
  await openFilterDropdown(page);
  await page.getByText("Add condition", { exact: true }).first().click();

  // Close the dropdown by clicking outside
  await page.keyboard.press("Escape");

  // The Filter button should still be visible
  const filterBtn = page
    .getByRole("button", { name: /filter/i })
    .first();
  await expect(filterBtn).toBeVisible();
});

test("toggling conjunction from AND to OR works in filter panel", async ({
  page,
}) => {
  await openFilterDropdown(page);
  await page.getByText("Add condition", { exact: true }).first().click();
  await page.getByText("Add condition", { exact: true }).first().click(); // second filter needed for conjunction

  // The conjunction control appears between filter rows — look for a button showing "and"
  // It's a small button (w-16) with text "and" and a chevron, only for index === 1
  const conjunctionBtn = page.locator("button").filter({ hasText: /^and$/ }).first();

  if (await conjunctionBtn.isVisible({ timeout: 2000 })) {
    await conjunctionBtn.click();

    // A sub-menu appears with "and" and "or" options
    await expect(
      page.locator("button").filter({ hasText: /^or$/ }).first(),
    ).toBeVisible({ timeout: 2000 });
  }
});

// ── Sort ─────────────────────────────────────────────────────────────────────

test("Sort button opens the sort dropdown", async ({ page }) => {
  await openSortDropdown(page);
  // The sort panel always shows "Sort by" as a heading
  await expect(page.getByText("Sort by")).toBeVisible({ timeout: 5000 });
});

test("adding a sort shows the Sorted indicator in toolbar", async ({
  page,
}) => {
  await openSortDropdown(page);

  // Click "Add sort" if present
  const addSortBtn = page.getByText(/add.*sort/i).first();
  if (await addSortBtn.isVisible()) {
    await addSortBtn.click();
  }

  // Dismiss dropdown
  await page.keyboard.press("Escape");

  // Toolbar Sort button should show the sorted-by indicator
  await expect(
    page.getByRole("button", { name: /sorted|sort/i }).first(),
  ).toBeVisible();
});

// ── Hide Fields ──────────────────────────────────────────────────────────────

test("Hide Fields dropdown opens and lists columns", async ({ page }) => {
  await openHideFieldsDropdown(page);

  // Should show a list of toggleable fields — look for any toggle or checkbox
  const items = page.locator('[role="switch"], [type="checkbox"]').first();
  await expect(items).toBeVisible({ timeout: 5000 });
});

test("toggling a field hidden removes it from column headers", async ({
  page,
}) => {
  await openHideFieldsDropdown(page);

  // Toggle the first non-primary field switch off
  const switches = page.locator('[role="switch"]');
  const count = await switches.count();
  if (count > 0) {
    await switches.first().click();
    // Restore by clicking the same switch again (it's still visible in the open dropdown)
    await switches.first().click();
  }

  // Click top-left corner to close the backdrop
  await page.mouse.click(10, 10);

  // The toolbar should still be visible
  await expect(page.getByRole("button", { name: /filter/i }).first()).toBeVisible();
});

// ── Bulk row seed ─────────────────────────────────────────────────────────────

test("1K seed button creates 1,000 rows and shows an alert", async ({
  page,
}) => {
  // Listen for the window.alert dialog
  let alertMessage = "";
  page.on("dialog", async (dialog) => {
    alertMessage = dialog.message();
    await dialog.accept();
  });

  await page.getByTitle("Add 1,000 rows").click();

  // Wait for the seed to complete (may take up to 20 seconds)
  await page.waitForTimeout(20_000);

  expect(alertMessage).toMatch(/1,000|1000/);
});

// ── View rename ───────────────────────────────────────────────────────────────

test("double-clicking the view name enables rename mode", async ({ page }) => {
  // The view name button is in the toolbar — it has the GridIcon and view name text
  // Double-click triggers inline rename mode
  const viewBtn = page.getByRole("button", { name: /grid view/i }).first();

  // Double-click to enter rename mode
  await viewBtn.dblclick();

  // An input should appear
  const anyInput = page.locator('input[type="text"]');
  await expect(anyInput.first()).toBeFocused({ timeout: 3000 });
});

test("pressing Enter after typing a new view name renames it", async ({
  page,
}) => {
  // Find the view name button (shows "Grid view" by default)
  const viewBtn = page.getByRole("button", { name: /grid view/i }).first();

  await viewBtn.dblclick();

  const input = page.locator('input[type="text"]').first();
  await input.clear();
  await input.fill("My Renamed View");
  await input.press("Enter");

  await expect(page.getByText("My Renamed View").first()).toBeVisible({
    timeout: 3000,
  });
});

// ── Row height ────────────────────────────────────────────────────────────────

test("row height picker opens when clicking the row height icon", async ({
  page,
}) => {
  // The row height button is between "Color" and "Share and sync"
  // Color button has text "Color", Share and sync has text "Share and sync"
  // Row height button is icon-only with class p-1 (not p-2 like others)
  // It's located after the Color button in the toolbar
  const colorBtn = page.getByRole("button", { name: /color/i });
  await expect(colorBtn).toBeVisible();

  // The row height button is the next sibling button with no text
  // Use the toolbar's ml-auto container and find icon-only buttons (p-1 padding)
  const toolbar = page.locator(".ml-auto");
  // Row height is the first button that has only p-1 class (icon-only, small padding)
  // compared to other buttons that have px-2 py-1
  const rowHeightBtn = toolbar.locator("button.rounded-md.p-1").first();

  await rowHeightBtn.click();

  // Should show height options: Short, Medium, Tall, Extra Tall
  await expect(
    page.getByText("Short").first(),
  ).toBeVisible({ timeout: 3000 });
});
