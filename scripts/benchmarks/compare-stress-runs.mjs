// Compares alternated stress runs of two images and reports the medians side by side.
//
//   node scripts/benchmarks/compare-stress-runs.mjs .bench/stress "u-before" "u-after"
//
// Runs are alternated (before, after, before, after) so machine drift lands on both sides,
// and the median of each side is reported rather than a single run: the harness's own
// spread between identical runs has been as wide as 50 MiB at peak, so a one-shot
// comparison cannot distinguish a real change from noise.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? ".bench/stress";
const beforePrefix = process.argv[3] ?? "u-before";
const afterPrefix = process.argv[4] ?? "u-after";

const loadSide = (prefix) =>
  readdirSync(root)
    .filter((name) => name.startsWith(prefix))
    .map((name) => path.join(root, name))
    .filter((dir) => existsSync(path.join(dir, "summary.json")))
    .map((dir) => ({ dir, summary: JSON.parse(readFileSync(path.join(dir, "summary.json"), "utf8")) }));

const median = (values) => {
  const sorted = values.filter((value) => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/** Peak arrayBuffers across a run's stages: the transient spike never shows in a summary total. */
const peakArrayBuffers = (dir) => {
  let peak = 0;
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".probe.json"))) {
    try {
      const stage = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      peak = Math.max(peak, (stage.usage?.arrayBuffers ?? 0) / 1048576);
    } catch {
      // A stage capture can be missing if the probe was not wired up; skip it.
    }
  }
  return peak || null;
};

/** Largest single tracked Buffer allocation, which is what the umami paging change targets. */
const largestAllocation = (dir) => {
  let largest = 0;
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".buffers.json"))) {
    try {
      const capture = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      for (const site of capture.sites ?? []) largest = Math.max(largest, (site.max ?? 0) / 1048576);
    } catch {
      // Same: buffer tracking is opt-in.
    }
  }
  return largest || null;
};

/** Stage samples are keyed by stage name, so the peak is the max across them. */
const peakStage = (stages) => {
  const values = Object.values(stages ?? {}).filter((value) => typeof value === "number");
  return values.length ? Math.max(...values) : null;
};

const METRICS = [
  ["peak container MiB", (run) => peakStage(run.summary.containerMiB)],
  ["peak node RSS MiB", (run) => peakStage(run.summary.nodeRssMiB)],
  ["peak node anon MiB", (run) => peakStage(run.summary.nodeAnonMiB)],
  ["multi-tab container MiB", (run) => run.summary.containerMiB?.["07-multi-tab"]],
  ["final (post-soak) MiB", (run) => run.summary.containerMiB?.["06-final"]],
  ["boot idle MiB", (run) => run.summary.containerMiB?.["01-boot-idle"]],
  ["peak arrayBuffers MiB", (run) => peakArrayBuffers(run.dir)],
  ["largest single alloc MiB", (run) => largestAllocation(run.dir)],
  ["client JS heap MiB", (run) => run.summary.client?.jsHeapUsedMiB],
  ["median board load ms", (run) => run.summary.latency?.medianBoardLoadMs],
  ["CPU seconds", (run) => run.summary.cpuSeconds],
];

const before = loadSide(beforePrefix);
const after = loadSide(afterPrefix);
console.log(`before "${beforePrefix}": ${before.length} runs   after "${afterPrefix}": ${after.length} runs`);
if (!before.length || !after.length) throw new Error("need at least one run on each side");

console.log(`\n${"metric".padEnd(26)} ${"before".padStart(10)} ${"after".padStart(10)} ${"change".padStart(12)}`);
console.log("-".repeat(62));
for (const [name, get] of METRICS) {
  const beforeValue = median(before.map(get));
  const afterValue = median(after.map(get));
  if (beforeValue === null || afterValue === null) continue;
  const delta = afterValue - beforeValue;
  const percent = beforeValue === 0 ? "" : ` (${delta >= 0 ? "+" : ""}${((delta / beforeValue) * 100).toFixed(0)}%)`;
  console.log(
    `${name.padEnd(26)} ${beforeValue.toFixed(1).padStart(10)} ${afterValue.toFixed(1).padStart(10)} ${((delta >= 0 ? "+" : "") + delta.toFixed(1) + percent).padStart(12)}`,
  );
}

console.log(`\nper-run values (to judge spread):`);
for (const [name, get] of METRICS) {
  const beforeValues = before.map(get).filter((value) => typeof value === "number");
  const afterValues = after.map(get).filter((value) => typeof value === "number");
  if (!beforeValues.length || !afterValues.length) continue;
  console.log(
    `  ${name.padEnd(26)} before [${beforeValues.map((value) => value.toFixed(1)).join(", ")}]  after [${afterValues.map((value) => value.toFixed(1)).join(", ")}]`,
  );
}
