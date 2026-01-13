import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "**/*.{test,spec}.{ts,tsx}",
      "tests/convex-integration/**/*.test.ts",
    ],
    exclude: ["tests/e2e/**/*", "node_modules"],
    // Use node for Convex tests, jsdom for React component tests
    // @ts-expect-error - environmentMatchGlobs is supported but not in type definitions
    environmentMatchGlobs: [
      ["convex/**/*.test.ts", "node"],
      ["tests/convex-integration/**/*.test.ts", "node"],
      ["../tasks/**/*.test.ts", "node"],
      ["src/**/*.test.{ts,tsx}", "jsdom"],
      ["src/**/__tests__/**/*.test.{ts,tsx}", "jsdom"],
    ],
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
  },
  resolve: {
    alias: {
      "@/convex": path.resolve(__dirname, "./convex"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
