import { z } from "zod";
import { ColumnType } from "generated/prisma/enums";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  verifyTableOwnership,
  getColumnWithOwnership,
  calculateColumnPosition,
  convertCellsForTypeChange,
} from "../utils/column-helpers";

export const columnRouter = createTRPCRouter({
  // Create a new column — no row backfill needed with JSONB (missing keys = empty)
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
        name: z.string().max(255).optional(),
        type: z.nativeEnum(ColumnType).optional().default(ColumnType.TEXT),
        afterColumnId: z.number().int().nullable().optional(),
        beforeColumnId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const newColumn = await ctx.db.$transaction(async (tx) => {
        // Verify table ownership
        await verifyTableOwnership(tx, input.tableId, ctx.session.user.id);

        // Generate column name if not provided
        const columnCount = await tx.column.count({
          where: { tableId: input.tableId },
        });
        const columnName = input.name ?? `Column ${columnCount + 1}`;

        // Calculate position based on afterColumnId or beforeColumnId
        const order = await calculateColumnPosition(tx, input.tableId, {
          afterColumnId: input.afterColumnId,
          beforeColumnId: input.beforeColumnId,
        });

        // Create column — no need to backfill rows.
        // Missing keys in JSONB are treated as empty by the frontend.
        return tx.column.create({
          data: {
            tableId: input.tableId,
            name: columnName,
            type: input.type,
            order,
            primary: false,
          },
        });
      });

      // Fire-and-forget: create a per-column pg_trgm expression index so that
      // "contains" ILIKE '%pattern%' filters on this column use the trigram index.
      // CONCURRENTLY avoids table locks; errors are swallowed (best-effort).
      const colId = newColumn.id;
      const tableId = newColumn.tableId;
      void ctx.db
        .$executeRawUnsafe(
          `CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_row_cells_col${colId}_trgm"` +
          ` ON "Row" USING GIN ((cells->>'${colId}') gin_trgm_ops)` +
          ` WHERE "tableId" = ${tableId}`,
        )
        .catch(() => {
          /* best-effort — query still works without index, just slower */
        });

      return newColumn;
    }),

  // Update column name and/or type
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255).optional(),
        type: z.nativeEnum(ColumnType).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Verify ownership
        const column = await getColumnWithOwnership(
          tx,
          input.id,
          ctx.session.user.id,
        );

        // Prevent updating primary column type
        if (column.primary && input.type && input.type !== column.type) {
          throw new Error("Cannot change type of primary column");
        }

        const updates: { name?: string; type?: ColumnType } = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.type !== undefined) updates.type = input.type;

        // If changing type, convert existing JSONB values
        if (input.type && input.type !== column.type) {
          await convertCellsForTypeChange(
            tx,
            input.id,
            column.tableId,
            input.type,
          );
        }

        return tx.column.update({
          where: { id: input.id },
          data: updates,
        });
      });
    }),

  // Reorder a column
  reorder: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        afterColumnId: z.number().int().nullable().optional(),
        beforeColumnId: z.number().int().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        const column = await getColumnWithOwnership(
          tx,
          input.id,
          ctx.session.user.id,
        );

        const newOrder = await calculateColumnPosition(tx, column.tableId, {
          afterColumnId: input.afterColumnId,
          beforeColumnId: input.beforeColumnId,
        });

        return tx.column.update({
          where: { id: input.id },
          data: { order: newOrder },
        });
      });
    }),

  // Set primary column
  setPrimary: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Verify ownership
        const column = await getColumnWithOwnership(
          tx,
          input.id,
          ctx.session.user.id,
        );

        // Get current primary column
        const currentPrimary = await tx.column.findFirst({
          where: {
            tableId: column.tableId,
            primary: true,
          },
        });

        // Unset current primary if exists and is different
        if (currentPrimary && currentPrimary.id !== input.id) {
          await tx.column.update({
            where: { id: currentPrimary.id },
            data: { primary: false },
          });
        }

        // Set new primary
        return tx.column.update({
          where: { id: input.id },
          data: { primary: true },
        });
      });
    }),

  // Get all columns for a table
  getAllByTable: protectedProcedure
    .input(z.object({ tableId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      await verifyTableOwnership(ctx.db, input.tableId, ctx.session.user.id);

      return ctx.db.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
      });
    }),

  // Get column by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      return getColumnWithOwnership(ctx.db, input.id, ctx.session.user.id);
    }),

  // Delete a column — lazy cleanup of orphan JSONB keys
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Verify ownership
        const column = await getColumnWithOwnership(
          tx,
          input.id,
          ctx.session.user.id,
        );

        // Prevent deleting primary column
        if (column.primary) {
          throw new Error("Cannot delete primary column");
        }

        // Delete column
        const deleted = await tx.column.delete({
          where: { id: input.id },
        });

        const colKey = String(input.id);

        // Lazy cleanup: strip the orphan key from all rows in the background.
        // This is fire-and-forget — orphan keys are harmless (frontend ignores them).
        void ctx.db.$executeRaw`
          UPDATE "Row"
          SET cells = cells - ${colKey}
          WHERE "tableId" = ${column.tableId}
        `.catch(() => {
          // Swallow errors — cleanup is best-effort
        });

        // Drop per-column trgm index (fire-and-forget, CONCURRENTLY avoids table locks).
        void ctx.db
          .$executeRawUnsafe(
            `DROP INDEX CONCURRENTLY IF EXISTS "idx_row_cells_col${input.id}_trgm"`,
          )
          .catch(() => {
            /* best-effort */
          });

        return deleted;
      });
    }),
});
