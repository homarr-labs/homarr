import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const languageDirectory = resolve(import.meta.dirname, "../../../translation/src/lang");

describe("Workshop navigation translations", () => {
  test("defines the navbar and breadcrumb label in every locale", async () => {
    const files = (await readdir(languageDirectory)).filter((file) => file.endsWith(".json"));
    for (const file of files) {
      const messages = JSON.parse(await readFile(resolve(languageDirectory, file), "utf8")) as {
        management?: { navbar?: { items?: { workshop?: unknown } } };
        navigationStructure?: { manage?: { workshop?: { label?: unknown } } };
      };
      expect(messages.management?.navbar?.items?.workshop, file).toBe("Workshop");
      expect(messages.navigationStructure?.manage?.workshop?.label, file).toBe("Workshop");
    }
  });
});
