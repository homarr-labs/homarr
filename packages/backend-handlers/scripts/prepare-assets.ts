import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  workspaces: { catalog: Record<string, string> };
};
const manifests = [path.join(root, "package.json")];
for (const directory of ["apps", "packages", "tooling"]) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) manifests.push(path.join(root, directory, entry.name, "package.json"));
  }
}
const dependencies: Record<string, string> = {};
for (const manifest of manifests) {
  let content: string;
  try {
    content = await readFile(manifest, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
    throw error;
  }
  const value = JSON.parse(content) as { dependencies?: Record<string, string> };
  for (const [name, version] of Object.entries(value.dependencies ?? {})) {
    dependencies[name] = packageJson.workspaces.catalog[name] ?? version;
  }
}
const sorted = Object.fromEntries(
  Object.entries(dependencies).toSorted(([left], [right]) => left.localeCompare(right)),
);
await writeFile(new URL("../src/generated/dependencies.json", import.meta.url), `${JSON.stringify(sorted, null, 2)}\n`);
