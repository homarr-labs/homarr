import { gzipSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const nextRoot = join(repositoryRoot, "apps/nextjs/.next");
const budgetBytes = Number(process.env.CUSTOM_WIDGET_CHUNK_BUDGET_BYTES ?? 768 * 1024);
if (!Number.isSafeInteger(budgetBytes) || budgetBytes <= 0) {
  throw new Error("CUSTOM_WIDGET_CHUNK_BUDGET_BYTES must be a positive integer.");
}

async function collect(directory, predicate) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await collect(path, predicate)));
    else if (predicate(entry.name, path)) result.push(path);
  }
  return result;
}

async function resolveChunk(chunk) {
  const normalized = chunk.replace(/^\/_next\//u, "");
  const candidates = [join(nextRoot, normalized), join(nextRoot, "static/chunks", basename(normalized))];
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next manifest-path representation.
    }
  }
  return null;
}

let serverChunks;
let manifestPaths;
try {
  [serverChunks, manifestPaths] = await Promise.all([
    collect(join(nextRoot, "server/chunks/ssr"), (name) =>
      /^packages_widgets_src_custom-api_component.*\.js$/u.test(name),
    ),
    collect(join(nextRoot, "standalone"), (name) => name === "react-loadable-manifest.json"),
  ]);
} catch {
  throw new Error("Next.js build output is missing. Run the Next.js production build before the bundle check.");
}

const moduleIds = new Set();
for (const serverChunk of serverChunks) {
  const source = await readFile(serverChunk, "utf8");
  for (const match of source.matchAll(/loadableGenerated:\{modules:\[(\d+)\]\}/gu)) moduleIds.add(match[1]);
}
if (moduleIds.size === 0) {
  throw new Error("The Custom JSX dynamic module was not found in the Next.js server build.");
}

const routePayloads = [];
for (const manifestPath of manifestPaths) {
  const normalizedManifestPath = manifestPath.replaceAll("\\", "/");
  const isRuntimeOrWorkbenchRoute =
    normalizedManifestPath.includes("/(board)/") ||
    normalizedManifestPath.includes("/boards/(content)/(home)/") ||
    normalizedManifestPath.includes("/manage/custom-widgets/");
  if (!isRuntimeOrWorkbenchRoute) continue;
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = new Set();
  for (const moduleId of moduleIds) {
    for (const file of manifest[moduleId]?.files ?? []) if (file.endsWith(".js")) files.add(file);
  }
  if (files.size === 0) continue;

  let rawBytes = 0;
  let compressedBytes = 0;
  for (const file of files) {
    const chunkPath = await resolveChunk(file);
    if (!chunkPath) throw new Error(`Custom JSX chunk ${file} referenced by a route manifest is missing.`);
    const source = await readFile(chunkPath);
    rawBytes += source.byteLength;
    compressedBytes += gzipSync(source).byteLength;
  }
  routePayloads.push({ manifestPath, files: files.size, rawBytes, compressedBytes });
}
if (routePayloads.length === 0) {
  throw new Error("No route manifest references the Custom JSX dynamic module.");
}

routePayloads.sort((left, right) => right.compressedBytes - left.compressedBytes);
const largest = routePayloads[0];
if (largest.compressedBytes > budgetBytes) {
  throw new Error(
    `The largest Custom JSX route payload is ${largest.compressedBytes} gzip bytes (${largest.rawBytes} raw), exceeding the ${budgetBytes} byte budget in ${relative(nextRoot, largest.manifestPath)}.`,
  );
}
console.log(
  `Custom JSX bundle check passed: ${routePayloads.length} routes, largest payload ${largest.compressedBytes} gzip bytes (${largest.rawBytes} raw across ${largest.files} chunks).`,
);
