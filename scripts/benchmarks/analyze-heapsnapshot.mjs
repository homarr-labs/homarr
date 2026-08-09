// Aggregates a Chrome .heapsnapshot by shallow (self) size per constructor/type,
// which is what "Summary" view in DevTools shows. Retained size needs graph
// traversal; shallow is usually enough to identify a dominant allocator.
import { readFileSync } from "node:fs";

const file = process.argv[2];
const raw = readFileSync(file, "utf8");
const snap = JSON.parse(raw);

const meta = snap.snapshot.meta;
const nodeFields = meta.node_fields;
const nodeTypes = meta.node_types[0];
const stride = nodeFields.length;
const iType = nodeFields.indexOf("type");
const iName = nodeFields.indexOf("name");
const iSelf = nodeFields.indexOf("self_size");

const nodes = snap.nodes;
const strings = snap.strings;
const count = snap.snapshot.node_count ?? nodes.length / stride;

const byKey = new Map();
let total = 0;
for (let i = 0; i < count; i++) {
  const base = i * stride;
  const type = nodeTypes[nodes[base + iType]] ?? "?";
  const name = strings[nodes[base + iName]] ?? "";
  const self = nodes[base + iSelf];
  total += self;
  // Group strings/numbers together — individually they are noise, collectively signal.
  const key = type === "string" || type === "number" || type === "hidden" ? `(${type})` : `${type}:${name}`;
  const acc = byKey.get(key) ?? { bytes: 0, n: 0 };
  acc.bytes += self;
  acc.n++;
  byKey.set(key, acc);
}

const MiB = (b) => (b / 1048576).toFixed(1);
console.log(`file: ${file}`);
console.log(`nodes: ${count.toLocaleString()}  edges: ${(snap.snapshot.edge_count ?? 0).toLocaleString()}`);
console.log(`total shallow size: ${MiB(total)} MiB\n`);

const top = [...byKey.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 35);
console.log("=== top shallow-size groups ===");
console.log("bytes(MiB)".padStart(11), "count".padStart(10), " key");
for (const [key, v] of top) {
  console.log(MiB(v.bytes).padStart(11), String(v.n).padStart(10), ` ${key.slice(0, 90)}`);
}

// Constructor-name rollup ignoring the type prefix, to surface app-level objects.
const byCtor = new Map();
for (const [key, v] of byKey) {
  if (key.startsWith("(")) continue;
  const name = key.slice(key.indexOf(":") + 1);
  if (!name) continue;
  const acc = byCtor.get(name) ?? { bytes: 0, n: 0 };
  acc.bytes += v.bytes;
  acc.n += v.n;
  byCtor.set(name, acc);
}
console.log("\n=== top named constructors ===");
for (const [name, v] of [...byCtor.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 30)) {
  console.log(MiB(v.bytes).padStart(11), String(v.n).padStart(10), ` ${name.slice(0, 90)}`);
}
