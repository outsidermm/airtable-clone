import { LexoRank } from "lexorank";
import type { PrismaClient } from "../../../../generated/prisma/client";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

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

    // Get the row that comes before the beforeRow — use id ordering since order column is removed
    const prevRows = await tx.$queryRaw<Array<{ id: number }>>`
      SELECT r2.id FROM "Row" r2
      WHERE r2."tableId" = ${tableId} AND r2.id < ${beforeRowId}
      ORDER BY r2.id DESC LIMIT 1
    `;

    if (prevRows.length > 0) {
      // We don't have a LexoRank order anymore, so this path won't be used
      // after migration. Keep for compatibility during transition.
      return LexoRank.middle().toString();
    } else {
      return LexoRank.middle().genPrev().toString();
    }
  }

  // Handle afterRowId or default behavior
  if (afterRowId === null || afterRowId === undefined) {
    // Insert at last position — no longer used for ordering
    return LexoRank.middle().toString();
  } else {
    return LexoRank.middle().toString();
  }
}

/**
 * Batch create multiple rows with empty cells JSON
 * Uses chunking for memory efficiency with large datasets
 */
export async function bulkCreateRows(
  tx: PrismaTransaction,
  tableId: number,
  count: number,
  options: {
    startingOrder?: string;
    cellsJson?: Record<string, unknown>;
  } = {},
): Promise<number[]> {
  const cellsJson = options.cellsJson ?? {};
  const cellsJsonStr = JSON.stringify(cellsJson);

  // Batch size for optimal performance with parameterized raw SQL
  const PARAMS_PER_ROW = 2; // tableId, cells
  const MAX_PG_PARAMS = 32767;
  const batchSize = Math.floor(MAX_PG_PARAMS / PARAMS_PER_ROW);

  const createdRowIds: number[] = [];

  for (let i = 0; i < count; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, count - i);

    // Build parameterized placeholders: ($1, $2::jsonb, NOW()), ($3, $4::jsonb, NOW()), ...
    const placeholders = Array.from({ length: currentBatchSize }, (_, idx) => {
      const offset = idx * PARAMS_PER_ROW;
      return `($${offset + 1}, $${offset + 2}::jsonb, NOW())`;
    }).join(", ");

    // Flatten parameters: [tableId, cellsJson, tableId, cellsJson, ...]
    const params = Array.from({ length: currentBatchSize }).flatMap(() => [
      tableId,
      cellsJsonStr,
    ]);

    const rows = await tx.$queryRawUnsafe<Array<{ id: number }>>(
      `INSERT INTO "Row" ("tableId", "cells", "createdAt") VALUES ${placeholders} RETURNING "id"`,
      ...params,
    );
    createdRowIds.push(...rows.map((r) => r.id));
  }

  return createdRowIds;
}
