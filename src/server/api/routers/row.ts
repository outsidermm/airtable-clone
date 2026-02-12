import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { verifyTableOwnership } from "../utils/column-helpers";
import {
  calculateRowPosition,
  createCellsForRow,
  bulkCreateRows,
} from "../utils/row-helpers";

export const rowRouter = createTRPCRouter({
  // Create a single row with cells for all columns
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
        afterRowId: z.number().int().nullable().optional(),
        beforeRowId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Verify ownership
        await verifyTableOwnership(tx, input.tableId, ctx.session.user.id);

        // Calculate position
        const order = await calculateRowPosition(tx, input.tableId, {
          afterRowId: input.afterRowId,
          beforeRowId: input.beforeRowId,
        });

        // Create row
        const row = await tx.row.create({
          data: {
            tableId: input.tableId,
            order,
          },
        });

        // Create cells for all columns
        await createCellsForRow(tx, input.tableId, row.id);

        // Return row with cells
        return tx.row.findUnique({
          where: { id: row.id },
          include: { cells: true },
        });
      });
    }),

  // Bulk create rows (optimized for 100k+ rows)
  bulkCreate: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
        count: z.number().int().min(1).max(1000000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(
        async (tx) => {
          // Verify ownership
          await verifyTableOwnership(tx, input.tableId, ctx.session.user.id);

          // Get last row to determine starting position
          const lastRow = await tx.row.findFirst({
            where: { tableId: input.tableId },
            orderBy: { order: "desc" },
            select: { order: true },
          });

          // Bulk create with optimizations
          const rowIds = await bulkCreateRows(tx, input.tableId, input.count, {
            startingOrder: lastRow?.order,
            generateCellData: true,
          });

          return { count: rowIds.length, rowIds };
        },
        {
          maxWait: 60000, // 60s max wait for lock
          timeout: 120000, // 2 min timeout for large batches
        },
      );
    }),

  // Get rows with cursor-based pagination (optimized for 1M rows)
  getRows: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
        limit: z.number().int().min(1).max(100).default(50),
        cursor: z.number().int().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify ownership
      await verifyTableOwnership(ctx.db, input.tableId, ctx.session.user.id);

      // Cursor-based pagination with Int IDs (100x faster than CUID)
      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
        take: input.limit + 1, // Get one extra to check if there's more
        skip: input.cursor ? 1 : 0,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { order: "asc" },
        include: {
          cells: {
            include: {
              column: {
                select: { id: true, name: true, type: true, order: true },
              },
            },
            orderBy: { columnId: "asc" },
          },
        },
      });

      let nextCursor: number | undefined;
      if (rows.length > input.limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem!.id;
      }

      return {
        rows,
        nextCursor,
      };
    }),

  // Reorder a row
  reorder: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        afterRowId: z.number().int().nullable().optional(),
        beforeRowId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Get row with ownership verification
        const row = await tx.row.findUnique({
          where: { id: input.id },
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

        // Calculate new position
        const newOrder = await calculateRowPosition(tx, row.tableId, {
          afterRowId: input.afterRowId,
          beforeRowId: input.beforeRowId,
        });

        return tx.row.update({
          where: { id: input.id },
          data: { order: newOrder },
        });
      });
    }),

  // Delete a row
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Get row with ownership verification
        const row = await tx.row.findUnique({
          where: { id: input.id },
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

        // Delete row (cascade deletes cells)
        return tx.row.delete({
          where: { id: input.id },
        });
      });
    }),

  // Bulk delete rows
  bulkDelete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number().int()).min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Verify ownership of first row (assumes all belong to same table/user)
        const firstRow = await tx.row.findUnique({
          where: { id: input.ids[0] },
          include: {
            table: {
              include: { base: true },
            },
          },
        });

        if (!firstRow) {
          throw new Error("Row not found");
        }

        if (firstRow.table.base.userId !== ctx.session.user.id) {
          throw new Error("Access denied");
        }

        // Delete all rows
        const result = await tx.row.deleteMany({
          where: {
            id: { in: input.ids },
            tableId: firstRow.tableId, // Ensure all rows belong to same table
          },
        });

        return { count: result.count };
      });
    }),
});
