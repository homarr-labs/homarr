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
const algorithmicExceptions = new Map([
  ["packages/custom-widgets/src/jsx/analyzer.ts", 400],
  ["packages/custom-widgets/src/jsx/interpreter.tsx", 400],
]);

for (const file of productionFiles) {
  const source = await readFile(file, "utf8");
  const name = relative(repositoryRoot, file);
  const lineCount = source.trimEnd().split("\n").length;
  const limit = algorithmicExceptions.get(name) ?? 300;
  if (lineCount > limit) failures.push(`${name} has ${lineCount} lines (limit ${limit})`);
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
if (!/from\s+["'].\/component-runtime\.generated\.json["']/u.test(componentRegistry)) {
  failures.push("The Custom JSX runtime registry must use the compact generated component index");
}
if (/from\s+["'].\/component-catalog["']/u.test(componentRegistry)) {
  failures.push("The Custom JSX runtime registry must not bundle the full authoring catalog");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Custom Widgets architecture checks passed for ${productionFiles.length} production modules.`);
}
