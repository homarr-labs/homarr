import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  appDirectory,
  collectFiles,
  compiled,
  createDependencyManifest,
  dependencyManifest,
  isCompiledFile,
} from "./standalone-artifact.mjs";

// Keep Next's generated launcher with its compilation and server configuration.
copyFileSync(join(compiled, "standalone", appDirectory, "server.js"), join(compiled, "standalone-server.js"));
writeFileSync(
  dependencyManifest,
  JSON.stringify(createDependencyManifest(collectFiles().filter((file) => !isCompiledFile(file)))),
);
