import { constants, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

export const compiled = resolve(".next");
export const root = resolve("../..");
export const appDirectory = relative(root, process.cwd());
export const dependencies = resolve(".output/dependencies");
export const standalone = resolve(".output/standalone");

function isOutside(path) {
  return path === ".." || path.startsWith(`..${sep}`);
}

// The compiled artifact owns every generated file, including Next's launcher.
// The dependency artifact contains only traced files outside the build tree.
export function collectFiles() {
  const files = new Set([join(compiled, "BUILD_ID"), join(compiled, "required-server-files.json")]);
  const manifest = JSON.parse(readFileSync(join(compiled, "required-server-files.json"), "utf8"));
  for (const file of manifest.files) files.add(resolve(file));
  files.add(resolve("package.json"));
  for (const file of [".env", ".env.production"]) {
    if (existsSync(file)) files.add(resolve(file));
  }

  function collectTraces(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (directory === compiled && ["cache", "dev", "standalone"].includes(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        collectTraces(path);
        continue;
      }
      if (!entry.name.endsWith(".nft.json")) continue;
      // NFT lists dependencies, excluding the entrypoint itself (including proxy).
      const entrypoint = path.slice(0, -".nft.json".length);
      if (existsSync(entrypoint)) files.add(entrypoint);
      const trace = JSON.parse(readFileSync(path, "utf8"));
      for (const file of trace.files) {
        const target = resolve(dirname(path), file);
        if (isOutside(relative(root, target))) throw new Error(`Trace escapes the repository: ${target}`);
        const generatedPath = relative(compiled, target);
        if (generatedPath.startsWith(`standalone${sep}`)) continue;
        // Keep native alias links, without copying through them into dependencies.
        if (generatedPath.startsWith(`node_modules${sep}`) && !lstatSync(target).isSymbolicLink()) continue;
        files.add(target);
      }
    }
  }
  collectTraces(compiled);

  // Edge middleware/functions can have assets which are not covered by NFT.
  const middleware = JSON.parse(readFileSync(join(compiled, "server/middleware-manifest.json"), "utf8"));
  for (const entry of [...Object.values(middleware.middleware), ...Object.values(middleware.functions)]) {
    for (const file of entry.files ?? []) files.add(join(compiled, file));
    for (const file of [...(entry.wasm ?? []), ...(entry.assets ?? [])]) files.add(join(compiled, file.filePath));
  }
  return [...files];
}

export function isCompiledFile(file) {
  return !isOutside(relative(compiled, file));
}

export function copyFiles(files, destinationRoot) {
  const ordered = files.map((file) => ({ file, symbolicLink: lstatSync(file).isSymbolicLink() }));
  ordered.sort((left, right) => {
    if (left.symbolicLink !== right.symbolicLink) {
      if (left.symbolicLink) return -1;
      return 1;
    }
    return left.file.localeCompare(right.file);
  });
  for (const { file, symbolicLink } of ordered) {
    const destination = join(destinationRoot, relative(root, file));
    mkdirSync(dirname(destination), { recursive: true });
    if (symbolicLink) {
      cpSync(file, destination, { recursive: true, verbatimSymlinks: true });
    } else {
      copyFileSync(file, destination, constants.COPYFILE_FICLONE);
    }
  }
}
