import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  test: {
    include: ["packages/integrations/src/runtime/review-regressions.spec.ts"],
    environment: "node",
    fileParallelism: false,
  },
});
