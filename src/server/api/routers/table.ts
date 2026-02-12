import { z } from "zod";
import { LexoRank } from "lexorank";
import { faker } from "@faker-js/faker";

import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const tableRouter = createTRPCRouter({
  // Create a new table with default rows, columns, and cells
  create: protectedProcedure
    .input(
      z.object({
        baseId: z.string(),
        name: z.string().max(255).optional(),
        rowCount: z.number().min(1).max(1000).optional().default(10),
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

        // Generate lexorank positions for columns and rows
        const colHeader = LexoRank.middle();
        const col1 = colHeader.genNext();
        const col2 = col1.genNext();
        const col3 = col2.genNext();

        const rowHeader = LexoRank.middle();
        let currentRowRank = rowHeader.genNext();
        const rowRanks: string[] = [];

        for (let i = 0; i < input.rowCount; i++) {
          rowRanks.push(currentRowRank.toString());
          currentRowRank = currentRowRank.genNext();
        }

        // Step 1: Create table with columns and rows
        const table = await tx.airtableTable.create({
          data: {
            name: input.name ?? "Untitled Table",
            baseId: input.baseId,
            views: {
              create: {
                name: "Grid view",
                config: {},
              },
            },
            columns: {
              create: [
                { name: "Name", type: "TEXT", order: col1.toString(), primary: true },
                { name: "Number", type: "NUMBER", order: col2.toString(), primary: false },
                { name: "Notes", type: "TEXT", order: col3.toString(), primary: false },
              ],
            },
            rows: {
              create: rowRanks.map((rank) => ({
                order: rank,
              })),
            },
          },
          include: {
            columns: { orderBy: { order: "asc" } },
            rows: { orderBy: { order: "asc" } },
          },
        });

        // Step 2: Create cells with faker data
        const cellsData = [];
        for (const row of table.rows) {
          for (const column of table.columns) {
            const cellValue: { textValue?: string; numberValue?: number } = {};

            if (column.type === "TEXT") {
              if (column.name === "Name") {
                cellValue.textValue = faker.person.fullName();
              } else {
                cellValue.textValue = faker.lorem.sentence();
              }
            } else if (column.type === "NUMBER") {
              cellValue.numberValue = faker.number.int({ min: 1, max: 1000 });
            }

            cellsData.push({
              tableId: table.id,
              rowId: row.id,
              columnId: column.id,
              ...cellValue,
            });
          }
        }

        // Batch create all cells
        await tx.cell.createMany({
          data: cellsData,
        });

        return table;
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
            select: { rows: true, cells: true },
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
