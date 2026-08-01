import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, test } from "vitest";

const gridDirectory = resolve(import.meta.dirname, "..");
const nextjsSourceDirectory = resolve(gridDirectory, "../../../../");
const sectionGridPath = resolve(gridDirectory, "section-grid.tsx");
const editorLoaderPath = resolve(gridDirectory, "grid-editor-loader.ts");

describe("board grid import boundary", () => {
  test("keeps every current dnd-kit runtime import inside the edit-only module", () => {
    const runtimeImports = getSourceFiles(nextjsSourceDirectory)
      .flatMap(getRuntimeImports)
      .filter(({ specifier }) => CURRENT_DND_KIT_PACKAGES.has(specifier))
      .map(({ filePath, kind, specifier }) => ({
        file: toSourceRelativePath(filePath),
        kind,
        specifier,
      }))
      .toSorted((first, second) =>
        `${first.file}:${first.specifier}:${first.kind}`.localeCompare(
          `${second.file}:${second.specifier}:${second.kind}`,
        ),
      );

    expect(runtimeImports).toEqual([
      {
        file: "components/board/sections/grid/grid-editor.tsx",
        kind: "static",
        specifier: "@dnd-kit/abstract",
      },
      {
        file: "components/board/sections/grid/grid-editor.tsx",
        kind: "static",
        specifier: "@dnd-kit/collision",
      },
      {
        file: "components/board/sections/grid/grid-editor.tsx",
        kind: "static",
        specifier: "@dnd-kit/dom",
      },
      {
        file: "components/board/sections/grid/grid-editor.tsx",
        kind: "static",
        specifier: "@dnd-kit/react",
      },
    ]);
  });

  test("loads the editor through next/dynamic only in the edit branch", () => {
    const sourceFile = parseSourceFile(sectionGridPath);
    const dynamicImport = sourceFile.statements.find(
      (statement): statement is ts.ImportDeclaration =>
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === "next/dynamic",
    );

    expect(dynamicImport?.importClause?.name?.text).toBe("dynamic");

    const gridEditorDeclaration = findNode(
      sourceFile,
      (node): node is ts.VariableDeclaration =>
        ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "GridEditor",
    );
    expect(gridEditorDeclaration).toBeDefined();
    expect(gridEditorDeclaration?.initializer && ts.isCallExpression(gridEditorDeclaration.initializer)).toBe(true);

    const dynamicCall = gridEditorDeclaration?.initializer;
    if (!dynamicCall || !ts.isCallExpression(dynamicCall)) {
      throw new Error("GridEditor must be initialized with next/dynamic");
    }

    expect(ts.isIdentifier(dynamicCall.expression) && dynamicCall.expression.text === "dynamic").toBe(true);
    expect(
      dynamicCall.arguments.some((argument) => ts.isIdentifier(argument) && argument.text === "loadGridEditorAsync"),
    ).toBe(true);
    expect(dynamicCall.arguments.some(hasDisabledSsrOption)).toBe(true);
    expect(dynamicCall.arguments.some(hasEditorLoadingOption)).toBe(true);
    expect(getRuntimeImports(sectionGridPath).filter(({ specifier }) => specifier === "./grid-editor")).toEqual([]);
    expect(
      getRuntimeImports(editorLoaderPath)
        .filter(({ specifier }) => specifier === "./grid-editor")
        .map(({ kind }) => kind),
    ).toEqual(["dynamic"]);

    const usages = findNodes(
      sourceFile,
      (node): node is ts.JsxSelfClosingElement =>
        ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) && node.tagName.text === "GridEditor",
    );
    expect(usages).toHaveLength(1);

    const gridEditorUsage = usages[0];
    if (!gridEditorUsage) {
      throw new Error("GridEditor must be rendered once");
    }

    const editConditional = findAncestor(gridEditorUsage, ts.isConditionalExpression);
    expect(editConditional && isDescendantOf(gridEditorUsage, editConditional.whenTrue)).toBe(true);
    expect(editConditional?.condition.getText(sourceFile)).toContain("isEditMode");
    expect(editConditional?.condition.getText(sourceFile)).toContain('editorRuntimeStatus === "ready"');
  });
});

const CURRENT_DND_KIT_PACKAGES = new Set(["@dnd-kit/abstract", "@dnd-kit/collision", "@dnd-kit/dom", "@dnd-kit/react"]);

interface RuntimeImport {
  filePath: string;
  kind: "dynamic" | "require" | "static";
  specifier: string;
}

const getSourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(path);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });

const getRuntimeImports = (filePath: string): RuntimeImport[] => {
  const sourceFile = parseSourceFile(filePath);
  const imports: RuntimeImport[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && isRuntimeImportDeclaration(node)) {
      imports.push({ filePath, kind: "static", specifier: node.moduleSpecifier.text });
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      isRuntimeExportDeclaration(node)
    ) {
      imports.push({ filePath, kind: "static", specifier: node.moduleSpecifier.text });
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      const [argument] = node.arguments;
      if (node.arguments.length === 1 && argument && ts.isStringLiteral(argument)) {
        imports.push({
          filePath,
          kind: node.expression.kind === ts.SyntaxKind.ImportKeyword ? "dynamic" : "require",
          specifier: argument.text,
        });
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      imports.push({ filePath, kind: "static", specifier: node.moduleReference.expression.text });
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return imports;
};

const isRuntimeImportDeclaration = (declaration: ts.ImportDeclaration) => {
  const clause = declaration.importClause;
  if (!clause) return true;
  if (clause.isTypeOnly) return false;
  if (clause.name) return true;
  if (!clause.namedBindings || ts.isNamespaceImport(clause.namedBindings)) return true;
  if (clause.namedBindings.elements.length === 0) return true;
  return clause.namedBindings.elements.some((element) => !element.isTypeOnly);
};

const isRuntimeExportDeclaration = (declaration: ts.ExportDeclaration) => {
  if (declaration.isTypeOnly) return false;
  if (!declaration.exportClause || ts.isNamespaceExport(declaration.exportClause)) return true;
  if (declaration.exportClause.elements.length === 0) return true;
  return declaration.exportClause.elements.some((element) => !element.isTypeOnly);
};

const parseSourceFile = (filePath: string) =>
  ts.createSourceFile(filePath, readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true, getScriptKind(filePath));

const getScriptKind = (filePath: string) => {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs") || filePath.endsWith(".cjs")) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
};

const hasDisabledSsrOption = (node: ts.Node) => {
  if (!ts.isObjectLiteralExpression(node)) return false;
  return node.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "ssr" &&
      property.initializer.kind === ts.SyntaxKind.FalseKeyword,
  );
};

const hasEditorLoadingOption = (node: ts.Node) => {
  if (!ts.isObjectLiteralExpression(node)) return false;
  return node.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "loading" &&
      ts.isIdentifier(property.initializer) &&
      property.initializer.text === "GridEditorLoading",
  );
};

const findNode = <TNode extends ts.Node>(
  root: ts.Node,
  predicate: (node: ts.Node) => node is TNode,
): TNode | undefined => findNodes(root, predicate)[0];

const findNodes = <TNode extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is TNode) => {
  const matches: TNode[] = [];
  const visit = (node: ts.Node) => {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return matches;
};

const findAncestor = <TNode extends ts.Node>(
  node: ts.Node,
  predicate: (candidate: ts.Node) => candidate is TNode,
): TNode | undefined => {
  let current = node.parent;
  while (current) {
    if (predicate(current)) return current;
    current = current.parent;
  }
  return undefined;
};

const isDescendantOf = (node: ts.Node, ancestor: ts.Node) => node.pos >= ancestor.pos && node.end <= ancestor.end;

const toSourceRelativePath = (filePath: string) => relative(nextjsSourceDirectory, filePath).replaceAll("\\", "/");
