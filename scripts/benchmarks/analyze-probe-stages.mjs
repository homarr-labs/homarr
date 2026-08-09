// Turns the per-stage probe captures of a stress run into one table, so growth can be
// attributed to a specific part of the process rather than to "memory".
//
//   node scripts/benchmarks/analyze-probe-stages.mjs .bench/stress/<label>
//
// The interesting column is never the total: it is which sub-total moved. Old-space
// growth is retained application state; new-space is churn; external is Buffers; and
// loaded-source growth means the server pulled in more code to serve a route. Those have
// completely different fixes, and a single RSS number cannot tell them apart.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const directory = process.argv[2];
if (!directory) throw new Error("usage: analyze-probe-stages.mjs <stress output dir>");

const stageFiles = readdirSync(directory)
  .filter((name) => name.endsWith(".probe.json"))
  .sort();
if (!stageFiles.length) throw new Error(`no *.probe.json in ${directory} (was HOMARR_PROBE_PORT set?)`);

/** Stage files are named so lexical order is chronological, except the numbered prefixes interleave. */
const ORDER = ["01-boot", "02-post-restore", "03-post-login", "04-board", "nav-", "07-multi-tab", "05-after", "soak-", "06-final"];
const rank = (name) => {
  const index = ORDER.findIndex((prefix) => name.startsWith(prefix));
  return index === -1 ? ORDER.length : index;
};
stageFiles.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

const MiB = (bytes) => (bytes / 1048576).toFixed(1);
const space = (stage, name) => stage.spaces?.find((entry) => entry.space_name === name)?.space_used_size ?? 0;

const stages = [];
for (const file of stageFiles) {
  const raw = JSON.parse(readFileSync(path.join(directory, file), "utf8"));
  if (raw.error) continue;
  stages.push({ name: file.replace(".probe.json", ""), ...raw });
}

const columns = [
  ["rss", (s) => s.usage.rss],
  ["heapTotal", (s) => s.usage.heapTotal],
  ["heapUsed", (s) => s.usage.heapUsed],
  ["old", (s) => space(s, "old_space")],
  ["large obj", (s) => space(s, "large_object_space")],
  ["new", (s) => space(s, "new_space")],
  ["code", (s) => space(s, "code_space") + space(s, "code_large_object_space")],
  ["trusted", (s) => space(s, "trusted_space")],
  ["external", (s) => s.usage.external],
  ["arrayBuf", (s) => s.usage.arrayBuffers],
  ["src loaded", (s) => s.modules?.totalBytes ?? 0],
];

const header = ["stage".padEnd(16), ...columns.map(([name]) => name.padStart(10)), "files".padStart(7)].join(" ");
console.log(`\n=== per-stage server memory, MiB (${stages.length} stages) ===`);
console.log(header);
console.log("-".repeat(header.length));
for (const stage of stages) {
  const cells = columns.map(([, get]) => MiB(get(stage)).padStart(10));
  console.log([stage.name.padEnd(16), ...cells, String(stage.modules?.fileCount ?? 0).padStart(7)].join(" "));
}

const first = stages[0];
const last = stages.at(-1);
const peak = (get) => Math.max(...stages.map(get));
console.log(`\n=== growth from "${first.name}" to "${last.name}", and the worst stage ===`);
console.log(`${"component".padEnd(34)} ${"start".padStart(9)} ${"end".padStart(9)} ${"delta".padStart(9)} ${"peak".padStart(9)}`);
for (const [name, get] of columns) {
  const delta = get(last) - get(first);
  console.log(
    `${name.padEnd(34)} ${MiB(get(first)).padStart(9)} ${MiB(get(last)).padStart(9)} ${(delta >= 0 ? "+" : "") + MiB(delta)}`.padEnd(65) +
      MiB(peak(get)).padStart(9),
  );
}

// Which code was pulled in later: a route that loads 5 MiB of chunks on first hit is a
// different (and more fixable) problem than one that retains 5 MiB of data.
const groupsOf = (stage) => new Map((stage.modules?.groups ?? []).map((group) => [group.name, group.bytes]));
const firstGroups = groupsOf(first);
const lastGroups = groupsOf(last);
const names = new Set([...firstGroups.keys(), ...lastGroups.keys()]);
const codeDeltas = [...names]
  .map((name) => ({ name, delta: (lastGroups.get(name) ?? 0) - (firstGroups.get(name) ?? 0), end: lastGroups.get(name) ?? 0 }))
  .filter((entry) => Math.abs(entry.delta) > 65536)
  .sort((a, b) => b.delta - a.delta);
if (codeDeltas.length) {
  console.log(`\n=== code loaded after boot (source bytes, MiB) ===`);
  for (const entry of codeDeltas) {
    console.log(`  ${(entry.delta >= 0 ? "+" : "") + MiB(entry.delta).padStart(7)}  -> ${MiB(entry.end).padStart(7)} total   ${entry.name}`);
  }
}
