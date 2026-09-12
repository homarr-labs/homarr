import { isBuiltin } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, posix } from "node:path";
import type { Loader, Plugin } from "esbuild";

import { HOST_WIDGET_MODULES } from "./schema";
import { resolveWidgetCompilerDependency, resolveWidgetServerSdk } from "./compiler-dependencies";
import type { CustomWidgetPackage } from "./schema";

const loaders: Record<string, Loader> = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".jsx": "jsx",
  ".mjs": "js",
  ".cjs": "js",
  ".json": "json",
  ".css": "css",
  ".svg": "dataurl",
  ".png": "dataurl",
  ".jpg": "dataurl",
  ".jpeg": "dataurl",
  ".webp": "dataurl",
  ".gif": "dataurl",
  ".woff": "dataurl",
  ".woff2": "dataurl",
  ".txt": "text",
  ".md": "text",
};

export function widgetPackageFilesPlugin(
  widget: CustomWidgetPackage,
  server: boolean,
  dependencyDirectory?: string,
  bundledHostDependencies: Record<string, string> = {},
): Plugin {
  return {
    name: "homarr-widget-package",
    setup(build) {
      build.onLoad({ filter: /\.node$/, namespace: "file" }, () => ({
        errors: [
          {
            text: "Native Node addons require a compatible external runner; portable widget artifacts support bundled JavaScript dependencies",
          },
        ],
      }));
      build.onResolve({ filter: /.*/ }, async (args) => {
        if (
          args.path === "@tabler/icons-react" &&
          !widget.dependencies[args.path] &&
          args.namespace !== "file" &&
          !args.pluginData?.widgetImplicit
        ) {
          const manifestPath = resolveWidgetCompilerDependency("@tabler/icons-react/package.json");
          const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { version: string };
          bundledHostDependencies[args.path] = manifest.version;
          return build.resolve(args.path, {
            resolveDir: dirname(manifestPath),
            kind: args.kind,
            pluginData: { widgetImplicit: true },
          });
        }
        if (args.pluginData?.widgetImplicit) return undefined;
        if (!server && HOST_WIDGET_MODULES.includes(args.path as (typeof HOST_WIDGET_MODULES)[number])) {
          return { path: args.path, external: true };
        }
        if (server && args.path === "@homarr/widget-sdk/server") {
          return {
            path: await resolveWidgetServerSdk(),
            namespace: "file",
          };
        }
        if (args.path.startsWith("@homarr/widget-sdk")) {
          return {
            errors: [
              { text: `SDK import '${args.path}' is unavailable in this ${server ? "server" : "browser"} module` },
            ],
          };
        }
        if (isBuiltin(args.path)) {
          if (server) return { path: args.path, external: true };
          return { errors: [{ text: `Node module '${args.path}' cannot be imported by a widget view` }] };
        }
        if (args.namespace === "file" || args.pluginData?.widgetDependency) return undefined;
        if (args.kind === "entry-point" || args.path.startsWith(".")) {
          let path = args.path;
          if (args.kind !== "entry-point") path = posix.normalize(posix.join(posix.dirname(args.importer), path));
          const resolved = resolveWidgetFile(widget.files, path);
          if (!resolved) return { errors: [{ text: `Package file '${path}' was not found` }] };
          return { path: resolved, namespace: "widget-file" };
        }
        if (!dependencyDirectory)
          return { errors: [{ text: `Install the declared dependency '${args.path}' before compiling` }] };
        const packageName = getDependencyName(args.path);
        const expectedVersion = widget.dependencies[packageName];
        if (!expectedVersion) return { errors: [{ text: `Declare an exact version for dependency '${packageName}'` }] };
        const resolved = await build.resolve(args.path, {
          resolveDir: dependencyDirectory,
          kind: args.kind,
          pluginData: { widgetDependency: true },
        });
        if (resolved.errors.length > 0) return { errors: resolved.errors };
        await assertDependencyVersion(resolved.path, packageName, expectedVersion);
        return { path: resolved.path, namespace: "file" };
      });
      build.onLoad({ filter: /.*/, namespace: "widget-file" }, (args) => {
        let loader = loaders[extname(args.path)];
        if (args.path.endsWith(".module.css")) loader = "local-css";
        if (!loader) return { errors: [{ text: `Unsupported widget file type: '${args.path}'` }] };
        const source = widget.files[args.path] ?? "";
        let contents: string | Uint8Array = source;
        if (loader === "dataurl" && /^data:[^,]+;base64,/u.test(source)) {
          contents = Buffer.from(source.slice(source.indexOf(",") + 1), "base64");
        }
        return { contents, loader };
      });
    },
  };
}

function resolveWidgetFile(files: Record<string, string>, path: string) {
  const candidates = [
    path,
    ...[".ts", ".tsx", ".js", ".jsx", ".json", "/index.ts", "/index.tsx", "/index.js"].map(
      (extension) => `${path}${extension}`,
    ),
  ];
  return candidates.find((candidate) => Object.hasOwn(files, candidate));
}

function getDependencyName(specifier: string) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0] ?? specifier;
}

async function assertDependencyVersion(resolved: string, name: string, expected: string) {
  let directory = dirname(resolved);
  while (true) {
    try {
      const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8")) as {
        name?: string;
        version?: string;
      };
      if (manifest.name === name) {
        if (manifest.version !== expected)
          throw new Error(`Dependency '${name}' requires ${expected}; installed ${manifest.version}`);
        return;
      }
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Cannot verify installed dependency '${name}'`);
    directory = parent;
  }
}
