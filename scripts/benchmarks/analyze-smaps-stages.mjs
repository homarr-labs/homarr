// Breaks each stage's RSS into JS heap, JIT code, native malloc and file-backed pages.
//
//   node scripts/benchmarks/analyze-smaps-stages.mjs .bench/stress/<label>
//
// `process.memoryUsage()` accounts for the JS heap and external buffers and stops there. On a
// loaded container that leaves a large unexplained remainder — measured at ~152 MiB of a
// 352 MiB peak — which is invisible to every JS-level tool. Only /proc/<pid>/smaps
// distinguishes what that remainder is, and only a per-stage capture shows which part of it
// grows under load.
//
// Anonymous mappings are classified by signature: V8 allocates its heap in 256 KiB pages
// (kRegularPageSize) and nothing else in the process allocates at that granularity in bulk,
// while pthread reserves ~8 MiB per thread stack and touches almost none of it.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const directory = process.argv[2];
if (!directory) throw new Error("usage: analyze-smaps-stages.mjs <stress output dir>");

const V8_PAGE_BYTES = 262144;
const THREAD_STACK_BYTES = 8196 * 1024;

const parse = (text) => {
  const mappings = [];
  let current;
  for (const line of text.split("\n")) {
    const header = /^([0-9a-f]+)-([0-9a-f]+)\s+(\S{4})\s+\S+\s+\S+\s+\S+\s*(.*)$/.exec(line);
    if (header) {
      if (current) mappings.push(current);
      const start = Number.parseInt(header[1], 16);
      const end = Number.parseInt(header[2], 16);
      current = { size: end - start, rss: 0, perms: header[3], file: (header[4] ?? "").trim() };
      continue;
    }
    if (!current) continue;
    const rss = /^Rss:\s+(\d+) kB/.exec(line);
    if (rss) current.rss = Number(rss[1]) * 1024;
  }
  if (current) mappings.push(current);
  return mappings;
};

const bucketOf = (mapping) => {
  const executable = mapping.perms.includes("x");
  if (mapping.file === "[stack]" || mapping.size === THREAD_STACK_BYTES) return "thread stacks";
  if (mapping.file === "[heap]") return "malloc brk heap";
  if (mapping.file.startsWith("[")) return "kernel";
  if (mapping.file) {
    if (/\.node$/.test(mapping.file)) return "native addons (file-backed)";
    if (/\/node$/.test(mapping.file)) return "node binary (file-backed)";
    if (/\.so/.test(mapping.file)) return "shared libraries (file-backed)";
    return "other file-backed";
  }
  if (executable) return "JIT code";
  if (mapping.size === V8_PAGE_BYTES) return "V8 heap pages";
  return "native malloc / buffers";
};

const ORDER = ["01-boot", "02-post-restore", "03-post-login", "04-board", "nav-", "07-multi-tab", "05-after", "soak-", "06-final"];
const rank = (name) => {
  const index = ORDER.findIndex((prefix) => name.startsWith(prefix));
  return index === -1 ? ORDER.length : index;
};

const stages = readdirSync(directory)
  .filter((name) => name.endsWith(".smaps.json"))
  .map((name) => name.replace(".smaps.json", ""))
  .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
if (!stages.length) throw new Error(`no *.smaps.json in ${directory}`);

const MiB = (bytes) => (bytes / 1048576).toFixed(1);
const BUCKETS = [
  "V8 heap pages",
  "native malloc / buffers",
  "JIT code",
  "node binary (file-backed)",
  "shared libraries (file-backed)",
  "native addons (file-backed)",
  "thread stacks",
  "malloc brk heap",
];

const rows = [];
for (const stage of stages) {
  const payload = JSON.parse(readFileSync(path.join(directory, `${stage}.smaps.json`), "utf8"));
  if (!payload.smaps) continue;
  const totals = new Map();
  let rss = 0;
  for (const mapping of parse(payload.smaps)) {
    rss += mapping.rss;
    const bucket = bucketOf(mapping);
    totals.set(bucket, (totals.get(bucket) ?? 0) + mapping.rss);
  }
  rows.push({ stage, rss, totals });
}

const header = ["stage".padEnd(16), "RSS".padStart(8), ...BUCKETS.map((name) => name.slice(0, 11).padStart(12))].join(" ");
console.log(`\n=== RSS composition per stage, MiB ===`);
console.log(header);
console.log("-".repeat(header.length));
for (const row of rows) {
  const cells = BUCKETS.map((bucket) => MiB(row.totals.get(bucket) ?? 0).padStart(12));
  console.log([row.stage.padEnd(16), MiB(row.rss).padStart(8), ...cells].join(" "));
}

const first = rows[0];
const peak = rows.reduce((best, row) => (row.rss > best.rss ? row : best), rows[0]);
console.log(`\n=== boot ("${first.stage}") vs peak ("${peak.stage}") ===`);
console.log(`${"bucket".padEnd(32)} ${"boot".padStart(9)} ${"peak".padStart(9)} ${"growth".padStart(9)}`);
for (const bucket of BUCKETS) {
  const from = first.totals.get(bucket) ?? 0;
  const to = peak.totals.get(bucket) ?? 0;
  if (from === 0 && to === 0) continue;
  const delta = to - from;
  console.log(
    `${bucket.padEnd(32)} ${MiB(from).padStart(9)} ${MiB(to).padStart(9)} ${((delta >= 0 ? "+" : "") + MiB(delta)).padStart(9)}`,
  );
}
console.log(
  `${"TOTAL RSS".padEnd(32)} ${MiB(first.rss).padStart(9)} ${MiB(peak.rss).padStart(9)} ${("+" + MiB(peak.rss - first.rss)).padStart(9)}`,
);
