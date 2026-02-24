import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getTimeAgo } from "~/lib/date";

describe("getTimeAgo", () => {
  const NOW = 1_700_000_000_000; // fixed reference point

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for < 1 minute ago', () => {
    expect(getTimeAgo(NOW - 30_000)).toBe("Just now");
    expect(getTimeAgo(NOW - 59_000)).toBe("Just now");
    expect(getTimeAgo(NOW)).toBe("Just now");
  });

  it('returns "Xm ago" for 1–59 minutes ago', () => {
    expect(getTimeAgo(NOW - 60_000)).toBe("1m ago");
    expect(getTimeAgo(NOW - 5 * 60_000)).toBe("5m ago");
    expect(getTimeAgo(NOW - 59 * 60_000)).toBe("59m ago");
  });

  it('returns "Xh ago" for 1–23 hours ago', () => {
    expect(getTimeAgo(NOW - 3_600_000)).toBe("1h ago");
    expect(getTimeAgo(NOW - 3 * 3_600_000)).toBe("3h ago");
    expect(getTimeAgo(NOW - 23 * 3_600_000)).toBe("23h ago");
  });

  it('returns "Xd ago" for 1+ days ago', () => {
    expect(getTimeAgo(NOW - 86_400_000)).toBe("1d ago");
    expect(getTimeAgo(NOW - 7 * 86_400_000)).toBe("7d ago");
    expect(getTimeAgo(NOW - 30 * 86_400_000)).toBe("30d ago");
  });
});
