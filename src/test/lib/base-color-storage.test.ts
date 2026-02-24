import { describe, it, expect, beforeEach } from "vitest";

// Set up localStorage mock before module import
const store: Record<string, string> = {};
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  },
  writable: true,
});

import {
  getStoredBaseColor,
  setStoredBaseColor,
} from "~/lib/base-color-storage";
import { BASE_COLORS } from "~/lib/base-icon-utils";

describe("base-color-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getStoredBaseColor", () => {
    it("returns a valid Tailwind color class for any base ID", () => {
      const color = getStoredBaseColor("base-1");
      expect(BASE_COLORS).toContain(color);
    });

    it("returns the same color for the same base ID (deterministic hash)", () => {
      const c1 = getStoredBaseColor("same-id");
      const c2 = getStoredBaseColor("same-id");
      expect(c1).toBe(c2);
    });

    it("reads a previously stored color from localStorage", () => {
      const target = BASE_COLORS[2]!;
      setStoredBaseColor("stored-base", target);
      expect(getStoredBaseColor("stored-base")).toBe(target);
    });

    it("falls back to deterministic hash when localStorage is empty", () => {
      // No stored value — should still return something valid
      const color = getStoredBaseColor("hash-only");
      expect(BASE_COLORS).toContain(color);
    });

    it("gracefully handles corrupt localStorage JSON", () => {
      store.baseColors = "NOT_VALID_JSON{{{";
      // Should not throw; falls back to hash
      expect(() => getStoredBaseColor("any")).not.toThrow();
      const color = getStoredBaseColor("any");
      expect(BASE_COLORS).toContain(color);
    });
  });

  describe("setStoredBaseColor", () => {
    it("persists a color so getStoredBaseColor returns it", () => {
      const target = BASE_COLORS[5]!;
      setStoredBaseColor("persist-test", target);
      expect(getStoredBaseColor("persist-test")).toBe(target);
    });

    it("allows overriding a previously stored color", () => {
      setStoredBaseColor("override-me", BASE_COLORS[0]!);
      setStoredBaseColor("override-me", BASE_COLORS[1]!);
      expect(getStoredBaseColor("override-me")).toBe(BASE_COLORS[1]);
    });

    it("stores multiple bases independently", () => {
      setStoredBaseColor("base-a", BASE_COLORS[0]!);
      setStoredBaseColor("base-b", BASE_COLORS[1]!);
      expect(getStoredBaseColor("base-a")).toBe(BASE_COLORS[0]);
      expect(getStoredBaseColor("base-b")).toBe(BASE_COLORS[1]);
    });
  });
});
