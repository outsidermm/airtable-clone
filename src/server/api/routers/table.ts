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
