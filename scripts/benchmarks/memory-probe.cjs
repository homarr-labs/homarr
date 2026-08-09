/**
 * Preloaded into the server with `NODE_OPTIONS=--require /probe/memory-probe.cjs` so
 * memory attribution can reach things the inspector cannot.
 *
 * Node's inspector evaluates in the main context, where `require` is a module-scoped
 * variable rather than a global — and the Next standalone entry does not set
 * `process.mainModule` — so `v8.getHeapSpaceStatistics()` and the CommonJS module cache
 * are both unreachable from a plain `Runtime.evaluate`. A preload runs as a real module,
 * so it can park what is needed on `globalThis`, which the inspector *can* see.
 *
 * Diagnostics only. Never part of a shipped image: it is mounted in by the benchmark
 * harness and costs a few hundred KiB of retained bookkeeping.
 */
const v8 = require("v8");
const fs = require("fs");
const path = require("path");
const Module = require("module");

/** Cache stat() results: the same chunk is asked about at every capture stage. */
const sizeCache = new Map();
const fileSize = (file) => {
  if (sizeCache.has(file)) return sizeCache.get(file);
  let size = 0;
  try {
    size = fs.statSync(file).size;
  } catch {
    size = 0;
  }
  sizeCache.set(file, size);
  return size;
};

/**
 * Which package a loaded file belongs to. Server bundle chunks live under
 * `.next/server/chunks`, so they are grouped separately from real node_modules
 * packages — a chunk's cost belongs to "what Next inlined", not to one dependency.
 */
const attributeFile = (file) => {
  const nodeModules = file.lastIndexOf("/node_modules/");
  if (nodeModules !== -1) {
    const rest = file.slice(nodeModules + "/node_modules/".length);
    const parts = rest.split("/");
    const pkg = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
    if (pkg === "next") {
      if (rest.includes("/dist/compiled/")) return "next/dist/compiled (vendored deps)";
      return "next/dist (framework runtime)";
    }
    return `node_modules: ${pkg}`;
  }
  if (file.includes("/.next/server/chunks/")) return ".next/server/chunks (bundled app code)";
  if (file.includes("/.next/server/app/")) return ".next/server/app (route bundles)";
  if (file.includes("/.next/server/pages/")) return ".next/server/pages";
  if (file.includes("/.next/server/")) return ".next/server (other)";
  if (file.includes("/.next/")) return ".next (other)";
  return `app: ${path.dirname(file).split("/").slice(-2).join("/")}`;
};

globalThis.__homarrProbe = {
  /** Per-space heap statistics: separates live JS objects from compiled code. */
  spaces: () => v8.getHeapSpaceStatistics(),
  heap: () => v8.getHeapStatistics(),
  usage: () => process.memoryUsage(),

  /**
   * Every file the CommonJS loader has resolved, with its on-disk byte size grouped by
   * owner. V8 keeps a script's source string alive for as long as any function in it
   * might still need lazy compilation, so these sizes are a direct lower bound on how
   * much heap the loaded code costs before a single object is allocated.
   */
  modules: () => {
    const cache = Module._cache ?? {};
    const groups = new Map();
    let total = 0;
    let count = 0;
    for (const file of Object.keys(cache)) {
      const size = fileSize(file);
      total += size;
      count++;
      const key = attributeFile(file);
      const acc = groups.get(key) ?? { bytes: 0, files: 0 };
      acc.bytes += size;
      acc.files++;
      groups.set(key, acc);
    }
    return {
      totalBytes: total,
      fileCount: count,
      groups: [...groups.entries()]
        .map(([name, acc]) => ({ name, ...acc }))
        .sort((a, b) => b.bytes - a.bytes),
    };
  },

  /** The individual loaded files, largest first — for naming specific offenders. */
  largestModules: (limit = 40) =>
    Object.keys(Module._cache ?? {})
      .map((file) => ({ file, bytes: fileSize(file) }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, limit),

  /** Raw list of resolved files, so two capture stages can be diffed. */
  moduleFiles: () => Object.keys(Module._cache ?? {}),

  /** Native bindings pulled in by the process, in load order. */
  moduleLoadList: () => process.moduleLoadList.slice(),
};

/**
 * Opt-in recording of the CommonJS require graph.
 *
 * Knowing that 24 MiB of source is resident at boot does not say *why* any of it is there.
 * The module cache is a flat list with no parentage, so the only way to answer "what pulled
 * this chunk in" is to record parent → child as the loader resolves it. The preload runs
 * before Next, so the graph is complete from the entry point down.
 *
 * Enable with HOMARR_PROBE_TRACK_REQUIRES=1.
 */
if (process.env.HOMARR_PROBE_TRACK_REQUIRES === "1") {
  const edges = new Set();
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    const result = originalLoad.call(this, request, parent, isMain);
    try {
      const resolved = Module._resolveFilename(request, parent, isMain);
      // Builtins resolve to their bare name and carry no file cost, so they only add noise.
      if (resolved.includes("/")) edges.add(`${parent ? parent.filename : "(entry)"}\t${resolved}`);
    } catch {
      // An unresolvable request is the caller's problem, not the probe's.
    }
    return result;
  };
  globalThis.__homarrProbe.requireGraph = () => [...edges].map((edge) => edge.split("\t"));
}

/**
 * Opt-in tracking of large Buffer allocations, by allocation site.
 *
 * `process.memoryUsage().arrayBuffers` can show ~100 MiB without any hint of who asked for
 * it, and a heap snapshot does not help: an ArrayBuffer's backing store lives outside the
 * JS heap, so the snapshot shows a small wrapper object and none of the bytes. Wrapping the
 * allocators and keeping a stack per call is the only way to get from "94 MiB of buffers"
 * to a file and line.
 *
 * Only allocations at or above the threshold are recorded, so the common small-buffer path
 * keeps its normal cost. Enable with HOMARR_PROBE_TRACK_BUFFERS=<bytes>.
 */
const trackThreshold = Number(process.env.HOMARR_PROBE_TRACK_BUFFERS ?? 0);
const bufferSites = new Map();
let trackedBytes = 0;
let trackedCount = 0;
if (trackThreshold > 0) {
  const record = (size) => {
    if (size < trackThreshold) return;
    trackedBytes += size;
    trackedCount++;
    // Frames 0-2 are Error/this wrapper, so skip them to land on the real caller.
    const stack = (new Error().stack ?? "").split("\n").slice(3, 9).join("\n");
    const acc = bufferSites.get(stack) ?? { bytes: 0, count: 0, max: 0 };
    acc.bytes += size;
    acc.count++;
    if (size > acc.max) acc.max = size;
    bufferSites.set(stack, acc);
  };

  for (const name of ["alloc", "allocUnsafe", "allocUnsafeSlow"]) {
    const original = Buffer[name];
    if (typeof original !== "function") continue;
    Buffer[name] = function (size, ...rest) {
      record(typeof size === "number" ? size : 0);
      return original.call(this, size, ...rest);
    };
  }
  /**
   * Buffers big enough to matter get their first bytes recorded. A stack says undici
   * buffered a body; only the bytes say whether that body was JSON, an image or a video
   * stream, and that is what decides whether the fix is a cap, a stream or a different URL.
   */
  const PREVIEW_THRESHOLD = 4 * 1048576;
  const previews = [];
  const originalConcat = Buffer.concat;
  Buffer.concat = function (list, totalLength) {
    const size = typeof totalLength === "number" ? totalLength : list.reduce((sum, item) => sum + item.length, 0);
    record(size);
    const result = originalConcat.call(this, list, totalLength);
    if (size >= PREVIEW_THRESHOLD && previews.length < 20) {
      previews.push({
        size,
        chunks: list.length,
        hex: result.subarray(0, 24).toString("hex"),
        text: result.subarray(0, 220).toString("latin1").replace(/[^\x20-\x7e]/g, "."),
        stack: (new Error().stack ?? "").split("\n").slice(2, 12).join("\n"),
      });
    }
    return result;
  };
  globalThis.__homarrProbe.previews = () => previews;

  // Default of 10 frames loses the caller behind undici's microtask hops.
  Error.stackTraceLimit = 30;

  globalThis.__homarrProbe.buffers = () => ({
    threshold: trackThreshold,
    previews: globalThis.__homarrProbe.previews ? globalThis.__homarrProbe.previews() : [],
    totalBytes: trackedBytes,
    count: trackedCount,
    sites: [...bufferSites.entries()]
      .map(([stack, acc]) => ({ stack, ...acc }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 25),
  });
}

/**
 * Opt-in tracking of outbound fetch responses, by URL.
 *
 * Buffer-allocation stacks say *how* memory was allocated (undici buffering a whole body)
 * but not *which request* did it, because the URL is not on the stack. Wrapping fetch before
 * Next loads means every caller gets the instrumented version, so a single oversized
 * integration response can be named. Enable with HOMARR_PROBE_TRACK_FETCH=1.
 */
if (process.env.HOMARR_PROBE_TRACK_FETCH === "1" && typeof globalThis.fetch === "function") {
  const originalFetch = globalThis.fetch;
  const fetchStats = new Map();
  /** Group by origin+path with the query string dropped: tokens and ids would fragment the table. */
  const keyFor = (url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return String(url).slice(0, 120);
    }
  };

  globalThis.fetch = async function (resource, options) {
    const url = typeof resource === "string" ? resource : (resource?.url ?? String(resource));
    const response = await originalFetch.call(this, resource, options);
    const key = keyFor(url);
    const acc = fetchStats.get(key) ?? { calls: 0, declaredBytes: 0, readBytes: 0, maxRead: 0, unknownLength: 0 };
    acc.calls++;
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (declared > 0) acc.declaredBytes += declared;
    else acc.unknownLength++;
    fetchStats.set(key, acc);

    // Body readers are wrapped rather than trusting content-length, because chunked and
    // gzipped responses declare nothing and those are exactly the large ones.
    for (const method of ["json", "text", "arrayBuffer"]) {
      const originalMethod = response[method];
      if (typeof originalMethod !== "function") continue;
      response[method] = async function (...rest) {
        const before = process.memoryUsage().arrayBuffers;
        const value = await originalMethod.apply(this, rest);
        const size =
          method === "text" && typeof value === "string"
            ? value.length
            : method === "arrayBuffer" && value?.byteLength
              ? value.byteLength
              : Math.max(0, process.memoryUsage().arrayBuffers - before);
        acc.readBytes += size;
        if (size > acc.maxRead) acc.maxRead = size;
        return value;
      };
    }
    return response;
  };

  globalThis.__homarrProbe.fetches = () => ({
    total: [...fetchStats.values()].reduce((sum, acc) => sum + acc.readBytes, 0),
    sites: [...fetchStats.entries()]
      .map(([url, acc]) => ({ url, ...acc }))
      .sort((a, b) => Math.max(b.readBytes, b.declaredBytes) - Math.max(a.readBytes, a.declaredBytes))
      .slice(0, 30),
  });
}

/**
 * A localhost-only JSON endpoint for the same data. Sampling over the inspector needs
 * SIGUSR1 and a CDP handshake per capture, which is too heavy to run at every stage of a
 * stress run; this is a plain fetch. Only started when HOMARR_PROBE_PORT is set, so the
 * preload does nothing observable unless the harness asks for it.
 */
const probePort = Number(process.env.HOMARR_PROBE_PORT ?? 0);
if (probePort > 0) {
  const probe = globalThis.__homarrProbe;
  require("http")
    .createServer((request, response) => {
      let body;
      try {
        // The raw file list is served separately: it is long, and every stage of a stress
        // run fetches the summary, so keeping it out of the default payload keeps those
        // captures small while still allowing a boot-vs-loaded diff on demand.
        body =
          request.url === "/files"
            ? JSON.stringify(probe.moduleFiles())
            : request.url === "/buffers"
              ? JSON.stringify(probe.buffers ? probe.buffers() : { disabled: true })
              : request.url === "/fetches"
                ? JSON.stringify(probe.fetches ? probe.fetches() : { disabled: true })
                : request.url === "/requires"
                  ? JSON.stringify(probe.requireGraph ? probe.requireGraph() : { disabled: true })
                  : JSON.stringify({
                usage: probe.usage(),
                spaces: probe.spaces(),
                heap: probe.heap(),
                modules: probe.modules(),
                largestModules: probe.largestModules(25),
                uptime: process.uptime(),
                execArgv: process.execArgv,
              });
      } catch (error) {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: String(error && error.message) }));
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(body);
    })
    // NODE_OPTIONS applies to every node process in the container, including the DB
    // migration step and any `docker exec node` the harness runs, so all of them load this
    // preload and race for the port. Only the long-lived server needs to serve; the rest
    // must carry on silently rather than dying on EADDRINUSE.
    .on("error", (error) => {
      if (error.code !== "EADDRINUSE") throw error;
    })
    .listen(probePort, "127.0.0.1", () => console.log(`[memory-probe] listening on 127.0.0.1:${probePort}`));
}
