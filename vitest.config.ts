import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      // Report on all source files for visibility, but only enforce thresholds
      // on the pure utility layer (src/lib/). Server routers require a live
      // database and are covered by E2E tests rather than unit tests.
      include: ["src/lib/**/*.{ts,tsx}", "src/server/api/utils/**/*.{ts,tsx}"],
      exclude: [
        "src/lib/**/*.d.ts",
        // server/api/utils files that depend on Prisma transactions
        // are partially tested; exclude from threshold enforcement
      ],
      thresholds: {
        // Enforce 80% on the utility layer we CAN unit test
        "src/lib/**": {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
});
