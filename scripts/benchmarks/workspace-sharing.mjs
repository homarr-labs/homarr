import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const checkout = path.resolve(process.argv[2] ?? ".");
const probes = [];
for (const group of ["apps", "packages", "tooling"]) {
  for (const entry of fs.readdirSync(path.join(checkout, group), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const workspace = path.join(group, entry.name);
    const manifestPath = path.join(checkout, workspace, "package.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const resolver = createRequire(manifestPath);
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    for (const [dependency, constraint] of Object.entries(dependencies)) {
      if (String(constraint).startsWith("workspace:")) continue;
      const searchPaths = resolver.resolve.paths(dependency) ?? [];
      const resolvedManifest = searchPaths
        .map((directory) => path.join(directory, dependency, "package.json"))
        .find((file) => fs.existsSync(file));
      if (!resolvedManifest) {
        let runtimeResolution;
        if (process.versions.bun) {
          try {
            runtimeResolution = resolver.resolve(dependency);
          } catch {
            // Missing packages remain explicit errors below.
          }
        }
        if (process.versions.bun && runtimeResolution === dependency) {
          probes.push({ workspace, dependency, kind: "runtime-builtin", runtime: `Bun ${process.versions.bun}` });
          continue;
        }
        probes.push({ workspace, dependency, error: "Package manifest not found in module search paths" });
        continue;
      }
      const realPath = fs.realpathSync(resolvedManifest);
      const stat = fs.statSync(realPath);
      const installed = JSON.parse(fs.readFileSync(realPath, "utf8"));
      probes.push({
        workspace,
        dependency,
        version: installed.version,
        path: path.relative(checkout, realPath),
        device: stat.dev,
        inode: stat.ino,
      });
    }
  }
}
const groups = new Map();
for (const probe of probes) {
  if (probe.error || probe.kind === "runtime-builtin") continue;
  const key = `${probe.dependency}@${probe.version}`;
  if (!groups.has(key))
    groups.set(key, {
      dependency: probe.dependency,
      version: probe.version,
      workspaces: [],
      paths: new Set(),
      inodes: new Set(),
    });
  const group = groups.get(key);
  group.workspaces.push(probe.workspace);
  group.paths.add(probe.path);
  group.inodes.add(`${probe.device}:${probe.inode}`);
}
const shared = [...groups.values()]
  .filter((group) => group.workspaces.length > 1)
  .map((group) => ({
    ...group,
    paths: [...group.paths],
    inodes: [...group.inodes],
  }));
console.log(
  JSON.stringify(
    {
      checkout,
      method:
        "Resolve every declared external dependency through each workspace's ancestor module search paths; group by package name and installed version. Local workspace dependencies are excluded.",
      workspaceCount: new Set(probes.map((probe) => probe.workspace)).size,
      probes,
      shared,
      errors: probes.filter((probe) => probe.error),
      duplicatedSharedPackages: shared.filter((group) => group.paths.length > 1 || group.inodes.length > 1),
      runtimeBuiltins: probes.filter((probe) => probe.kind === "runtime-builtin"),
    },
    null,
    2,
  ),
);
if (probes.some((probe) => probe.error)) process.exitCode = 1;
