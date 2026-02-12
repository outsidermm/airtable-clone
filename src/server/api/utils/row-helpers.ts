import { LexoRank } from "lexorank";
import { ColumnType, type PrismaClient } from "../../../../generated/prisma/client";

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

/**
 * Create cells for a new row across all columns in a table
 * Optimized for bulk operations
 */
export async function createCellsForRow(
  tx: PrismaTransaction,
  tableId: number,
  rowId: number,
) {
  // Get all columns for the table
  const columns = await tx.column.findMany({
    where: { tableId },
    select: { id: true, type: true },
  });

  if (columns.length === 0) {
    return;
  }

  // Create cells for each column
  await tx.cell.createMany({
    data: columns.map((column) => ({
      tableId,
      rowId,
      columnId: column.id,
      textValue: column.type === ColumnType.TEXT ? "" : null,
      numberValue: column.type === ColumnType.NUMBER ? null : null,
    })),
  });
}

/**
 * Batch create multiple rows with cells
 * Uses chunking for memory efficiency with large datasets
 */
export async function bulkCreateRows(
  tx: PrismaTransaction,
  tableId: number,
  count: number,
  options: {
    startingOrder?: string;
    generateCellData?: boolean;
  } = {},
): Promise<number[]> {
  const { generateCellData = true, startingOrder } = options;

  // Get columns once for all rows
  const columns = await tx.column.findMany({
    where: { tableId },
    select: { id: true, type: true },
  });

  // Generate row orders
  let currentOrder = startingOrder
    ? LexoRank.parse(startingOrder)
    : LexoRank.middle();

  const rowOrders: string[] = [];
  for (let i = 0; i < count; i++) {
    rowOrders.push(currentOrder.toString());
    currentOrder = currentOrder.genNext();
  }

  // Batch size for optimal performance
  // For 100k+ inserts, use parameterized raw SQL with PostgreSQL parameter limits
  const PARAMS_PER_ROW = 2; // tableId, order
  const MAX_PG_PARAMS = 32767; // PostgreSQL limit is 65535, use conservative value
  const BATCH_SIZE_RAW_SQL = Math.floor(MAX_PG_PARAMS / PARAMS_PER_ROW); // ~16k rows
  const BATCH_SIZE_PRISMA = 1000; // Standard batch size for Prisma createMany

  const createdRowIds: number[] = [];

  // Determine batch size based on total count
  const useRawSQL = count >= 100000;
  const batchSize = useRawSQL ? BATCH_SIZE_RAW_SQL : BATCH_SIZE_PRISMA;

  // Create rows in batches
  for (let i = 0; i < count; i += batchSize) {
    const currentBatchSize = Math.min(batchSize, count - i);
    const batchOrders = rowOrders.slice(i, i + currentBatchSize);

    if (useRawSQL) {
      // Use parameterized raw SQL for 100k+ inserts (secure and fast)
      // Build placeholders: ($1, $2, NOW()), ($3, $4, NOW()), ...
      const placeholders = batchOrders
        .map((_, idx) => {
          const offset = idx * PARAMS_PER_ROW;
          return `($${offset + 1}, $${offset + 2}, NOW())`;
        })
        .join(", ");

      // Flatten parameters: [tableId, order1, tableId, order2, ...]
      const params = batchOrders.flatMap((order) => [tableId, order]);

      // Execute parameterized query (PostgreSQL handles all escaping)
      await tx.$queryRawUnsafe(
        `INSERT INTO "Row" ("tableId", "order", "createdAt") VALUES ${placeholders}`,
        ...params
      );

      // Get the created row IDs
      const rows = await tx.row.findMany({
        where: {
          tableId,
          order: { in: batchOrders },
        },
        select: { id: true },
      });
      createdRowIds.push(...rows.map((r) => r.id));
    } else {
      // Use createMany for smaller datasets (type-safe)
      const rowsData = batchOrders.map((order) => ({
        tableId,
        order,
      }));

      await tx.row.createMany({ data: rowsData });

      // Get the created row IDs
      const rows = await tx.row.findMany({
        where: {
          tableId,
          order: { in: batchOrders },
        },
        select: { id: true },
      });
      createdRowIds.push(...rows.map((r) => r.id));
    }
  }

  // Create cells if requested
  if (generateCellData && columns.length > 0) {
    // Create cells in batches to avoid memory issues
    const CELL_BATCH_SIZE = 1000;
    for (let i = 0; i < createdRowIds.length; i += CELL_BATCH_SIZE) {
      const batchRowIds = createdRowIds.slice(i, i + CELL_BATCH_SIZE);

      const cellsData = batchRowIds.flatMap((rowId) =>
        columns.map((column) => ({
          tableId,
          rowId,
          columnId: column.id,
          textValue: column.type === ColumnType.TEXT ? "" : null,
          numberValue: column.type === ColumnType.NUMBER ? null : null,
        }))
      );

      await tx.cell.createMany({ data: cellsData });
    }
  }

  return createdRowIds;
}
