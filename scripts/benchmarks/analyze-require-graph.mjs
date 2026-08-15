// Attributes loaded server code to whatever pulled it in.
//
//   node scripts/benchmarks/analyze-require-graph.mjs <graph.json> <sizes.json>
//
// `graph.json` is the probe's /requires output (parent → child edges) and `sizes.json` is a
// map of file → byte size. Together they answer the question a flat module list cannot:
// 24 MiB of source is resident before the first request, and this says which entry point is
// responsible for it — boot-time instrumentation, or code a route actually needed.
//
// Bytes are attributed by *exclusive reachability*: a file counts against an entry only if
// every path to it goes through that entry. Anything reachable from more than one entry is
// reported as shared, because removing either entry would not free it.
import { readFileSync } from "node:fs";

const [, , graphPath, sizesPath] = process.argv;
if (!graphPath || !sizesPath) throw new Error("usage: analyze-require-graph.mjs <graph.json> <sizes.json>");

const edges = JSON.parse(readFileSync(graphPath, "utf8"));
const sizes = JSON.parse(readFileSync(sizesPath, "utf8"));

const children = new Map();
const allNodes = new Set();
for (const [parent, child] of edges) {
  allNodes.add(parent);
  allNodes.add(child);
  const list = children.get(parent) ?? [];
  list.push(child);
  children.set(parent, list);
}

const sizeOf = (file) => sizes[file] ?? 0;
const MiB = (bytes) => (bytes / 1048576).toFixed(2);

const reachableFrom = (roots) => {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const node = stack.pop();
    if (seen.has(node)) continue;
    seen.add(node);
    for (const child of children.get(node) ?? []) if (!seen.has(child)) stack.push(child);
  }
  return seen;
};

/**
 * Boot-time entries. Next runs `instrumentation` before serving anything, and Homarr uses it
 * to register cron tasks and the websocket server — the two subsystems that can drag the
 * whole integration and widget graph in before a single request arrives.
 */
const classify = (file) => {
  if (/instrumentation/.test(file)) return "instrumentation (cron tasks, websocket)";
  if (/\/\.next\/server\/app\//.test(file)) return "route bundles";
  if (/next\/dist/.test(file)) return "next framework";
  return null;
};

const entries = new Map();
for (const node of allNodes) {
  const kind = classify(node);
  if (!kind) continue;
  const list = entries.get(kind) ?? [];
  list.push(node);
  entries.set(kind, list);
}

console.log(`edges: ${edges.length.toLocaleString()}   nodes: ${allNodes.size.toLocaleString()}`);
const totalBytes = [...allNodes].reduce((sum, node) => sum + sizeOf(node), 0);
console.log(`total loaded source in the graph: ${MiB(totalBytes)} MiB\n`);

const reach = new Map();
for (const [kind, roots] of entries) reach.set(kind, reachableFrom(roots));

console.log("=== exclusive attribution (bytes only this entry can reach) ===");
for (const [kind, reachable] of reach) {
  let exclusive = 0;
  let exclusiveCount = 0;
  for (const node of reachable) {
    let onlyHere = true;
    for (const [otherKind, otherReachable] of reach) {
      if (otherKind !== kind && otherReachable.has(node)) {
        onlyHere = false;
        break;
      }
    }
    if (onlyHere) {
      exclusive += sizeOf(node);
      exclusiveCount++;
    }
  }
  console.log(
    `  ${MiB(exclusive).padStart(8)} MiB  ${String(exclusiveCount).padStart(5)} files   ${kind}  (reaches ${reachable.size} nodes total)`,
  );
}

// The heaviest single importers: a parent that alone drags in several MiB is the actionable
// unit, because that is the import a developer can make lazy.
console.log(`\n=== heaviest direct importers (own subtree, may overlap) ===`);
const subtreeSize = new Map();
for (const parent of children.keys()) {
  const reachable = reachableFrom([parent]);
  let bytes = 0;
  for (const node of reachable) bytes += sizeOf(node);
  subtreeSize.set(parent, { bytes, count: reachable.size });
}
const short = (file) => file.replace(/^.*\/(\.next|node_modules)\//, "$1/");
for (const [file, info] of [...subtreeSize.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 18)) {
  console.log(`  ${MiB(info.bytes).padStart(8)} MiB  ${String(info.count).padStart(5)} files   ${short(file).slice(0, 90)}`);
}
