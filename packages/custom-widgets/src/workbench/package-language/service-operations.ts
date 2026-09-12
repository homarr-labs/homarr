import ts from "typescript-compiler-api";

import type { PackageLanguageCompletion, PackageLanguageInfo, PackageLanguageLocation } from "./types";

export function languageCompletion(
  service: ts.LanguageService,
  file: string,
  position: number,
  prefix: string,
): PackageLanguageCompletion[] {
  const result = service.getCompletionsAtPosition(file, position, {
    includeCompletionsForModuleExports: false,
    includeCompletionsWithInsertText: true,
  });
  return (result?.entries ?? [])
    .filter((entry) => !prefix || entry.name.toLowerCase().includes(prefix.toLowerCase()))
    .slice(0, 500)
    .map((entry) => ({
      name: entry.name,
      kind: entry.kind,
      sortText: entry.sortText,
      insertText: entry.insertText,
      from: entry.replacementSpan?.start,
      to: entry.replacementSpan && entry.replacementSpan.start + entry.replacementSpan.length,
    }));
}

export function languageInfo(service: ts.LanguageService, file: string, position: number): PackageLanguageInfo | null {
  const info = service.getQuickInfoAtPosition(file, position);
  if (!info) return null;
  return {
    from: info.textSpan.start,
    to: info.textSpan.start + info.textSpan.length,
    signature: ts.displayPartsToString(info.displayParts),
    documentation: ts.displayPartsToString(info.documentation),
  };
}

export function languageDefinition(
  service: ts.LanguageService,
  file: string,
  position: number,
  readFile: (file: string) => string | undefined,
): PackageLanguageLocation | null {
  const definitions = service.getDefinitionAtPosition(file, position);
  const definition = definitions?.find((item) => item.fileName.startsWith("/widget/")) ?? definitions?.[0];
  if (!definition) return null;
  const { textSpan, fileName } = definition;
  if (fileName.startsWith("/widget/"))
    return { path: fileName.slice("/widget/".length), from: textSpan.start, to: textSpan.start + textSpan.length };
  const source = readFile(fileName);
  if (!source) return null;
  // Some installed declaration files contain thousands of icons. Show a bounded excerpt.
  let from = Math.max(0, textSpan.start - 2000);
  if (from > 0) from = source.indexOf("\n", from) + 1;
  const end = source.indexOf("\n", Math.min(source.length - 1, textSpan.start + textSpan.length + 2000));
  let to = source.length;
  if (end >= 0) to = end;
  return {
    path: fileName,
    from: textSpan.start - from,
    to: textSpan.start + textSpan.length - from,
    declaration: { source: source.slice(from, to), line: source.slice(0, from).split("\n").length },
  };
}

export function renameLanguageSymbol(
  service: ts.LanguageService,
  file: string,
  position: number,
  name: string,
  project: Record<string, string>,
) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, name);
  if (scanner.scan() !== ts.SyntaxKind.Identifier || scanner.scan() !== ts.SyntaxKind.EndOfFileToken)
    throw new Error("Enter a JavaScript identifier for the new name");
  const info = service.getRenameInfo(file, position, { allowRenameOfImportPath: false });
  if (!info.canRename) throw new Error(info.localizedErrorMessage);
  const locations =
    service.findRenameLocations(file, position, false, false, { providePrefixAndSuffixTextForRename: true }) ?? [];
  if (locations.some((location) => !Object.hasOwn(project, location.fileName)))
    throw new Error("Installed SDK and dependency declarations are read-only");
  const changed: Record<string, string> = {};
  for (const path of new Set(locations.map((location) => location.fileName))) {
    let source = project[path] ?? "";
    for (const location of locations
      .filter((item) => item.fileName === path)
      .toSorted((a, b) => b.textSpan.start - a.textSpan.start)) {
      const replacement = `${location.prefixText ?? ""}${name}${location.suffixText ?? ""}`;
      source =
        source.slice(0, location.textSpan.start) +
        replacement +
        source.slice(location.textSpan.start + location.textSpan.length);
    }
    changed[path.slice("/widget/".length)] = source;
  }
  return changed;
}
