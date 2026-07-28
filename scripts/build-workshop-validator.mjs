import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

const repositoryRoot = resolve(import.meta.dirname, "..");
const outfile = resolve(repositoryRoot, "apps/workshop/pb_hooks/widget-validator.bundle.cjs");

await build({
  absWorkingDir: repositoryRoot,
  entryPoints: [resolve(repositoryRoot, "packages/workshop/src/pocketbase-validator.ts")],
  bundle: true,
  platform: "neutral",
  format: "cjs",
  target: "es2015",
  mainFields: ["module", "main"],
  outfile,
});

const bundle = await readFile(outfile, "utf8");
await writeFile(outfile, bundle.replace(/[ \t]+$/gmu, ""), "utf8");
