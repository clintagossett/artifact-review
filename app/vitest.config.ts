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
      "../tasks/**/*.test.ts",
    ],
    // Use edge-runtime for Convex tests, jsdom for React component tests
    // @ts-expect-error - environmentMatchGlobs is supported but not in type definitions
    environmentMatchGlobs: [
      ["convex/**/*.test.ts", "edge-runtime"],
      ["../tasks/**/*.test.ts", "edge-runtime"],
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
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
