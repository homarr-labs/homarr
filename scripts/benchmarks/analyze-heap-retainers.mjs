// Builds a reverse-edge index over a .heapsnapshot and walks upward from the
// heaviest object groups to find who retains them. Answers "what is holding
// these 800k objects", which shallow-size aggregation cannot.
import { readFileSync } from "node:fs";

const file = process.argv[2];
const snap = JSON.parse(readFileSync(file, "utf8"));
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
const nodeType = (o) => nodeTypes[nodes[o * nStride + nType]] ?? "?";

// firstEdge[o] = index of node o's first edge
const firstEdge = new Uint32Array(N + 1);
for (let o = 0, acc = 0; o < N; o++) {
  firstEdge[o] = acc;
  acc += nodes[o * nStride + nEdgeCount];
}
firstEdge[N] = E;

// Reverse index via counting sort.
const inDeg = new Uint32Array(N);
for (let e = 0; e < E; e++) inDeg[edges[e * eStride + eTo] / nStride]++;
const revStart = new Uint32Array(N + 1);
for (let o = 0, acc = 0; o < N; o++) {
  revStart[o] = acc;
  acc += inDeg[o];
}
revStart[N] = E;
const cursor = Uint32Array.from(revStart.subarray(0, N));
const revTo = new Uint32Array(E);
for (let src = 0; src < N; src++) {
  for (let e = firstEdge[src]; e < firstEdge[src + 1]; e++) {
    revTo[cursor[edges[e * eStride + eTo] / nStride]++] = src;
  }
}

const edgeLabelInto = (src, dstOrd) => {
  for (let e = firstEdge[src]; e < firstEdge[src + 1]; e++) {
    if (edges[e * eStride + eTo] / nStride === dstOrd) {
      const t = edgeTypes[edges[e * eStride + eType]];
      const raw = edges[e * eStride + eName];
      return t === "element" || t === "hidden" ? `[${raw}]` : (strings[raw] ?? String(raw));
    }
  }
  return "?";
};

const interesting = (o) => {
  const n = nodeName(o);
  const t = nodeType(o);
  if (!n) return false;
  if (t === "synthetic") return true;
  return !/^(system|Object|Array|\(.*\))/.test(n);
};

// Walk up to `maxDepth` retainers, preferring paths that reach something named.
const retainerPath = (start, maxDepth = 14) => {
  const seen = new Set([start]);
  let frontier = [{ ord: start, path: [] }];
  for (let d = 0; d < maxDepth; d++) {
    const next = [];
    for (const { ord, path } of frontier) {
      for (let r = revStart[ord]; r < revStart[ord + 1]; r++) {
        const src = revTo[r];
        if (seen.has(src)) continue;
        seen.add(src);
        const step = `${nodeType(src)}:${nodeName(src) || "-"} --${edgeLabelInto(src, ord)}-->`;
        const newPath = [step, ...path];
        if (interesting(src)) return newPath;
        next.push({ ord: src, path: newPath });
        if (next.length > 4000) break;
      }
    }
    if (!next.length) break;
    frontier = next.slice(0, 4000);
  }
  return null;
};

const target = process.argv[3] ?? "rb";
const wantType = process.argv[4];
const sampleSize = Number(process.argv[5] ?? 12);

const matches = [];
for (let o = 0; o < N && matches.length < 400000; o++) {
  if (nodeName(o) === target && (!wantType || nodeType(o) === wantType)) matches.push(o);
}
console.log(`target "${target}"${wantType ? ` (type ${wantType})` : ""}: ${matches.length} instances`);

const counts = new Map();
const step = Math.max(1, Math.floor(matches.length / sampleSize));
for (let i = 0; i < matches.length; i += step) {
  const p = retainerPath(matches[i]);
  if (!p) continue;
  const key = p.slice(-4).join(" ");
  counts.set(key, (counts.get(key) ?? 0) + 1);
}
console.log("\n=== most common retainer tails (nearest 4 hops) ===");
for (const [k, v] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  ${v}x  ${k}`);
}
