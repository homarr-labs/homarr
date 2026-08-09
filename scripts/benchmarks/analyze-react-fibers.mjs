// Aggregates React Fiber nodes by their `type`/`elementType` target, giving a
// component/element histogram of the live tree — i.e. what is actually mounted.
import { readFileSync } from "node:fs";

const snap = JSON.parse(readFileSync(process.argv[2], "utf8"));
const meta = snap.snapshot.meta;

const nf = meta.node_fields;
const nStride = nf.length;
const nType = nf.indexOf("type");
const nName = nf.indexOf("name");
const nEdgeCount = nf.indexOf("edge_count");
const nodeTypes = meta.node_types[0];

const ef = meta.edge_fields;
const eStride = ef.length;
const eType = ef.indexOf("type");
const eName = ef.indexOf("name_or_index");
const eTo = ef.indexOf("to_node");
const edgeTypes = meta.edge_types[0];

const nodes = snap.nodes;
const edges = snap.edges;
const strings = snap.strings;
const N = snap.snapshot.node_count;
const E = snap.snapshot.edge_count;

const nodeName = (o) => strings[nodes[o * nStride + nName]] ?? "";
const nodeTypeName = (o) => nodeTypes[nodes[o * nStride + nType]] ?? "?";

const firstEdge = new Uint32Array(N + 1);
for (let o = 0, acc = 0; o < N; o++) {
  firstEdge[o] = acc;
  acc += nodes[o * nStride + nEdgeCount];
}
firstEdge[N] = E;

const fiberClass = process.argv[3] ?? "rb";
const hist = new Map();
let fibers = 0;
let withoutType = 0;

for (let o = 0; o < N; o++) {
  if (nodeName(o) !== fiberClass || nodeTypeName(o) !== "object") continue;
  fibers++;
  let label = null;
  for (let e = firstEdge[o]; e < firstEdge[o + 1]; e++) {
    const et = edgeTypes[edges[e * eStride + eType]];
    if (et === "element" || et === "hidden") continue;
    const prop = strings[edges[e * eStride + eName]];
    if (prop !== "type" && prop !== "elementType") continue;
    const dst = edges[e * eStride + eTo] / nStride;
    const dt = nodeTypeName(dst);
    const dn = nodeName(dst);
    // Host elements point at a string ("div"); components at a closure/object.
    if (dt === "string" || dt === "concatenated string") label = `<${dn}>`;
    else if (dn) label = `${dt}:${dn}`;
    else label = `${dt}:(anonymous)`;
    if (prop === "type") break;
  }
  if (!label) {
    withoutType++;
    continue;
  }
  hist.set(label, (hist.get(label) ?? 0) + 1);
}

console.log(`live fibers: ${fibers.toLocaleString()} (no type edge: ${withoutType.toLocaleString()})`);
console.log(`distinct types: ${hist.size}\n`);
console.log("count".padStart(9), " fiber type");
for (const [k, v] of [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
  console.log(String(v).padStart(9), ` ${k.slice(0, 90)}`);
}
