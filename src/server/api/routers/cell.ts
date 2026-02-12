import { z } from "zod";
import { ColumnType } from "generated/prisma/enums";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const cellRouter = createTRPCRouter({
  // Update a single cell value
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().optional(),
        rowId: z.number().int(),
        columnId: z.number().int(),
        textValue: z.string().nullable().optional(),
        numberValue: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Get cell with ownership verification
        let cell;
        if (input.id) {
          cell = await tx.cell.findUnique({
            where: { id: input.id },
            include: {
              table: {
                include: { base: true },
              },
            },
          });
        } else {
          // Find by rowId and columnId
          cell = await tx.cell.findFirst({
            where: {
              rowId: input.rowId,
              columnId: input.columnId,
            },
            include: {
              table: {
                include: { base: true },
              },
            },
          });
        }

        if (!cell) {
          throw new Error("Cell not found");
        }

        if (cell.table.base.userId !== ctx.session.user.id) {
          throw new Error("Access denied");
        }

        // Use upsert with unique constraint [columnId, rowId]
        return tx.cell.upsert({
          where: {
            columnId_rowId: {
              columnId: input.columnId,
              rowId: input.rowId,
            },
          },
          create: {
            tableId: cell.tableId,
            rowId: input.rowId,
            columnId: input.columnId,
            textValue: input.textValue ?? null,
            numberValue: input.numberValue ?? null,
          },
          update: {
            textValue: input.textValue ?? null,
            numberValue: input.numberValue ?? null,
          },
        });
      });
    }),

  // Bulk update cells (optimized for paste operations)
  bulkUpdate: protectedProcedure
    .input(
      z.object({
        updates: z
          .array(
            z.object({
              rowId: z.number().int(),
              columnId: z.number().int(),
              textValue: z.string().nullable().optional(),
              numberValue: z.number().nullable().optional(),
            }),
          )
          .min(1)
          .max(10000000), // Limit to prevent abuse
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Verify ownership via first cell
        const firstUpdate = input.updates[0]!;
        const sampleCell = await tx.cell.findFirst({
          where: {
            rowId: firstUpdate.rowId,
            columnId: firstUpdate.columnId,
          },
          include: {
            table: {
              include: { base: true },
            },
          },
        });

        if (!sampleCell) {
          throw new Error("Cell not found");
        }

        if (sampleCell.table.base.userId !== ctx.session.user.id) {
          throw new Error("Access denied");
        }

        // Batch update cells
        const BATCH_SIZE = 100;
        let updatedCount = 0;

        for (let i = 0; i < input.updates.length; i += BATCH_SIZE) {
          const batch = input.updates.slice(i, i + BATCH_SIZE);

          // Use Promise.all for parallel updates within batch
          await Promise.all(
            batch.map((update) =>
              tx.cell.upsert({
                where: {
                  columnId_rowId: {
                    columnId: update.columnId,
                    rowId: update.rowId,
                  },
                },
                create: {
                  tableId: sampleCell.tableId,
                  rowId: update.rowId,
                  columnId: update.columnId,
                  textValue: update.textValue ?? null,
                  numberValue: update.numberValue ?? null,
                },
                update: {
                  textValue: update.textValue ?? null,
                  numberValue: update.numberValue ?? null,
                },
              })
            )
          );

          updatedCount += batch.length;
        }

        return { count: updatedCount };
      });
    }),

  // Get all cells for a row
  getByRow: protectedProcedure
    .input(z.object({ rowId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      // Get row with ownership verification
      const row = await ctx.db.row.findUnique({
        where: { id: input.rowId },
        include: {
          table: {
            include: { base: true },
          },
        },
      });

      if (!row) {
        throw new Error("Row not found");
      }

      if (row.table.base.userId !== ctx.session.user.id) {
        throw new Error("Access denied");
      }

      return ctx.db.cell.findMany({
        where: { rowId: input.rowId },
        include: {
          column: {
            select: { id: true, name: true, type: true, order: true },
          },
        },
        orderBy: { columnId: "asc" },
      });
    }),

  // Get all cells for a column (useful for filtering/sorting)
  getByColumn: protectedProcedure
    .input(
      z.object({
        columnId: z.number().int(),
        limit: z.number().int().min(1).max(1000).optional(),
        cursor: z.number().int().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get column with ownership verification
      const column = await ctx.db.column.findUnique({
        where: { id: input.columnId },
        include: {
          table: {
            include: { base: true },
          },
        },
      });

      if (!column) {
        throw new Error("Column not found");
      }

      if (column.table.base.userId !== ctx.session.user.id) {
        throw new Error("Access denied");
      }

      const limit = input.limit ?? 50;

      const cells = await ctx.db.cell.findMany({
        where: { columnId: input.columnId },
        take: limit + 1,
        skip: input.cursor ? 1 : 0,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { rowId: "asc" },
        include: {
          row: {
            select: { id: true, order: true },
          },
        },
      });

      let nextCursor: number | undefined;
      if (cells.length > limit) {
        const nextItem = cells.pop();
        nextCursor = nextItem!.id;
      }

      return {
        cells,
        nextCursor,
      };
    }),

  // Search cells (optimized with pg_trgm GIN index)
  search: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
        query: z.string().min(1),
        columnId: z.number().int().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify table ownership
      const table = await ctx.db.airtableTable.findUnique({
        where: { id: input.tableId },
        include: { base: true },
      });

      if (!table || table.base.userId !== ctx.session.user.id) {
        throw new Error("Table not found or access denied");
      }

      // Use pg_trgm index for fast text search
      const cells = await ctx.db.$queryRaw<
        Array<{
          id: number;
          textValue: string | null;
          numberValue: number | null;
          rowId: number;
          columnId: number;
        }>
      >`
        SELECT
          c.id,
          c."textValue",
          c."numberValue",
          c."rowId",
          c."columnId"
        FROM "Cell" c
        WHERE c."tableId" = ${input.tableId}
          ${input.columnId ? `AND c."columnId" = ${input.columnId}` : ""}
          AND c."textValue" ILIKE ${"%" + input.query + "%"}
        ORDER BY c."rowId" ASC
        LIMIT ${input.limit}
      `;

      return cells;
    }),
});
