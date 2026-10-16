import { constants, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  appDirectory,
  collectFiles,
  compiled,
  copyFiles,
  createDependencyManifest,
  dependencies,
  dependencyManifest,
  isCompiledFile,
  standalone,
} from "./standalone-artifact.mjs";

// Final output is disposable. Never rewrite either restored cache artifact.
if (!existsSync(join(dependencies, appDirectory, "package.json"))) {
  throw new Error("Standalone dependencies are missing; run the production build through Turbo");
}
const files = collectFiles();
if (
  readFileSync(dependencyManifest, "utf8") !==
  JSON.stringify(createDependencyManifest(files.filter((file) => !isCompiledFile(file))))
) {
  throw new Error("Standalone dependencies differ from compilation; reinstall dependencies or rebuild with --force");
}
rmSync(standalone, { recursive: true, force: true });
const copyOptions = { recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE };
cpSync(dependencies, standalone, copyOptions);
copyFiles(files.filter(isCompiledFile), standalone);
const application = join(standalone, appDirectory);
mkdirSync(application, { recursive: true });
copyFileSync(join(compiled, "standalone-server.js"), join(application, "server.js"));

// Next also copies these directories for prerendered HTML/RSC and route files.
for (const directory of ["app", "pages"]) {
  const source = join(compiled, "server", directory);
  if (existsSync(source)) {
    cpSync(source, join(application, ".next/server", directory), {
      ...copyOptions,
      force: true,
    });
  }
}
cpSync(join(compiled, "static"), join(application, ".next/static"), copyOptions);
cpSync("public", join(application, "public"), copyOptions);
if (readFileSync(join(compiled, "BUILD_ID"), "utf8") !== readFileSync(join(application, ".next/BUILD_ID"), "utf8")) {
  throw new Error("Standalone build ID differs from the compiled build");
}
