import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

// Zod schemas for view config
const sortConfigSchema = z.object({
  columnId: z.number().int(),
  direction: z.enum(["asc", "desc"]),
});

const filterConfigSchema = z.object({
  columnId: z.number().int(),
  operator: z.enum([
    "is_empty",
    "is_not_empty",
    "contains",
    "not_contains",
    "equals",
    "not_equals",
    "greater_than",
    "less_than",
    "greater_than_or_equal",
    "less_than_or_equal",
  ]),
  value: z.union([z.string(), z.number()]).optional(),
});

const viewConfigSchema = z.object({
  sorts: z.array(sortConfigSchema).optional().default([]),
  filters: z.array(filterConfigSchema).optional().default([]),
  hiddenColumns: z.array(z.number().int()).optional().default([]),
});

export const viewRouter = createTRPCRouter({
  // Create a new view
  create: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        // Verify user owns the table
        const table = await tx.airtableTable.findUnique({
          where: { id: input.tableId },
          include: { base: true },
        });

        if (!table || table.base.userId !== ctx.session.user.id) {
          throw new Error("Table not found or access denied");
        }

        // Count existing views to generate sequential name
        const viewCount = await tx.view.count({
          where: { tableId: input.tableId },
        });
        const viewName = `Grid ${viewCount + 1}`;

        // Create view with empty config
        return tx.view.create({
          data: {
            name: viewName,
            tableId: input.tableId,
            config: {
              sorts: [],
              filters: [],
              hiddenColumns: [],
            },
          },
        });
      });
    }),

  // Rename a view
  rename: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table that owns this view
      const view = await ctx.db.view.findUnique({
        where: { id: input.id },
        include: {
          table: {
            include: { base: true },
          },
        },
      });

      if (!view || view.table.base.userId !== ctx.session.user.id) {
        throw new Error("View not found or access denied");
      }

      return ctx.db.view.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),

  // Delete a view
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table that owns this view
      const view = await ctx.db.view.findUnique({
        where: { id: input.id },
        include: {
          table: {
            include: { base: true },
          },
        },
      });

      if (!view || view.table.base.userId !== ctx.session.user.id) {
        throw new Error("View not found or access denied");
      }

      return ctx.db.view.delete({
        where: { id: input.id },
      });
    }),

  // Update view configuration (sorts, filters, hidden columns)
  updateConfig: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        config: viewConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns the table that owns this view
      const view = await ctx.db.view.findUnique({
        where: { id: input.id },
        include: {
          table: {
            include: { base: true },
          },
        },
      });

      if (!view || view.table.base.userId !== ctx.session.user.id) {
        throw new Error("View not found or access denied");
      }

      if (input.config.hiddenColumns) {
        // Verify all column IDs in hiddenColumns belong to the same table
        const columns = await ctx.db.column.findMany({
          where: {
            id: { in: input.config.hiddenColumns },
            tableId: view.tableId,
          },
        });

        if (columns.length !== input.config.hiddenColumns.length) {
          throw new Error("One or more hidden column IDs are invalid");
        }
      }

      return ctx.db.view.update({
        where: { id: input.id },
        data: { config: input.config },
      });
    }),

  // Get view by ID with config
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const view = await ctx.db.view.findUnique({
        where: { id: input.id },
        include: {
          table: {
            include: { base: true },
          },
        },
      });

      if (!view || view.table.base.userId !== ctx.session.user.id) {
        throw new Error("View not found or access denied");
      }

      return view;
    }),

  // Get all views for a table
  getAllByTable: protectedProcedure
    .input(z.object({ tableId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      // Verify user owns the table
      const table = await ctx.db.airtableTable.findUnique({
        where: { id: input.tableId },
        include: { base: true },
      });

      if (!table || table.base.userId !== ctx.session.user.id) {
        throw new Error("Table not found or access denied");
      }

      return ctx.db.view.findMany({
        where: { tableId: input.tableId },
        orderBy: { createdAt: "asc" },
      });
    }),
});
