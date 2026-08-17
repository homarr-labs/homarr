import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    setupFiles: ["./vitest.setup.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["html", "json-summary", "json"],
      all: true,
      exclude: (configDefaults.coverage.exclude ?? []).concat("apps/nextjs/.next/"),
      reportOnFailure: true,
    },

    exclude: [...configDefaults.exclude, "apps/nextjs/.next"],
    projects: [
      {
        extends: true,
        test: {
          name: "api-node",
          environment: "node",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: ["packages/api/**/*.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "db-node",
          environment: "node",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: ["packages/db/test/**/*.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "custom-widgets-node",
          environment: "node",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: ["packages/custom-widgets/src/**/*.spec.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "request-handler-node",
          environment: "node",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: ["packages/request-handler/**/*.spec.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "docker-node",
          environment: "node",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: ["packages/docker/**/*.spec.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["**/*.spec.{ts,tsx}"],
          exclude: [
            ...configDefaults.exclude,
            "apps/nextjs/.next",
            "packages/api/**",
            "packages/custom-widgets/**",
            "packages/db/**",
            "packages/docker/**",
            "packages/request-handler/**",
            "e2e/**",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          environment: "node",
          include: ["e2e/**/*.spec.ts"],
        },
      },
    ],
  },
});
