// Lists the largest strings in a .heapsnapshot with a content preview, and buckets
// them by what they look like. Aggregate "37 MiB of strings" says nothing about
// whether that is base64 images, translations, or bundled source.
import { readFileSync } from "node:fs";

const snap = JSON.parse(readFileSync(process.argv[2], "utf8"));
const meta = snap.snapshot.meta;
const nf = meta.node_fields;
const stride = nf.length;
const iType = nf.indexOf("type");
const iName = nf.indexOf("name");
const iSelf = nf.indexOf("self_size");
const nodeTypes = meta.node_types[0];
const nodes = snap.nodes;
const strings = snap.strings;
const N = snap.snapshot.node_count;

const classify = (text) => {
  if (/^data:[^;]+;base64,/.test(text)) return "data-URL (base64 inline image)";
  if (/^[A-Za-z0-9+/]{200,}={0,2}$/.test(text.slice(0, 400))) return "bare base64 blob";
  if (/^(https?:)?\/\//.test(text)) return "URL";
  if (/^\s*[[{]/.test(text) && text.length > 200) return "JSON payload";
  if (/^<svg|^<\?xml/.test(text)) return "inline SVG";
  if (/function |=>|require\(|import /.test(text) && text.length > 400) return "source/code";
  return "other text";
};

const items = [];
let totalStringBytes = 0;
for (let i = 0; i < N; i++) {
  const base = i * stride;
  const type = nodeTypes[nodes[base + iType]];
  if (type !== "string" && type !== "concatenated string" && type !== "sliced string") continue;
  const self = nodes[base + iSelf];
  totalStringBytes += self;
  const text = strings[nodes[base + iName]] ?? "";
  items.push({ self, text });
}

items.sort((a, b) => b.self - a.self);
const MiB = (b) => (b / 1048576).toFixed(2);

console.log(`total string bytes: ${MiB(totalStringBytes)} MiB across ${items.length.toLocaleString()} strings\n`);

console.log("=== 25 largest strings ===");
console.log("KiB".padStart(9), " kind".padEnd(34), "preview");
for (const item of items.slice(0, 25)) {
  const kind = classify(item.text);
  const preview = item.text.replace(/\s+/g, " ").slice(0, 80);
  console.log((item.self / 1024).toFixed(1).padStart(9), ` ${kind.padEnd(33)}`, preview);
}

const buckets = new Map();
for (const item of items) {
  const kind = classify(item.text);
  const acc = buckets.get(kind) ?? { bytes: 0, n: 0 };
  acc.bytes += item.self;
  acc.n++;
  buckets.set(kind, acc);
}
console.log("\n=== string bytes by kind ===");
console.log("MiB".padStart(9), "count".padStart(10), " kind");
for (const [kind, v] of [...buckets.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(MiB(v.bytes).padStart(9), String(v.n).padStart(10), ` ${kind}`);
}
