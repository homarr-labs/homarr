import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

let architecture = process.arch;
if (architecture === "x64") architecture = "amd64";

let libc = "native";
if (process.platform === "linux") {
  libc = "musl";
  const { glibcVersionRuntime } = process.report.getReport().header;
  if (glibcVersionRuntime) libc = `glibc-${glibcVersionRuntime}`;
}

const platform =
  process.env.TURBO_PLATFORM || `${process.platform}/${architecture}/${libc}/node-${process.versions.node}`;
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--print-platform") {
  console.log(platform);
} else {
  const require = createRequire(import.meta.url);
  const result = spawnSync(process.execPath, [require.resolve("turbo/bin/turbo"), ...args], {
    stdio: "inherit",
    env: { ...process.env, TURBO_PLATFORM: platform },
  });
  if (result.error) throw result.error;
  if (result.signal) process.kill(process.pid, result.signal);
  process.exitCode = result.status ?? 1;
}
