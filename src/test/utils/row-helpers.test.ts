/**
 * Tests for row-helpers utilities.
 * calculateRowPosition uses DB queries — we test the validation branches
 * and the LexoRank arithmetic by mocking the Prisma transaction.
 */
import { describe, it, expect, vi } from "vitest";
import { LexoRank } from "lexorank";

// Re-test the LexoRank arithmetic that calculateRowPosition relies on —
// doing so without importing the helper keeps the test isolated from Prisma.
describe("LexoRank ordering invariants (used by calculateRowPosition)", () => {
  it("genNext() produces a lexicographically greater value", () => {
    const base = LexoRank.middle();
    const next = base.genNext();
    expect(next.toString() > base.toString()).toBe(true);
  });

  it("genPrev() produces a lexicographically smaller value", () => {
    const base = LexoRank.middle();
    const prev = base.genPrev();
    expect(prev.toString() < base.toString()).toBe(true);
  });

  it("between() produces a value strictly between two ranks", () => {
    const a = LexoRank.middle();
    const b = a.genNext().genNext();
    const mid = a.between(b);
    expect(mid.toString() > a.toString()).toBe(true);
    expect(mid.toString() < b.toString()).toBe(true);
  });

  it("a chain of genNext() calls maintains order", () => {
    let rank = LexoRank.middle();
    const chain: string[] = [rank.toString()];
    for (let i = 0; i < 10; i++) {
      rank = rank.genNext();
      chain.push(rank.toString());
    }
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i]! > chain[i - 1]!).toBe(true);
    }
  });

  it("can generate ranks for 10k items without collision", () => {
    let rank = LexoRank.middle();
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      rank = rank.genNext();
      const s = rank.toString();
      expect(seen.has(s)).toBe(false);
      seen.add(s);
    }
  });

  it("parse() round-trips the string representation", () => {
    const original = LexoRank.middle().genNext();
    const parsed = LexoRank.parse(original.toString());
    expect(parsed.toString()).toBe(original.toString());
  });
});

describe("calculateRowPosition — argument validation (via mocked transaction)", () => {
  // Import after describing tests so vi.mock takes effect
  it("throws when both afterRowId and beforeRowId are provided", async () => {
    // We mock the tx to never be called — the error is thrown before any query
    const { calculateRowPosition } = await import(
      "~/server/api/utils/row-helpers"
    );

    // A minimal mock — this branch throws before querying DB
    const fakeTx = {} as Parameters<typeof calculateRowPosition>[0];

    await expect(
      calculateRowPosition(fakeTx, 1, {
        afterRowId: 10,
        beforeRowId: 20,
      }),
    ).rejects.toThrow("Cannot specify both afterRowId and beforeRowId");
  });
});
