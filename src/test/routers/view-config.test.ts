/**
 * Tests for ViewConfig schema validation (pure Zod — no DB or network needed).
 * We re-export/duplicate the schema here rather than importing server-only code
 * to keep the test isolated from tRPC context setup.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// Mirror the viewConfigSchema from src/server/api/routers/view.ts
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
  filterGroupLogic: z.enum(["AND", "OR"]).optional().default("AND"),
  hiddenColumns: z.array(z.number().int()).optional().default([]),
  rowHeight: z
    .enum(["short", "medium", "tall", "extraTall"])
    .optional()
    .default("short"),
  columnOrder: z.array(z.number().int()).optional(),
  frozenColumns: z.number().int().min(0).optional().default(0),
});

describe("viewConfigSchema", () => {
  describe("defaults", () => {
    it("parses an empty object and fills in all defaults", () => {
      const result = viewConfigSchema.parse({});
      expect(result).toEqual({
        sorts: [],
        filters: [],
        filterGroupLogic: "AND",
        hiddenColumns: [],
        rowHeight: "short",
        columnOrder: undefined,
        frozenColumns: 0,
      });
    });

    it("frozenColumns defaults to 0 when not provided", () => {
      const result = viewConfigSchema.parse({});
      expect(result.frozenColumns).toBe(0);
    });

    it("rowHeight defaults to 'short'", () => {
      const result = viewConfigSchema.parse({ rowHeight: undefined });
      expect(result.rowHeight).toBe("short");
    });
  });

  describe("sorts", () => {
    it("accepts valid sort config", () => {
      const result = viewConfigSchema.parse({
        sorts: [{ columnId: 1, direction: "asc" }],
      });
      expect(result.sorts).toHaveLength(1);
      expect(result.sorts[0]).toEqual({ columnId: 1, direction: "asc" });
    });

    it("accepts desc direction", () => {
      const result = viewConfigSchema.parse({
        sorts: [{ columnId: 5, direction: "desc" }],
      });
      expect(result.sorts[0]!.direction).toBe("desc");
    });

    it("rejects invalid direction", () => {
      expect(() =>
        viewConfigSchema.parse({ sorts: [{ columnId: 1, direction: "INVALID" }] }),
      ).toThrow();
    });

    it("rejects non-integer columnId", () => {
      expect(() =>
        viewConfigSchema.parse({ sorts: [{ columnId: 1.5, direction: "asc" }] }),
      ).toThrow();
    });
  });

  describe("filters", () => {
    it("accepts all valid operators", () => {
      const operators = [
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
      ] as const;

      for (const operator of operators) {
        const result = viewConfigSchema.parse({
          filters: [{ columnId: 1, operator }],
        });
        expect(result.filters[0]!.operator).toBe(operator);
      }
    });

    it("accepts string value", () => {
      const result = viewConfigSchema.parse({
        filters: [{ columnId: 1, operator: "contains", value: "hello" }],
      });
      expect(result.filters[0]!.value).toBe("hello");
    });

    it("accepts number value", () => {
      const result = viewConfigSchema.parse({
        filters: [{ columnId: 1, operator: "greater_than", value: 42 }],
      });
      expect(result.filters[0]!.value).toBe(42);
    });

    it("accepts filter without value", () => {
      const result = viewConfigSchema.parse({
        filters: [{ columnId: 1, operator: "is_empty" }],
      });
      expect(result.filters[0]!.value).toBeUndefined();
    });

    it("rejects unknown operator", () => {
      expect(() =>
        viewConfigSchema.parse({
          filters: [{ columnId: 1, operator: "UNKNOWN_OP" }],
        }),
      ).toThrow();
    });
  });

  describe("filterGroupLogic", () => {
    it("accepts AND", () => {
      const result = viewConfigSchema.parse({ filterGroupLogic: "AND" });
      expect(result.filterGroupLogic).toBe("AND");
    });

    it("accepts OR", () => {
      const result = viewConfigSchema.parse({ filterGroupLogic: "OR" });
      expect(result.filterGroupLogic).toBe("OR");
    });

    it("rejects invalid logic", () => {
      expect(() =>
        viewConfigSchema.parse({ filterGroupLogic: "XOR" }),
      ).toThrow();
    });
  });

  describe("hiddenColumns", () => {
    it("accepts an array of column IDs", () => {
      const result = viewConfigSchema.parse({ hiddenColumns: [1, 2, 3] });
      expect(result.hiddenColumns).toEqual([1, 2, 3]);
    });

    it("defaults to empty array", () => {
      const result = viewConfigSchema.parse({});
      expect(result.hiddenColumns).toEqual([]);
    });

    it("rejects non-integer IDs", () => {
      expect(() =>
        viewConfigSchema.parse({ hiddenColumns: [1.5] }),
      ).toThrow();
    });
  });

  describe("rowHeight", () => {
    it("accepts all valid row heights", () => {
      for (const rh of ["short", "medium", "tall", "extraTall"] as const) {
        const result = viewConfigSchema.parse({ rowHeight: rh });
        expect(result.rowHeight).toBe(rh);
      }
    });

    it("rejects invalid row height", () => {
      expect(() =>
        viewConfigSchema.parse({ rowHeight: "huge" }),
      ).toThrow();
    });
  });

  describe("columnOrder", () => {
    it("accepts an ordered array of column IDs", () => {
      const result = viewConfigSchema.parse({ columnOrder: [3, 1, 2] });
      expect(result.columnOrder).toEqual([3, 1, 2]);
    });

    it("is optional — undefined when not provided", () => {
      const result = viewConfigSchema.parse({});
      expect(result.columnOrder).toBeUndefined();
    });
  });

  describe("frozenColumns", () => {
    it("accepts 0", () => {
      const result = viewConfigSchema.parse({ frozenColumns: 0 });
      expect(result.frozenColumns).toBe(0);
    });

    it("accepts positive integers", () => {
      const result = viewConfigSchema.parse({ frozenColumns: 3 });
      expect(result.frozenColumns).toBe(3);
    });

    it("rejects negative numbers", () => {
      expect(() =>
        viewConfigSchema.parse({ frozenColumns: -1 }),
      ).toThrow();
    });

    it("rejects non-integers", () => {
      expect(() =>
        viewConfigSchema.parse({ frozenColumns: 1.5 }),
      ).toThrow();
    });

    it("defaults to 0 when omitted", () => {
      const result = viewConfigSchema.parse({});
      expect(result.frozenColumns).toBe(0);
    });
  });

  describe("full config round-trip", () => {
    it("parses a complete valid config", () => {
      const input = {
        sorts: [
          { columnId: 1, direction: "asc" },
          { columnId: 2, direction: "desc" },
        ],
        filters: [
          { columnId: 3, operator: "contains", value: "hello" },
          { columnId: 4, operator: "greater_than", value: 100 },
        ],
        filterGroupLogic: "OR",
        hiddenColumns: [5, 6],
        rowHeight: "tall",
        columnOrder: [1, 3, 2, 4],
        frozenColumns: 2,
      };
      const result = viewConfigSchema.parse(input);
      expect(result.sorts).toHaveLength(2);
      expect(result.filters).toHaveLength(2);
      expect(result.filterGroupLogic).toBe("OR");
      expect(result.hiddenColumns).toEqual([5, 6]);
      expect(result.rowHeight).toBe("tall");
      expect(result.columnOrder).toEqual([1, 3, 2, 4]);
      expect(result.frozenColumns).toBe(2);
    });
  });
});
