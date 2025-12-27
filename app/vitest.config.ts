import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Use edge-runtime for Convex tests, jsdom for React component tests
    environmentMatchGlobs: [
      ["convex/**/*.test.ts", "edge-runtime"],
      ["../tasks/**/tests/convex/**/*.test.ts", "edge-runtime"],
      ["src/**/*.test.{ts,tsx}", "jsdom"],
      ["src/**/__tests__/**/*.test.{ts,tsx}", "jsdom"],
    ],
    // Note: Task folder tests excluded due to vitest path issues with spaces
    // Tests developed in task folders should be moved to convex/__tests__/ or src/__tests__/
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
