import { z } from "zod";
import { ColumnType } from "generated/prisma/enums";

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
  // "OR" is used by the search-to-filter feature so any column can match
  filterGroupLogic: z.enum(["AND", "OR"]).optional().default("AND"),
  hiddenColumns: z.array(z.number().int()).optional().default([]),
  rowHeight: z.enum(["short", "medium", "tall", "extraTall"]).optional().default("short"),
});

export type SortConfig = z.infer<typeof sortConfigSchema>;
export type FilterConfig = z.infer<typeof filterConfigSchema>;
export type ViewConfig = z.infer<typeof viewConfigSchema>;

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

  // Duplicate a view
  duplicate: protectedProcedure
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

      // Create duplicate with same config and name + " (copy)"
      return ctx.db.view.create({
        data: {
          name: `${view.name} (copy)`,
          tableId: view.tableId,
          config: view.config ?? undefined,
          order: view.order,
        },
      });
    }),

  // Update view configuration (sorts, filters, hidden columns)
  update: protectedProcedure
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
        orderBy: { order: "asc" },
      });
    }),

  // Get data for a view with filters, sorts, and hidden columns applied
  getData: protectedProcedure
    .input(
      z.object({
        viewId: z.number().int(),
        limit: z.number().int().min(1).max(500).default(200),
        cursor: z.number().int().optional(),
        // offset enables random-access page fetching (OFFSET N in raw SQL)
        offset: z.number().int().min(0).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get view with ownership verification
      const view = await ctx.db.view.findUnique({
        where: { id: input.viewId },
        include: {
          table: {
            include: { base: true },
          },
        },
      });

      if (!view || view.table.base.userId !== ctx.session.user.id) {
        throw new Error("View not found or access denied");
      }

      // Parse view config
      const config = viewConfigSchema.parse(view.config);
      const { filters, sorts, hiddenColumns, filterGroupLogic = "AND" } = config;

      // Get all columns to determine types for filtering
      const columns = await ctx.db.column.findMany({
        where: { tableId: view.tableId },
        orderBy: { order: "asc" },
      });

      const columnMap = new Map(columns.map((c) => [c.id, c]));

      // Build filter conditions for SQL
      const filterConditions: string[] = [];
      const filterParams: (string | number)[] = [];

      filters.forEach((filter) => {
        const column = columnMap.get(filter.columnId);
        if (!column) return;

        // Skip incomplete filters — operators that need a value but have none
        const needsValue = !["is_empty", "is_not_empty"].includes(filter.operator);
        if (needsValue && (filter.value === undefined || filter.value === "")) return;

        const colKey = String(filter.columnId);
        const isText = column.type === ColumnType.TEXT;

        switch (filter.operator) {
          case "is_empty":
            if (isText) {
              filterConditions.push(
                `(r.cells->>'${colKey}' IS NULL OR r.cells->>'${colKey}' = '')`
              );
            } else {
              filterConditions.push(
                `(NOT r.cells ? '${colKey}' OR jsonb_typeof(r.cells->'${colKey}') = 'null')`
              );
            }
            break;

          case "is_not_empty":
            if (isText) {
              filterConditions.push(
                `(r.cells->>'${colKey}' IS NOT NULL AND r.cells->>'${colKey}' != '')`
              );
            } else {
              filterConditions.push(
                `(r.cells ? '${colKey}' AND jsonb_typeof(r.cells->'${colKey}') != 'null')`
              );
            }
            break;

          case "contains":
            filterConditions.push(
              `r.cells->>'${colKey}' ILIKE $${filterParams.length + 1}`
            );
            filterParams.push(`%${filter.value}%`);
            break;

          case "not_contains":
            filterConditions.push(
              `(r.cells->>'${colKey}' IS NULL OR r.cells->>'${colKey}' NOT ILIKE $${filterParams.length + 1})`
            );
            filterParams.push(`%${filter.value}%`);
            break;

          case "equals":
            if (isText) {
              filterConditions.push(
                `r.cells->>'${colKey}' = $${filterParams.length + 1}`
              );
              filterParams.push(filter.value!);
            } else {
              filterConditions.push(
                `(r.cells->>'${colKey}')::float = $${filterParams.length + 1}`
              );
              filterParams.push(filter.value!);
            }
            break;

          case "not_equals":
            if (isText) {
              filterConditions.push(
                `(r.cells->>'${colKey}' IS NULL OR r.cells->>'${colKey}' != $${filterParams.length + 1})`
              );
              filterParams.push(filter.value!);
            } else {
              filterConditions.push(
                `(r.cells->>'${colKey}' IS NULL OR (r.cells->>'${colKey}')::float != $${filterParams.length + 1})`
              );
              filterParams.push(filter.value!);
            }
            break;

          case "greater_than":
            filterConditions.push(
              `(r.cells->>'${colKey}')::float > $${filterParams.length + 1}`
            );
            filterParams.push(filter.value as number);
            break;

          case "less_than":
            filterConditions.push(
              `(r.cells->>'${colKey}')::float < $${filterParams.length + 1}`
            );
            filterParams.push(filter.value as number);
            break;

          case "greater_than_or_equal":
            filterConditions.push(
              `(r.cells->>'${colKey}')::float >= $${filterParams.length + 1}`
            );
            filterParams.push(filter.value as number);
            break;

          case "less_than_or_equal":
            filterConditions.push(
              `(r.cells->>'${colKey}')::float <= $${filterParams.length + 1}`
            );
            filterParams.push(filter.value as number);
            break;
        }
      });

      // Build ORDER BY clause for sorts using JSONB extraction
      const orderByParts: string[] = [];
      sorts.forEach((sort) => {
        const column = columnMap.get(sort.columnId);
        if (!column) return;

        const colKey = String(sort.columnId);
        const isText = column.type === ColumnType.TEXT;

        if (isText) {
          orderByParts.push(
            `r.cells->>'${colKey}' ${sort.direction.toUpperCase()}`
          );
        } else {
          orderByParts.push(
            `(r.cells->>'${colKey}')::float ${sort.direction.toUpperCase()}`
          );
        }
      });

      // Always add r.id as final sort for deterministic pagination
      orderByParts.push("r.id ASC");

      const isFirstPage = !input.cursor && (!input.offset || input.offset === 0);

      // Build WHERE clause
      const whereClauses: string[] = [`r."tableId" = ${view.tableId}`];
      // cursor is mutually exclusive with offset; offset path skips cursor WHERE
      if (input.cursor && !input.offset) {
        whereClauses.push(`r.id > ${input.cursor}`);
      }
      if (filterConditions.length > 0) {
        // OR: any filter can match — wrap in a single (A OR B OR …) clause
        // AND: every filter must match — push conditions individually
        if (filterGroupLogic === "OR") {
          whereClauses.push(`(${filterConditions.join(" OR ")})`);
        } else {
          whereClauses.push(...filterConditions);
        }
      }

      const whereClause = whereClauses.join(" AND ");
      const orderByClause = orderByParts.join(", ");
      const offsetClause = (input.offset && input.offset > 0) ? `OFFSET ${input.offset}` : "";

      // Build count WHERE clause (without cursor/offset conditions)
      const countWhereClauses: string[] = [`r."tableId" = ${view.tableId}`];
      if (filterConditions.length > 0) {
        if (filterGroupLogic === "OR") {
          countWhereClauses.push(`(${filterConditions.join(" OR ")})`);
        } else {
          countWhereClauses.push(...filterConditions);
        }
      }
      const countWhereClause = countWhereClauses.join(" AND ");

      // Execute count (first page only) and row IDs in parallel
      const sqlStart = Date.now();
      const [countResult, rowIds] = await Promise.all([
        isFirstPage
          ? ctx.db.$queryRawUnsafe<Array<{ count: bigint }>>(
              `SELECT COUNT(*) as count FROM "Row" r WHERE ${countWhereClause}`,
              ...filterParams
            )
          : Promise.resolve(undefined),
        ctx.db.$queryRawUnsafe<Array<{ id: number }>>(
          `
          SELECT r.id
          FROM "Row" r
          WHERE ${whereClause}
          ORDER BY ${orderByClause}
          LIMIT ${input.limit + 1}
          ${offsetClause}
          `,
          ...filterParams
        ),
      ]);

      const totalCount = countResult ? Number(countResult[0]?.count ?? 0) : undefined;

      // Check if there are more rows
      let nextCursor: number | undefined;
      if (rowIds.length > input.limit) {
        const nextItem = rowIds.pop();
        nextCursor = nextItem!.id;
      }

      // If no rows, return empty result
      if (rowIds.length === 0) {
        return {
          rows: [],
          nextCursor: undefined,
          totalCount,
        };
      }

      // Get full row data — cells are already on the row as JSONB
      const rows = await ctx.db.row.findMany({
        where: {
          id: { in: rowIds.map((r) => r.id) },
        },
      });
      const sqlMs = Date.now() - sqlStart;

      // Sort rows to match the order from the query
      const rowMap = new Map(rows.map((r) => [r.id, r]));
      const sortedRows = rowIds.map((r) => rowMap.get(r.id)!);

      return {
        rows: sortedRows,
        nextCursor,
        totalCount,
        sqlMs,
      };
    }),

  // Reorder views
  reorder: protectedProcedure
    .input(
      z.object({
        tableId: z.number().int(),
        viewIds: z.array(z.number().int()),
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

        // Update order for each view using LexoRank-like spacing
        // Generate equally spaced order values
        const updates = input.viewIds.map((viewId, index) => {
          const order = String.fromCharCode(97 + Math.floor(index / 26)) + String.fromCharCode(97 + (index % 26));
          return tx.view.update({
            where: { id: viewId },
            data: { order },
          });
        });

        await Promise.all(updates);
      });
    }),
});
