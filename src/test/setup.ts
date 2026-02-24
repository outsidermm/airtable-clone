import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Silence console.error for expected React errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = args[0];
    if (
      typeof msg === "string" &&
      (msg.includes("Warning:") || msg.includes("Error: Not implemented"))
    ) {
      return;
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
