import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = process.env.ROOT;
if (!root) throw new Error("ROOT required");
const require = createRequire(`${root}/package.json`);
const { build } = require("esbuild");
const scratch = import.meta.dirname;
const label = process.env.LABEL;
if (!label || !/^[a-z0-9-]+$/i.test(label)) throw new Error("LABEL must contain only letters, numbers or hyphens");
const output = join(resolve(process.env.OUTPUT ?? `${scratch}/../output/workbench`), label);
await mkdir(output, { recursive: true });
const result = await build({
  stdin: {
    contents: (await readFile(join(scratch, "browser-entry.tsx"), "utf8")).replaceAll("SOURCE", root),
    resolveDir: root,
    loader: "tsx",
  },
  bundle: true,
  platform: "browser",
  format: "esm",
  splitting: true,
  outdir: output,
  metafile: true,
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  jsx: "automatic",
  loader: { ".css": "css" },
  plugins: [
    {
      name: "counts",
      setup(build) {
        build.onResolve({ filter: /^@homarr\/api\/client$/ }, () => ({ path: "api", namespace: "stub" }));
        build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: "export const fetchApi = {};",
          loader: "js",
        }));
        build.onLoad(
          {
            filter:
              /\/(component-catalog\.ts|code-editor\.tsx|code-language\.ts|preview-response-panel\.tsx|response-tree\.tsx|analyzer\.ts|_custom-widget-form-utils\.ts)$/,
          },
          async (args) => {
            let contents = await readFile(args.path, "utf8");
            if (
              label === "ported" &&
              ["code-editor.tsx", "code-language.ts", "preview-response-panel.tsx"].some((name) =>
                args.path.endsWith(`/workbench/${name}`),
              )
            ) {
              contents = execFileSync("git", ["show", `99d6e2545:${args.path.slice(root.length + 1)}`], {
                cwd: root,
                encoding: "utf8",
              });
            }
            const count = (name) =>
              `globalThis.__counts && (globalThis.__counts.${name} = (globalThis.__counts.${name} ?? 0) + 1);`;
            contents = contents.replace(
              "const component = customJsxCatalogComponentByName.get(name);",
              `${count("props")} const component = customJsxCatalogComponentByName.get(name);`,
            );
            contents = contents.replace("const values = { schema:", `${count("schema")} const values = { schema:`);
            if (args.path.endsWith("/workbench/analyzer.ts"))
              contents = contents.replace(
                "const diagnostics: EditorDiagnostic[] = [];",
                `${count("templateAnalysis")} const diagnostics: EditorDiagnostic[] = [];`,
              );
            contents = contents.replace(
              "export function analyzeRequestManifest(value: string): EditorDiagnostic[] {",
              `export function analyzeRequestManifest(value: string): EditorDiagnostic[] {${count("requestAnalysis")}`,
            );
            contents = contents.replace(
              "export function buildDefinition(values: CustomWidgetFormValues) {",
              `export function buildDefinition(values: CustomWidgetFormValues) {${count("definition")}`,
            );
            contents = contents.replace(
              "const data = useMemo(() => [createResponseTreeNode",
              `${count("tree")} const data = useMemo(() => [createResponseTreeNode`,
            );
            contents = contents.replace(
              "const responseNode = node as ResponseTreeData;",
              `${count("treeNodes")} const responseNode = node as ResponseTreeData;`,
            );
            return { contents, loader: args.path.endsWith("tsx") ? "tsx" : "ts" };
          },
        );
      },
    },
  ],
});
await writeFile(join(output, "meta.json"), JSON.stringify(result.metafile));
await writeFile(
  join(output, "index.html"),
  '<html><head><link rel="stylesheet" href="/LABEL/stdin.css"></head><body><div id="root"></div><script type="module" src="/LABEL/stdin.js"></script></body></html>'.replaceAll(
    "LABEL",
    label,
  ),
);
console.log(
  JSON.stringify({
    label,
    outputs: Object.fromEntries(Object.entries(result.metafile.outputs).map(([path, info]) => [path, info.bytes])),
  }),
);
