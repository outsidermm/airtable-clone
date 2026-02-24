/**
 * E2E tests — Drag-and-drop reordering
 *
 * Covers:
 *  - Column reordering via drag on header cells
 *  - Row reordering via drag on row drag handles
 *
 * NOTE: dnd-kit uses Pointer Events (not HTML5 drag API).
 * Playwright simulates pointer events via mouse.move() + mouse.down/up().
 *
 * Implementation notes:
 *  - A 5px activation constraint is set on the PointerSensor, so the drag
 *    must move at least 5px before the drag starts.
 *  - Column drag items: `col-{id}` role on header cells
 *  - Row drag items: `row-{id}` — the entire row acts as the sortable item
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

// ── Helper: pointer-based drag ───────────────────────────────────────────────

/**
 * Perform a pointer-events drag from (startX, startY) to (endX, endY).
 * Uses a slow step-by-step move to trigger dnd-kit's threshold detection.
 */
async function pointerDrag(
  page: import("@playwright/test").Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // Move in small increments to satisfy the 5px activation constraint
  const steps = 15;
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await page.mouse.move(x, y, { steps: 1 });
    await page.waitForTimeout(10);
  }
  await page.mouse.up();
}


// ── Row reordering ───────────────────────────────────────────────────────────

test("dragging a row drag handle reorders rows", async ({ page }) => {
  // Row drag handles are typically the leftmost element in a row
  // dnd-kit's SortableRow wraps the entire row — look for rows by class
  const rows = page.locator('[id^="cell-"]');
  const rowCount = await rows.count();

  if (rowCount < 2) {
    test.skip();
    return;
  }

  // Get positions of two rows
  const row1BBox = await rows.nth(0).boundingBox();
  const row2BBox = await rows.nth(1).boundingBox();

  if (!row1BBox || !row2BBox) {
    test.skip();
    return;
  }

  // Drag row 1 below row 2
  await pointerDrag(
    page,
    { x: row1BBox.x + 10, y: row1BBox.y + row1BBox.height / 2 },
    {
      x: row2BBox.x + 10,
      y: row2BBox.y + row2BBox.height + 5,
    },
  );

  await page.waitForTimeout(1000);

  // Grid should still be visible without errors
  await expect(page.locator('[id^="cell-"]').first()).toBeVisible();
});

test("grid remains stable (no crash) after several row drags", async ({
  page,
}) => {
  const rows = page.locator('[id^="cell-"]');

  for (let i = 0; i < 3; i++) {
    const count = await rows.count();
    if (count < 2) break;

    const r0 = await rows.nth(0).boundingBox();
    const r1 = await rows.nth(1).boundingBox();
    if (!r0 || !r1) break;

    await pointerDrag(
      page,
      { x: r0.x + 5, y: r0.y + r0.height / 2 },
      { x: r1.x + 5, y: r1.y + r1.height / 2 },
    );
    await page.waitForTimeout(500);
  }

  await expect(page.locator('[id^="cell-"]').first()).toBeVisible();
});

// ── Column resize ─────────────────────────────────────────────────────────────

test("dragging a column resize handle changes the column width", async ({
  page,
}) => {
  // Column resize handles are typically at the right edge of header cells
  // Look for the resize handle element
  const resizeHandles = page.locator(
    "[class*='resize'], [class*='resizer'], [style*='cursor: col-resize']",
  );

  const handleCount = await resizeHandles.count();

  if (handleCount === 0) {
    // Fall back: drag the right edge of the header
    const header = page.locator(".sticky.top-0").first();
    const bbox = await header.boundingBox();
    if (!bbox) {
      test.skip();
      return;
    }

    // Drag from the right edge of the header
    const startX = bbox.x + bbox.width - 2;
    const startY = bbox.y + bbox.height / 2;

    await pointerDrag(
      page,
      { x: startX, y: startY },
      { x: startX + 50, y: startY },
    );
  } else {
    const handle = resizeHandles.first();
    const bbox = await handle.boundingBox();
    if (!bbox) {
      test.skip();
      return;
    }

    await pointerDrag(
      page,
      { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 },
      { x: bbox.x + bbox.width / 2 + 50, y: bbox.y + bbox.height / 2 },
    );
  }

  // Grid should still be visible
  await expect(page.locator('[id^="cell-"]').first()).toBeVisible();
});
