import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import { describe, expect, test } from "vitest";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const collectRuntimeSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectRuntimeSourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name) || /\.spec\.(ts|tsx)$/.test(entry.name)) return [];
    return [path];
  });

const rootWidgetsModule = "@homarr/widgets";

const hasRuntimeRootWidgetImport = (source: string, fileName: string): boolean => {
  const { program } = parse(source, {
    sourceFilename: fileName,
    sourceType: "unambiguous",
    plugins: ["typescript", "jsx", "decorators-legacy", "importAttributes"],
  });
  const hasStaticImport = program.body.some(
    (node) =>
      node.type === "ImportDeclaration" &&
      node.source.value === rootWidgetsModule &&
      node.importKind !== "type" &&
      (node.specifiers.length === 0 ||
        node.specifiers.some((specifier) => specifier.type !== "ImportSpecifier" || specifier.importKind !== "type")),
  );
  return hasStaticImport || hasDynamicRootWidgetImport(program);
};

const hasDynamicRootWidgetImport = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(hasDynamicRootWidgetImport);
  if (typeof value !== "object" || value === null) return false;

  const node = value as Record<string, unknown>;
  if (node.type === "CallExpression") {
    const callee = node.callee as Record<string, unknown> | undefined;
    const argument = Array.isArray(node.arguments)
      ? (node.arguments[0] as Record<string, unknown> | undefined)
      : undefined;
    if (callee?.type === "Import" && argument?.type === "StringLiteral" && argument.value === rootWidgetsModule) {
      return true;
    }
  }

  return Object.values(node).some(hasDynamicRootWidgetImport);
};

describe("widget import boundary", () => {
  test("application runtime code uses narrow widget exports", () => {
    const offenders = collectRuntimeSourceFiles(sourceRoot).filter((path) => {
      const source = readFileSync(path, "utf8");
      return hasRuntimeRootWidgetImport(source, path);
    });

    expect(offenders).toEqual([]);
  });

  test.each([
    ['import type { WidgetDefinition } from "@homarr/widgets";', false],
    ['import { type WidgetDefinition } from "@homarr/widgets";', false],
    ["const example = 'import { widgets } from \"@homarr/widgets\";';", false],
    ['// import { widgets } from "@homarr/widgets";', false],
    ['import { widgets } from "@homarr/widgets";', true],
    ['import { type WidgetDefinition, widgets } from "@homarr/widgets";', true],
    ['import /* chunk */ ( /* source */ "@homarr/widgets" );', true],
  ])("detects runtime root imports in %s", (source, expected) => {
    expect(hasRuntimeRootWidgetImport(source, "fixture.ts")).toBe(expected);
  });
});
