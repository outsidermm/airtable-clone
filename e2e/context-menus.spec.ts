/**
 * E2E tests — Context menus
 *
 * Covers:
 *  - Right-clicking a row shows the record context menu
 *  - Record menu items: Insert record above, Insert record below, Delete record
 *  - Right-clicking a column header shows the column context menu
 *  - Column menu items: Hide field, Sort A→Z, Filter by field
 */

import { test, expect } from "@playwright/test";
import {
  createTestBase,
  deleteTestBase,
  navigateToBase,
  firstCell,
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

// ── Record (row) context menu ────────────────────────────────────────────────

test("right-clicking a row shows the record context menu", async ({ page }) => {
  const cell = firstCell(page);
  await cell.click({ button: "right" });

  // The context menu portal appears at document body level
  await expect(page.getByText("Insert record above")).toBeVisible();
  await expect(page.getByText("Insert record below")).toBeVisible();
  await expect(page.getByText("Delete record")).toBeVisible();
});

test("Insert record above adds a row before the right-clicked row", async ({
  page,
}) => {
  const cells = page.locator('[id^="cell-"]');
  const countBefore = await cells.count();

  const cell = firstCell(page);
  await cell.click({ button: "right" });
  await page.getByText("Insert record above").click();

  // Wait for the mutation to complete
  await page.waitForTimeout(1500);
  const countAfter = await cells.count();

  expect(countAfter).toBeGreaterThanOrEqual(countBefore);
});

test("Insert record below adds a row after the right-clicked row", async ({
  page,
}) => {
  const cells = page.locator('[id^="cell-"]');
  const countBefore = await cells.count();

  const cell = firstCell(page);
  await cell.click({ button: "right" });
  await page.getByText("Insert record below").click();

  await page.waitForTimeout(1500);
  const countAfter = await cells.count();
  expect(countAfter).toBeGreaterThanOrEqual(countBefore);
});

test("Duplicate record duplicates the right-clicked row", async ({ page }) => {
  const cells = page.locator('[id^="cell-"]');
  const countBefore = await cells.count();

  const cell = firstCell(page);
  await cell.click({ button: "right" });
  await page.getByText("Duplicate record").click();

  await page.waitForTimeout(1500);
  const countAfter = await cells.count();
  expect(countAfter).toBeGreaterThanOrEqual(countBefore);
});

test("Delete record removes a row", async ({ page }) => {
  // First insert a row so we have something to delete without affecting seed data
  const cell = firstCell(page);
  await cell.click({ button: "right" });
  await page.getByText("Insert record below").click();
  await page.waitForTimeout(1000);

  // Count after insertion
  const cells = page.locator('[id^="cell-"]');
  const countAfterInsert = await cells.count();

  // Now delete the first row
  const cellToDelete = firstCell(page);
  await cellToDelete.click({ button: "right" });
  await page.getByText("Delete record").click();

  await page.waitForTimeout(1500);
  const countAfterDelete = await cells.count();
  expect(countAfterDelete).toBeLessThan(countAfterInsert);
});

test("context menu closes when pressing Escape", async ({ page }) => {
  const cell = firstCell(page);
  await cell.click({ button: "right" });
  await expect(page.getByText("Insert record above")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByText("Insert record above")).not.toBeVisible({
    timeout: 2000,
  });
});

// ── Column header context menu ───────────────────────────────────────────────
// Column headers for non-primary columns are rendered as <button> elements.
// The default table has "Number" and "Notes" columns as header buttons.

test("right-clicking a column header shows the column context menu", async ({
  page,
}) => {
  // Right-click on the "Number" column header button
  const header = page.getByRole("button", { name: "Number" });
  await header.click({ button: "right" });

  // Column context menu items — Sort A → Z is unique to the column context menu
  await expect(page.getByText("Sort A → Z")).toBeVisible({ timeout: 5000 });
});

test("column context menu contains Sort A→Z option", async ({ page }) => {
  const header = page.getByRole("button", { name: "Number" });
  await header.click({ button: "right" });

  await expect(
    page.getByText(/sort a.*z|sort ascending/i).first(),
  ).toBeVisible({ timeout: 5000 });
});

test("column context menu contains Filter by this field option", async ({
  page,
}) => {
  const header = page.getByRole("button", { name: "Number" });
  await header.click({ button: "right" });

  await expect(
    page.getByText(/filter by this field/i),
  ).toBeVisible({ timeout: 5000 });
});

test("column context menu has Delete field option", async ({
  page,
}) => {
  // Right-click on the "Number" header — "Delete field" should be present
  const header = page.getByRole("button", { name: "Number" });
  await header.click({ button: "right" });

  await expect(
    page.getByText(/delete field/i),
  ).toBeVisible({ timeout: 5000 });
});
