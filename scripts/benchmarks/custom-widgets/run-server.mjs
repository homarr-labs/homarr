import { spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const name = process.argv[2];
if (!["router", "response", "management"].includes(name)) throw new Error("Choose router, response or management");
if (!process.env.ROOT) throw new Error("ROOT required");
const root = resolve(process.env.ROOT);
const require = createRequire(join(root, "package.json"));
const output = resolve(process.env.OUTPUT ?? `${import.meta.dirname}/output/server`);
await mkdir(output, { recursive: true });
const result = spawnSync(
  process.execPath,
  ["--import", pathToFileURL(require.resolve("tsx")).href, `${import.meta.dirname}/server/${name}.mts`],
  {
    cwd: root,
    env: { ...process.env, ROOT: root, OUT: join(output, `${name}-${process.env.LABEL ?? "run"}.json`) },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
