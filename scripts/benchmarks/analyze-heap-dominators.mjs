// Computes real retained sizes from a .heapsnapshot and reports the biggest retainers.
//
//   node --max-old-space-size=8192 scripts/benchmarks/analyze-heap-dominators.mjs <file>
//
// Shallow-size histograms answer "what kind of objects exist" and are misleading for
// "what is costing memory": 4 MiB of `Object` spread over 95k instances says nothing about
// which subsystem is holding them. Retained size — everything that would be freed if a node
// were released — is the number that maps onto a cause, and it needs the dominator tree.
//
// Same algorithm Chrome DevTools uses: postorder the reachable graph, solve dominators by
// iterated predecessor intersection, then accumulate self sizes up the dominator tree.
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("usage: analyze-heap-dominators.mjs <file.heapsnapshot> [topN]");
const topN = Number(process.argv[3] ?? 40);

const snap = JSON.parse(readFileSync(file, "utf8"));
const meta = snap.snapshot.meta;

const nf = meta.node_fields;
const nStride = nf.length;
const nType = nf.indexOf("type");
const nName = nf.indexOf("name");
const nSelf = nf.indexOf("self_size");
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
const selfSize = (o) => nodes[o * nStride + nSelf];

console.log(`file: ${file}`);
console.log(`nodes: ${N.toLocaleString()}  edges: ${E.toLocaleString()}`);

// firstEdge[o] = index of node o's first edge.
const firstEdge = new Uint32Array(N + 1);
for (let o = 0, acc = 0; o < N; o++) {
  firstEdge[o] = acc;
  acc += nodes[o * nStride + nEdgeCount];
}
firstEdge[N] = E;

/**
 * Weak edges do not keep their target alive, so counting them would let a WeakMap or a
 * weak handle claim retention it does not actually have.
 */
const isWeak = (e) => edgeTypes[edges[e * eStride + eType]] === "weak";

// ---------------------------------------------------------------- postorder from the root
const postOrder = new Int32Array(N).fill(-1); // node ordinal -> postorder index
const postOrderNodes = new Int32Array(N);
{
  const visited = new Uint8Array(N);
  // Explicit stack: the graph is far too deep for recursion.
  const stackNode = new Int32Array(N + 1);
  const stackEdge = new Uint32Array(N + 1);
  let post = 0;
  let top = 0;
  stackNode[0] = 0;
  stackEdge[0] = firstEdge[0];
  visited[0] = 1;
  while (top >= 0) {
    const node = stackNode[top];
    let e = stackEdge[top];
    let descended = false;
    while (e < firstEdge[node + 1]) {
      if (isWeak(e)) {
        e++;
        continue;
      }
      const child = edges[e * eStride + eTo] / nStride;
      e++;
      if (!visited[child]) {
        visited[child] = 1;
        stackEdge[top] = e;
        top++;
        stackNode[top] = child;
        stackEdge[top] = firstEdge[child];
        descended = true;
        break;
      }
    }
    if (descended) continue;
    stackEdge[top] = e;
    if (e >= firstEdge[node + 1]) {
      postOrder[node] = post;
      postOrderNodes[post] = node;
      post++;
      top--;
    }
  }
  console.log(`reachable from root: ${post.toLocaleString()} nodes`);
  // Unreachable nodes keep postOrder -1 and are excluded from the dominator solve.
  var reachableCount = post;
}

// ------------------------------------------------- reverse edges, restricted to reachable
const inDeg = new Uint32Array(N);
for (let src = 0; src < N; src++) {
  if (postOrder[src] === -1) continue;
  for (let e = firstEdge[src]; e < firstEdge[src + 1]; e++) {
    if (isWeak(e)) continue;
    const dst = edges[e * eStride + eTo] / nStride;
    if (postOrder[dst] !== -1) inDeg[dst]++;
  }
}
const revStart = new Uint32Array(N + 1);
{
  let acc = 0;
  for (let o = 0; o < N; o++) {
    revStart[o] = acc;
    acc += inDeg[o];
  }
  revStart[N] = acc;
}
const revTo = new Uint32Array(revStart[N]);
{
  const cursor = Uint32Array.from(revStart.subarray(0, N));
  for (let src = 0; src < N; src++) {
    if (postOrder[src] === -1) continue;
    for (let e = firstEdge[src]; e < firstEdge[src + 1]; e++) {
      if (isWeak(e)) continue;
      const dst = edges[e * eStride + eTo] / nStride;
      if (postOrder[dst] !== -1) revTo[cursor[dst]++] = src;
    }
  }
}

// -------------------------------------------------------------------- dominators
const rootPost = postOrder[0];
const dom = new Int32Array(reachableCount).fill(-1);
dom[rootPost] = rootPost;
{
  const intersect = (a, b) => {
    // Higher postorder index is closer to the root, so walking the smaller one upward
    // converges on the nearest common dominator.
    while (a !== b) {
      if (a < b) a = dom[a];
      else b = dom[b];
      if (a === -1 || b === -1) return -1;
    }
    return a;
  };
  let changed = true;
  let sweeps = 0;
  while (changed) {
    changed = false;
    sweeps++;
    for (let i = reachableCount - 1; i >= 0; i--) {
      if (i === rootPost) continue;
      const node = postOrderNodes[i];
      let newDom = -1;
      for (let r = revStart[node]; r < revStart[node + 1]; r++) {
        const predPost = postOrder[revTo[r]];
        if (predPost === -1 || dom[predPost] === -1) continue;
        newDom = newDom === -1 ? predPost : intersect(newDom, predPost);
        if (newDom === -1) break;
      }
      if (newDom !== -1 && dom[i] !== newDom) {
        dom[i] = newDom;
        changed = true;
      }
    }
  }
  console.log(`dominator solve converged in ${sweeps} sweeps`);
}

// ---------------------------------------------------------------- retained sizes
const retained = new Float64Array(reachableCount);
for (let i = 0; i < reachableCount; i++) retained[i] = selfSize(postOrderNodes[i]);
for (let i = 0; i < reachableCount; i++) {
  if (i === rootPost) continue;
  const d = dom[i];
  if (d !== -1 && d !== i) retained[d] += retained[i];
}

const MiB = (bytes) => (bytes / 1048576).toFixed(2);

// A node whose dominator is the root is a top-level owner: its retained size is memory that
// only it holds. Those are the entries worth naming.
const label = (o) => {
  const type = nodeType(o);
  const name = nodeName(o) || "(anonymous)";
  return `${type}:${name}`;
};

const candidates = [];
for (let i = 0; i < reachableCount; i++) {
  if (i === rootPost) continue;
  if (retained[i] < 262144) continue;
  candidates.push(i);
}
candidates.sort((a, b) => retained[b] - retained[a]);

console.log(`\n=== largest retainers (retained size = freed if this went away) ===`);
console.log(`${"retained".padStart(10)} ${"self".padStart(9)}  what`);
const shown = [];
for (const i of candidates) {
  const node = postOrderNodes[i];
  // Skip a node whose dominator is already listed: its bytes are counted in that ancestor,
  // so printing both would double-report the same memory.
  let ancestor = dom[i];
  let covered = false;
  for (let guard = 0; guard < 200 && ancestor !== -1 && ancestor !== rootPost; guard++) {
    if (shown.includes(ancestor)) {
      covered = true;
      break;
    }
    ancestor = dom[ancestor];
  }
  if (covered) continue;
  shown.push(i);
  console.log(`${MiB(retained[i]).padStart(10)} ${MiB(selfSize(node)).padStart(9)}  ${label(node).slice(0, 96)}`);
  if (shown.length >= topN) break;
}

// Grouping by constructor over retained size shows which *kind* of thing dominates, which
// is what a shallow histogram cannot express.
const byName = new Map();
for (let i = 0; i < reachableCount; i++) {
  const node = postOrderNodes[i];
  const key = label(node);
  const acc = byName.get(key) ?? { retained: 0, self: 0, count: 0 };
  acc.self += selfSize(node);
  acc.count++;
  byName.set(key, acc);
}
console.log(`\n=== self size by constructor, top 15 (for cross-checking the above) ===`);
for (const [name, acc] of [...byName.entries()].sort((a, b) => b[1].self - a[1].self).slice(0, 15)) {
  console.log(`${MiB(acc.self).padStart(10)} MiB  ${String(acc.count).padStart(8)}x  ${name.slice(0, 80)}`);
}
