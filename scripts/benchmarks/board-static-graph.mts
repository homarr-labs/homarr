import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "@babel/parser";

export const getRuntimeModuleSpecifiers = (sourceText: string, fileName: string) => {
  try {
    const ast = parse(sourceText, { sourceFilename: fileName, sourceType: "module", plugins: ["typescript", "jsx"] });
    return ast.program.body.flatMap((statement) => {
      if (statement.type === "ImportDeclaration") {
        if (statement.importKind === "type" || statement.importKind === "typeof") return [];
        const hasRuntimeBinding =
          statement.specifiers.length === 0 ||
          statement.specifiers.some(
            (specifier) => specifier.type !== "ImportSpecifier" || specifier.importKind !== "type",
          );
        return hasRuntimeBinding ? [statement.source.value] : [];
      }
      if (statement.type === "ExportAllDeclaration") {
        return statement.exportKind === "type" ? [] : [statement.source.value];
      }
      if (statement.type === "ExportNamedDeclaration" && statement.source) {
        if (statement.exportKind === "type") return [];
        const hasRuntimeBinding =
          statement.specifiers.length === 0 ||
          statement.specifiers.some((specifier) => specifier.exportKind !== "type");
        return hasRuntimeBinding ? [statement.source.value] : [];
      }
      return [];
    });
  } catch (error) {
    throw new Error(`Unable to parse static imports in ${fileName}`, { cause: error });
  }
};

const canonicalize = (fileName: string) => {
  try {
    return fs.realpathSync.native(fileName);
  } catch {
    return path.resolve(fileName);
  }
};

const resolveFile = (candidate: string) => {
  const candidates = path.extname(candidate)
    ? [candidate]
    : [
        candidate,
        `${candidate}.ts`,
        `${candidate}.tsx`,
        `${candidate}.mts`,
        `${candidate}.js`,
        `${candidate}.jsx`,
        path.join(candidate, "index.ts"),
        path.join(candidate, "index.tsx"),
        path.join(candidate, "index.mts"),
        path.join(candidate, "index.js"),
      ];
  return candidates.find((fileName) => fs.existsSync(fileName) && fs.statSync(fileName).isFile()) ?? null;
};

const firstExportTarget = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return null;
  for (const nested of Object.values(value)) {
    const target = firstExportTarget(nested);
    if (target) return target;
  }
  return null;
};

const getPackageName = (specifier: string) => specifier.split("/").slice(0, 2).join("/");

const resolvePackageExport = (exports: unknown, exportKey: string) => {
  if (exportKey === "." && typeof exports === "string") return exports;
  if (!exports || typeof exports !== "object") return null;
  const exportMap = exports as Record<string, unknown>;
  const exact = firstExportTarget(exportMap[exportKey]);
  if (exact) return exact;

  for (const [pattern, value] of Object.entries(exportMap)) {
    const wildcard = pattern.indexOf("*");
    if (wildcard < 0) continue;
    const prefix = pattern.slice(0, wildcard);
    const suffix = pattern.slice(wildcard + 1);
    if (!exportKey.startsWith(prefix) || !exportKey.endsWith(suffix)) continue;
    const match = exportKey.slice(prefix.length, exportKey.length - suffix.length);
    const target = firstExportTarget(value);
    if (target) return target.replaceAll("*", match);
  }
  return null;
};

const getWorkspacePackages = (root: string) => {
  const packages = new Map<string, { directory: string; exports: unknown }>();
  for (const parent of ["apps", "packages", "tooling"]) {
    const parentDirectory = path.join(root, parent);
    if (!fs.existsSync(parentDirectory)) continue;
    for (const directoryEntry of fs.readdirSync(parentDirectory, { withFileTypes: true })) {
      if (!directoryEntry.isDirectory()) continue;
      const directory = path.join(parentDirectory, directoryEntry.name);
      const manifestPath = path.join(directory, "package.json");
      if (!fs.existsSync(manifestPath)) continue;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { name?: string; exports?: unknown };
      if (manifest.name) packages.set(manifest.name, { directory, exports: manifest.exports });
    }
  }
  return packages;
};

export const collectBoardStaticGraph = (repositoryRoot: string) => {
  const root = canonicalize(repositoryRoot);
  const entries = [
    "apps/nextjs/src/app/[locale]/layout.tsx",
    "apps/nextjs/src/app/[locale]/(home)/(board)/layout.tsx",
    "apps/nextjs/src/app/[locale]/(home)/(board)/page.tsx",
    "apps/nextjs/src/app/[locale]/boards/(content)/[name]/(board)/layout.tsx",
    "apps/nextjs/src/app/[locale]/boards/(content)/[name]/(board)/page.tsx",
    "apps/nextjs/src/app/[locale]/boards/(content)/_client.tsx",
  ].map((entry) => path.join(root, entry));
  const workspacePackages = getWorkspacePackages(root);
  const unresolvedWorkspaceImports: Array<{ importer: string; specifier: string }> = [];

  const resolveSpecifier = (specifier: string, importer: string) => {
    if (specifier.startsWith(".")) return resolveFile(path.resolve(path.dirname(importer), specifier));
    if (specifier.startsWith("~/")) return resolveFile(path.join(root, "apps/nextjs/src", specifier.slice(2)));
    if (specifier.startsWith("@static-data/")) {
      return resolveFile(path.join(root, "static-data", specifier.slice("@static-data/".length)));
    }
    if (!specifier.startsWith("@homarr/") || specifier === "@homarr/node-unifi") return null;

    const [, , ...subpathParts] = specifier.split("/");
    const workspacePackage = workspacePackages.get(getPackageName(specifier));
    if (!workspacePackage) return null;
    const exportKey = subpathParts.length === 0 ? "." : `./${subpathParts.join("/")}`;
    const target = resolvePackageExport(workspacePackage.exports, exportKey);
    return target ? resolveFile(path.resolve(workspacePackage.directory, target)) : null;
  };

  const queue = [...entries];
  const visited = new Set<string>();
  const parents = new Map<string, { importer: string; specifier: string }>();
  const bareWidgetImports: Array<{ importer: string; specifier: string }> = [];
  const forbiddenModules = new Set([
    path.join(root, "packages/spotlight/src/component.ts"),
    path.join(root, "packages/spotlight/src/components/spotlight.tsx"),
    path.join(root, "packages/spotlight/src/spotlight-store.ts"),
    path.join(root, "packages/widgets/src/modals/widget-edit-modal.tsx"),
    path.join(root, "apps/nextjs/src/components/board/items/item-move-modal.tsx"),
    path.join(root, "apps/nextjs/src/components/onboarding/board-tour.tsx"),
    path.join(root, "apps/nextjs/src/components/onboarding/tour-shell.tsx"),
  ]);

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) continue;
    const current = canonicalize(next);
    if (visited.has(current)) continue;
    visited.add(current);
    if (!/\.[cm]?[jt]sx?$/.test(current)) continue;

    const sourceText = fs.readFileSync(current, "utf8");
    for (const specifier of getRuntimeModuleSpecifiers(sourceText, current)) {
      if (specifier === "@homarr/widgets") bareWidgetImports.push({ importer: current, specifier });
      const resolved = resolveSpecifier(specifier, current);
      if (!resolved) {
        if (workspacePackages.has(getPackageName(specifier))) {
          unresolvedWorkspaceImports.push({ importer: current, specifier });
        }
        continue;
      }
      const target = canonicalize(resolved);
      if (!target.startsWith(`${root}${path.sep}`) || target.includes(`${path.sep}node_modules${path.sep}`)) continue;
      if (!parents.has(target)) parents.set(target, { importer: current, specifier });
      queue.push(target);
    }
  }

  const reachedForbiddenModules = [...forbiddenModules].filter((fileName) => visited.has(fileName));
  const formatChain = (target: string) => {
    const chain = [path.relative(root, target)];
    let current = target;
    while (parents.has(current)) {
      const parent = parents.get(current);
      if (!parent) break;
      chain.unshift(`${path.relative(root, parent.importer)} --${parent.specifier}-->`);
      current = parent.importer;
    }
    return chain.join(" ");
  };

  return {
    entries: entries.map((entry) => path.relative(root, entry)),
    visitedModuleCount: visited.size,
    bareWidgetImports: bareWidgetImports.map(({ importer, specifier }) => ({
      importer: path.relative(root, importer),
      specifier,
    })),
    reachedForbiddenModules: reachedForbiddenModules.map(formatChain),
    unresolvedWorkspaceImports: unresolvedWorkspaceImports.map(({ importer, specifier }) => ({
      importer: path.relative(root, importer),
      specifier,
    })),
  };
};

const run = () => {
  const repositoryRoot = path.resolve(process.env.BOARD_GRAPH_ROOT ?? ".");
  const result = collectBoardStaticGraph(repositoryRoot);
  if (
    result.bareWidgetImports.length > 0 ||
    result.reachedForbiddenModules.length > 0 ||
    result.unresolvedWorkspaceImports.length > 0
  ) {
    throw new Error(`Board static graph reaches a forbidden eager module:\n${JSON.stringify(result, null, 2)}`);
  }
  console.log(
    JSON.stringify(
      {
        ...result,
        eagerWidgetRegistryReachable: false,
        eagerSpotlightImplementationReachable: false,
        eagerWidgetEditorReachable: false,
        eagerItemMoveEditorReachable: false,
        eagerBoardTourReachable: false,
      },
      null,
      2,
    ),
  );
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) run();
