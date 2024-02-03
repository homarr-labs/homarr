import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    include: ["**/*.test.ts"],
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["html", "json-summary", "json"],
      all: true,
      exclude: ["apps/nextjs/.next/"],
    },

    exclude: [...configDefaults.exclude, "apps/nextjs/.next"],
  },
});
