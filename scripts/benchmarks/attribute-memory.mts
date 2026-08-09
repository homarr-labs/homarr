/**
 * Full RAM attribution for a running Homarr container, top-down:
 *
 *   cgroup  ->  processes  ->  address-space mappings  ->  V8 spaces  ->  JS objects
 *
 * Every layer is measured, and each layer's total is reconciled against the one
 * above it so nothing hides in a rounding gap. The point is to answer "what takes
 * what" with numbers that add up, rather than quoting one aggregate (`memory.current`,
 * `heapUsed`) that silently omits most of the footprint.
 *
 *   node --experimental-strip-types scripts/benchmarks/attribute-memory.mts <container>
 *
 * Notes on the layers, because each one measures something different:
 *  - cgroup `anon` is the number that counts against a container limit and cannot be
 *    reclaimed. `memory.current` also includes page cache, which swings by tens of MiB
 *    for reasons unrelated to the app.
 *  - `smaps` is the only place the split between JS heap, JIT code, native malloc and
 *    mapped shared libraries is visible. V8's own numbers cover just its heap.
 *  - `heapUsed` is live JS objects. `heapTotal` is what V8 has committed, including
 *    free space it is holding for reuse. The gap between them is real RSS.
 */
import { execFile, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const container = process.argv[2];
if (!container) throw new Error("usage: attribute-memory.mts <container> [--snapshot <file>] [--label <name>]");
const snapshotIndex = process.argv.indexOf("--snapshot");
const snapshotPath = snapshotIndex === -1 ? undefined : process.argv[snapshotIndex + 1];
const labelIndex = process.argv.indexOf("--label");
const label = labelIndex === -1 ? "current" : (process.argv[labelIndex + 1] ?? "current");

const MiB = (bytes: number) => Math.round((bytes / 1048576) * 10) / 10;
const pad = (value: string | number, width: number) => String(value).padStart(width);

const execIn = async (script: string) => {
  const { stdout } = await execFileAsync("docker", ["exec", container, "sh", "-c", script], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
};

/**
 * Piping to stdin avoids the escaping problems of `node -e "..."` through two shells.
 * NODE_OPTIONS is cleared because the container may carry a `--require` preload meant only
 * for the long-lived server; inheriting it into every helper is wasted work at best.
 */
const execNodeIn = (script: string) =>
  new Promise<string>((resolve, reject) => {
    const proc = spawn("docker", ["exec", "-e", "NODE_OPTIONS=", "-i", container, "node"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => (stdout += chunk));
    proc.stderr.on("data", (chunk) => (stderr += chunk));
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `node exited ${code}`))));
    proc.stdin.end(script);
  });

/** comm is truncated to 15 chars and Next retitles itself, so match by prefix. */
const findServerPidAsync = async () => {
  const out = await execIn(
    `for p in /proc/[0-9]*; do n=$(cat "$p/comm" 2>/dev/null);` +
      ` case "$n" in node*|next-server*|bun*) echo "$(basename "$p") $n";; esac; done`,
  );
  const line = out.trim().split("\n").filter(Boolean)[0];
  if (!line) throw new Error("no node/next-server/bun process found in the container");
  const [pid, comm] = line.split(/\s+/);
  return { pid: Number(pid), comm: comm ?? "?" };
};

const { pid, comm } = await findServerPidAsync();

// ---------------------------------------------------------------- layer 1: cgroup
const cgroupRaw = await execIn(
  `cat /sys/fs/cgroup/memory.current; echo ---; cat /sys/fs/cgroup/memory.peak 2>/dev/null || echo 0; echo ---; cat /sys/fs/cgroup/memory.stat`,
);
const [currentRaw, peakRaw, statRaw] = cgroupRaw.split("---");
const cgroupStat = new Map<string, number>();
for (const line of (statRaw ?? "").trim().split("\n")) {
  const [key, value] = line.trim().split(/\s+/);
  if (key && value) cgroupStat.set(key, Number(value));
}
const cgroupCurrent = Number((currentRaw ?? "0").trim());
const cgroupPeak = Number((peakRaw ?? "0").trim());

// ---------------------------------------------------------- layer 2: per-process RSS
const perProcessRaw = await execIn(
  `for p in /proc/[0-9]*/status; do awk '/^Name:/{n=$2} /^VmRSS:/{print n" "$2}' "$p" 2>/dev/null; done`,
);
const processes = perProcessRaw
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [name, kib] = line.trim().split(/\s+/);
    return { name: name ?? "?", bytes: Number(kib) * 1024 };
  })
  .sort((a, b) => b.bytes - a.bytes);

// ------------------------------------------------- layer 3: address space via smaps
/**
 * Buckets every mapping of the server process. The categories are chosen so each maps
 * onto a distinct cause a developer can act on:
 *   - `.so` / node binary text: the runtime and native addons, mostly shared and
 *     file-backed, so cheap and not something app code controls.
 *   - JIT code: anonymous executable pages, i.e. what V8 compiled at runtime. Grows
 *     with how much JavaScript actually ran, not with how much shipped.
 *   - large anonymous: V8's heap reservations and big malloc'd blocks.
 *   - small anonymous: malloc arenas and thread stacks.
 */
const smapsRaw = await execIn(`cat /proc/${pid}/smaps`);
type Mapping = { start: number; end: number; size: number; rss: number; anonymous: number; perms: string; path: string };
const mappings: Mapping[] = [];
{
  let current: Mapping | undefined;
  for (const line of smapsRaw.split("\n")) {
    const header = /^([0-9a-f]+)-([0-9a-f]+)\s+(\S{4})\s+\S+\s+\S+\s+\S+\s*(.*)$/.exec(line);
    if (header) {
      if (current) mappings.push(current);
      const start = Number.parseInt(header[1]!, 16);
      const end = Number.parseInt(header[2]!, 16);
      current = { start, end, size: end - start, rss: 0, anonymous: 0, perms: header[3]!, path: (header[4] ?? "").trim() };
      continue;
    }
    if (!current) continue;
    const rss = /^Rss:\s+(\d+) kB/.exec(line);
    if (rss) current.rss = Number(rss[1]) * 1024;
    const anon = /^Anonymous:\s+(\d+) kB/.exec(line);
    if (anon) current.anonymous = Number(anon[1]) * 1024;
  }
  if (current) mappings.push(current);
}

/**
 * Anonymous mappings cannot be told apart by size alone: V8 carves its heap out of one
 * huge reservation in ~256 KiB pages, so /proc shows hundreds of small `rw-p` mappings
 * that look exactly like malloc arenas. Grouping address-adjacent anonymous mappings
 * back into the reservation they came from restores the distinction — a region reserving
 * gigabytes of address space is V8's cage, and committed RSS inside it is the JS heap.
 * Everything anonymous outside those regions is native: malloc, Buffers, thread stacks.
 */
const anonymousMappings = mappings.filter((mapping) => !mapping.path).sort((a, b) => a.start - b.start);
type Region = { start: number; end: number; reserved: number; rss: number; exec: boolean; maps: number };
const regions: Region[] = [];
for (const mapping of anonymousMappings) {
  const last = regions.at(-1);
  if (last && mapping.start === last.end) {
    last.end = mapping.end;
    last.reserved += mapping.size;
    last.rss += mapping.rss;
    last.exec ||= mapping.perms.includes("x");
    last.maps++;
    continue;
  }
  regions.push({
    start: mapping.start,
    end: mapping.end,
    reserved: mapping.size,
    rss: mapping.rss,
    exec: mapping.perms.includes("x"),
    maps: 1,
  });
}
/** Reserving >=512 MiB of address space is only ever V8 claiming its cage up front. */
const V8_RESERVATION_BYTES = 512 * 1048576;
const v8Regions = regions.filter((region) => region.reserved >= V8_RESERVATION_BYTES);
const inV8Region = (address: number) =>
  v8Regions.some((region) => address >= region.start && address < region.end);

/**
 * V8 allocates its heap in 256 KiB pages (`kRegularPageSize`), which is the single most
 * recognisable signature in the map: a 256 KiB anonymous `rw-p` mapping is a JS heap page
 * and nothing else in the process allocates at exactly that granularity in bulk. Thread
 * stacks are the other unmistakable shape — pthread reserves 8 MiB + a guard page, so they
 * show up as ~8196 KiB reservations that are almost entirely untouched.
 */
const V8_PAGE_BYTES = 262144;
const THREAD_STACK_BYTES = 8196 * 1024;

const categorise = (mapping: Mapping) => {
  const { path, perms } = mapping;
  const executable = perms.includes("x");
  if (path === "[stack]") return "main thread stack";
  if (path === "[heap]") return "malloc brk heap";
  if (path.startsWith("[")) return `kernel ${path}`;
  if (path) {
    if (/\.node$/.test(path)) return `native addon ${path.split("/").pop()}`;
    if (/\/node$|\/bun$/.test(path)) return executable ? "node binary (code)" : "node binary (data)";
    if (/\.so/.test(path)) return executable ? "shared library (code)" : "shared library (data)";
    return `file-backed ${path.split("/").pop()}`;
  }
  if (executable) return "JIT code (anonymous executable)";
  if (mapping.size === V8_PAGE_BYTES) return "V8 heap pages (256 KiB regular pages)";
  if (mapping.size === THREAD_STACK_BYTES) return "thread stacks (8 MiB reserved each)";
  if (inV8Region(mapping.start)) return "V8 reserved range (code range / trusted space)";
  if (mapping.size >= 8 * 1048576) return "native: large anonymous mmap (>=8 MiB)";
  return "native: malloc arenas, Buffers, small V8 spaces";
};

const byCategory = new Map<string, { rss: number; size: number; count: number }>();
let smapsRssTotal = 0;
let smapsAnonTotal = 0;
for (const mapping of mappings) {
  smapsRssTotal += mapping.rss;
  smapsAnonTotal += mapping.anonymous;
  const key = categorise(mapping);
  const acc = byCategory.get(key) ?? { rss: 0, size: 0, count: 0 };
  acc.rss += mapping.rss;
  acc.size += mapping.size;
  acc.count++;
  byCategory.set(key, acc);
}

// ------------------------------------------------------------- layer 4: V8 internals
/**
 * Preferred path: the preloaded probe's localhost endpoint. It needs no signal, no CDP
 * handshake and no GC pause, so it can be sampled at every stage of a stress run.
 */
const probeHttp = await execNodeIn(`
fetch("http://127.0.0.1:${process.env.HOMARR_PROBE_PORT ?? 9333}/")
  .then((response) => response.text())
  .then((text) => console.log(text))
  .catch((error) => console.log(JSON.stringify({ probeUnavailable: String(error && error.message) })));
`)
  .then((raw) => {
    try {
      return JSON.parse(raw.trim());
    } catch {
      return null;
    }
  })
  .catch(() => null);

const haveProbeHttp = probeHttp !== null && !probeHttp.probeUnavailable;
/** The inspector is still needed for a heap snapshot, and as the fallback when no probe is loaded. */
const needInspector = Boolean(snapshotPath) || !haveProbeHttp;
let webSocketUrl: string | undefined;
if (needInspector) {
  await execIn(`kill -USR1 ${pid}`).catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 1_500));
  const listRaw = await execNodeIn(`
const http = require("node:http");
http.get({ host: "127.0.0.1", port: 9229, path: "/json/list" }, (response) => {
  let body = "";
  response.on("data", (chunk) => (body += chunk));
  response.on("end", () => console.log(body));
}).on("error", (error) => console.log("ERR " + error.message));
`).catch((error: Error) => `ERR ${error.message}`);
  webSocketUrl = /"webSocketDebuggerUrl":\s*"([^"]+)"/.exec(listRaw)?.[1];
}

const evaluateInServerAsync = async (expression: string) => {
  if (!webSocketUrl) return null;
  const out = await execNodeIn(`
const ws = new WebSocket(${JSON.stringify(webSocketUrl)});
let nextId = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve) => { const id = ++nextId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message.result); pending.delete(message.id); }
});
ws.addEventListener("error", () => { console.error("inspector websocket error"); process.exit(1); });
ws.addEventListener("open", async () => {
  await send("Runtime.enable");
  const response = await send("Runtime.evaluate", { expression: ${JSON.stringify(expression)}, returnByValue: true, awaitPromise: true });
  if (response?.exceptionDetails) { console.error(JSON.stringify(response.exceptionDetails).slice(0, 800)); process.exit(1); }
  console.log(JSON.stringify(response?.result?.value ?? null));
  ws.close();
  process.exit(0);
});
`).catch((error: Error) => `null /* ${error.message} */`);
  try {
    return JSON.parse(out.trim());
  } catch {
    return null;
  }
};

/**
 * Fallback when no probe is mounted. The inspected context has no `require`, so the only
 * route to the module system is `process.mainModule` — which the Next standalone entry
 * does not set, so per-space statistics are usually unavailable this way. Kept because it
 * still works on containers started by hand, and reports `process.memoryUsage()` regardless.
 */
const v8Detail = haveProbeHttp
  ? { ...probeHttp, probe: true }
  : await evaluateInServerAsync(`(() => {
  const usage = process.memoryUsage();
  const out = { usage, spaces: null, heap: null, modules: null, largestModules: null, probe: false,
    versions: process.versions, execArgv: process.execArgv, uptime: process.uptime() };
  const probe = globalThis.__homarrProbe;
  try {
    if (probe) {
      out.probe = true;
      out.spaces = probe.spaces();
      out.heap = probe.heap();
      out.modules = probe.modules();
      out.largestModules = probe.largestModules(25);
    } else if (process.mainModule) {
      const req = process.mainModule.require.bind(process.mainModule);
      const v8 = req("v8");
      out.spaces = v8.getHeapSpaceStatistics();
      out.heap = v8.getHeapStatistics();
    }
  } catch (error) { out.error = String(error && error.message); }
  return out;
})()`);

// --------------------------------------------------------------------- report
const line = (name: string, bytes: number, of: number, note = "") =>
  `${pad(MiB(bytes).toFixed(1), 9)} MiB  ${pad(((bytes / of) * 100).toFixed(1), 5)}%  ${name}${note ? `   ${note}` : ""}`;

console.log(`\n############ RAM attribution: ${label} ############`);
console.log(`container ${container}  server pid ${pid} (${comm})  uptime ${Math.round(v8Detail?.uptime ?? 0)}s`);
if (v8Detail?.execArgv?.length) console.log(`node flags: ${v8Detail.execArgv.join(" ")}`);

console.log(`\n=== LAYER 1: cgroup (what the container limit sees) ===`);
const anon = cgroupStat.get("anon") ?? 0;
console.log(line("anon  — non-reclaimable, the real cost", anon, cgroupCurrent));
console.log(line("file  — page cache, reclaimable under pressure", cgroupStat.get("file") ?? 0, cgroupCurrent));
for (const key of ["slab", "kernel_stack", "pagetables", "sock", "shmem"]) {
  const value = cgroupStat.get(key) ?? 0;
  if (value > 0) console.log(line(`${key} — kernel bookkeeping`, value, cgroupCurrent));
}
console.log(`${pad(MiB(cgroupCurrent).toFixed(1), 9)} MiB         memory.current (sum of the above)`);
console.log(`${pad(MiB(cgroupPeak).toFixed(1), 9)} MiB         memory.peak (high-water since boot)`);

console.log(`\n=== LAYER 2: processes inside the container ===`);
const processTotal = processes.reduce((sum, item) => sum + item.bytes, 0);
for (const item of processes) console.log(line(item.name, item.bytes, processTotal));
console.log(`${pad(MiB(processTotal).toFixed(1), 9)} MiB         sum of process RSS`);

console.log(`\n=== LAYER 3: address space of pid ${pid} (smaps, ${mappings.length} mappings) ===`);
for (const [name, acc] of [...byCategory.entries()].sort((a, b) => b[1].rss - a[1].rss)) {
  if (acc.rss < 65536) continue;
  console.log(line(name, acc.rss, smapsRssTotal, `(${acc.count} maps, ${MiB(acc.size).toFixed(0)} MiB reserved)`));
}
console.log(`${pad(MiB(smapsRssTotal).toFixed(1), 9)} MiB         total RSS`);
console.log(`${pad(MiB(smapsAnonTotal).toFixed(1), 9)} MiB         of which anonymous (not backed by a file)`);
console.log(
  `\n  address-space reservations >=512 MiB (V8 claims its heap up front; only committed pages cost RAM):`,
);
for (const region of v8Regions.sort((a, b) => b.reserved - a.reserved)) {
  console.log(
    `    ${pad((region.reserved / 1073741824).toFixed(1), 6)} GiB reserved -> ${pad(MiB(region.rss).toFixed(1), 7)} MiB committed  (${region.maps} mappings)`,
  );
}

if (v8Detail?.usage) {
  const usage = v8Detail.usage;
  console.log(`\n=== LAYER 4: inside V8 ===`);
  console.log(line("heapTotal — committed to the JS heap", usage.heapTotal, usage.rss));
  console.log(line("  heapUsed — live JS objects in it", usage.heapUsed, usage.rss));
  console.log(line("  heap free — committed but unused", usage.heapTotal - usage.heapUsed, usage.rss));
  console.log(line("external — Buffers/ArrayBuffers off-heap", usage.external, usage.rss));
  console.log(line("  arrayBuffers — of which ArrayBuffer", usage.arrayBuffers, usage.rss));
  const rest = usage.rss - usage.heapTotal - usage.external;
  console.log(line("rest — native malloc, JIT code, .so, stacks", rest, usage.rss));
  console.log(`${pad(MiB(usage.rss).toFixed(1), 9)} MiB         process.memoryUsage().rss`);

  if (v8Detail.spaces) {
    console.log(`\n--- V8 heap spaces (which part of the JS heap) ---`);
    const spaceTotal = v8Detail.spaces.reduce((sum: number, s: { space_size: number }) => sum + s.space_size, 0);
    for (const space of [...v8Detail.spaces].sort((a, b) => b.space_size - a.space_size)) {
      if (space.space_size < 65536) continue;
      console.log(
        line(space.space_name, space.space_size, spaceTotal, `(${MiB(space.space_used_size).toFixed(1)} MiB used)`),
      );
    }
  }
  if (v8Detail.heap) {
    console.log(`\n--- V8 heap statistics ---`);
    console.log(`  heap_size_limit        ${MiB(v8Detail.heap.heap_size_limit).toFixed(0)} MiB  (--max-old-space-size)`);
    console.log(`  malloced_memory        ${MiB(v8Detail.heap.malloced_memory).toFixed(1)} MiB`);
    console.log(`  peak_malloced_memory   ${MiB(v8Detail.heap.peak_malloced_memory).toFixed(1)} MiB`);
    console.log(`  number_of_native_contexts ${v8Detail.heap.number_of_native_contexts}`);
    console.log(`  number_of_detached_contexts ${v8Detail.heap.number_of_detached_contexts}`);
  }
  if (v8Detail.modules) {
    const modules = v8Detail.modules;
    console.log(
      `\n--- LAYER 5: loaded code, by owner (${modules.fileCount} files, ${MiB(modules.totalBytes).toFixed(1)} MiB of source on disk) ---`,
    );
    console.log(
      `  V8 keeps a script's source string alive while any function in it is still lazily`,
    );
    console.log(`  compilable, so this is a floor on what merely *loading* the code costs.`);
    for (const group of modules.groups) {
      if (group.bytes < 262144) continue;
      console.log(line(group.name, group.bytes, modules.totalBytes, `(${group.files} files)`));
    }
    console.log(`${pad(MiB(modules.totalBytes).toFixed(1), 9)} MiB         total source loaded`);
  }
  if (v8Detail.largestModules) {
    console.log(`\n--- largest individual loaded files ---`);
    for (const item of v8Detail.largestModules.slice(0, 15)) {
      const short = item.file.replace(/^.*\/(\.next|node_modules)\//, "$1/");
      console.log(`  ${pad(MiB(item.bytes).toFixed(2), 8)} MiB  ${short}`);
    }
  }
  if (!v8Detail.probe) {
    console.log(
      `\n  (no probe loaded: per-space and per-module attribution unavailable. Start the container with`,
    );
    console.log(`   NODE_OPTIONS="--require /probe/memory-probe.cjs" and the probe dir mounted.)`);
  }
  if (v8Detail.error) console.log(`  (v8 detail unavailable: ${v8Detail.error})`);
} else {
  console.log(`\n=== LAYER 4: inside V8 === unavailable (inspector not reachable)`);
}

if (snapshotPath) {
  const inContainerPath = "/tmp/attribute.heapsnapshot";
  console.log(`\n=== taking heap snapshot (after a forced GC, so it shows retained not garbage) ===`);
  console.log(
    (
      await execNodeIn(`
const fs = require("node:fs");
const out = fs.createWriteStream(${JSON.stringify(inContainerPath)});
const ws = new WebSocket(${JSON.stringify(webSocketUrl)});
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "HeapProfiler.addHeapSnapshotChunk") out.write(message.params.chunk);
  else if (message.id === 3) out.end(() => { console.log("written"); process.exit(0); });
});
ws.addEventListener("error", () => { console.error("inspector websocket error"); process.exit(1); });
ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ id: 1, method: "HeapProfiler.enable" }));
  ws.send(JSON.stringify({ id: 2, method: "HeapProfiler.collectGarbage" }));
  ws.send(JSON.stringify({ id: 3, method: "HeapProfiler.takeHeapSnapshot", params: { reportProgress: false } }));
});
`)
    ).trim(),
  );
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(snapshotPath);
    const proc = spawn("docker", ["exec", container, "cat", inContainerPath]);
    proc.stdout.pipe(out);
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`docker exec cat exited ${code}`))));
  });
  await execIn(`rm -f ${inContainerPath}`).catch(() => undefined);
  console.log(`saved ${snapshotPath}`);
}
