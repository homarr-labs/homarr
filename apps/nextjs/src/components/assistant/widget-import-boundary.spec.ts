import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const collectRuntimeSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectRuntimeSourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.spec\.(ts|tsx)$/.test(entry.name)) return [];
    return [path];
  });

describe("widget import boundary", () => {
  test("application runtime code uses narrow widget exports", () => {
    const offenders = collectRuntimeSourceFiles(sourceRoot).filter((path) => {
      const source = readFileSync(path, "utf8");
      const importStatements = source.match(/import[\s\S]*?;/g) ?? [];
      return (
        importStatements.some(
          (statement) => !/^import\s+type\b/.test(statement) && /\sfrom\s+["']@homarr\/widgets["']/.test(statement),
        ) || /import\(["']@homarr\/widgets["']\)/.test(source)
      );
    });

    expect(offenders).toEqual([]);
  });
});
