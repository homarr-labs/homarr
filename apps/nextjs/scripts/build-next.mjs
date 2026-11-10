import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { freemem, totalmem } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getHeapStatistics } from "node:v8";

const gibibyte = 1024 ** 3;
const cgroupRoot = "/sys/fs/cgroup";
const nextCli = resolve(import.meta.dirname, "../../../node_modules/next/dist/bin/next");

function readBytes(path) {
  try {
    const source = readFileSync(path, "utf8").trim();
    if (source === "max") return null;
    const bytes = Number(source);
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error("Invalid memory counter");
    return bytes;
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

function readCgroups() {
  const levels = [];
  try {
    const mount = readFileSync("/proc/self/mountinfo", "utf8")
      .split("\n")
      .find((line) => line.includes(" - cgroup2 "))
      ?.split(" ");
    // Other layouts keep Node's existing heap; do not guess namespace ceilings.
    if (mount?.[3] !== "/" || mount[4] !== cgroupRoot) return { complete: false, levels };
    const membership = readFileSync("/proc/self/cgroup", "utf8")
      .split("\n")
      .find((line) => line.startsWith("0::"))
      ?.slice(3);
    if (!membership?.startsWith("/") || membership.split("/").includes("..")) return { complete: false, levels };
    let directory = join(cgroupRoot, membership);
    while (true) {
      const limitBytes = readBytes(join(directory, "memory.max"));
      const currentBytes = readBytes(join(directory, "memory.current"));
      const highBytes = readBytes(join(directory, "memory.high"));
      if (directory !== cgroupRoot && (limitBytes === undefined || currentBytes == null || highBytes === undefined))
        return { complete: false, levels };
      levels.push({
        limitBytes: limitBytes ?? null,
        highBytes: highBytes ?? null,
        currentBytes: currentBytes ?? null,
        peakBytes: readBytes(join(directory, "memory.peak")) ?? null,
      });
      if (directory === cgroupRoot) break;
      directory = dirname(directory);
    }
    return { complete: true, levels };
  } catch {
    return { complete: false, levels };
  }
}

function memoryCapacity() {
  const cgroups = readCgroups();
  const constrainedBytes = process.constrainedMemory();
  const nodeAvailableBytes = process.availableMemory();
  let effectiveTotalBytes = totalmem();
  let availableBytes = nodeAvailableBytes;
  if (constrainedBytes > 0) effectiveTotalBytes = Math.min(effectiveTotalBytes, constrainedBytes);
  for (const level of cgroups.levels) {
    for (const ceiling of [level.limitBytes, level.highBytes]) {
      if (ceiling === null) continue;
      effectiveTotalBytes = Math.min(effectiveTotalBytes, ceiling);
      if (level.currentBytes !== null)
        availableBytes = Math.min(availableBytes, Math.max(0, ceiling - level.currentBytes));
    }
  }
  return {
    hostTotalBytes: totalmem(),
    hostFreeBytes: freemem(),
    constrainedBytes,
    nodeAvailableBytes,
    effectiveTotalBytes,
    availableBytes,
    cgroupComplete: cgroups.complete,
    cgroupLevels: cgroups.levels,
  };
}

if (process.argv[2] === "--compile") {
  console.log(
    `[build-memory] ${JSON.stringify({ phase: "next-cli", heapLimitBytes: getHeapStatistics().heap_size_limit })}`,
  );
  process.argv = [process.execPath, nextCli, "build", "--webpack"];
  await import(pathToFileURL(nextCli).href);
} else {
  const capacity = memoryCapacity();
  const env = { ...process.env };
  const existingOptions = env.NODE_OPTIONS ?? "";
  const explicitHeap = /--max[-_]old[-_]space[-_]size(?:[-_]percentage)?(?:=|\s|"|$)/u.test(
    `${existingOptions} ${process.execArgv.join(" ")}`,
  );
  let selectedOldSpaceMiB = null;
  if (
    !explicitHeap &&
    capacity.cgroupComplete &&
    capacity.effectiveTotalBytes >= 12 * gibibyte &&
    capacity.availableBytes >= 10 * gibibyte
  ) {
    selectedOldSpaceMiB = 6144;
    env.NODE_OPTIONS = `${existingOptions} --max-old-space-size=6144`.trim();
  }
  console.log(`[build-memory] ${JSON.stringify({ phase: "before", ...capacity, explicitHeap, selectedOldSpaceMiB })}`);
  const result = spawnSync(process.execPath, [...process.execArgv, fileURLToPath(import.meta.url), "--compile"], {
    stdio: "inherit",
    env,
  });
  console.log(`[build-memory] ${JSON.stringify({ phase: "after", ...memoryCapacity() })}`);
  if (result.error) throw result.error;
  if (result.signal) process.kill(process.pid, result.signal);
  process.exitCode = result.status ?? 1;
}
