import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { verifyTableOwnership } from "../utils/column-helpers";
import { bulkCreateRows } from "../utils/row-helpers";

export const rowRouter = createTRPCRouter({
  // Create a single row with empty cells JSON
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      await verifyTableOwnership(ctx.db, input.tableId, ctx.session.user.id);

      // Create row with empty cells
      return ctx.db.row.create({
        data: {
          tableId: input.tableId,
          cells: {},
        },
      });
    }),

  // Bulk create rows (optimized for 100k+ rows)
  bulkCreate: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
        count: z.number().int().min(1).max(1000000),
        seed: z.boolean().optional().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(
        async (tx) => {
          // Verify ownership
          await verifyTableOwnership(tx, input.tableId, ctx.session.user.id);

          // Get table columns for seeding
          let rowIds: number[];
          if (input.seed) {
            const columns = await tx.column.findMany({
              where: { tableId: input.tableId },
              orderBy: { order: "asc" },
            });

            // Bulk create with varied seeded data
            rowIds = await bulkCreateRows(tx, input.tableId, input.count, {
              generateVariedData: true,
              columnIds: columns.map(c => c.id),
              columnTypes: columns.map(c => c.type),
            });
          } else {
            // Bulk create with empty cells
            rowIds = await bulkCreateRows(tx, input.tableId, input.count);
          }

          return { count: rowIds.length, rowIds };
        },
        {
          maxWait: 60000,
          timeout: 120000,
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

      // Cursor-based pagination — cells are already on the row as JSONB
      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
        take: input.limit + 1,
        skip: input.cursor ? 1 : 0,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { id: "asc" },
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

  // Delete a row
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      // Get row with ownership verification
      const row = await ctx.db.row.findUnique({
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

      return ctx.db.row.delete({
        where: { id: input.id },
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
        // Verify ownership of first row
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

        const result = await tx.row.deleteMany({
          where: {
            id: { in: input.ids },
            tableId: firstRow.tableId,
          },
        });

        return { count: result.count };
      });
    }),
});
