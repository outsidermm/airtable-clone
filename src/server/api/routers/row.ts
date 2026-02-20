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
      await verifyTableOwnership(ctx.db, input.tableId, ctx.session.user.id);
      
      const columns = await ctx.db.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
      });

      // FIX 1: Combine DROP INDEX into a single atomic statement
      if (columns.length > 0) {
        const indexNames = columns
          .map((c) => `"idx_row_cells_col${c.id}_trgm"`)
          .join(", ");
        
        await ctx.db.$executeRawUnsafe(`DROP INDEX IF EXISTS ${indexNames}`);
      }

      try {
        const result = await ctx.db.$transaction(
          async (tx) => {
            const sqlStart = Date.now();
            const count = input.seed
              ? await bulkCreateRows(tx, input.tableId, input.count, {
                  generateVariedData: true,
                  columnIds: columns.map((c) => c.id),
                  columnTypes: columns.map((c) => c.type),
                })
              : await bulkCreateRows(tx, input.tableId, input.count);
            return { count, sqlMs: Date.now() - sqlStart };
          },
          { maxWait: 600000, timeout: 1200000 },
        );
        return result;
      } finally {
        // FIX 2: Recreate trgm indexes sequentially to avoid deadlocks
        // We wrap this in an async IIFE so it remains fire-and-forget 
        // without blocking the tRPC response return.
        void (async () => {
          for (const c of columns) {
            try {
              await ctx.db.$executeRawUnsafe(
                `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_row_cells_col${c.id}_trgm"` +
                  ` ON "Row" USING GIN ((cells->>'${c.id}') gin_trgm_ops)` +
                  ` WHERE "tableId" = ${input.tableId}`,
              );
            } catch (error) {
              /* ignore — another concurrent request may have rebuilt it already */
              console.error(`Failed to recreate index for column ${c.id}:`, error);
            }
          }
        })();
      }
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

  // Duplicate a row (copies all cell data)
  duplicate: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.row.findUnique({
        where: { id: input.id },
        include: { table: { include: { base: true } } },
      });

      if (!row) throw new Error("Row not found");
      if (row.table.base.userId !== ctx.session.user.id) throw new Error("Access denied");

      const sqlStart = Date.now();
      const newRow = await ctx.db.row.create({
        data: { tableId: row.tableId, cells: row.cells ?? {} },
      });
      return { ...newRow, sqlMs: Date.now() - sqlStart };
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
