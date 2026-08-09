// Reports what allocated memory during a stress run, by site and by owner — and, given two
// stages, what a single stage allocated.
//
//   node scripts/benchmarks/analyze-allocations.mjs <dir> [fromStage] [toStage]
//   node scripts/benchmarks/analyze-allocations.mjs .bench/stress/peak nav-03 07-multi-tab
//
// This is the counterpart to a heap snapshot and answers the opposite question. A snapshot is
// taken after a forced GC, so it shows only what *survived*; the churn that produces a memory
// peak is by definition gone by then. The sampling heap profiler records an allocation stack
// every N bytes regardless of survival, so a peak driven by transient garbage — which is what
// this container's peak turned out to be — shows up here and nowhere else.
//
// Sampling totals are cumulative since boot, so a single stage is only meaningful as the
// difference between two captures. Without stage arguments this reports the cumulative
// profile, which is dominated by boot-time module loading.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

const [, , directory, fromStage, toStage] = process.argv;
if (!directory) throw new Error("usage: analyze-allocations.mjs <dir> [fromStage] [toStage]");

const load = (stage) => {
  const file = path.join(directory, `${stage}.allocations.json`);
  if (!existsSync(file)) throw new Error(`missing ${file}`);
  const parsed = JSON.parse(readFileSync(file, "utf8"));
  if (parsed.disabled) throw new Error("sampling was not enabled (HOMARR_PROBE_SAMPLE_ALLOCATIONS)");
  return parsed;
};

const MiB = (bytes) => (bytes / 1048576).toFixed(2);

/** Groups a frame to something a developer could act on: a package, a chunk, or node itself. */
const ownerOf = (key) => {
  const url = key.slice(key.indexOf("|") + 1);
  if (!url || url.startsWith("undefined")) return "unattributed (no script)";
  if (/^node:/.test(url)) {
    if (/cjs\/loader|modules\//.test(url)) return "node: CommonJS module loader (reading source)";
    return "node internals";
  }
  const dependency = /\/app\/node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(url);
  if (dependency) return `node_modules: ${dependency[1]}`;
  if (url.includes("/.next/server/chunks/")) {
    const chunk = /chunks\/(?:ssr\/)?([^/:]+)/.exec(url);
    return `chunk ${chunk ? chunk[1] : "?"}`;
  }
  if (url.includes("/.next/server/app/")) return "route bundle";
  if (url.includes("/probe/")) return "the probe itself (diagnostics)";
  return "other";
};

/**
 * Renders a `functionName|url:line` key for display. Split on the first separator explicitly
 * rather than with a single-occurrence `replace`, which reads as a botched sanitiser (CodeQL
 * flags it as one) and would mangle any URL that itself contained a pipe.
 */
const shorten = (key) => {
  const separator = key.indexOf("|");
  const functionName = separator === -1 ? key : key.slice(0, separator);
  const url = separator === -1 ? "" : key.slice(separator + 1);
  return `${functionName}  <- ${url}`
    .replaceAll("/app/apps/nextjs/.next/server/", "")
    .replaceAll("/app/node_modules/", "");
};

let label;
let total;
let sites;

if (fromStage && toStage) {
  const before = load(fromStage);
  const after = load(toStage);
  const previous = new Map(before.sites.map((site) => [site.key, site.bytes]));
  label = `allocated between "${fromStage}" and "${toStage}"`;
  total = after.total - before.total;
  sites = after.sites
    .map((site) => ({ ...site, bytes: site.bytes - (previous.get(site.key) ?? 0) }))
    .filter((site) => site.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes);
} else {
  const profile = load(fromStage ?? "06-final");
  label = `cumulative since boot (${fromStage ?? "06-final"})`;
  total = profile.total;
  sites = profile.sites;
}

const covered = sites.reduce((sum, site) => sum + site.bytes, 0);
console.log(`${label}: ${MiB(total)} MiB total, ${MiB(covered)} MiB attributed across ${sites.length} sites\n`);

const byOwner = new Map();
for (const site of sites) {
  const owner = ownerOf(site.key);
  const acc = byOwner.get(owner) ?? { bytes: 0, sites: 0 };
  acc.bytes += site.bytes;
  acc.sites++;
  byOwner.set(owner, acc);
}

console.log("=== allocation volume by owner ===");
console.log(`${"MiB".padStart(9)} ${"share".padStart(7)} ${"sites".padStart(6)}  owner`);
for (const [owner, acc] of [...byOwner.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 18)) {
  const share = covered === 0 ? "-" : `${((acc.bytes / covered) * 100).toFixed(1)}%`;
  console.log(`${MiB(acc.bytes).padStart(9)} ${share.padStart(7)} ${String(acc.sites).padStart(6)}  ${owner}`);
}

console.log(`\n=== top individual allocation sites ===`);
for (const site of sites.slice(0, 16)) {
  const share = covered === 0 ? "-" : `${((site.bytes / covered) * 100).toFixed(1)}%`;
  console.log(`\n  ${MiB(site.bytes)} MiB (${share})  ${shorten(site.key).slice(0, 110)}`);
  for (const frame of (site.stack ?? []).slice(1, 4)) console.log(`      from ${shorten(frame).slice(0, 106)}`);
}
