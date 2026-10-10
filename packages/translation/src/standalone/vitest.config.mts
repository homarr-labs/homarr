import { defineConfig } from "vitest/config";

export default defineConfig({
  envDir: false,
  cacheDir: new URL("./.cache", import.meta.url).pathname,
  test: {
    environment: "node",
    include: ["packages/translation/src/standalone/*.spec.tsx"],
    cache: false,
    maxWorkers: 1,
  },
});
