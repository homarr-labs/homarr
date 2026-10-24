import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const root = resolve(process.env.ROOT ?? `${import.meta.dirname}/../../..`);
const require = createRequire(join(root, "package.json"));
const { transform } = require("esbuild");
let files = 0;
for (const directory of ["", "runtime", "server", "workbench"]) {
  const path = join(import.meta.dirname, directory);
  for (const name of await readdir(path)) {
    if (!/\.(mjs|mts|tsx)$/.test(name)) continue;
    let loader = "js";
    if (name.endsWith(".mts")) loader = "ts";
    if (name.endsWith(".tsx")) loader = "tsx";
    await transform(await readFile(join(path, name), "utf8"), { loader, sourcefile: name, logLevel: "error" });
    files++;
  }
}
console.log(`Syntax passed for ${files} harness scripts/fixtures; no benchmark executed`);
