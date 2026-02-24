import { describe, it, expect } from "vitest";
import {
  getBaseColor,
  getLightColorClass,
  BASE_COLORS,
} from "~/lib/base-icon-utils";

describe("base-icon-utils", () => {
  describe("BASE_COLORS", () => {
    it("exports a non-empty array of Tailwind class strings", () => {
      expect(BASE_COLORS.length).toBeGreaterThan(0);
      for (const c of BASE_COLORS) {
        expect(c).toMatch(/^bg-\w+-\d+$/);
      }
    });
  });

  describe("getBaseColor", () => {
    it("returns a value from BASE_COLORS", () => {
      const color = getBaseColor("some-base-id");
      expect(BASE_COLORS).toContain(color);
    });

    it("is deterministic — same input always yields same output", () => {
      const id = "deterministic-test-id";
      const c1 = getBaseColor(id);
      const c2 = getBaseColor(id);
      expect(c1).toBe(c2);
    });

    it("different IDs can produce different colors", () => {
      const colors = new Set(
        Array.from({ length: 50 }, (_, i) => getBaseColor(`base-${i}`)),
      );
      // With 30 colors and 50 IDs, we expect more than 1 unique color
      expect(colors.size).toBeGreaterThan(1);
    });

    it("handles empty string without throwing", () => {
      expect(() => getBaseColor("")).not.toThrow();
      expect(BASE_COLORS).toContain(getBaseColor(""));
    });

    it("handles single-character IDs", () => {
      expect(BASE_COLORS).toContain(getBaseColor("a"));
      expect(BASE_COLORS).toContain(getBaseColor("z"));
    });

    it("handles long IDs", () => {
      const longId = "x".repeat(200);
      expect(BASE_COLORS).toContain(getBaseColor(longId));
    });
  });

  describe("getLightColorClass", () => {
    it("maps a full color class to its 100-shade variant", () => {
      expect(getLightColorClass("bg-red-300")).toBe("bg-red-100");
      expect(getLightColorClass("bg-blue-600")).toBe("bg-blue-100");
      expect(getLightColorClass("bg-green-900")).toBe("bg-green-100");
    });

    it("handles all named colors", () => {
      const colors = [
        "red",
        "orange",
        "yellow",
        "green",
        "cyan",
        "blue",
        "indigo",
        "purple",
        "pink",
        "gray",
      ];
      for (const color of colors) {
        expect(getLightColorClass(`bg-${color}-300`)).toBe(`bg-${color}-100`);
      }
    });

    it("returns bg-gray-100 for unknown color names", () => {
      expect(getLightColorClass("bg-teal-300")).toBe("bg-gray-100");
      expect(getLightColorClass("bg-lime-300")).toBe("bg-gray-100");
    });

    it("handles malformed input gracefully", () => {
      // Should not throw — falls back to gray-100
      expect(getLightColorClass("not-a-class")).toBe("bg-gray-100");
    });
  });
});
