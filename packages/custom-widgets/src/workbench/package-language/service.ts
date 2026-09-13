import ts from "typescript-compiler-api";

import { languageCompletion, languageDefinition, languageInfo, renameLanguageSymbol } from "./service-operations";
import type { PackageLanguageLibraries, PackageLanguageRequest } from "./types";

/** Pure in-memory language service. Package code is parsed, never executed. */
export function createPackageLanguageService(libraries: PackageLanguageLibraries) {
  const project: Record<string, string> = {};
  let projectVersion = 0;
  const versions = new Map<string, number>();
  const snapshots = new Map<string, ts.IScriptSnapshot>();
  const directories = new Set<string>();
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    skipLibCheck: true,
    noUncheckedIndexedAccess: true,
    allowJs: true,
    checkJs: false,
    noEmit: true,
    allowImportingTsExtensions: true,
    resolveJsonModule: true,
    allowArbitraryExtensions: true,
    types: [],
  };
  const readFile = (file: string) => project[file] ?? libraries.files[file];
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [
      ...Object.keys(project).filter((file) => /\.[cm]?[jt]sx?$/u.test(file)),
      ...libraries.globalFiles,
    ],
    getScriptVersion: (file) => String(versions.get(file) ?? 0),
    getProjectVersion: () => String(projectVersion),
    getScriptSnapshot: (file) => {
      const source = readFile(file);
      if (source === undefined) return undefined;
      let snapshot = snapshots.get(file);
      if (!snapshot) {
        snapshot = ts.ScriptSnapshot.fromString(source);
        snapshots.set(file, snapshot);
      }
      return snapshot;
    },
    getCurrentDirectory: () => "/widget",
    getCompilationSettings: () => options,
    getDefaultLibFileName: () => libraries.defaultLib,
    fileExists: (file) => readFile(file) !== undefined,
    readFile,
    readDirectory: () => [],
    directoryExists: (directory) => directories.has(directory.replace(/\/$/u, "") || "/"),
    getDirectories: (directory) =>
      [...directories].filter(
        (candidate) => candidate.startsWith(`${directory}/`) && !candidate.slice(directory.length + 1).includes("/"),
      ),
    useCaseSensitiveFileNames: () => true,
    resolveModuleNames: (names, from) =>
      names.map((name) => {
        const root = libraries.roots[name];
        if (root) return { resolvedFileName: root, isExternalLibraryImport: true };
        return ts.resolveModuleName(name, from, options, host).resolvedModule;
      }),
  };
  const updateDirectories = () => {
    directories.clear();
    for (const file of [...Object.keys(libraries.files), ...Object.keys(project)]) {
      let directory = file;
      while (directory.includes("/")) {
        directory = directory.slice(0, directory.lastIndexOf("/"));
        directories.add(directory || "/");
      }
    }
  };
  updateDirectories();
  const service = ts.createLanguageService(host);
  const patch = (changes: Record<string, string | null>) => {
    let layoutChanged = false;
    for (const [path, source] of Object.entries(changes)) {
      const file = `/widget/${path}`;
      if (source === null) {
        delete project[file];
        layoutChanged = true;
      } else {
        if (!Object.hasOwn(project, file)) layoutChanged = true;
        project[file] = source;
      }
      versions.set(file, (versions.get(file) ?? 0) + 1);
      snapshots.delete(file);
    }
    projectVersion += 1;
    if (layoutChanged) updateDirectories();
  };
  return {
    patch,
    update(files: Record<string, string>) {
      const changes: Record<string, string | null> = { ...files };
      for (const file of Object.keys(project)) {
        const path = file.slice("/widget/".length);
        if (!Object.hasOwn(files, path)) changes[path] = null;
      }
      patch(changes);
    },
    execute(request: PackageLanguageRequest): unknown {
      const file = `/widget/${request.input.path}`;
      const source = project[file];
      if (source === undefined) throw new Error("This package file is no longer available");
      switch (request.method) {
        case "diagnostics":
          return [...service.getSyntacticDiagnostics(file), ...service.getSemanticDiagnostics(file)]
            .slice(0, 100)
            .map((diagnostic) => ({
              path: request.input.path,
              from: diagnostic.start ?? 0,
              to: (diagnostic.start ?? 0) + (diagnostic.length ?? 0),
              severity: diagnostic.category === ts.DiagnosticCategory.Error ? "error" : "warning",
              message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
              code: diagnostic.code,
            }));
        case "complete":
          return languageCompletion(service, file, request.input.position, request.input.prefix);
        case "detail": {
          const details = service.getCompletionEntryDetails(
            file,
            request.input.position,
            request.input.name,
            {},
            undefined,
            {},
            undefined,
          );
          if (!details) return null;
          return {
            from: request.input.position,
            to: request.input.position,
            signature: ts.displayPartsToString(details.displayParts),
            documentation: ts.displayPartsToString(details.documentation),
          };
        }
        case "hover":
          return languageInfo(service, file, request.input.position);
        case "definition":
          return languageDefinition(service, file, request.input.position, readFile);
        case "format": {
          const changes = service.getFormattingEditsForDocument(file, {
            ...ts.getDefaultFormatCodeSettings("\n"),
            indentSize: 2,
            tabSize: 2,
            convertTabsToSpaces: true,
            newLineCharacter: "\n",
            semicolons: ts.SemicolonPreference.Insert,
          });
          return applyLanguageChanges(source, changes);
        }
        case "rename":
          return renameLanguageSymbol(service, file, request.input.position, request.input.name, project);
      }
    },
    dispose: () => service.dispose(),
  };
}

export function applyLanguageChanges(source: string, changes: readonly ts.TextChange[]) {
  for (const change of changes.toSorted((left, right) => right.span.start - left.span.start)) {
    source = source.slice(0, change.span.start) + change.newText + source.slice(change.span.start + change.span.length);
  }
  return source;
}
