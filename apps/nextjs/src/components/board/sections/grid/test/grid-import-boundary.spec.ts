import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const gridDirectory = resolve(import.meta.dirname, "..");
const nextjsSourceDirectory = resolve(gridDirectory, "../../../../");
const sectionGridPath = resolve(gridDirectory, "section-grid.tsx");
const editorBoundaryPath = resolve(gridDirectory, "board-grid-editor-boundary.tsx");
const editorLoaderPath = resolve(gridDirectory, "grid-editor-loader.ts");

describe("board grid import boundary", () => {
  test("keeps every current dnd-kit runtime import inside the edit-only module", () => {
    const runtimeImports = getSourceFiles(nextjsSourceDirectory)
      .flatMap(getRuntimeImports)
      .filter(({ specifier }) => isCurrentDndKitImport(specifier))
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
      { file: "components/board/sections/grid/grid-editor.tsx", kind: "static", specifier: "@dnd-kit/abstract" },
      { file: "components/board/sections/grid/grid-editor.tsx", kind: "static", specifier: "@dnd-kit/collision" },
      { file: "components/board/sections/grid/grid-editor.tsx", kind: "static", specifier: "@dnd-kit/dom" },
      { file: "components/board/sections/grid/grid-editor.tsx", kind: "static", specifier: "@dnd-kit/dom/modifiers" },
      { file: "components/board/sections/grid/grid-editor.tsx", kind: "static", specifier: "@dnd-kit/dom/utilities" },
      { file: "components/board/sections/grid/grid-editor.tsx", kind: "static", specifier: "@dnd-kit/react" },
    ]);
  });

  test("loads the editor only in edit mode without replacing static board content", () => {
    const sectionSource = readFileSync(sectionGridPath, "utf8");
    const boundarySource = readFileSync(editorBoundaryPath, "utf8");

    expect(sectionSource).not.toMatch(/import dynamic from ["']next\/dynamic["']/);
    expect(sectionSource).toMatch(/<SectionContent\s*\/>/);
    expect(sectionSource).toMatch(/<div ref={editorHostRef} className={classes\.editorPortalHost}\s*\/>/);
    expect(boundarySource).toMatch(/loadGridEditorAsync\(\)/);
    expect(boundarySource).toMatch(/isEditMode\s*&&\s*Provider\s*&&\s*GridEditor/);
    expect(boundarySource).toMatch(/createPortal\(<GridEditor \{\.\.\.props} \/>, host, props\.sectionId\)/);
    expect(getRuntimeImports(sectionGridPath).filter(({ specifier }) => specifier === "./grid-editor")).toEqual([]);
    expect(
      getRuntimeImports(editorLoaderPath)
        .filter(({ specifier }) => specifier === "./grid-editor")
        .map(({ kind }) => kind),
    ).toEqual(["dynamic"]);
  });
});

const CURRENT_DND_KIT_PACKAGES = ["@dnd-kit/abstract", "@dnd-kit/collision", "@dnd-kit/dom", "@dnd-kit/react"];

const isCurrentDndKitImport = (specifier: string) =>
  CURRENT_DND_KIT_PACKAGES.some((packageName) => specifier === packageName || specifier.startsWith(`${packageName}/`));

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
  const source = readFileSync(filePath, "utf8");
  const imports: RuntimeImport[] = [];
  const addMatches = (pattern: RegExp, kind: RuntimeImport["kind"], specifierGroup: number) => {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[specifierGroup];
      if (specifier) imports.push({ filePath, kind, specifier });
    }
  };

  addMatches(/(?:^|\n)\s*(?:import|export)\s+(?!type\b)[^;]*?\sfrom\s*["']([^"']+)["']/g, "static", 1);
  addMatches(/(?:^|\n)\s*import\s*["']([^"']+)["']/g, "static", 1);
  addMatches(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, "dynamic", 1);
  addMatches(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g, "require", 1);

  return imports;
};

const toSourceRelativePath = (filePath: string) => relative(nextjsSourceDirectory, filePath).replaceAll("\\", "/");
