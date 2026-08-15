import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";
import { parse as parseYaml } from "yaml";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..");
const outPath = path.resolve(repoRoot, "static-data", "dependencies.json");

interface PackageJson {
  dependencies?: Record<string, string>;
}

const parseCatalogAsync = async (): Promise<Map<string, string>> => {
  try {
    const raw = await fsPromises.readFile(path.join(repoRoot, "pnpm-workspace.yaml"), "utf-8");
    const parsed = parseYaml(raw) as { catalog?: Record<string, string> };
    return new Map(Object.entries(parsed.catalog ?? {}));
  } catch {
    return new Map();
  }
};

const paths = await glob("**/package.json", {
  ignore: "**/node_modules/**",
  cwd: repoRoot,
  absolute: true,
});

const catalog = await parseCatalogAsync();
const merged: Record<string, string> = {};

for (const p of paths) {
  const pkg = JSON.parse(await fsPromises.readFile(p, "utf-8")) as PackageJson;
  if (!pkg.dependencies) continue;
  for (const [name, version] of Object.entries(pkg.dependencies)) {
    merged[name] = catalog.get(name) ?? version;
  }
}

const sorted = Object.fromEntries(
  Object.entries(merged)
    .filter(([, v]) => !v.includes("workspace:"))
    .sort(([a], [b]) => a.localeCompare(b)),
);

await fsPromises.writeFile(outPath, JSON.stringify(sorted, null, 2) + "\n");
console.log(`Wrote ${Object.keys(sorted).length} dependencies to ${outPath}`);
