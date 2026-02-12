import { LexoRank } from "lexorank";
import type { PrismaClient } from "../../../../generated/prisma/client";

type PrismaTransaction = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Verify that the user owns the table (through base ownership)
 */
export async function verifyTableOwnership(
  tx: PrismaTransaction,
  tableId: number,
  userId: string,
) {
  const table = await tx.airtableTable.findUnique({
    where: { id: tableId },
    include: { base: true },
  });

  if (!table) {
    throw new Error("Table not found");
  }

  if (table.base.userId !== userId) {
    throw new Error("Access denied");
  }

  return table;
}

/**
 * Get column with ownership verification
 */
export async function getColumnWithOwnership(
  tx: PrismaTransaction,
  columnId: number,
  userId: string,
) {
  const column = await tx.column.findUnique({
    where: { id: columnId },
    include: {
      table: {
        include: { base: true },
      },
    },
  });

  if (!column) {
    throw new Error("Column not found");
  }

  if (column.table.base.userId !== userId) {
    throw new Error("Access denied");
  }

  return column;
}

/**
 * Calculate the LexoRank position for a column
 * Supports inserting before or after another column, or at the start
 */
export async function calculateColumnPosition(
  tx: PrismaTransaction,
  tableId: number,
  options: {
    afterColumnId?: number | null;
    beforeColumnId?: number | null;
  },
): Promise<string> {
  const { afterColumnId, beforeColumnId } = options;

  // Can't specify both
  if (afterColumnId !== undefined && beforeColumnId !== undefined) {
    throw new Error("Cannot specify both afterColumnId and beforeColumnId");
  }

  // Handle beforeColumnId
  if (beforeColumnId !== undefined && beforeColumnId !== null) {
    const beforeColumn = await tx.column.findUnique({
      where: { id: beforeColumnId },
    });

    if (beforeColumn?.tableId !== tableId) {
      throw new Error("Invalid beforeColumnId");
    }

    // Get the column that comes before the beforeColumn
    const prevColumn = await tx.column.findFirst({
      where: {
        tableId,
        order: { lt: beforeColumn.order },
      },
      orderBy: { order: "desc" },
    });

    if (prevColumn) {
      // Insert between prevColumn and beforeColumn
      const prevOrder = LexoRank.parse(prevColumn.order);
      const beforeOrder = LexoRank.parse(beforeColumn.order);
      return prevOrder.between(beforeOrder).toString();
    } else {
      // Insert at start (before first column)
      const beforeOrder = LexoRank.parse(beforeColumn.order);
      return beforeOrder.genPrev().toString();
    }
  }

  // Handle afterColumnId or default behavior
  if (afterColumnId === null || afterColumnId === undefined) {
    // Insert at first position
    const firstColumn = await tx.column.findFirst({
      where: { tableId },
      orderBy: { order: "asc" },
    });

    if (!firstColumn) {
      // First column in table
      return LexoRank.middle().toString();
    }

    const firstOrder = LexoRank.parse(firstColumn.order);
    return firstOrder.genPrev().toString();
  } else {
    // Insert after specified column
    const afterColumn = await tx.column.findUnique({
      where: { id: afterColumnId },
    });

    if (afterColumn?.tableId !== tableId) {
      throw new Error("Invalid afterColumnId");
    }

    // Get the next column
    const nextColumn = await tx.column.findFirst({
      where: {
        tableId,
        order: { gt: afterColumn.order },
      },
      orderBy: { order: "asc" },
    });

    const afterOrder = LexoRank.parse(afterColumn.order);

    if (nextColumn) {
      // Insert between afterColumn and nextColumn
      const nextOrder = LexoRank.parse(nextColumn.order);
      return afterOrder.between(nextOrder).toString();
    } else {
      // Insert at end
      return afterOrder.genNext().toString();
    }
  }
}

/**
 * Convert cells when changing column type
 */
export async function convertCellsForTypeChange(
  tx: PrismaTransaction,
  columnId: number,
  newType: "TEXT" | "NUMBER",
) {
  if (newType === "TEXT") {
    // Convert number to text using raw SQL
    await tx.$executeRaw`
      UPDATE "Cell"
      SET "textValue" = CAST("numberValue" AS TEXT),
          "numberValue" = NULL
      WHERE "columnId" = ${columnId} AND "numberValue" IS NOT NULL
    `;
  } else if (newType === "NUMBER") {
    // Convert text to number (set to null if can't convert)
    await tx.$executeRaw`
      UPDATE "Cell"
      SET "numberValue" = CASE
        WHEN "textValue" ~ '^[0-9]+\.?[0-9]*$'
        THEN CAST("textValue" AS FLOAT)
        ELSE NULL
      END,
      "textValue" = NULL
      WHERE "columnId" = ${columnId} AND "textValue" IS NOT NULL
    `;
  }
}
