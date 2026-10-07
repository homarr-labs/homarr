import { rmSync } from "node:fs";
import { collectFiles, copyFiles, dependencies, isCompiledFile } from "./standalone-artifact.mjs";

// Separate uploads stay below the remote cache's per-artifact size limit.
// Recover expired dependencies from traces without changing cached compilation.
const files = collectFiles().filter((file) => !isCompiledFile(file));
rmSync(dependencies, { recursive: true, force: true });
copyFiles(files, dependencies);
