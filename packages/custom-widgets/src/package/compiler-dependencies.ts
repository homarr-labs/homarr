import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Bundle locations differ between workspace TS, Next server chunks, and /app/apps/cli/cli.cjs. */
function runtimeModulePaths() {
  const modulePath = typeof __filename === "string" ? __filename : fileURLToPath(import.meta.url);
  const paths = [resolve(modulePath), join(process.cwd(), "package.json")];
  if (process.argv[1]) paths.push(resolve(process.argv[1]));
  return [...new Set(paths)];
}

export function resolveWidgetCompilerDependency(specifier: string) {
  for (const path of runtimeModulePaths()) {
    try {
      return createRequire(path).resolve(specifier);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "MODULE_NOT_FOUND")) throw error;
    }
  }
  throw new Error(`The installed widget compiler is missing '${specifier}'. Include its production dependency files.`);
}

export async function resolveWidgetServerSdk() {
  try {
    return resolveWidgetCompilerDependency("@homarr/widget-sdk/server");
  } catch {
    // Standalone traces retain package source, but workspace node_modules links are not guaranteed.
  }
  const inspected = new Set<string>();
  for (const modulePath of runtimeModulePaths()) {
    let directory = dirname(modulePath);
    while (!inspected.has(directory)) {
      inspected.add(directory);
      const packageDirectory = join(directory, "packages", "widget-sdk");
      try {
        const manifest = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8")) as {
          name?: string;
        };
        const source = join(packageDirectory, "src", "server.ts");
        if (manifest.name === "@homarr/widget-sdk" && (await stat(source)).isFile()) return source;
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      }
      const parent = dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
  throw new Error("The installed widget compiler is missing packages/widget-sdk/src/server.ts from its output trace");
}
