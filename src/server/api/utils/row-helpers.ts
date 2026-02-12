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
    // Insert at first position
    const firstRow = await tx.row.findFirst({
      where: { tableId },
      orderBy: { order: "asc" },
    });

    if (!firstRow) {
      // First row in table
      return LexoRank.middle().toString();
    }

    const firstOrder = LexoRank.parse(firstRow.order);
    return firstOrder.genPrev().toString();
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

  // Batch size for optimal performance (per CLAUDE.md)
  const BATCH_SIZE = 1000;
  const createdRowIds: number[] = [];

  // Create rows in batches
  for (let i = 0; i < count; i += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, count - i);
    const batchOrders = rowOrders.slice(i, i + batchSize);

    // Create rows
    const rowsData = batchOrders.map((order) => ({
      tableId,
      order,
    }));

    // Use $executeRawUnsafe for 100k+ inserts (per CLAUDE.md)
    if (count >= 100000) {
      const values = rowsData
        .map((r) => `(${tableId}, '${r.order}', NOW())`)
        .join(",");

      await tx.$executeRawUnsafe(`
        INSERT INTO "Row" ("tableId", "order", "createdAt")
        VALUES ${values}
      `);

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
      // Use createMany for smaller batches
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
    for (let i = 0; i < createdRowIds.length; i += BATCH_SIZE) {
      const batchRowIds = createdRowIds.slice(i, i + BATCH_SIZE);

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
