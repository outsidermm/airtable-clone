/**
 * Shared E2E test helpers.
 *
 * Provides typed wrappers around tRPC's batch HTTP API so tests can
 * create/delete test data programmatically without going through the UI.
 *
 * tRPC batch format:
 *   POST /api/trpc/<procedure>?batch=1
 *   Body: { "0": { "json": <input> } }
 *   Response: [{ "result": { "data": { "json": <output> } } }]
 */

import type { Page, APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";

/** Call a tRPC mutation using the Playwright request context. */
async function callMutation<T>(
  request: APIRequestContext,
  procedure: string,
  input: unknown,
): Promise<T> {
  const res = await request.post(`/api/trpc/${procedure}?batch=1`, {
    data: { "0": { json: input } },
  });

  if (!res.ok()) {
    throw new Error(
      `tRPC ${procedure} failed: ${res.status()} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as [
    { result: { data: { json: T } } } | { error: unknown },
  ];

  const first = body[0];
  if (!first || "error" in first) {
    throw new Error(
      `tRPC ${procedure} returned an error: ${JSON.stringify(first)}`,
    );
  }

  return first.result.data.json;
}

/** Shapes returned by the tRPC routers (minimal set used in tests). */
export interface TrpcBase {
  id: string;
  name: string;
}

export interface TrpcTable {
  id: number;
  name: string;
}

/**
 * Create a new base (includes a default "Table 1" with sample rows).
 * Returns the base object `{ id, name, ... }`.
 */
export async function createTestBase(
  request: APIRequestContext,
): Promise<TrpcBase> {
  return callMutation<TrpcBase>(request, "base.create", {});
}

/**
 * Delete a base by ID.
 */
export async function deleteTestBase(
  request: APIRequestContext,
  baseId: string,
): Promise<void> {
  await callMutation(request, "base.delete", { id: baseId });
}

/**
 * Navigate to a base's first table and wait for the grid to load at least
 * one cell.
 */
export async function navigateToBase(page: Page, baseId: string): Promise<void> {
  await page.goto(`/base/${baseId}`);
  // Wait for at least one data cell to appear, indicating the grid has loaded.
  await page.waitForSelector('[id^="cell-"]', { timeout: 15_000 });
  // Wait for React hydration to complete so all event handlers are wired up.
  // SSR cells appear before client-side JS finishes hydrating, which causes
  // button onClick handlers to silently no-op if clicked too early.
  await page.waitForLoadState("networkidle");
}

/**
 * Return the first loaded grid cell on the page.
 */
export function firstCell(page: Page) {
  return page.locator('[id^="cell-"]').first();
}

/**
 * Click a cell, then return the focused input element within it.
 *
 * Cells switch from a read-only div to a focusable input when selected, so
 * we click once to select and again to enter edit mode when needed.
 */
export async function selectCell(page: Page, cellLocator: ReturnType<Page["locator"]>) {
  await cellLocator.click();
}

/**
 * Click a cell twice to enter edit mode, then return the input/textarea.
 */
export async function editCell(page: Page, cellLocator: ReturnType<Page["locator"]>) {
  await cellLocator.click();
  await cellLocator.click();
}

/**
 * Wait for the grid's row count to stabilise at `expectedCount`.
 * Checks the "N record(s)" footer label.
 */
export async function waitForRowCount(
  page: Page,
  expectedCount: number,
): Promise<void> {
  await expect(
    page.locator(`text=${expectedCount.toLocaleString()} record`),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * Open the Filter toolbar dropdown.
 */
export async function openFilterDropdown(page: Page) {
  await page
    .getByRole("button", { name: /filter/i })
    .first()
    .click();
  await expect(page.getByText("Add condition", { exact: true })).toBeVisible();
}

/**
 * Open the Sort toolbar dropdown.
 */
export async function openSortDropdown(page: Page) {
  await page.getByRole("button", { name: /sort/i }).first().click();
}

/**
 * Open the Hide Fields toolbar dropdown.
 */
export async function openHideFieldsDropdown(page: Page) {
  await page.getByRole("button", { name: /hide fields/i }).first().click();
}
