import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { arch, cpus, freemem, hostname, platform, release, totalmem } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { BenchmarkCase } from "./lib.mts";
import { runCase, sha256 } from "./lib.mts";

const BASELINE_COMMIT = "bab37f76c607e70d871fb7bdde259fa527051b58";
const directory = dirname(fileURLToPath(import.meta.url));
const options = {
  before: "/tmp/homarr-performance-before-bab37f7",
  after: process.cwd(),
  cases: [] as string[],
  lanes: [] as string[],
  warmup: 3,
  trials: 9,
  iterations: undefined as number | undefined,
  out: "/tmp/homarr-performance-audit-results.json",
  verifyOnly: false,
  list: false,
};

function usage(): void {
  console.log(`Node 24.18.0 before/after audit runner
  --before DIR       Immutable source archive for ${BASELINE_COMMIT}
  --after DIR        Changed checkout (default: current directory)
  --case ID[,ID]     Select IDs, including their ID:variant cases; repeatable
  --lane NAME[,NAME] Select case module filenames; repeatable
  --warmup N        Warmup paired batches (default: 3)
  --trials N        Recorded alternating paired batches (default: 9)
  --iterations N    Override each case's per-batch operations
  --out FILE        JSON output (default: /tmp/homarr-performance-audit-results.json)
  --verify-only     Run actual-source operations, metrics and assertions without timing
  --list            List registered case IDs without preparing cases`);
}

const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === "--help" || argument === "-h") {
    usage();
    process.exit(0);
  }
  if (argument === "--verify-only") {
    options.verifyOnly = true;
    continue;
  }
  if (argument === "--list") {
    options.list = true;
    continue;
  }
  const value = args[++index];
  if (!value) throw new Error(`Missing value for ${argument}`);
  switch (argument) {
    case "--before":
      options.before = resolve(value);
      break;
    case "--after":
      options.after = resolve(value);
      break;
    case "--out":
      options.out = resolve(value);
      break;
    case "--case":
      options.cases.push(...value.split(","));
      break;
    case "--lane":
      options.lanes.push(...value.split(","));
      break;
    case "--warmup":
      options.warmup = Number(value);
      break;
    case "--trials":
      options.trials = Number(value);
      break;
    case "--iterations":
      options.iterations = Number(value);
      break;
    default:
      throw new Error(`Unknown argument ${argument}`);
  }
}
for (const [name, amount] of Object.entries({
  warmup: options.warmup,
  trials: options.trials,
  iterations: options.iterations,
})) {
  if (amount === undefined) continue;
  let minimum = 1;
  if (name === "warmup") minimum = 0;
  if (!Number.isSafeInteger(amount) || amount < minimum) throw new Error(`--${name} must be an integer >= ${minimum}`);
}
if (process.version !== "v24.18.0" || process.versions.bun) {
  throw new Error(`Use the pinned Node v24.18.0 runtime; received ${process.version}`);
}
if (!existsSync(options.before)) throw new Error(`Baseline root does not exist: ${options.before}`);

const registrations: { benchmark: BenchmarkCase; lane: string; file: string; sha256: string }[] = [];
for (const filename of readdirSync(join(directory, "cases")).toSorted()) {
  if (!filename.endsWith(".mts")) continue;
  const lane = filename.slice(0, -4);
  if (options.lanes.length && !options.lanes.includes(lane)) continue;
  const file = join(directory, "cases", filename);
  const module = await import(pathToFileURL(file).href);
  if (!Array.isArray(module.cases)) throw new Error(`${filename} must export cases: BenchmarkCase[]`);
  for (const benchmark of module.cases as BenchmarkCase[]) {
    if (!benchmark.id || !benchmark.title || typeof benchmark.prepare !== "function") {
      throw new Error(`${filename}: incomplete benchmark case`);
    }
    if (registrations.some((entry) => entry.benchmark.id === benchmark.id))
      throw new Error(`Duplicate case ID ${benchmark.id}`);
    registrations.push({ benchmark, lane, file, sha256: sha256(readFileSync(file, "utf8")) });
  }
}
for (const lane of options.lanes) {
  if (!registrations.some((entry) => entry.lane === lane)) throw new Error(`No cases for lane ${lane}`);
}
for (const id of options.cases) {
  if (!registrations.some(({ benchmark }) => benchmark.id === id || benchmark.id.startsWith(`${id}:`))) {
    throw new Error(`No registered case matches ${id}`);
  }
}
let selected = registrations;
if (options.cases.length) {
  selected = registrations.filter(({ benchmark }) =>
    options.cases.some((id) => benchmark.id === id || benchmark.id.startsWith(`${id}:`)),
  );
}
if (options.list) {
  console.log(selected.map(({ benchmark, lane }) => `${benchmark.id}\t${lane}\t${benchmark.title}`).join("\n"));
  process.exit(0);
}
if (selected.length === 0) throw new Error("No benchmark cases selected");

function git(arguments_: string[]): string | undefined {
  try {
    return execFileSync("git", ["-C", options.after, ...arguments_], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  completedAt: undefined as string | undefined,
  status: "running",
  invocation: process.argv,
  configuration: options,
  provenance: {
    baselineCommit: BASELINE_COMMIT,
    baselineArchive:
      "Before source file hashes checked against git show baselineCommit:path before each case's operations",
    currentCommit: git(["rev-parse", "HEAD"]),
    currentBranch: git(["branch", "--show-current"]),
    currentChanges: git(["status", "--porcelain", "--untracked-files=no"]),
    harness: ["lib.mts", "run.mts"].map((file) => ({
      file,
      sha256: sha256(readFileSync(join(directory, file), "utf8")),
    })),
    dependencyRoot: process.env.BENCH_DEPENDENCY_ROOT,
    compilerRoot: process.env.BENCH_COMPILER_ROOT,
  },
  runtime: {
    engine: "Node.js/V8",
    node: process.version,
    versions: process.versions,
    executable: process.execPath,
    execArgv: process.execArgv,
    explicitGc: typeof globalThis.gc === "function",
    platform: platform(),
    arch: arch(),
    osRelease: release(),
    hostname: hostname(),
    cpuModel: cpus()[0]?.model,
    logicalCpus: cpus().length,
    totalMemoryBytes: totalmem(),
    freeMemoryBytesAtStart: freemem(),
  },
  methodology: {
    execution:
      "Serial cases; alternating before/after order per paired trial; process-wide CPU includes operation loop overhead",
    compilation:
      "Extracted source transpiled with recorded TypeScript compiler to ES2022/CommonJS and classic React JSX; no Next.js production build or React Compiler transform",
    summaries: "Median batch wall/CPU divided by batch iterations; raw paired samples retained",
    metrics: "Case-supplied measured numeric outputs from actual-source fixture operations",
    memory:
      "Heap/RSS process snapshots per batch, not allocation counts or peak/production memory; deltas can be negative and shared process state affects RSS",
    io: "No production latency claim. Case fixture descriptions must identify simulated I/O, clocks, dependency stubs and data scales",
  },
  results: [] as unknown[],
  failures: [] as { id: string; lane: string; message: string; stack?: string }[],
};
function save(): void {
  mkdirSync(dirname(options.out), { recursive: true });
  writeFileSync(options.out, `${JSON.stringify(report, null, 2)}\n`);
}
save();
const baselineHashes = new Map<string, string>();
function validateBaseline(file: string, actualSha256: string): void {
  let expectedSha256 = baselineHashes.get(file);
  if (!expectedSha256) {
    const baselineSource = execFileSync("git", ["-C", options.after, "show", `${BASELINE_COMMIT}:${file}`], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    expectedSha256 = sha256(baselineSource);
    baselineHashes.set(file, expectedSha256);
  }
  if (actualSha256 !== expectedSha256) throw new Error(`Baseline source hash mismatch: ${file}`);
}
for (const { benchmark, lane, file, sha256: caseSha256 } of selected) {
  try {
    const result = await runCase(
      benchmark,
      { before: options.before, after: options.after },
      { ...options, validateBaseline },
    );
    report.results.push({ ...result, findingId: benchmark.id.split(":")[0], lane, caseFile: file, caseSha256 });
    console.log(`PASS ${benchmark.id} (${report.results.length}/${selected.length})`);
  } catch (error) {
    const caught = error as Error;
    report.failures.push({ id: benchmark.id, lane, message: caught.message, stack: caught.stack });
    console.error(`FAIL ${benchmark.id}: ${caught.message}`);
  }
  save();
}
report.completedAt = new Date().toISOString();
report.status = "passed";
if (report.failures.length) report.status = "failed";
save();
console.log(`${report.results.length} passed, ${report.failures.length} failed; ${options.out}`);
if (report.failures.length) process.exitCode = 1;
