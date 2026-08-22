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

interface AstNode {
  type: string;
  [key: string]: unknown;
}

const isAstNode = (value: unknown): value is AstNode =>
  typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";

const getAstNode = (value: unknown) => (isAstNode(value) ? value : undefined);
const getAstNodes = (value: unknown) => (Array.isArray(value) ? value.filter(isAstNode) : []);

const isRootWidgetsModule = (node: unknown) => {
  const astNode = getAstNode(node);
  return astNode?.type === "StringLiteral" && astNode.value === rootWidgetsModule;
};

const hasRuntimeRootWidgetImport = (source: string, fileName: string): boolean => {
  const sourceFile = parse(source, {
    sourceFilename: fileName,
    sourceType: "unambiguous",
    plugins: ["typescript", "jsx", "decorators-legacy", "importAttributes"],
  });
  let found = false;

  const visit = (node: AstNode) => {
    if (found) return;

    if (node.type === "ImportDeclaration" && isRootWidgetsModule(node.source)) {
      const specifiers = getAstNodes(node.specifiers);
      if (
        node.importKind !== "type" &&
        (specifiers.length === 0 ||
          specifiers.some((specifier) => specifier.type !== "ImportSpecifier" || specifier.importKind !== "type"))
      ) {
        found = true;
      }
    } else if (
      (node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") &&
      isRootWidgetsModule(node.source)
    ) {
      const specifiers = getAstNodes(node.specifiers);
      if (
        node.exportKind !== "type" &&
        (node.type === "ExportAllDeclaration" ||
          specifiers.length === 0 ||
          specifiers.some((specifier) => specifier.exportKind !== "type"))
      ) {
        found = true;
      }
    } else if (node.type === "TSImportEqualsDeclaration" && node.importKind !== "type") {
      const moduleReference = getAstNode(node.moduleReference);
      if (moduleReference?.type === "TSExternalModuleReference" && isRootWidgetsModule(moduleReference.expression)) {
        found = true;
      }
    } else if (node.type === "CallExpression") {
      const callee = getAstNode(node.callee);
      const argument = getAstNodes(node.arguments)[0];
      if (
        isRootWidgetsModule(argument) &&
        (callee?.type === "Import" || (callee?.type === "Identifier" && callee.name === "require"))
      ) {
        found = true;
      }
    }

    for (const value of Object.values(node)) {
      if (isAstNode(value)) visit(value);
      else if (Array.isArray(value)) value.filter(isAstNode).forEach(visit);
    }
  };

  visit(sourceFile as unknown as AstNode);
  return found;
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
    ['export type { WidgetDefinition } from "@homarr/widgets";', false],
    ["const example = 'import { widgets } from \"@homarr/widgets\";';", false],
    ['// import { widgets } from "@homarr/widgets";', false],
    ['import { widgets } from "@homarr/widgets";', true],
    ['import { type WidgetDefinition, widgets } from "@homarr/widgets";', true],
    ['export * from "@homarr/widgets";', true],
    ['import /* chunk */ ( /* source */ "@homarr/widgets" );', true],
    ['require("@homarr/widgets");', true],
  ])("detects runtime root imports in %s", (source, expected) => {
    expect(hasRuntimeRootWidgetImport(source, "fixture.ts")).toBe(expected);
  });
});
