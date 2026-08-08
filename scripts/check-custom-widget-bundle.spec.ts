// @vitest-environment node

import { spawnSync } from "node:child_process";
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
});
