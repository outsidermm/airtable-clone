import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const baseRouter = createTRPCRouter({
  // Create a new base
  create: protectedProcedure
    .input(z.object({
    }))
    .mutation(async ({ ctx }) => {
      return ctx.db.base.create({
        data: {
          userId: ctx.session.user.id,
          airtableTables: {
            create: {
              name: "Table 1",
            }
          }
        },
      });
    }),

  // Get a single base by ID with tables
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findUnique({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          airtableTables: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!base) {
        throw new Error("Base not found or access denied");
      }

      return base;
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
      });
    }),

  // Get bases by name (partial match)
  getByName: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().max(255)}))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findMany({
        where: {
          id: input.id,
          userId: ctx.session.user.id, // Ensure user owns this base
          name: {
            contains: input.name, // Partial match on name
            mode: "insensitive", // Case-insensitive search
          }
        },
      });

      if (!base) {
        throw new Error("Base not found or access denied");
      }

      return base;
    }),

  // Update a base
  rename: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(255),
    }))
    .mutation(async ({ ctx, input }) => {

      // Verify ownership before updating
      const base = await ctx.db.base.findUnique({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!base) {
        throw new Error("Base not found or access denied");
      }

      return ctx.db.base.update({
        where: { id: input.id },
        data: { name: input.name },
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
