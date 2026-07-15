import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { customJsxComponentRegistry } from "../core";

describe("generated Custom JSX documentation", () => {
  test("matches the canonical component registry", async () => {
    const path = resolve(import.meta.dirname, "../../../../apps/docs/src/generated/custom-jsx-components.json");
    const generated = JSON.parse(await readFile(path, "utf8")) as unknown;
    const expected = customJsxComponentRegistry.map(
      ({ name, package: packageName, category, safety, reason, documentationUrl }) => ({
        name,
        package: packageName,
        category,
        safety,
        reason,
        documentationUrl,
      }),
    );
    expect(generated).toEqual(expected);
  });
});
