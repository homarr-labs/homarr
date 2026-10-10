import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  envDir: false,
  cacheDir: fileURLToPath(new URL("./.vitest-cache", import.meta.url)),
  test: {
    cache: false,
    include: ["test/security.spec.ts"],
    passWithNoTests: false,
  },
});
