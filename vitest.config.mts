import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

// Docker-backed suites are opt-in through pnpm test:integration.
const integrationTests = [
  "**/*.integration.spec.ts",
  "packages/db/test/mysql-migration.spec.ts",
  "packages/db/test/postgresql-migration.spec.ts",
  "packages/integrations/test/aria2.spec.ts",
  "packages/integrations/test/home-assistant.spec.ts",
  "packages/integrations/test/nextcloud.spec.ts",
  "packages/integrations/test/nzbget.spec.ts",
  "packages/integrations/test/pi-hole.spec.ts",
  "packages/integrations/test/sabnzbd.spec.ts",
  "packages/integrations/test/technitium.spec.ts",
];

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
          exclude: [...configDefaults.exclude, ...integrationTests],
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
            ...integrationTests,
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: integrationTests,
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          environment: "node",
          include: ["e2e/**/*.spec.ts"],
          exclude: [...configDefaults.exclude, "e2e/assistant-docs-screenshots.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "docs-screenshots",
          environment: "node",
          include: ["e2e/assistant-docs-screenshots.spec.ts"],
        },
      },
    ],
  },
});
