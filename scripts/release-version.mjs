import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

// Homarr publishes images and archives; only the repository version needs updating.
export async function prepare(_pluginConfig, { cwd, env, nextRelease, logger }) {
  const packagePath = join(cwd, "package.json");
  const manifest = JSON.parse(await readFile(packagePath, "utf8"));
  manifest.version = nextRelease.version;
  await writeFile(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);
  await promisify(execFile)(process.execPath, ["install", "--lockfile-only", "--ignore-scripts"], { cwd, env });
  logger.log("Updated package.json and bun.lock to %s", nextRelease.version);
}
