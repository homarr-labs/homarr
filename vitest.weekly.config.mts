import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "latest-peers-current-source",
    environment: "node",
    setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts", "./packages/integrations/weekly/setup.ts"],
    include: ["packages/integrations/weekly/*.live.ts"],
    reporters: ["./packages/integrations/weekly/reporter.ts"],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 780_000,
    hookTimeout: 30_000,
    retry: 0,
    silent: true,
    env: { CI: "true", NODE_ENV: "development", SKIP_ENV_VALIDATION: "true", DISABLE_REDIS_LOGS: "true" },
  },
});
