import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { isBuiltin } from "node:module";
import ts from "typescript-compiler-api";

import { HOST_WIDGET_MODULES } from "../src/package/schema";
import type { PackageLanguageLibraries } from "../src/workbench/package-language/types";

/** Emit the deployed SDK API and collect only installed declaration dependencies. No registry requests. */
export function buildEditorLanguageLibraries(repositoryRoot: string): PackageLanguageLibraries {
  const sdkRoot = join(repositoryRoot, "packages/widget-sdk/src");
  const sdkManifest = JSON.parse(readFileSync(join(sdkRoot, "../package.json"), "utf8")) as {
    version: string;
    exports: Record<string, string>;
  };
  const configPath = join(sdkRoot, "../tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  const roots = Object.values(sdkManifest.exports)
    .filter((file) => /\.tsx?$/u.test(file) && !file.includes("examples"))
    .map((file) => resolve(sdkRoot, "..", file));
  const program = ts.createProgram(roots, {
    ...parsed.options,
    noEmit: false,
    declaration: true,
    emitDeclarationOnly: true,
    declarationMap: false,
    incremental: false,
    isolatedModules: false,
  });
  const emitted = new Map<string, string>();
  for (const file of program.getSourceFiles()) {
    if (!file.fileName.startsWith(`${sdkRoot}/`)) continue;
    if (file.fileName.includes(".d.")) {
      emitted.set(file.fileName, file.text);
      continue;
    }
    const result = program.emit(file, (path, text) => emitted.set(path, text), undefined, true);
    if (
      result.emitSkipped ||
      result.diagnostics.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    )
      throw new Error(`Unable to emit SDK editor declarations: ${file.fileName}`);
  }

  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    allowImportingTsExtensions: true,
  };
  const importer = join(repositoryRoot, "packages/custom-widgets/__editor.ts");
  const files: Record<string, string> = {};
  const moduleRoots: Record<string, string> = {};
  const queue: string[] = [];
  const seen = new Set<string>();
  const virtual = (file: string) => {
    if (file.startsWith(`${sdkRoot}/`))
      return `/node_modules/@homarr/widget-sdk/${declarationPath(file.slice(sdkRoot.length + 1))}`;
    const marker = file.lastIndexOf("/node_modules/");
    if (marker < 0) throw new Error(`Editor types cannot include a private workspace file: ${file}`);
    return `/node_modules/${file.slice(marker + "/node_modules/".length)}`;
  };
  const add = (file: string) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    queue.push(file);
  };
  const sdkModules = Object.entries(sdkManifest.exports)
    .filter(([name, file]) => !name.includes("examples") && /\.tsx?$/u.test(file))
    .map(([name]) => name.replace(/^\./u, "@homarr/widget-sdk"));
  for (const name of new Set([...HOST_WIDGET_MODULES, ...sdkModules, "@tabler/icons-react"])) {
    const module = ts.resolveModuleName(name, importer, options, ts.sys).resolvedModule;
    if (!module) throw new Error(`Cannot resolve installed editor types: ${name}`);
    moduleRoots[name] = virtual(module.resolvedFileName);
    add(module.resolvedFileName);
  }
  const defaultLib = ts.getDefaultLibFilePath(options);
  add(defaultLib);
  const node = ts.resolveTypeReferenceDirective("node", importer, options, ts.sys).resolvedTypeReferenceDirective;
  if (!node) throw new Error("Cannot resolve installed Node editor declarations");
  add(node.resolvedFileName);
  const printer = ts.createPrinter({ removeComments: true });
  while (queue.length > 0) {
    const file = queue.shift();
    if (!file) break;
    let source = readFileSync(file, "utf8");
    if (file.startsWith(`${sdkRoot}/`)) {
      const declaration = emitted.get(declarationPath(file));
      if (declaration === undefined) throw new Error(`Missing emitted SDK declaration: ${file}`);
      source = declaration;
    }
    const references = ts.preProcessFile(source, true, true);
    // Keep SDK JSDoc; trim large repeated third-party comments without changing their signatures.
    if (!file.startsWith(`${sdkRoot}/`))
      source = printer.printFile(ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true));
    files[virtual(file)] = source;
    collectManifests(file, sdkRoot, files, virtual);
    for (const reference of references.importedFiles) {
      if (isBuiltin(reference.fileName)) continue;
      const resolved = ts.resolveModuleName(reference.fileName, file, options, ts.sys).resolvedModule;
      if (resolved && /\.[cm]?tsx?$/u.test(resolved.resolvedFileName)) add(resolved.resolvedFileName);
    }
    for (const reference of references.referencedFiles) add(resolve(dirname(file), reference.fileName));
    for (const reference of references.typeReferenceDirectives) {
      const resolved = ts.resolveTypeReferenceDirective(
        reference.fileName,
        file,
        options,
        ts.sys,
      ).resolvedTypeReferenceDirective;
      if (resolved) add(resolved.resolvedFileName);
    }
    for (const reference of references.libReferenceDirectives)
      add(join(dirname(defaultLib), `lib.${reference.fileName.toLowerCase()}.d.ts`));
  }
  files["/node_modules/@homarr/widget-sdk/package.json"] = JSON.stringify({
    name: "@homarr/widget-sdk",
    version: sdkManifest.version,
    exports: Object.fromEntries(
      Object.entries(moduleRoots)
        .filter(([name]) => name.startsWith("@homarr/widget-sdk"))
        .map(([name, file]) => [
          name.replace("@homarr/widget-sdk", "."),
          `./${file.slice("/node_modules/@homarr/widget-sdk/".length)}`,
        ]),
    ),
  });
  files["/widget-assets.d.ts"] = [
    'declare module "*.css" { const classes: Record<string, string>; export default classes; }',
    ...["svg", "png", "jpg", "jpeg", "webp", "gif", "woff", "woff2", "txt", "md"].map(
      (extension) => `declare module "*.${extension}" { const value: string; export default value; }`,
    ),
  ].join("\n");
  return {
    files: Object.fromEntries(Object.entries(files).toSorted(([left], [right]) => left.localeCompare(right, "en"))),
    roots: moduleRoots,
    globalFiles: [virtual(node.resolvedFileName), "/widget-assets.d.ts"],
    defaultLib: virtual(defaultLib),
    sdkVersion: sdkManifest.version,
    typescriptVersion: ts.version,
  };
}

function declarationPath(file: string) {
  if (file.includes(".d.")) return file;
  return file.replace(/\.tsx?$/u, ".d.ts");
}

function collectManifests(
  file: string,
  sdkRoot: string,
  files: Record<string, string>,
  virtual: (file: string) => string,
) {
  if (file.startsWith(sdkRoot)) return;
  let directory = dirname(file);
  while (directory.includes("/node_modules/")) {
    const path = join(directory, "package.json");
    if (existsSync(path)) {
      const manifest = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      files[virtual(path)] = JSON.stringify(
        Object.fromEntries(
          ["name", "version", "types", "typings", "main", "exports", "typesVersions", "type"]
            .filter((key) => manifest[key] !== undefined)
            .map((key) => [key, manifest[key]]),
        ),
      );
    }
    directory = dirname(directory);
  }
}
