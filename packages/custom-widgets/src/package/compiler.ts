import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isBuiltin } from "node:module";
import { build, version } from "esbuild";

import type { CompiledWidgetView, CustomWidgetArtifact } from "./artifact";
import { customWidgetArtifactSchema } from "./artifact";
import { widgetPackageFilesPlugin } from "./compiler-files";
import { prepareCustomWidgetDependencies } from "./dependencies";
import { hashWidgetArtifactContent } from "./integrity";
import { customWidgetPackageSchema } from "./schema";
import type { CustomWidgetPackage } from "./schema";

export interface WidgetPackageCompileOptions {
  dependencyDirectory?: string;
  rootDirectory?: string;
  allowDependencyInstall?: boolean;
}

export async function compileCustomWidgetPackage(
  input: unknown,
  options: WidgetPackageCompileOptions = {},
): Promise<CustomWidgetArtifact> {
  const widget = customWidgetPackageSchema.parse(input);
  const sourceDigest = hashWidgetArtifactContent(widget);
  if (Object.keys(widget.dependencies).length > 0 && !options.dependencyDirectory && options.rootDirectory) {
    options = {
      ...options,
      dependencyDirectory: await prepareCustomWidgetDependencies(widget, sourceDigest, {
        rootDirectory: options.rootDirectory,
        allowDependencyInstall: options.allowDependencyInstall,
      }),
    };
  }
  const compilation = { ...options, bundledHostDependencies: {} as Record<string, string> };
  const tile = await compileEntry(widget, widget.manifest.entrypoints.tile, false, compilation);
  const client: CustomWidgetArtifact["client"] = { tile };
  for (const surface of ["advanced", "configuration"] as const) {
    const entrypoint = widget.manifest.entrypoints[surface];
    if (entrypoint) client[surface] = await compileEntry(widget, entrypoint, false, compilation);
  }
  let server: string | undefined;
  if (widget.manifest.entrypoints.server) {
    server = (await compileEntry(widget, widget.manifest.entrypoints.server, true, compilation)).javascript;
  }
  const artifact = {
    format: "homarr-widget-artifact-v3" as const,
    sourceDigest,
    manifest: widget.manifest,
    client,
    server,
    dependencyLock: {
      dependencies: widget.dependencies,
      compilerVersion: version,
      nodeVersion: process.versions.node,
      lockfile: await readDependencyLock(options.dependencyDirectory),
      bundledHostDependencies: compilation.bundledHostDependencies,
    },
  };
  return customWidgetArtifactSchema.parse({ ...artifact, digest: hashWidgetArtifactContent(artifact) });
}

async function compileEntry(
  widget: CustomWidgetPackage,
  entrypoint: string,
  server: boolean,
  options: WidgetPackageCompileOptions & { bundledHostDependencies: Record<string, string> },
): Promise<CompiledWidgetView> {
  const result = await build({
    entryPoints: [entrypoint],
    bundle: true,
    write: false,
    metafile: true,
    outfile: "widget.cjs",
    format: "cjs",
    platform: server ? "node" : "browser",
    target: server ? "node24" : "es2022",
    jsx: "automatic",
    sourcemap: "inline",
    logLevel: "silent",
    plugins: [widgetPackageFilesPlugin(widget, server, options.dependencyDirectory, options.bundledHostDependencies)],
    define: server ? {} : { "process.env.NODE_ENV": '"production"' },
  });
  if (server && result.metafile) {
    for (const output of Object.values(result.metafile.outputs)) {
      for (const imported of output.imports) {
        if (imported.external && !isBuiltin(imported.path)) {
          throw new Error(
            `Server dependency '${imported.path}' was not bundled; runtime dependency installation is unsupported`,
          );
        }
      }
    }
  }
  const javascript = result.outputFiles?.find((file) => file.path.endsWith(".cjs"))?.text;
  if (!javascript) throw new Error(`The compiler produced no JavaScript for '${entrypoint}'`);
  const hostModules = [
    ...new Set(
      Object.values(result.metafile?.outputs ?? {})
        .flatMap((output) => output.imports)
        .filter((imported) => imported.external && !isBuiltin(imported.path))
        .map((imported) => imported.path),
    ),
  ].toSorted();
  return { javascript, css: result.outputFiles?.find((file) => file.path.endsWith(".css"))?.text ?? "", hostModules };
}

async function readDependencyLock(directory?: string) {
  if (!directory) return undefined;
  try {
    return await readFile(join(directory, "package-lock.json"), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

export { hashWidgetArtifactContent } from "./integrity";
