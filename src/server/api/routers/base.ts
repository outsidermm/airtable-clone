import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const baseRouter = createTRPCRouter({
  // Create a new base
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      starred: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.base.create({
        data: {
          name: input.name,
          starred: input.starred,
          userId: ctx.session.user.id,
        },
      });
    }),

  // Get all bases for the current user
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.base.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: [
          { starred: "desc" }, // Starred bases first
          { updatedAt: "desc" }, // Then by most recently updated
        ],
        include: {
          _count: {
            select: { airtableTables: true },
          },
        },
      });
    }),

  // Get a single base by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id, // Ensure user owns this base
        },
        include: {
          airtableTables: {
            orderBy: { createdAt: "asc" },
            include: {
              _count: {
                select: {
                  rows: true,
                  columns: true,
                },
              },
            },
          },
        },
      });

      if (!base) {
        throw new Error("Base not found or access denied");
      }

      return base;
    }),

  // Update a base
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255).optional(),
      starred: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify ownership before updating
      const base = await ctx.db.base.findUnique({
        where: { id, userId: ctx.session.user.id },
      });

      if (!base) {
        throw new Error("Base not found or access denied");
      }

      return ctx.db.base.update({
        where: { id },
        data,
      });
    }),

  // Delete a base (cascade deletes tables, columns, rows, cells)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before deleting
      const base = await ctx.db.base.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!base) {
        throw new Error("Base not found or access denied");
      }

      return ctx.db.base.delete({
        where: { id: input.id },
      });
    }),

  // Toggle starred status
  toggleStarred: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!base) {
        throw new Error("Base not found or access denied");
      }

      return ctx.db.base.update({
        where: { id: input.id },
        data: { starred: !base.starred },
      });
    }),
});
