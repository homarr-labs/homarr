// @vitest-environment node

import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vitest";

describe("Custom Widget bundle budget", () => {
  test.each(["not-a-number", "0", "-1", "1.5", String(Number.MAX_SAFE_INTEGER + 1)])(
    "rejects an invalid byte budget (%s)",
    (budget) => {
      const result = spawnSync(process.execPath, ["scripts/check-custom-widget-bundle.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, CUSTOM_WIDGET_CHUNK_BUDGET_BYTES: budget },
      });

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("CUSTOM_WIDGET_CHUNK_BUDGET_BYTES must be a positive integer");
      expect(result.stderr).not.toContain("Next.js build output is missing");
    },
  );

  test("finds the dynamic module from its runtime chunk when server metadata is absent", async () => {
    const nextRoot = await mkdtemp(join(tmpdir(), "homarr-custom-widget-bundle-"));
    const serverChunk = join(nextRoot, "server/chunks/ssr/packages_widgets_src_custom-api_component_test.js");
    const manifestPath = join(
      nextRoot,
      "standalone/apps/nextjs/.next/server/app/[locale]/(home)/(board)/page/react-loadable-manifest.json",
    );
    const runtimeChunk = join(nextRoot, "static/chunks/custom-widget-runtime.js");
    try {
      await Promise.all([
        mkdir(dirname(serverChunk), { recursive: true }),
        mkdir(dirname(manifestPath), { recursive: true }),
        mkdir(dirname(runtimeChunk), { recursive: true }),
      ]);
      await Promise.all([
        writeFile(serverChunk, "const generatedWithoutLoadableMetadata = true;"),
        writeFile(runtimeChunk, 'const runtimeError = "RUNTIME_RENDER_ERROR";'),
        writeFile(manifestPath, JSON.stringify({ 42: { id: 42, files: ["static/chunks/custom-widget-runtime.js"] } })),
      ]);

      const result = spawnSync(process.execPath, ["scripts/check-custom-widget-bundle.mjs"], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: { ...process.env, CUSTOM_WIDGET_NEXT_ROOT: nextRoot },
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Custom JSX bundle check passed");
    } finally {
      await rm(nextRoot, { force: true, recursive: true });
    }
  });
});
