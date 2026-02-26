import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const cellRouter = createTRPCRouter({
  // Update a single cell value (operates on Row.cells JSONB)
  update: protectedProcedure
    .input(
      z.object({
        rowId: z.number().int(),
        columnId: z.number().int(),
        value: z.union([z.string(), z.number(), z.null()]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sqlStart = Date.now();

      // Verify ownership via row -> table -> base
      const row = await ctx.db.row.findUnique({
        where: { id: input.rowId },
        include: {
          table: {
            include: {
              base: true,
              columns: true,
            },
          },
        },
      });

      if (!row) {
        throw new Error("Row not found");
      }

      if (row.table.base.userId !== ctx.session.user.id) {
        throw new Error("Access denied");
      }

      // Find the column to validate type
      const column = row.table.columns.find((c) => c.id === input.columnId);
      if (!column) {
        throw new Error("Column not found");
      }

      // Validate value against column type
      if (input.value !== null) {
        if (column.type === "NUMBER") {
          if (typeof input.value === "string") {
            throw new Error("Cannot input a string into number fields");
          }
          if (typeof input.value === "number" && isNaN(input.value)) {
            throw new Error("Invalid number value");
          }
        } else if (column.type === "TEXT") {
          if (typeof input.value === "number") {
            // Auto-convert numbers to strings for text fields
            input.value = String(input.value);
          }
        }
      }

      const colKey = String(input.columnId);
      const jsonValue =
        input.value === null ? "null" : JSON.stringify(input.value);

      await ctx.db.$executeRaw`
        UPDATE "Row"
        SET cells = jsonb_set(cells, ${`{${colKey}}`}::text[], ${jsonValue}::jsonb)
        WHERE id = ${input.rowId}
      `;

      return {
        rowId: input.rowId,
        columnId: input.columnId,
        sqlMs: Date.now() - sqlStart,
      };
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
              value: z.union([z.string(), z.number(), z.null()]),
            }),
          )
          .min(1)
          .max(10000000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership via first row
      const firstUpdate = input.updates[0]!;
      const row = await ctx.db.row.findUnique({
        where: { id: firstUpdate.rowId },
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

      // Group updates by rowId for efficiency
      const updatesByRow = new Map<
        number,
        Array<{ columnId: number; value: string | number | null }>
      >();
      for (const update of input.updates) {
        const existing = updatesByRow.get(update.rowId) ?? [];
        existing.push({ columnId: update.columnId, value: update.value });
        updatesByRow.set(update.rowId, existing);
      }

      // Apply updates per row using jsonb concatenation
      const BATCH_SIZE = 100;
      let updatedCount = 0;
      const entries = Array.from(updatesByRow.entries());

      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(([rowId, cellUpdates]) => {
            const patch: Record<string, unknown> = {};
            for (const cu of cellUpdates) {
              patch[String(cu.columnId)] = cu.value;
            }
            const patchStr = JSON.stringify(patch);
            return ctx.db.$executeRaw`
              UPDATE "Row"
              SET cells = cells || ${patchStr}::jsonb
              WHERE id = ${rowId}
            `;
          }),
        );
        updatedCount += batch.reduce((sum, [, u]) => sum + u.length, 0);
      }

      return { count: updatedCount };
    }),

  // Get all cells for a row
  getByRow: protectedProcedure
    .input(z.object({ rowId: z.number().int() }))
    .query(async ({ ctx, input }) => {
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

      return row.cells as Record<string, unknown>;
    }),

  // Search cells across rows in a table (now supports pagination)
  search: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
        query: z.string().min(1),
        columnId: z.number().int().optional(),
        limit: z.number().int().min(1).max(500).default(200),
        offset: z.number().int().min(0).optional(),
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

      const searchPattern = `%${input.query}%`;
      const sqlStart = Date.now();
      const isFirstPage = !input.offset || input.offset === 0;

      if (input.columnId) {
        // Search within a specific column key in JSONB
        const colKey = String(input.columnId);

        const [countResult, rows] = await Promise.all([
          isFirstPage
            ? ctx.db.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count
                FROM "Row"
                WHERE "tableId" = ${input.tableId}
                  AND cells->>${colKey} ILIKE ${searchPattern}
              `
            : Promise.resolve(undefined),
          ctx.db.$queryRaw<Array<{ id: number; cells: unknown }>>`
            SELECT id, cells
            FROM "Row"
            WHERE "tableId" = ${input.tableId}
              AND cells->>${colKey} ILIKE ${searchPattern}
            ORDER BY id ASC
            LIMIT ${input.limit}
            OFFSET ${input.offset ?? 0}
          `,
        ]);

        return {
          rows,
          totalCount: countResult
            ? Number(countResult[0]?.count ?? 0)
            : undefined,
          sqlMs: Date.now() - sqlStart,
        };
      } else {
        // Search across all JSONB values using LATERAL expansion
        const [countResult, rows] = await Promise.all([
          isFirstPage
            ? ctx.db.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(DISTINCT r.id) as count
                FROM "Row" r,
                LATERAL jsonb_each_text(r.cells) AS kv(key, value)
                WHERE r."tableId" = ${input.tableId}
                  AND kv.value ILIKE ${searchPattern}
              `
            : Promise.resolve(undefined),
          ctx.db.$queryRaw<Array<{ id: number; cells: unknown }>>`
            SELECT r.id, r.cells
            FROM "Row" r,
            LATERAL jsonb_each_text(r.cells) AS kv(key, value)
            WHERE r."tableId" = ${input.tableId}
              AND kv.value ILIKE ${searchPattern}
            GROUP BY r.id, r.cells
            ORDER BY r.id ASC
            LIMIT ${input.limit}
            OFFSET ${input.offset ?? 0}
          `,
        ]);

        return {
          rows,
          totalCount: countResult
            ? Number(countResult[0]?.count ?? 0)
            : undefined,
          sqlMs: Date.now() - sqlStart,
        };
      }
    }),
});
