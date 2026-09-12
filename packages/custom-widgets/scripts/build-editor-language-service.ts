import { mkdir, writeFile } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { resolve } from "node:path";
import { build } from "esbuild";

import { buildEditorLanguageLibraries } from "./editor-language-libraries";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const destination = resolve(repositoryRoot, "apps/nextjs/public/__widget-editor");
const libraries = buildEditorLanguageLibraries(repositoryRoot);
await mkdir(destination, { recursive: true });
await writeFile(resolve(destination, "types.json"), JSON.stringify(libraries));
await build({
  absWorkingDir: repositoryRoot,
  entryPoints: ["packages/custom-widgets/src/workbench/package-language/worker.ts"],
  outfile: resolve(destination, "worker.js"),
  bundle: true,
  platform: "browser",
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "linked",
  plugins: [
    {
      name: "browser-only-typescript-host",
      setup(builder) {
        // TypeScript detects browsers before creating ts.sys; no Node filesystem is available in the worker.
        builder.onResolve({ filter: /^(?:node:)?(?:fs|path|os|crypto|buffer|inspector|perf_hooks)$/ }, (args) => {
          if (isBuiltin(args.path)) return { path: args.path, namespace: "browser-typescript-node" };
          return undefined;
        });
        builder.onLoad({ filter: /.*/, namespace: "browser-typescript-node" }, () => ({
          contents: "export default {};",
        }));
      },
    },
  ],
});
console.info(
  `Built local widget editor worker with ${Object.keys(libraries.files).length} declaration files (SDK ${libraries.sdkVersion}, TypeScript ${libraries.typescriptVersion})`,
);
