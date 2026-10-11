import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(packageRoot, "../..");
const sourceRoots = [
  join(packageRoot, "src"),
  join(repositoryRoot, "packages/api/src/router/custom-widget"),
  join(repositoryRoot, "packages/widgets/src/custom-api"),
  join(repositoryRoot, "apps/nextjs/src/app/[locale]/manage/custom-widgets"),
];
const productionFiles = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "test") await collect(path);
    } else if ([".ts", ".tsx"].includes(extname(entry.name)) && !/\.spec\.tsx?$/u.test(entry.name)) {
      productionFiles.push(path);
    }
  }
}

for (const sourceRoot of sourceRoots) await collect(sourceRoot);
const failures = [];
const graph = new Map();
for (const file of productionFiles) {
  const source = await readFile(file, "utf8");
  const name = relative(repositoryRoot, file);
  if (file.startsWith(join(packageRoot, "src")) && /from\s+["']@homarr\/(?:api|widgets)(?:\/|["'])/u.test(source)) {
    failures.push(`${name} imports a forbidden adapter package`);
  }
  if (extname(file) === ".tsx" && /(?:runtime|workbench|custom-widgets|custom-api)/u.test(name)) {
    for (const line of source.split("\n")) {
      const match = line.match(/>\s*([A-Za-z][A-Za-z0-9 .,!?'-]*)\s*</u);
      if (match) failures.push(`${name} contains untranslated JSX text: ${JSON.stringify(match[1]?.trim())}`);
    }
    if (/\b(?:aria-label|description|label|placeholder|title)=["'][A-Za-z]/u.test(source)) {
      failures.push(`${name} contains an untranslated user-facing attribute`);
    }
  }
  const dependencies = [];
  for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/gu)) {
    const candidate = resolve(file, "..", match[1]);
    const resolved = productionFiles.find(
      (item) =>
        item === candidate ||
        item === `${candidate}.ts` ||
        item === `${candidate}.tsx` ||
        item === join(candidate, "index.ts"),
    );
    if (resolved) dependencies.push(resolved);
  }
  graph.set(file, dependencies);
}

const visiting = new Set();
const visited = new Set();
function visit(file, path = []) {
  if (visiting.has(file)) {
    failures.push(`circular dependency: ${[...path, file].map((item) => relative(repositoryRoot, item)).join(" -> ")}`);
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const dependency of graph.get(file) ?? []) visit(dependency, [...path, file]);
  visiting.delete(file);
  visited.add(file);
}
for (const file of productionFiles) visit(file);

const widgetAdapter = await readFile(join(repositoryRoot, "packages/widgets/src/custom-api/component.tsx"), "utf8");
if (!/dynamic\(\(\)\s*=>\s*import\(["']\.\/custom-jsx-display["']\)/u.test(widgetAdapter)) {
  failures.push("Custom JSX board rendering must remain dynamically loaded");
}
const editorAdapter = await readFile(
  join(repositoryRoot, "packages/custom-widgets/src/workbench/code-editor.tsx"),
  "utf8",
);
if (!/lazy\(\(\)\s*=>\s*import\(["'].\/direct-code-mirror["']\)\)/u.test(editorAdapter)) {
  failures.push("CodeMirror must remain dynamically loaded after the client mounts");
}
const componentRegistry = await readFile(
  join(repositoryRoot, "packages/custom-widgets/src/core/component-registry.ts"),
  "utf8",
);
if (!/from\s+["']\.\/component-catalog\.runtime\.generated\.json["']/u.test(componentRegistry)) {
  failures.push("The Custom JSX runtime registry must use the generated runtime projection");
}
if (/from\s+["']\.\/component-catalog["']/u.test(componentRegistry)) {
  failures.push("The Custom JSX runtime registry must not import the full authoring catalog");
}
const metadataGenerator = await readFile(
  join(repositoryRoot, "packages/custom-widgets/scripts/generate-component-metadata.ts"),
  "utf8",
);
if (
  !/const runtimeCatalog = \{[\s\S]*?catalog\.globalProps[\s\S]*?catalog\.components/u.test(metadataGenerator) ||
  !/component-catalog\.runtime\.generated\.json/u.test(metadataGenerator) ||
  !/props\.map\(\(\{ name: propName, required \}\)/u.test(metadataGenerator)
) {
  failures.push("The runtime projection must preserve required prop metadata from the canonical authoring catalog");
}
const jsxAnalyzer = await readFile(join(packageRoot, "src/jsx/analyzer-jsx.ts"), "utf8");
if (
  !/customJsxRequiredPropsByName/u.test(jsxAnalyzer) ||
  /from\s+["']\.\.\/core\/component-catalog["']/u.test(jsxAnalyzer)
) {
  failures.push("The JSX analyzer must use required props from the runtime projection");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Custom Widgets architecture checks passed for ${productionFiles.length} production modules.`);
}
