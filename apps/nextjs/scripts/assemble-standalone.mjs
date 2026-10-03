import {
  constants,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// Independent uploads for identical inputs can have different build IDs and
// server action keys. Recreate Next's compiled file set from one restored build;
// the separately cached standalone directory supplies its traced dependencies.
const compiled = resolve(".next");
const standalone = join(compiled, "standalone/apps/nextjs/.next");
const files = new Set(["BUILD_ID", "required-server-files.json"]);
const manifest = JSON.parse(readFileSync(join(compiled, "required-server-files.json"), "utf8"));
for (const file of manifest.files) {
  if (file.startsWith(".next/")) files.add(file.slice(".next/".length));
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
    const trace = JSON.parse(readFileSync(path, "utf8"));
    for (const file of trace.files) {
      const target = relative(compiled, resolve(dirname(path), file));
      if (!target.startsWith("../") && !target.startsWith("standalone/")) files.add(target);
    }
  }
}
collectTraces(compiled);
rmSync(standalone, { recursive: true, force: true });
for (const file of files) {
  const source = join(compiled, file);
  const destination = join(standalone, file);
  mkdirSync(dirname(destination), { recursive: true });
  if (lstatSync(source).isSymbolicLink()) {
    cpSync(source, destination, { recursive: true, verbatimSymlinks: true });
  } else {
    copyFileSync(source, destination, constants.COPYFILE_FICLONE);
  }
}
// Next also copies these directories for prerendered HTML/RSC and route files.
for (const directory of ["app", "pages"]) {
  const source = join(compiled, "server", directory);
  if (existsSync(source)) {
    cpSync(source, join(standalone, "server", directory), { recursive: true, force: true, verbatimSymlinks: true });
  }
}
if (readFileSync(join(compiled, "BUILD_ID"), "utf8") !== readFileSync(join(standalone, "BUILD_ID"), "utf8")) {
  throw new Error("Standalone build ID differs from the compiled build");
}
