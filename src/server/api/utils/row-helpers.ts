import { faker } from "@faker-js/faker";
import type { PrismaClient } from "../../../../generated/prisma/client";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

const BATCH_SIZE = 10_000;

/**
 * Bulk-insert N rows using minimal round-trips.
 *
 * - Empty rows: single generate_series INSERT (one round-trip, fully DB-side)
 * - Seeded rows: Faker.js generates data JS-side, passed as a JSONB array
 *   and expanded with jsonb_array_elements (one round-trip per BATCH_SIZE rows)
 *
 * Rows are assigned sequential `order` values starting from MAX(order)+1
 * so new rows always sort after existing ones and preserve insertion order.
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
  // Get the current maximum order so new rows sort after existing ones
  const baseOrderResult = await tx.$queryRaw<[{ max: number | null }]>`
    SELECT MAX("order") as max FROM "Row" WHERE "tableId" = ${tableId}
  `;
  const baseOrder = baseOrderResult[0]?.max ?? 0;

  if (options.generateVariedData && options.columnIds?.length) {
    let totalInserted = 0;

    for (let offset = 0; offset < count; offset += BATCH_SIZE) {
      const batchSize = Math.min(BATCH_SIZE, count - offset);

      // Generate batchSize rows of realistic data with Faker.js
      const rowsJson = JSON.stringify(
        Array.from({ length: batchSize }, () => {
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
        }),
      );

      // Each batch offset gives sequential order values: baseOrder+offset+1 … baseOrder+offset+batchSize
      const batchBaseOrder = baseOrder + offset;
      const affected = await tx.$executeRawUnsafe(
        `INSERT INTO "Row" ("tableId", "cells", "order", "createdAt")
         SELECT $1::int, elem, $3::float + ROW_NUMBER() OVER (), NOW()
         FROM jsonb_array_elements($2::jsonb) AS elem`,
        tableId,
        rowsJson,
        batchBaseOrder,
      );
      totalInserted += affected;
    }

    return totalInserted;
  }

  // No seeding: insert N empty rows in a single generate_series query
  // Order values: baseOrder+1 … baseOrder+count
  const affected = await tx.$executeRawUnsafe(
    `INSERT INTO "Row" ("tableId", "cells", "order", "createdAt")
     SELECT $1::int, '{}'::jsonb, $3::float + gs, NOW()
     FROM generate_series(1, $2::int) AS gs`,
    tableId,
    count,
    baseOrder,
  );
  return affected;
}
