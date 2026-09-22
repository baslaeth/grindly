import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/database/**/*.test.ts"],
    environment: "node",
    testTimeout: 15_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
