import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  resolve: {
    alias: [
      {
        find: /^@homarr\/definitions$/,
        replacement: fileURLToPath(new URL("../../../../definitions/src/integration.ts", import.meta.url)),
      },
    ],
  },
  test: {
    include: [
      "packages/integrations/src/stats/-runtime/*.spec.ts",
      "packages/integrations/src/stats/frigate-auth.spec.ts",
    ],
    environment: "node",
    fileParallelism: false,
    server: { deps: { inline: ["zod"] } },
  },
});
