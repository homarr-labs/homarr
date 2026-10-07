import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  appDirectory,
  collectFiles,
  compiled,
  copyFiles,
  dependencies,
  isCompiledFile,
  standalone,
} from "./standalone-artifact.mjs";

// Final output is disposable. Never rewrite either restored cache artifact.
if (!existsSync(join(dependencies, appDirectory, "package.json"))) {
  throw new Error("Standalone dependencies are missing; run the production build through Turbo");
}
rmSync(standalone, { recursive: true, force: true });
cpSync(dependencies, standalone, { recursive: true, verbatimSymlinks: true });
copyFiles(collectFiles().filter(isCompiledFile), standalone);
const application = join(standalone, appDirectory);
mkdirSync(application, { recursive: true });
copyFileSync(join(compiled, "standalone-server.js"), join(application, "server.js"));

// Next also copies these directories for prerendered HTML/RSC and route files.
for (const directory of ["app", "pages"]) {
  const source = join(compiled, "server", directory);
  if (existsSync(source)) {
    cpSync(source, join(application, ".next/server", directory), {
      recursive: true,
      force: true,
      verbatimSymlinks: true,
    });
  }
}
cpSync(join(compiled, "static"), join(application, ".next/static"), { recursive: true, verbatimSymlinks: true });
cpSync("public", join(application, "public"), { recursive: true, verbatimSymlinks: true });
if (readFileSync(join(compiled, "BUILD_ID"), "utf8") !== readFileSync(join(application, ".next/BUILD_ID"), "utf8")) {
  throw new Error("Standalone build ID differs from the compiled build");
}
