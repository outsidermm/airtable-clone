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

      const sqlStart = Date.now();
      const row = await ctx.db.row.create({
        data: {
          tableId: input.tableId,
          cells: {},
        },
      });
      return { ...row, sqlMs: Date.now() - sqlStart };
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

          const sqlStart = Date.now();
          let count: number;

          if (input.seed) {
            const columns = await tx.column.findMany({
              where: { tableId: input.tableId },
              orderBy: { order: "asc" },
            });

            // Single generate_series INSERT with DB-side random data
            count = await bulkCreateRows(tx, input.tableId, input.count, {
              generateVariedData: true,
              columnIds: columns.map((c) => c.id),
              columnTypes: columns.map((c) => c.type),
            });
          } else {
            // Single generate_series INSERT with empty cells
            count = await bulkCreateRows(tx, input.tableId, input.count);
          }

          return { count, sqlMs: Date.now() - sqlStart };
        },
        {
          maxWait: 60000,
          timeout: 120000,
        },
      );
    }),

  // Get rows with cursor-based or offset-based pagination (optimized for 1M rows)
  getRows: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
        limit: z.number().int().min(1).max(500).default(200),
        cursor: z.number().int().optional(),
        // offset enables random-access page fetching via subquery seek
        offset: z.number().int().min(0).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify ownership
      await verifyTableOwnership(ctx.db, input.tableId, ctx.session.user.id);

      const isFirstPage = !input.cursor && (!input.offset || input.offset === 0);

      // Offset-based path: subquery seek to find cursor at position N, then range scan
      if (input.offset !== undefined && input.offset > 0 && !input.cursor) {
        const sqlStart = Date.now();
        const [totalCount, seekResult] = await Promise.all([
          isFirstPage
            ? ctx.db.row.count({ where: { tableId: input.tableId } })
            : Promise.resolve(undefined),
          ctx.db.$queryRaw<Array<{ id: number }>>`
            SELECT id FROM "Row"
            WHERE "tableId" = ${input.tableId}
            ORDER BY id ASC
            LIMIT 1 OFFSET ${input.offset}
          `,
        ]);

        const seekId = seekResult[0]?.id;
        if (seekId === undefined) {
          return { rows: [], nextCursor: undefined, totalCount, sqlMs: Date.now() - sqlStart };
        }

        const rows = await ctx.db.row.findMany({
          where: { tableId: input.tableId, id: { gte: seekId } },
          take: input.limit + 1,
          orderBy: { id: "asc" },
        });
        const sqlMs = Date.now() - sqlStart;

        let nextCursor: number | undefined;
        if (rows.length > input.limit) {
          const nextItem = rows.pop();
          nextCursor = nextItem!.id;
        }

        return { rows, nextCursor, totalCount, sqlMs };
      }

      // Cursor-based path (sequential / first page)
      const sqlStart = Date.now();
      const [totalCount, rows] = await Promise.all([
        isFirstPage
          ? ctx.db.row.count({ where: { tableId: input.tableId } })
          : Promise.resolve(undefined),
        ctx.db.row.findMany({
          where: { tableId: input.tableId },
          take: input.limit + 1,
          skip: input.cursor ? 1 : 0,
          cursor: input.cursor ? { id: input.cursor } : undefined,
          orderBy: { id: "asc" },
        }),
      ]);
      const sqlMs = Date.now() - sqlStart;

      let nextCursor: number | undefined;
      if (rows.length > input.limit) {
        const nextItem = rows.pop();
        nextCursor = nextItem!.id;
      }

      return { rows, nextCursor, totalCount, sqlMs };
    }),

  // Delete a row
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const sqlStart = Date.now();

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

      const deleted = await ctx.db.row.delete({
        where: { id: input.id },
      });
      return { ...deleted, sqlMs: Date.now() - sqlStart };
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
