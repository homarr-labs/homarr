import { readFileSync, rmSync } from "node:fs";
import {
  collectFiles,
  copyFiles,
  createDependencyManifest,
  dependencies,
  dependencyManifest,
  isCompiledFile,
} from "./standalone-artifact.mjs";

// Separate uploads stay below the remote cache's per-artifact size limit.
// Recover expired dependencies from traces without changing cached compilation.
const files = collectFiles().filter((file) => !isCompiledFile(file));
if (readFileSync(dependencyManifest, "utf8") !== JSON.stringify(createDependencyManifest(files))) {
  throw new Error("Standalone dependencies changed after compilation; rebuild the compiled artifact before caching");
}
rmSync(dependencies, { recursive: true, force: true });
copyFiles(files, dependencies);
