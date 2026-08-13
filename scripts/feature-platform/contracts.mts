import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

export interface ContractProblem {
  message: string;
  repair: string;
}

const read = (root: string, path: string) => readFileSync(join(root, path), "utf8");

const containerBody = (source: string, variable: string, opener: "{" | "[") => {
  const declaration = source.indexOf(`const ${variable}`);
  if (declaration < 0) throw new Error(`Could not find const ${variable}`);
  const start = source.indexOf(opener, declaration);
  if (start < 0) throw new Error(`Could not find ${opener} for ${variable}`);
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }
    if (character === opener) depth += 1;
    if (character === closer) depth -= 1;
    if (depth === 0) return source.slice(start + 1, index);
  }
  throw new Error(`Could not find closing ${closer} for ${variable}`);
};

const objectEntries = (source: string, variable: string) => {
  const body = containerBody(source, variable, "{");
  const matches = [...body.matchAll(/^  (?:"([^"]+)"|([\w-]+))(?::\s|,\s*$)/gm)];
  return new Map(
    matches.map((match, index) => [
      match[1] ?? match[2],
      body.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? body.length).trim(),
    ]),
  );
};

const arrayStrings = (source: string, variable: string) =>
  [...containerBody(source, variable, "[").matchAll(/^  "([^"]+)",?$/gm)].map((match) => match[1]);

export const readObjectRegistry = (root: string, path: string, variable: string) =>
  objectEntries(read(root, path), variable);

export const readArrayRegistry = (root: string, path: string, variable: string) =>
  arrayStrings(read(root, path), variable);

const compareKeys = (
  problems: ContractProblem[],
  expectedName: string,
  expected: Iterable<string>,
  actualName: string,
  actual: Iterable<string>,
) => {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = [...expectedSet].filter((key) => !actualSet.has(key));
  const extra = [...actualSet].filter((key) => !expectedSet.has(key));
  if (missing.length === 0 && extra.length === 0) return;
  problems.push({
    message: `${actualName} does not match ${expectedName} (missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"})`,
    repair: `Add or remove the named entries in ${actualName} so it has exactly the same keys as ${expectedName}.`,
  });
};

const walkFiles = (directory: string): string[] => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && [".git", ".turbo", "node_modules"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
};

const directStringOrNull = (value: string | undefined) => {
  if (!value) return undefined;
  if (/^null,?$/.test(value)) return null;
  return value.match(/^"([^"]+)"/)?.[1];
};

const documentationPath = (definition: string | undefined) => {
  if (!definition) return undefined;
  const value = definition.match(/^    documentationUrl: (.+),$/m)?.[1];
  if (value === "null") return null;
  return value?.match(/^createDocumentationLink\("([^"]+)"\)$/)?.[1];
};

const collectWidgetDefinitions = (root: string) => {
  const definitions = new Map<string, { path: string; hasSupportedIntegrations: boolean }>();
  for (const path of walkFiles(join(root, "packages/widgets/src"))) {
    if (!/\/index\.tsx?$/.test(path)) continue;
    const source = readFileSync(path, "utf8");
    const kindConstants = new Map(
      [...source.matchAll(/(?:export )?const (\w+) = "([^"]+)";/g)].map((match) => [match[1], match[2]]),
    );
    for (const match of source.matchAll(/createWidgetDefinition\(("([^"]+)"|(\w+)),\s*\{/g)) {
      const body = source.slice(match.index, source.indexOf("}).withDynamicImport", match.index));
      const kind = match[2] ?? kindConstants.get(match[3]);
      if (!kind) continue;
      definitions.set(kind, {
        path: relative(root, path),
        hasSupportedIntegrations: /\n  supportedIntegrations:/.test(body),
      });
    }
  }
  return definitions;
};

const exportTargets = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(exportTargets);
};

const escapeRegex = (value: string) => value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

const targetExists = (packageDirectory: string, target: string) => {
  if (!target.startsWith("./")) return true;
  const absoluteTarget = resolve(packageDirectory, target);
  if (!target.includes("*")) return existsSync(absoluteTarget);
  const wildcardIndex = absoluteTarget.indexOf("*");
  const searchRoot = dirname(absoluteTarget.slice(0, wildcardIndex));
  if (!existsSync(searchRoot)) return false;
  const pattern = new RegExp(`^${escapeRegex(absoluteTarget).replaceAll("*", "[^/]+")}$`);
  return walkFiles(searchRoot).some((path) => pattern.test(path));
};

export const checkPackageExports = (root: string): ContractProblem[] => {
  const packageFiles = walkFiles(root).filter(
    (path) => path.endsWith("package.json") && !path.includes("/node_modules/") && !path.includes("/.turbo/"),
  );
  const problems: ContractProblem[] = [];
  for (const packageFile of packageFiles) {
    const packageJson = JSON.parse(readFileSync(packageFile, "utf8")) as { exports?: unknown };
    for (const target of exportTargets(packageJson.exports)) {
      if (targetExists(dirname(packageFile), target)) continue;
      problems.push({
        message: `${relative(root, packageFile)} exports ${target}, but that target does not resolve`,
        repair:
          "Remove the stale export or add the intended source file; do not leave a public package path pointing at nothing.",
      });
    }
  }
  return problems;
};

export const checkFeatureContracts = (root: string): ContractProblem[] => {
  const problems: ContractProblem[] = [];
  const integrationDefinitions = objectEntries(
    read(root, "packages/definitions/src/integration.ts"),
    "integrationDefs",
  );
  const creatorKeys = objectEntries(
    read(root, "packages/integrations/src/base/creator.ts"),
    "integrationCreators",
  ).keys();
  const integrationSlugs = objectEntries(
    read(root, "packages/definitions/src/docs/integration-doc-slugs.ts"),
    "integrationDocSlugs",
  );
  compareKeys(problems, "integrationDefs", integrationDefinitions.keys(), "integrationCreators", creatorKeys);
  compareKeys(
    problems,
    "integrationDefs",
    integrationDefinitions.keys(),
    "integrationDocSlugs",
    integrationSlugs.keys(),
  );

  for (const [kind, definition] of integrationDefinitions) {
    const slug = directStringOrNull(integrationSlugs.get(kind));
    const link = documentationPath(definition);
    const expected = slug === null ? null : `/docs/integrations/${slug}`;
    if (slug === undefined || link !== expected) {
      problems.push({
        message: `Integration ${kind} has docs slug ${String(slug)} but documentationUrl ${String(link)}`,
        repair:
          slug === null
            ? "Set documentationUrl to null."
            : `Set documentationUrl to createDocumentationLink("${expected}").`,
      });
    }
    if (slug !== null && slug !== undefined) {
      for (const filename of ["index.ts", "index.mdx"]) {
        const path = `apps/docs/docs/integrations/${slug}/${filename}`;
        if (!existsSync(join(root, path)))
          problems.push({
            message: `Integration ${kind} points to missing ${path}`,
            repair: `Add ${path} or remove the docs slug.`,
          });
      }
    }
  }

  const widgetKinds = arrayStrings(read(root, "packages/definitions/src/widget.ts"), "widgetKinds");
  const manifest = read(root, "packages/widgets/src/manifest.ts");
  const definitions = collectWidgetDefinitions(root);
  const widgetSlugs = objectEntries(read(root, "packages/definitions/src/docs/widget-doc-slugs.ts"), "widgetDocSlugs");
  const support = objectEntries(
    read(root, "packages/definitions/src/widget-integration-map.ts"),
    "nativeFeatureCapabilities",
  );
  compareKeys(problems, "widgetKinds", widgetKinds, "moduleLoaders", objectEntries(manifest, "moduleLoaders").keys());
  compareKeys(
    problems,
    "widgetKinds",
    widgetKinds,
    "componentLoaders",
    objectEntries(manifest, "componentLoaders").keys(),
  );
  compareKeys(
    problems,
    "widgetKinds",
    widgetKinds,
    "widgetCatalogIcons",
    objectEntries(read(root, "packages/widgets/src/catalog.ts"), "widgetCatalogIcons").keys(),
  );
  compareKeys(
    problems,
    "widgetKinds",
    widgetKinds,
    "widgetImports",
    objectEntries(read(root, "packages/widgets/src/index.tsx"), "widgetImports").keys(),
  );
  compareKeys(problems, "widgetKinds", widgetKinds, "widget definitions", definitions.keys());
  compareKeys(problems, "widgetKinds", widgetKinds, "widgetDocSlugs", widgetSlugs.keys());

  const supportSource = read(root, "packages/definitions/src/widget-integration-map.ts");
  if (!supportSource.includes("widgetIntegrationSupport = createWidgetIntegrationSupport()")) {
    problems.push({
      message: "widgetIntegrationSupport is not derived from nativeFeatureCapabilities",
      repair: "Generate the forward widget support map from the canonical capability descriptor.",
    });
  }
  if (!supportSource.includes("integrationWidgetSupport = createIntegrationWidgetSupport()")) {
    problems.push({
      message: "integrationWidgetSupport is not derived from nativeFeatureCapabilities",
      repair: "Generate the reverse integration support map from the canonical capability descriptor.",
    });
  }

  const translations = JSON.parse(read(root, "packages/translation/src/lang/en.json")) as {
    widget?: Record<string, { name?: string; description?: string }>;
  };
  for (const kind of widgetKinds) {
    const translation = translations.widget?.[kind];
    if (!translation?.name?.trim() || !translation.description?.trim()) {
      problems.push({
        message: `Widget ${kind} is missing a non-empty English name or description`,
        repair: `Add widget.${kind}.name and widget.${kind}.description to packages/translation/src/lang/en.json.`,
      });
    }
    const slug = directStringOrNull(widgetSlugs.get(kind));
    if (slug !== null && slug !== undefined) {
      const metadataPath = `apps/docs/docs/widgets/${slug}/index.ts`;
      if (!existsSync(join(root, metadataPath)) && !existsSync(join(root, `${metadataPath}x`)))
        problems.push({
          message: `Widget ${kind} points to missing ${metadataPath}(x)`,
          repair: `Add ${metadataPath} or remove the docs slug.`,
        });
      const pagePath = `apps/docs/docs/widgets/${slug}/index.mdx`;
      if (!existsSync(join(root, pagePath)))
        problems.push({
          message: `Widget ${kind} points to missing ${pagePath}`,
          repair: `Add ${pagePath} or remove the docs slug.`,
        });
    }
    const definition = definitions.get(kind);
    if (definition?.hasSupportedIntegrations !== support.has(kind)) {
      problems.push({
        message: `Widget ${kind} integration support differs between ${definition?.path ?? "its definition"} and nativeFeatureCapabilities`,
        repair:
          "Declare supportedIntegrations in both the widget definition and nativeFeatureCapabilities, or in neither.",
      });
    }
  }
  for (const kind of support.keys()) {
    if (!widgetKinds.includes(kind))
      problems.push({
        message: `nativeFeatureCapabilities contains unknown widget ${kind}`,
        repair: "Remove it or add the widget kind first.",
      });
  }

  problems.push(...checkPackageExports(root));
  return problems;
};
