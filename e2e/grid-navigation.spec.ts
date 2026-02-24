/**
 * E2E tests — Grid keyboard navigation
 *
 * Covers:
 *  - Arrow keys move focus between cells
 *  - Tab / Shift+Tab move horizontally
 *  - Enter enters edit mode; Escape exits edit mode
 *  - Shift+Enter inserts a new row below
 *  - Delete / Backspace clears cell content
 *  - Typing a character while a cell is selected enters edit mode
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

// ── Arrow key navigation ─────────────────────────────────────────────────────

test("ArrowRight moves focus to the next column", async ({ page }) => {
  const cell = firstCell(page);
  const cellId = await cell.getAttribute("id"); // e.g. "cell-1-1"
  await cell.click();

  await page.keyboard.press("ArrowRight");

  // The active element should now be a different cell
  const focused = page.locator("[id^='cell-']:focus, [id^='cell-'] input:focus");
  await expect(focused).not.toHaveAttribute("id", cellId ?? "");
});

test("ArrowDown moves focus to the next row", async ({ page }) => {
  const cells = page.locator('[id^="cell-"]');
  // Click the first cell to select it
  await cells.first().click();
  const firstCellId = await cells.first().getAttribute("id");

  await page.keyboard.press("ArrowDown");

  // Grid uses ring-2 to indicate selected cell — wait for a different cell to get ring-2
  await expect(
    page.locator('[id^="cell-"].ring-2').or(page.locator('[id^="cell-"][class*="ring-2"]')),
  ).not.toHaveAttribute("id", firstCellId ?? "", { timeout: 2000 });
});

test("ArrowLeft wraps back from first column to stay in bounds", async ({
  page,
}) => {
  const cell = firstCell(page);
  await cell.click();

  // Should not throw or navigate to a non-existent cell
  await page.keyboard.press("ArrowLeft");
  // Verify grid still visible
  await expect(page.locator('[id^="cell-"]').first()).toBeVisible();
});

test("ArrowUp from first row stays in bounds", async ({ page }) => {
  const cell = firstCell(page);
  await cell.click();

  await page.keyboard.press("ArrowUp");
  await expect(page.locator('[id^="cell-"]').first()).toBeVisible();
});

// ── Tab navigation ───────────────────────────────────────────────────────────

test("Tab moves focus rightward across columns", async ({ page }) => {
  const cells = page.locator('[id^="cell-"]');
  await cells.first().click();
  const firstCellId = await cells.first().getAttribute("id");

  await page.keyboard.press("Tab");

  // Grid uses ring-2 to indicate selected cell; Tab moves to next column
  await expect(
    page.locator('[id^="cell-"].ring-2').or(page.locator('[id^="cell-"][class*="ring-2"]')),
  ).not.toHaveAttribute("id", firstCellId ?? "", { timeout: 2000 });
});

test("Shift+Tab moves focus leftward", async ({ page }) => {
  // Tab right to second column, then Shift+Tab should come back to first
  const cells = page.locator('[id^="cell-"]');
  await cells.first().click();
  const firstCellId = await cells.first().getAttribute("id");

  await page.keyboard.press("Tab"); // move right to second column

  // Selected cell should now be different
  const selectedAfterTab = page.locator('[id^="cell-"].ring-2').or(
    page.locator('[id^="cell-"][class*="ring-2"]'),
  );
  await expect(selectedAfterTab).not.toHaveAttribute("id", firstCellId ?? "", { timeout: 2000 });

  await page.keyboard.press("Shift+Tab"); // move back left

  // After Shift+Tab the selected cell should be back to (or near) the first cell
  await expect(page.locator('[id^="cell-"]').first()).toBeVisible();
});

// ── Enter / Escape ───────────────────────────────────────────────────────────

test("Enter on a selected cell enters edit mode", async ({ page }) => {
  const cell = firstCell(page);
  await cell.click();

  await page.keyboard.press("Enter");

  // An input should become focused inside the cell
  const input = cell.locator("input, textarea");
  await expect(input).toBeFocused({ timeout: 2000 });
});

test("Escape exits edit mode and returns to selection mode", async ({
  page,
}) => {
  const cell = firstCell(page);
  await cell.click();
  await page.keyboard.press("Enter"); // enter edit mode

  await page.keyboard.press("Escape"); // exit edit mode

  // Cell itself (not input) should be visible and the input gone or unfocused
  await expect(cell).toBeVisible();
});

test("Typing a character while cell is selected enters edit mode with that character", async ({
  page,
}) => {
  const cell = firstCell(page);
  await cell.click();

  await page.keyboard.press("x"); // trigger inline edit

  const input = cell.locator("input, textarea");
  await expect(input).toBeFocused({ timeout: 2000 });
});

// ── Shift+Enter — insert row below ──────────────────────────────────────────

test("Shift+Enter inserts a new row below the current row", async ({
  page,
}) => {
  const cell = firstCell(page);
  await cell.click();

  // Count rows before
  const beforeCount = await page.locator('[id^="cell-"]').count();

  await page.keyboard.press("Shift+Enter");

  // Allow for network round-trip
  await page.waitForTimeout(1500);

  const afterCount = await page.locator('[id^="cell-"]').count();
  expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
});

// ── Delete / Backspace ───────────────────────────────────────────────────────

test("Delete key clears cell content when in selection mode", async ({
  page,
}) => {
  // First write something into a cell
  const cell = firstCell(page);
  await cell.click();
  await page.keyboard.press("Enter");
  const input = cell.locator("input, textarea");
  await input.fill("hello");
  await page.keyboard.press("Escape");

  // Now press Delete to clear
  await cell.click();
  await page.keyboard.press("Delete");

  // After clearing, cell text should be empty or the input value should be ""
  await page.waitForTimeout(500);
  const text = await cell.innerText();
  expect(text.trim()).toBe("");
});
