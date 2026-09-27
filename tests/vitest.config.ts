import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

if (process.env.HOMARR_CONTRACT_RUN !== "1") {
  throw new Error("Use pnpm test so contracts run with disposable database and Redis services");
}

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "contracts",
    environment: "node",
    include: ["tests/**/*.contract.test.ts"],
    setupFiles: ["tests/support/setup.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
