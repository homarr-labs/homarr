import { z } from "zod/v4";

import type { IntegrationKind } from "@homarr/definitions";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { bucketHistory, fetchStatsAsync, getStatsMetrics } from "@homarr/integrations/stats";
import type { StatsValue } from "@homarr/integrations/stats";
import { createGetSetChannel, createLockChannel, getIntegrationCacheGenerationAsync } from "@homarr/redis";

import { getIntegrationCacheIdentity } from "./lib/integration-request-handler";
import { appendStatsHistoryAsync, readStatsHistoryAsync } from "./stats-history";

const logger = createLogger({ module: "integrationStats" });

const FRESH_MS = 60 * 60 * 1000;
const RETRY_MS = 60_000;
const MAX_PENDING = 128;
const snapshotSchema = z.object({
  identity: z.string(),
  values: z.record(z.string(), z.union([z.number().finite(), z.string().max(4096), z.boolean(), z.null()])),
  updatedAt: z.number().nullable(),
  retryAt: z.number(),
  error: z.boolean(),
});
type Snapshot = z.infer<typeof snapshotSchema>;
type Input = Parameters<typeof getIntegrationCacheIdentity>[0]["integration"] & { kind: IntegrationKind };
const running = new Map<string, Promise<void>>();
const cacheOptions = { useBoundedCacheClient: true };

const demoValues: Partial<Record<IntegrationKind, Record<string, StatsValue>>> = {
  sonarr: {
    shows: 74,
    monitored: 68,
    downloaded: 3_128,
    storage: 1.82 * 1024 ** 4,
    missing: 6,
    queued: 3,
    episodes: 3_986,
  },
  radarr: {
    movies: 386,
    monitored: 342,
    downloaded: 371,
    storage: 3.74 * 1024 ** 4,
    missing: 15,
    queued: 4,
  },
  qBittorrent: { download: 38 * 1024 ** 2, upload: 9.3 * 1024 ** 2, paused: false },
  proxmox: { nodes: 3, vms: 12, lxcs: 8 },
  piHole: {
    dnsQueriesToday: 119_872,
    adsBlockedToday: 19_641,
    adsBlockedTodayPercentage: 16.38,
    domainsBeingBlocked: 1_186_431,
  },
  immich: {
    userCount: 4,
    photoCount: 48_392,
    videoCount: 2_438,
    totalLibraryUsageInBytes: 684.5 * 1024 ** 3,
  },
  karakeep: { bookmarks: 1_247, favorites: 86, archived: 212, highlights: 418, lists: 24, tags: 93 },
  mealie: { recipes: 318, users: 14, categories: 28, tags: 76 },
  spoolman: { spools: 24, remainingWeight: 8_120 },
};

export const getDemoStatsValues = (integration: Pick<Input, "kind" | "url">) => {
  const demoMode = ["1", "yes", "t", "true"].includes((process.env.DEMO_MODE ?? "").toLowerCase());
  if (!demoMode || integration.url !== "https://demo.homarr.dev") return undefined;
  return demoValues[integration.kind];
};

const resolveAsync = async (integration: Input) => {
  const generation = await getIntegrationCacheGenerationAsync(integration.id);
  if (!generation.isShared) throw new Error("Statistics cache is temporarily unavailable");
  // Snapshots outlive the expiring response-cache generation. Credentials and URLs
  // remain part of their identity; generations only guard in-flight refreshes.
  const identity = getIntegrationCacheIdentity({ integration, options: { version: 1 } });
  // A stable key replaces old credentials' data instead of retaining unreachable snapshots forever.
  const name = `integration-stats:snapshot:v1:${integration.id}`;
  const channel = createGetSetChannel<Snapshot>(name, cacheOptions);
  const parsed = snapshotSchema.safeParse(await channel.getAsync());
  let snapshot: Snapshot = { identity, values: {}, updatedAt: null, retryAt: 0, error: false };
  // Retain snapshots written before response generations were decoupled.
  if (parsed.success && (parsed.data.identity === identity || parsed.data.identity.endsWith(`:${identity}`)))
    snapshot = { ...parsed.data, identity };
  return { identity, generation: generation.value, name, channel, snapshot };
};

export const getStatsSnapshotAsync = async (integration: Input) => {
  const demo = getDemoStatsValues(integration);
  if (demo) {
    return {
      values: demo,
      updatedAt: Date.now(),
      retryAt: 0,
      error: false,
      stale: false,
    };
  }

  const { snapshot } = await resolveAsync(integration);
  return {
    values: snapshot.values,
    updatedAt: snapshot.updatedAt,
    retryAt: snapshot.retryAt,
    error: snapshot.error,
    stale: snapshot.updatedAt === null || Date.now() - snapshot.updatedAt >= FRESH_MS,
  };
};

const pauseAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 250));

/**
 * @param mode `true` refreshes now, `false` keeps snapshots for one hour and
 * `{ maxAgeMs }` refreshes snapshots older than the given age.
 */
export const refreshStatsAsync = async (integration: Input, mode: boolean | { maxAgeMs: number }) => {
  const key = integration.id;
  const pending = running.get(key);
  if (pending) return await pending;
  if (running.size >= MAX_PENDING) throw new Error("Statistics refresh queue is full");
  const force = mode === true;
  const freshMs = typeof mode === "object" ? Math.min(mode.maxAgeMs, FRESH_MS) : FRESH_MS;
  const work = runRefreshAsync(integration, force, freshMs).finally(() => running.delete(key));
  running.set(key, work);
  return await work;
};

const runRefreshAsync = async (integration: Input, force: boolean, freshMs: number) => {
  const initial = await resolveAsync(integration);
  if (!force && initial.snapshot.retryAt > Date.now()) return;
  if (!force && initial.snapshot.updatedAt !== null && Date.now() - initial.snapshot.updatedAt < freshMs) return;
  const lock = createLockChannel(`integration-stats:lock:${integration.id}`, cacheOptions);
  const token = await lock.acquireAsync(120);
  // Another process owns this source. The caller keeps its snapshot and checks again later.
  if (!token) return;
  let slot: ReturnType<typeof createLockChannel> | undefined;
  let slotToken: string | undefined;
  let owned = true;
  const controller = new AbortController();
  const renewal = setInterval(() => {
    void (async () => {
      if (!(await lock.renewAsync(token, 120))) owned = false;
      if (slot && slotToken && !(await slot.renewAsync(slotToken, 120))) owned = false;
      if (!owned) controller.abort();
    })().catch(() => {
      owned = false;
      controller.abort();
    });
  }, 10_000);
  renewal.unref?.();
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const waitUntil = Date.now() + 60_000;
    while (!slot && Date.now() < waitUntil) {
      if (!owned) break;
      for (let index = 0; index < 4; index += 1) {
        const candidate = createLockChannel(`integration-stats:slot:${index}`, cacheOptions);
        const acquired = await candidate.acquireAsync(120);
        if (!acquired) continue;
        slot = candidate;
        slotToken = acquired;
        break;
      }
      if (!slot) await pauseAsync();
    }
    if (!slot || !owned) return;
    // Recheck after queuing: credentials or another refresh may have changed the snapshot.
    const current = await resolveAsync(integration);
    if (current.identity !== initial.identity || current.generation !== initial.generation) return;
    if (!force && current.snapshot.updatedAt !== null && Date.now() - current.snapshot.updatedAt < freshMs) return;
    deadline = setTimeout(() => controller.abort(), 60_000);
    deadline.unref?.();
    try {
      const raw = getDemoStatsValues(integration) ?? (await fetchBeforeAbortAsync(integration, controller.signal));
      controller.signal.throwIfAborted();
      const values: Snapshot["values"] = {};
      for (const metric of getStatsMetrics(integration.kind)) values[metric.key] = raw[metric.key] ?? null;
      const snapshot = snapshotSchema.parse({
        identity: initial.identity,
        values,
        updatedAt: Date.now(),
        retryAt: 0,
        error: false,
      });
      const latest = await resolveAsync(integration);
      if (owned && latest.identity === initial.identity && latest.generation === initial.generation) {
        const written = await lock.setPersistentIfOwnedAsync(token, initial.name, snapshot);
        if (written && snapshot.updatedAt !== null)
          await appendStatsHistoryAsync(integration.id, initial.identity, values, snapshot.updatedAt);
      }
    } catch {
      // Promise.all can reject before sibling provider requests finish.
      controller.abort();
      logger.warn("Statistics source refresh failed", { integrationId: integration.id, kind: integration.kind });
      const latest = await resolveAsync(integration);
      if (owned && latest.identity === initial.identity && latest.generation === initial.generation) {
        await lock.setPersistentIfOwnedAsync(token, initial.name, {
          ...current.snapshot,
          retryAt: Date.now() + RETRY_MS,
          error: true,
        });
      }
    }
  } finally {
    controller.abort();
    clearInterval(renewal);
    if (deadline) clearTimeout(deadline);
    const releases = [lock.releaseAsync(token)];
    if (slot && slotToken) releases.push(slot.releaseAsync(slotToken));
    await Promise.allSettled(releases);
  }
};

// Legacy adapters may ignore cancellation. Stop waiting so one stalled source cannot
// retain a distributed refresh slot forever; their own in-flight guard prevents overlap.
const fetchBeforeAbortAsync = async (integration: Input, signal: AbortSignal) => {
  signal.throwIfAborted();
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([fetchStatsAsync(integration, signal), aborted]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
};

interface SeriesOptions {
  metrics: string[];
  start: number;
  end: number;
  samples: number;
}

// Deterministic wave around the seeded value so demo graphs move without a live source.
const createDemoPoints = (value: number, metric: string, { start, end, samples }: Omit<SeriesOptions, "metrics">) => {
  const seed = [...metric].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const step = (end - start) / (samples - 1);
  return Array.from({ length: samples }, (_, index) => {
    const time = Math.round(start + step * index);
    const wave = Math.sin(time / 600_000 + seed) * 0.06 + Math.sin(time / 170_000 + seed * 3) * 0.03;
    return { time, value: Math.round(value * (1 + wave) * 100) / 100 };
  });
};

/**
 * Sampled history of numeric statistics recorded by earlier refreshes.
 */
export const getStatsSeriesAsync = async (integration: Input, { metrics, start, end, samples }: SeriesOptions) => {
  const demo = getDemoStatsValues(integration);
  if (demo) {
    return metrics.map((metric) => {
      const value = demo[metric];
      return {
        metric,
        points: typeof value === "number" ? createDemoPoints(value, metric, { start, end, samples }) : [],
      };
    });
  }

  const { identity } = await resolveAsync(integration);
  const items = await readStatsHistoryAsync(integration.id, identity, start);
  // History is only recorded while a board polls it. Leave those periods empty instead of
  // repeating the last value across them.
  const maxGapMs = Math.max(((end - start) / (samples - 1)) * 2, 5 * 60_000);
  return metrics.map((metric) => {
    const states = items.flatMap((item) => {
      const value = item.values[metric];
      return value === undefined ? [] : [{ state: String(value), time: item.time }];
    });
    let cursor = -1;
    const points = bucketHistory(states, { start, end, samples }).map((point) => {
      while (cursor + 1 < states.length && (states[cursor + 1]?.time ?? Number.POSITIVE_INFINITY) <= point.time)
        cursor++;
      const lastTime = states[cursor]?.time;
      if (lastTime === undefined || point.time - lastTime > maxGapMs) return { time: point.time, value: null };
      return point;
    });
    return { metric, points };
  });
};
