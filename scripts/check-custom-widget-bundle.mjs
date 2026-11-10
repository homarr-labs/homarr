import { gzipSync } from "node:zlib";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const nextRoot = resolve(process.env.CUSTOM_WIDGET_NEXT_ROOT ?? join(repositoryRoot, "apps/nextjs/.next"));
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

function isRuntimeOrWorkbenchRoute(manifestPath) {
  const normalizedManifestPath = manifestPath.replaceAll("\\", "/");
  return (
    normalizedManifestPath.includes("/(board)/") ||
    normalizedManifestPath.includes("/boards/(content)/(home)/") ||
    normalizedManifestPath.includes("/manage/custom-widgets/")
  );
}

let serverChunks;
let manifestPaths;
try {
  [serverChunks, manifestPaths] = await Promise.all([
    collect(join(nextRoot, "server/chunks/ssr"), (name) =>
      /^packages_widgets_src_custom-api_component.*\.js$/u.test(name),
    ),
    // Canonical route manifests survive compiler-cache restoration; standalone is assembled separately.
    collect(join(nextRoot, "server"), (name) => name === "react-loadable-manifest.json"),
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
  const hasRuntimeMarker = new Map();
  for (const manifestPath of manifestPaths) {
    if (!isRuntimeOrWorkbenchRoute(manifestPath)) continue;
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    for (const [moduleId, entry] of Object.entries(manifest)) {
      for (const file of entry.files ?? []) {
        if (!file.endsWith(".js")) continue;
        let hasMarker = hasRuntimeMarker.get(file);
        if (hasMarker === undefined) {
          const chunkPath = await resolveChunk(file);
          hasMarker = chunkPath ? (await readFile(chunkPath, "utf8")).includes("RUNTIME_RENDER_ERROR") : false;
          hasRuntimeMarker.set(file, hasMarker);
        }
        if (!hasMarker) continue;
        moduleIds.add(moduleId);
        break;
      }
    }
  }
}
if (moduleIds.size === 0) {
  throw new Error("The Custom JSX dynamic module was not found in the Next.js server build.");
}

const routePayloads = [];
for (const manifestPath of manifestPaths) {
  if (!isRuntimeOrWorkbenchRoute(manifestPath)) continue;
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
    if (!chunkPath) {
      try {
        const routeEntry = relative(join(nextRoot, "server"), manifestPath)
          .replaceAll("\\", "/")
          .replace(/\/react-loadable-manifest\.json$/u, ".js");
        let activeRoute = null;
        try {
          const appPaths = JSON.parse(await readFile(join(nextRoot, "server/app-paths-manifest.json"), "utf8"));
          activeRoute = Object.values(appPaths).includes(routeEntry);
        } catch {
          // The route index is optional diagnostic metadata.
        }
        const presentIds = [...moduleIds].filter((id) => manifest[id]).toSorted();
        const matchingIds = presentIds.filter((id) => (manifest[id].files ?? []).includes(file));
        const selectedIds = [...new Set([...matchingIds, ...presentIds])].slice(0, 8);
        const entries = [];
        for (const id of selectedIds) {
          const entryFiles = (manifest[id].files ?? []).filter((name) => name.endsWith(".js"));
          const references = [];
          for (const reference of [...new Set([file, ...entryFiles])]
            .filter((name) => entryFiles.includes(name))
            .slice(0, 8)) {
            const path = await resolveChunk(reference);
            if (!path) {
              references.push({ file: reference.slice(0, 256), exists: false });
              continue;
            }
            const { size } = await stat(path);
            let runtimeMarker = null;
            if (size <= 2 * 1024 * 1024) {
              runtimeMarker = (await readFile(path, "utf8")).includes("RUNTIME_RENDER_ERROR");
            }
            references.push({ file: reference.slice(0, 256), exists: true, bytes: size, runtimeMarker });
          }
          entries.push({ id: id.slice(0, 256), totalFiles: entryFiles.length, files: references });
        }
        const emittedChunks = (await readdir(join(nextRoot, "static/chunks")).catch(() => [])).toSorted();
        console.error(
          "[DEBUG-bundle-ci-20261110]",
          JSON.stringify({
            manifest: relative(nextRoot, manifestPath).slice(0, 512),
            activeRoute,
            markerReadLimitBytes: 2 * 1024 * 1024,
            totalModuleIds: moduleIds.size,
            matchingModuleIds: matchingIds.slice(0, 8).map((id) => id.slice(0, 256)),
            selectedEntries: entries,
            totalServerChunks: serverChunks.length,
            serverChunks: serverChunks
              .map((path) => basename(path))
              .toSorted()
              .slice(0, 8),
            totalEmittedChunks: emittedChunks.length,
            emittedChunks: emittedChunks.slice(0, 40),
          }),
        );
      } catch {
        console.error("[DEBUG-bundle-ci-20261110] Missing-chunk diagnostic metadata unavailable.");
      }
      throw new Error(`Custom JSX chunk ${file} referenced by a route manifest is missing.`);
    }
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
