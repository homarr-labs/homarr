import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

const exclude = [
  ...configDefaults.exclude,
  "**/.slim/**",
  "**/.scratch/**",
  "**/snapshots/**",
  "**/.snapshots/**",
  "**/__snapshots__/**",
];

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    clearMocks: true,
    maxWorkers: 2,
    passWithNoTests: false,
    coverage: { enabled: false },
    exclude,
    projects: [
      {
        extends: true,
        test: {
          name: "security-permissions",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: [
            "packages/definitions/src/test/permissions.spec.ts",
            "packages/auth/permissions/test/*.spec.ts",
            "packages/auth/api-key/test/get-api-key-session.spec.ts",
            "packages/auth/test/security.spec.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "security-routers",
          environment: "node",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: [
            "packages/api/src/router/test/**/*.spec.ts",
            "packages/api/src/router/board/test/custom-widget-placement-access.spec.ts",
            "packages/api/src/test/open-api.spec.ts",
            "packages/api/src/test/integration-request.spec.ts",
            "packages/api/src/test/integration-http-auth-coverage.spec.ts",
            "packages/api/src/test/assistant-generation-access.spec.ts",
          ],
          exclude: [...exclude, "packages/api/src/router/test/integration/integration-router.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "security-mcp",
          environment: "node",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: ["packages/api/src/test/mcp.spec.ts", "apps/nextjs/src/app/api/mcp/**/*.spec.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "security-custom-widgets",
          environment: "node",
          setupFiles: ["./vitest.setup.ts", "./vitest.setup.node.ts"],
          include: [
            "packages/custom-widgets/src/test/server-policy.spec.ts",
            "packages/custom-widgets/src/test/jsx-policy.spec.ts",
            "packages/custom-widgets/src/test/request-manifest.spec.ts",
            "packages/custom-widgets/src/test/request-limits.spec.ts",
            "packages/custom-widgets/src/test/request-deadline.spec.ts",
            "packages/custom-widgets/src/test/options.spec.ts",
            "packages/custom-widgets/src/test/schema.spec.ts",
            "packages/custom-widgets/src/test/import.spec.ts",
            "packages/custom-widgets/src/test/preview-sessions.spec.ts",
            "packages/custom-widgets/src/test/runtime.spec.tsx",
          ],
        },
      },
    ],
  },
});
