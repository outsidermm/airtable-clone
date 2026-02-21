import { faker } from "@faker-js/faker";
import { LexoRank } from "lexorank";
import type { PrismaClient } from "../../../../generated/prisma/client";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const BATCH_SIZE = 10_000;

/**
 * Bulk-insert N rows using minimal round-trips.
 *
 * - Both empty and seeded rows: LexoRank strings are generated JS-side in
 * batches of BATCH_SIZE, then inserted via jsonb_array_elements_text.
 *
 * Rows are assigned sequential LexoRank `order` values starting from
 * MAX(order).genNext() so new rows always sort after existing ones.
 *
 * Returns the total number of rows inserted.
 */
export async function bulkCreateRows(
  tx: PrismaTransaction,
  tableId: number,
  count: number,
  options: {
    generateVariedData?: boolean;
    columnIds?: number[];
    columnTypes?: string[];
  } = {},
): Promise<number> {
  // Find the last row's LexoRank order so new rows sort after it
  const lastRowResult = await tx.$queryRaw<[{ order: string | null }]>`
    SELECT "order" FROM "Row" WHERE "tableId" = ${tableId}
    ORDER BY "order" DESC, id DESC LIMIT 1
  `;
  let currentRank = lastRowResult[0]?.order
    ? LexoRank.parse(lastRowResult[0].order)
    : LexoRank.middle();

  if (options.generateVariedData && options.columnIds?.length) {
    let totalInserted = 0;

    for (let offset = 0; offset < count; offset += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, count - offset);

      // Generate LexoRank order values for this batch
      const orders: string[] = [];
      for (let i = 0; i < batchSize; i++) {
        currentRank = currentRank.genNext();
        orders.push(currentRank.toString());
      }

      // Generate batchSize rows of realistic data with Faker.js
      const cellsArray = Array.from({ length: batchSize }, () => {
        const cells: Record<string, string | number> = {};
        for (let i = 0; i < options.columnIds!.length; i++) {
          const colId = String(options.columnIds![i]!);
          if (options.columnTypes![i] === "NUMBER") {
            cells[colId] = faker.number.int({ min: 0, max: 9999 });
          } else {
            cells[colId] = faker.commerce.productName();
          }
        }
        return cells;
      });

      const cellsJson = JSON.stringify(cellsArray);
      const ordersJson = JSON.stringify(orders);

      const affected = await tx.$executeRawUnsafe(
        `INSERT INTO "Row" ("tableId", "cells", "order", "createdAt")
         SELECT $1::int, c.val, o.val, NOW()
         FROM jsonb_array_elements($2::jsonb) WITH ORDINALITY AS c(val, idx)
         JOIN jsonb_array_elements_text($3::jsonb) WITH ORDINALITY AS o(val, idx) USING (idx)`,
        tableId,
        cellsJson,
        ordersJson,
      );
      totalInserted += affected;
    }

    return totalInserted;
  }

  // No seeding: insert N empty rows in batches with LexoRank order strings
  let totalInserted = 0;

  for (let offset = 0; offset < count; offset += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, count - offset);

    const orders: string[] = [];
    for (let i = 0; i < batchSize; i++) {
      currentRank = currentRank.genNext();
      orders.push(currentRank.toString());
    }

    const ordersJson = JSON.stringify(orders);
    const affected = await tx.$executeRawUnsafe(
      `INSERT INTO "Row" ("tableId", "cells", "order", "createdAt")
       SELECT $1::int, '{}'::jsonb, order_val, NOW()
       FROM jsonb_array_elements_text($2::jsonb) AS order_val`,
      tableId,
      ordersJson,
    );
    totalInserted += affected;
  }

  return totalInserted;
}

/**
 * Calculate the LexoRank position for a row
 * Supports inserting before or after another row, or at the start/end
 */
export async function calculateRowPosition(
  tx: PrismaTransaction,
  tableId: number,
  options: {
    afterRowId?: number | null;
    beforeRowId?: number | null;
  },
): Promise<string> {
  const { afterRowId, beforeRowId } = options;

  // Can't specify both
  if (afterRowId !== undefined && beforeRowId !== undefined) {
    throw new Error("Cannot specify both afterRowId and beforeRowId");
  }

  // Handle beforeRowId
  if (beforeRowId !== undefined && beforeRowId !== null) {
    const beforeRow = await tx.row.findUnique({
      where: { id: beforeRowId },
    });

    if (beforeRow?.tableId !== tableId) {
      throw new Error("Invalid beforeRowId");
    }

    // Get the row that comes before the beforeRow
    const prevRow = await tx.row.findFirst({
      where: {
        tableId,
        order: { lt: beforeRow.order },
      },
      orderBy: { order: "desc" },
    });

    if (prevRow) {
      // Insert between prevRow and beforeRow
      const prevOrder = LexoRank.parse(prevRow.order);
      const beforeOrder = LexoRank.parse(beforeRow.order);
      return prevOrder.between(beforeOrder).toString();
    } else {
      // Insert at start (before first row)
      const beforeOrder = LexoRank.parse(beforeRow.order);
      return beforeOrder.genPrev().toString();
    }
  }

  // Handle afterRowId or default behavior
  if (afterRowId === null || afterRowId === undefined) {
    // Insert at last position
    const lastRow = await tx.row.findFirst({
      where: { tableId },
      orderBy: { order: "desc" },
    });

    if (!lastRow) {
      // First row in table
      return LexoRank.middle().toString();
    }

    const lastOrder = LexoRank.parse(lastRow.order);
    return lastOrder.genNext().toString();
  } else {
    // Insert after specified row
    const afterRow = await tx.row.findUnique({
      where: { id: afterRowId },
    });

    if (afterRow?.tableId !== tableId) {
      throw new Error("Invalid afterRowId");
    }

    // Get the next row
    const nextRow = await tx.row.findFirst({
      where: {
        tableId,
        order: { gt: afterRow.order },
      },
      orderBy: { order: "asc" },
    });

    const afterOrder = LexoRank.parse(afterRow.order);

    if (nextRow) {
      // Insert between afterRow and nextRow
      const nextOrder = LexoRank.parse(nextRow.order);
      return afterOrder.between(nextOrder).toString();
    } else {
      // Insert at end
      return afterOrder.genNext().toString();
    }
  }
}
