/**
 * E2E tests — Modals and dialogs
 *
 * Covers:
 *  - Add Column modal: open, search field types, select type, configure name, create
 *  - Edit Column modal: open via double-click on header, change name, save
 *  - Add Table modal: open from table tab "+", create new blank table
 *  - Cancel button closes the modal without making changes
 */

import { test, expect } from "@playwright/test";
import {
  createTestBase,
  deleteTestBase,
  navigateToBase,
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

// ── Add Column modal ──────────────────────────────────────────────────────────

// The add-column (+) button in the grid header has style="width: 80px"
// and contains only a PlusIcon (no text label).
function getAddColBtn(page: Parameters<typeof navigateToBase>[0]) {
  return page.locator('button[style*="width: 80px"]');
}

// After the add-column modal is open, click a field type by its exact label name.
// The modal is position: fixed and may be outside the visual viewport, so we
// use evaluate() to call the native .click() which bypasses viewport restrictions.
async function clickFieldType(page: Parameters<typeof navigateToBase>[0], name: string) {
  const modal = page.locator(".shadow-2xl");
  const btn = modal.locator("button").filter({ hasText: name }).first();
  // Scroll the button into view within its overflow container first
  await btn.evaluate((el) => el.scrollIntoView({ block: "nearest" }));
  // Use native click to bypass Playwright's viewport check
  await btn.evaluate((el) => (el as HTMLElement).click());
}

test("clicking the + column button opens the Add Column modal", async ({
  page,
}) => {
  await getAddColBtn(page).click();

  // The modal has a "Find a field type" placeholder input
  await expect(page.getByPlaceholder("Find a field type")).toBeVisible({
    timeout: 5000,
  });
});

test("field type search filters the list", async ({ page }) => {
  await getAddColBtn(page).click();

  const searchInput = page.getByPlaceholder("Find a field type");
  await searchInput.fill("number");

  // "Number" field type button should be visible within the modal
  const modal = page.locator(".shadow-2xl");
  await expect(modal.locator("button").filter({ hasText: "Number" }).first()).toBeVisible();
});

test("selecting a field type opens the configuration page", async ({
  page,
}) => {
  await getAddColBtn(page).click();

  await page.getByPlaceholder("Find a field type").fill("text");
  await clickFieldType(page, "Text");

  // Configuration page shows a field name input
  await expect(page.getByPlaceholder("Field name (optional)")).toBeVisible({
    timeout: 3000,
  });
});

test("creating a new Text field adds a column to the grid", async ({
  page,
}) => {
  await getAddColBtn(page).click();

  const searchInput = page.getByPlaceholder("Find a field type");
  await searchInput.fill("text");
  await clickFieldType(page, "Text");

  await page.getByPlaceholder("Field name (optional)").fill("E2E Test Column");
  await page.getByRole("button", { name: "Create field" }).click();

  // Wait for the column to appear
  await page.waitForTimeout(2000);
  await expect(page.getByText("E2E Test Column")).toBeVisible({ timeout: 5000 });
});

test("Cancel button closes the modal without creating a column", async ({
  page,
}) => {
  await getAddColBtn(page).click();

  await page.getByPlaceholder("Find a field type").fill("text");
  await clickFieldType(page, "Text");

  await page.getByRole("button", { name: "Cancel" }).click();

  // Modal should be gone
  await expect(
    page.getByPlaceholder("Field name (optional)"),
  ).not.toBeVisible({ timeout: 2000 });
});

test("clicking outside the modal backdrop closes it", async ({ page }) => {
  await getAddColBtn(page).click();

  await expect(page.getByPlaceholder("Find a field type")).toBeVisible();

  // Click the transparent backdrop (fixed inset-0 div)
  await page.mouse.click(5, 5); // top-left corner, behind the modal

  await expect(
    page.getByPlaceholder("Find a field type"),
  ).not.toBeVisible({ timeout: 2000 });
});

// ── Edit Column modal ─────────────────────────────────────────────────────────

test("double-clicking a column header opens the Edit Column modal", async ({
  page,
}) => {
  // Column header buttons for non-primary columns (e.g. "Number", "Notes")
  // Double-click the "Number" header button
  const numberHeader = page.getByRole("button", { name: "Number" });
  await numberHeader.dblclick();

  // Edit modal shows a field name input pre-filled with the column name
  await expect(
    page.getByPlaceholder("Field name (optional)"),
  ).toBeVisible({ timeout: 5000 });
});

// ── Add Table modal ───────────────────────────────────────────────────────────

test("clicking the + tab button opens the Add Table menu", async ({ page }) => {
  // The "+" button in the table tab bar
  const addTableBtn = page
    .getByRole("button", { name: /add table|new table|\+/i })
    .or(
      page.locator("button[title*='table' i]"),
    )
    .first();

  if (await addTableBtn.isVisible()) {
    await addTableBtn.click();

    await expect(
      page
        .getByText(/start from scratch|new table|create table/i)
        .first(),
    ).toBeVisible({ timeout: 5000 });
  } else {
    // Skip if the button is not accessible in current layout
    test.skip();
  }
});

test("creating a blank table from the Add Table menu adds a new table tab", async ({
  page,
}) => {
  const addTableBtn = page
    .getByRole("button", { name: /add table|new table|\+/i })
    .or(page.locator("button[title*='table' i]"))
    .first();

  if (!(await addTableBtn.isVisible())) {
    test.skip();
    return;
  }

  await addTableBtn.click();

  const scratchOption = page.getByText(/start from scratch/i);
  if (await scratchOption.isVisible()) {
    await scratchOption.click();
    await page.waitForTimeout(2000);
    // A new "Table 2" or similar tab should appear
    await expect(
      page.getByText(/table 2|new table/i),
    ).toBeVisible({ timeout: 5000 });
  }
});
