import { describe, it, expect, beforeEach } from "vitest";
import {
  pushQueryEntry,
  getQueryLog,
  clearQueryLog,
  type QueryEntry,
} from "~/lib/query-log";

describe("query-log", () => {
  beforeEach(() => {
    clearQueryLog();
  });

  describe("pushQueryEntry", () => {
    it("adds an entry to the log", () => {
      pushQueryEntry({ path: "view.getData", label: "getData", totalMs: 42 });
      const log = getQueryLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({
        path: "view.getData",
        label: "getData",
        totalMs: 42,
      });
    });

    it("assigns sequential IDs", () => {
      pushQueryEntry({ path: "a", label: "a", totalMs: 1 });
      pushQueryEntry({ path: "b", label: "b", totalMs: 2 });
      const log = getQueryLog();
      // newest entry is first
      expect(log[0]!.path).toBe("b");
      expect(log[1]!.path).toBe("a");
      expect(log[0]!.id).toBeGreaterThan(log[1]!.id);
    });

    it("stores optional sqlMs and rowCount", () => {
      pushQueryEntry({
        path: "row.getRows",
        label: "getRows",
        totalMs: 120,
        sqlMs: 80,
        rowCount: 50,
      });
      const log = getQueryLog();
      expect(log[0]).toMatchObject({ sqlMs: 80, rowCount: 50 });
    });

    it("stores a timestamp close to now", () => {
      const before = Date.now();
      pushQueryEntry({ path: "x", label: "x", totalMs: 5 });
      const after = Date.now();
      const entry = getQueryLog()[0]!;
      expect(entry.timestamp).toBeGreaterThanOrEqual(before);
      expect(entry.timestamp).toBeLessThanOrEqual(after);
    });

    it("caps the log at 50 entries (MAX_ENTRIES)", () => {
      for (let i = 0; i < 60; i++) {
        pushQueryEntry({ path: `p${i}`, label: `l${i}`, totalMs: i });
      }
      expect(getQueryLog()).toHaveLength(50);
    });

    it("newest entries appear first", () => {
      pushQueryEntry({ path: "first", label: "first", totalMs: 1 });
      pushQueryEntry({ path: "second", label: "second", totalMs: 2 });
      pushQueryEntry({ path: "third", label: "third", totalMs: 3 });
      const log = getQueryLog();
      expect(log[0]!.path).toBe("third");
      expect(log[1]!.path).toBe("second");
      expect(log[2]!.path).toBe("first");
    });
  });

  describe("getQueryLog", () => {
    it("returns empty array when no entries", () => {
      expect(getQueryLog()).toEqual([]);
    });

    it("returns a copy-safe array", () => {
      pushQueryEntry({ path: "a", label: "a", totalMs: 1 });
      const log1 = getQueryLog();
      const log2 = getQueryLog();
      expect(log1).toEqual(log2);
    });
  });

  describe("clearQueryLog", () => {
    it("empties the log", () => {
      pushQueryEntry({ path: "a", label: "a", totalMs: 1 });
      pushQueryEntry({ path: "b", label: "b", totalMs: 2 });
      clearQueryLog();
      expect(getQueryLog()).toHaveLength(0);
    });

    it("allows new entries after clear", () => {
      pushQueryEntry({ path: "old", label: "old", totalMs: 1 });
      clearQueryLog();
      pushQueryEntry({ path: "new", label: "new", totalMs: 2 });
      const log = getQueryLog();
      expect(log).toHaveLength(1);
      expect(log[0]!.path).toBe("new");
    });
  });
});
