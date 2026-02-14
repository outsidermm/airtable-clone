import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { createDefaultTable } from "../utils/table-helpers";

export const tableRouter = createTRPCRouter({
  // Create a new table with default rows, columns, and cells
  create: protectedProcedure
    .input(
      z.object({
        baseId: z.string(),
        rowCount: z.number().min(1).max(1000).optional().default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Verify user owns the base
        const base = await tx.base.findUnique({
          where: {
            id: input.baseId,
            userId: ctx.session.user.id,
          },
        });

        if (!base) {
          throw new Error("Base not found or access denied");
        }

        // Count existing tables to generate sequential name
        const tableCount = await tx.airtableTable.count({
          where: { baseId: input.baseId },
        });
        const tableName = `Table ${tableCount + 1}`;

        return createDefaultTable(tx, input.baseId, tableName, input.rowCount);
      });
    }),

  // Rename a table
  rename: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the base that owns this table
      const table = await ctx.db.airtableTable.findUnique({
        where: { id: input.id },
        include: { base: true },
      });

      if (!table || table.base.userId !== ctx.session.user.id) {
        throw new Error("Table not found or access denied");
      }

      return ctx.db.airtableTable.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  // Delete a table (cascade deletes columns, rows, cells, views)
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the base that owns this table
      const table = await ctx.db.airtableTable.findUnique({
        where: { id: input.id },
        include: { base: true },
      });

      if (!table || table.base.userId !== ctx.session.user.id) {
        throw new Error("Table not found or access denied");
      }

      return ctx.db.airtableTable.delete({
        where: { id: input.id },
      });
    }),

  // Duplicate a table with all columns, rows, and views
  duplicate: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Get the original table with all related data
        const originalTable = await tx.airtableTable.findUnique({
          where: { id: input.id },
          include: {
            base: true,
            columns: { orderBy: { order: "asc" } },
            rows: true,
            views: { orderBy: { order: "asc" } },
          },
        });

        if (!originalTable || originalTable.base.userId !== ctx.session.user.id) {
          throw new Error("Table not found or access denied");
        }

        // Create new table with "(copy)" suffix
        const newTable = await tx.airtableTable.create({
          data: {
            name: `${originalTable.name} (copy)`,
            baseId: originalTable.baseId,
          },
        });

        // Copy columns and build column ID mapping
        const columnIdMap = new Map<number, number>();
        for (const col of originalTable.columns) {
          const newColumn = await tx.column.create({
            data: {
              name: col.name,
              type: col.type,
              order: col.order,
              primary: col.primary,
              tableId: newTable.id,
            },
          });
          columnIdMap.set(col.id, newColumn.id);
        }

        // Copy rows with remapped cell column IDs
        for (const row of originalTable.rows) {
          const oldCells = row.cells as Record<string, string | number | null>;
          const newCells: Record<string, string | number | null> = {};

          // Remap column IDs in cells JSONB
          for (const [oldColId, value] of Object.entries(oldCells)) {
            const newColId = columnIdMap.get(Number(oldColId));
            if (newColId) {
              newCells[String(newColId)] = value;
            }
          }

          await tx.row.create({
            data: {
              tableId: newTable.id,
              cells: newCells,
            },
          });
        }

        // Copy views with remapped column IDs in configs
        for (const view of originalTable.views) {
          const oldConfig = view.config as {
            sorts?: Array<{ columnId: number; direction: string }>;
            filters?: Array<{ columnId: number; operator: string; value?: string | number }>;
            hiddenColumns?: number[];
            rowHeight?: string;
          };

          const newConfig = {
            sorts: oldConfig.sorts?.map((sort) => ({
              ...sort,
              columnId: columnIdMap.get(sort.columnId) ?? sort.columnId,
            })) ?? [],
            filters: oldConfig.filters?.map((filter) => ({
              ...filter,
              columnId: columnIdMap.get(filter.columnId) ?? filter.columnId,
            })) ?? [],
            hiddenColumns: oldConfig.hiddenColumns?.map(
              (colId) => columnIdMap.get(colId) ?? colId
            ) ?? [],
            rowHeight: oldConfig.rowHeight ?? "short",
          };

          await tx.view.create({
            data: {
              name: view.name,
              tableId: newTable.id,
              order: view.order,
              config: newConfig,
            },
          });
        }

        return newTable;
      });
    }),

  // Get table by ID with all data
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const table = await ctx.db.airtableTable.findUnique({
        where: { id: input.id },
        include: {
          base: true,
          columns: { orderBy: { order: "asc" } },
          views: true,
          _count: {
            select: { rows: true },
          },
        },
      });

      if (!table || table.base.userId !== ctx.session.user.id) {
        throw new Error("Table not found or access denied");
      }

      return table;
    }),

  // Get all tables for a base
  getAllByBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user owns the base
      const base = await ctx.db.base.findUnique({
        where: {
          id: input.baseId,
          userId: ctx.session.user.id,
        },
      });

      if (!base) {
        throw new Error("Base not found or access denied");
      }

      return ctx.db.airtableTable.findMany({
        where: { baseId: input.baseId },
        orderBy: { createdAt: "asc" },
        include: {
          _count: {
            select: { rows: true, columns: true },
          },
        },
      });
    }),
});
