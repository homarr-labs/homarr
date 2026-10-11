import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { build } from "esbuild";

const ttlSeconds = Number(process.env.CACHE_EXPIRY_TTL_SECONDS ?? 1);
const idleMs = Number(process.env.CACHE_EXPIRY_IDLE_MS ?? 100);
const entryCounts = (process.env.CACHE_EXPIRY_ENTRY_COUNTS ?? "1,25,100").split(",").map(Number);
const responseBytes = Number(process.env.CACHE_EXPIRY_RESPONSE_BYTES ?? 262_144);
const repeatCycles = Number(process.env.CACHE_EXPIRY_REPEAT_CYCLES ?? 5);
const repeatEntries = Number(process.env.CACHE_EXPIRY_REPEAT_ENTRIES ?? 25);
const checkEviction = process.argv.includes("--check-eviction");
const actualExecutorPath = resolve("packages/custom-widgets/src/server/request-executor.ts");
const selectedExecutorPath = resolve(process.env.CACHE_EXPIRY_EXECUTOR_SOURCE ?? actualExecutorPath);
const compiledExecutorPath = resolve("audit-evidence/2026-10-11/measurements/.cache-expiry-executor.mjs");
const runId = `cache-expiry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const counts = new Map<string, number>();
let delayedResponse = false;

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const id = url.searchParams.get("id") ?? "missing";
  counts.set(id, (counts.get(id) ?? 0) + 1);
  if (id === "inflight" && delayedResponse) {
    await delay(250);
    delayedResponse = false;
  }
  const size = Number(url.searchParams.get("bytes") ?? "0");
  const version = url.searchParams.get("version") ?? "1";
  const body = JSON.stringify({ version, payload: "x".repeat(Math.max(0, size)) });
  response.writeHead(200, { "content-type": "application/json" });
  response.end(body);
});

async function sample(label: string, entries: number): Promise<void> {
  if (typeof global.gc !== "function") throw new Error("Run with --expose-gc so retained-cache samples are comparable");
  await delay(0);
  global.gc();
  const memory = process.memoryUsage();
  console.log(JSON.stringify({ label, fixtureEntries: entries, responseBytes, at: new Date().toISOString(), ...memory }));
}

async function sampleAfterIdle(label: string, entries: number): Promise<void> {
  const startedCpu = process.cpuUsage();
  const waitMs = ttlSeconds * 1_000 + idleMs;
  await delay(waitMs);
  const idleCpu = process.cpuUsage(startedCpu);
  console.log(JSON.stringify({ event: "idle-expiry-window", label, fixtureEntries: entries, waitMs, userCpuMicros: idleCpu.user, systemCpuMicros: idleCpu.system }));
  await sample(label, entries);
}

async function loadExecutor(): Promise<{
  executeCustomWidgetRequest: typeof import("../../../packages/custom-widgets/src/server/request-executor.ts").executeCustomWidgetRequest;
  invalidateCustomWidgetResponseCache: typeof import("../../../packages/custom-widgets/src/server/request-executor.ts").invalidateCustomWidgetResponseCache;
}> {
  const source = await readFile(selectedExecutorPath, "utf8");
  const result = await build({
    stdin: {
      contents: 'export { executeCustomWidgetRequest, invalidateCustomWidgetResponseCache } from "@cache-expiry/request-executor";',
      resolveDir: dirname(actualExecutorPath),
      sourcefile: "cache-expiry-entry.ts",
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    write: false,
    plugins: [{
      name: "cache-expiry-executor-source",
      setup(pluginBuild) {
        pluginBuild.onResolve({ filter: /^@cache-expiry\/request-executor$/ }, () => ({
          path: selectedExecutorPath,
          namespace: "cache-expiry-executor-source",
        }));
        pluginBuild.onLoad({ filter: /.*/, namespace: "cache-expiry-executor-source" }, () => ({
          contents: source,
          resolveDir: dirname(actualExecutorPath),
          loader: "ts",
        }));
      },
    }],
  });
  await writeFile(compiledExecutorPath, result.outputFiles[0]!.contents);
  return import(`${compiledExecutorPath}?source=${encodeURIComponent(selectedExecutorPath)}-${Date.now()}`);
}

async function request(id: string, options: { bytes?: number; ttl?: number; version?: string } = {}) {
  const url = new URL("/response", baseUrl);
  url.searchParams.set("id", id);
  if (options.bytes !== undefined) url.searchParams.set("bytes", String(options.bytes));
  if (options.version !== undefined) url.searchParams.set("version", options.version);
  return executeCustomWidgetRequest({
    baseUrl,
    targetUrl: url,
    method: "GET",
    networkScope: "loopback",
    kind: "query",
    cacheKey: `${runId}:${id}`,
    cacheTtlSeconds: options.ttl ?? ttlSeconds,
  });
}

let baseUrl = "";

async function run(): Promise<void> {
  const executor = await loadExecutor();
  executeCustomWidgetRequest = executor.executeCustomWidgetRequest;
  invalidateCustomWidgetResponseCache = executor.invalidateCustomWidgetResponseCache;
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not bind local fixture server");
  baseUrl = `http://127.0.0.1:${address.port}`;
  const executorHash = createHash("sha256").update(await readFile(selectedExecutorPath)).digest("hex");
  const processLimits = await readFile("/proc/self/limits", "utf8").catch(() => "unavailable");
  console.log(JSON.stringify({ event: "start", runId, entryCounts, responseBytes, ttlSeconds, idleMs, repeatCycles, repeatEntries, baseUrl, mode: "production executor + loopback HTTP", executorSource: selectedExecutorPath, executorSha256: executorHash, node: process.version, execArgv: process.execArgv, processUsage: process.resourceUsage(), processLimits }));

  try {
    for (const entryCount of entryCounts) {
      if (!Number.isInteger(entryCount) || entryCount < 1) throw new Error(`Invalid entry count: ${entryCount}`);
      const prefix = `${runId}:memory-${entryCount}-`;
      invalidateCustomWidgetResponseCache([prefix]);
      await sample("empty-before-fill", 0);
      const ids = Array.from({ length: entryCount }, (_, index) => `memory-${entryCount}-${index}`);
      // All entries use identical deterministic JSON payloads, below the 1 MiB response limit.
      await Promise.all(ids.map((id) => request(id, { bytes: responseBytes })));
      const afterFill = ids.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
      await Promise.all(ids.map((id) => request(id)));
      const afterHits = ids.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
      if (afterHits !== afterFill) throw new Error(`Cache hit check failed for ${entryCount} entries: ${afterFill} -> ${afterHits}`);
      await sample("populated-after-hit-check", entryCount);
      // Do not request any cache key during this interval: expiry is observed while idle.
      await sampleAfterIdle("ttl-plus-idle-before-invalidation", entryCount);
      invalidateCustomWidgetResponseCache([prefix]);
      await sample("after-explicit-invalidation", entryCount);
    }

    // Let each 25-entry generation expire while idle, then fill the next without explicit invalidation.
    // The next insertion exercises existing prune-on-insert behavior in the baseline.
    const repeatPrefix = `${runId}:repeat-cycle-`;
    await sample("repeat-cycles-empty-baseline", 0);
    for (let cycle = 1; cycle <= repeatCycles; cycle += 1) {
      const ids = Array.from({ length: repeatEntries }, (_, index) => `repeat-cycle-${cycle}-${index}`);
      await Promise.all(ids.map((id) => request(id, { bytes: responseBytes })));
      const afterFill = ids.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
      await Promise.all(ids.map((id) => request(id)));
      const afterHits = ids.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
      if (afterHits !== afterFill) throw new Error(`Repeated-cycle cache-hit check failed in cycle ${cycle}`);
      await sample("repeat-cycle-populated", repeatEntries);
      await sampleAfterIdle("repeat-cycle-ttl-plus-idle-before-next-fill", repeatEntries);
    }
    invalidateCustomWidgetResponseCache([repeatPrefix]);
    await sample("repeat-cycles-after-final-invalidation", repeatEntries);

    const probe = "expiry-probe";
    await request(probe, { version: "before" });
    await delay(ttlSeconds * 1_000 + 10);
    const beforeRefetch = counts.get(probe) ?? 0;
    const refreshed = await request(probe, { version: "after" });
    if ((counts.get(probe) ?? 0) !== beforeRefetch + 1 || (refreshed.data as { version?: string }).version !== "after")
      throw new Error("Expired entry did not refetch");
    const beforeHit = counts.get(probe) ?? 0;
    await request(probe, { version: "ignored" });
    if ((counts.get(probe) ?? 0) !== beforeHit) throw new Error("Refreshed entry did not hit cache");

    // An older in-flight generation must not repopulate after invalidation.
    delayedResponse = true;
    const oldRequest = request("inflight", { ttl: 60, version: "old" });
    while ((counts.get("inflight") ?? 0) === 0) await delay(5);
    invalidateCustomWidgetResponseCache([`${runId}:inflight`]);
    const newer = await request("inflight", { ttl: 60, version: "new" });
    await oldRequest;
    const requestsBeforeFinalHit = counts.get("inflight") ?? 0;
    const finalHit = await request("inflight", { ttl: 60, version: "ignored" });
    if ((finalHit.data as { version?: string }).version !== "new" || (counts.get("inflight") ?? 0) !== requestsBeforeFinalHit)
      throw new Error("In-flight invalidation generation check failed");
    console.log(JSON.stringify({ event: "inflight-invalidation", old: (await oldRequest).data && "completed", cachedVersion: (finalHit.data as { version?: string }).version, serverRequests: counts.get("inflight") }));
    void newer;

    if (checkEviction) {
      const firstKey = `${runId}:eviction-0`;
      for (let index = 0; index < 1_001; index += 1) {
        const id = `eviction-${index}`;
        await request(id, { ttl: 3_600, version: String(index) });
      }
      const before = counts.get("eviction-0") ?? 0;
      await request("eviction-0", { ttl: 3_600, version: "re-fetch" });
      if ((counts.get("eviction-0") ?? 0) !== before + 1) throw new Error("Oldest-entry eviction check failed");
      console.log(JSON.stringify({ event: "entry-eviction", oldestKey: firstKey, refetched: true, entriesInserted: 1_001 }));
    }
  } finally {
    try {
      invalidateCustomWidgetResponseCache([`${runId}:`]);
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    } finally {
      await unlink(compiledExecutorPath).catch(() => undefined);
    }
  }
}

let executeCustomWidgetRequest: Awaited<ReturnType<typeof loadExecutor>>["executeCustomWidgetRequest"];
let invalidateCustomWidgetResponseCache: Awaited<ReturnType<typeof loadExecutor>>["invalidateCustomWidgetResponseCache"];
await run();
