import { z } from "zod/v4";

import type { DuckDuckGoBang } from "@homarr/request-handler/duckduckgo-bangs";

import { normalizeBangToken } from "../-apps-search/bangs";
import type { NormalizedBangsDataset } from "../-apps-search/bangs";
import type { BangsDatasetEntry, BangsDatasetTimer, BangsSearchProcedureResources } from "./resources";

const duckDuckGoBangsResponseSchema = z.array(
  z.object({
    t: z.string(),
    s: z.string(),
    d: z.string().optional(),
    u: z.string(),
    c: z.string().optional(),
    sc: z.string().optional(),
    r: z.number().optional(),
  }),
);

const maximumCacheSize = 1000;
const maximumInflightRequests = 100;
const cacheTtlMs = 10_000;
const requestTimeoutMs = 60_000;
const upstreamSettlementGraceMs = 60_000;
const trustedFetchTimeoutMs = 10_000;
const cacheKey = "local:{}";

class RequestHandlerTimeoutError extends Error {
  constructor() {
    super("Request handler deadline exceeded");
    this.name = RequestHandlerTimeoutError.name;
  }
}

class RequestHandlerOverloadedError extends Error {
  constructor() {
    super("Request handler concurrency limit exceeded");
    this.name = RequestHandlerOverloadedError.name;
  }
}

export async function requestBangsDatasetAsync(resources: BangsSearchProcedureResources): Promise<DuckDuckGoBang[]> {
  if (resources.policy.noExternalConnection) return [];

  const controller = new AbortController();
  const timer = resources.clock.setTimeout(() => controller.abort(), trustedFetchTimeoutMs);
  const response = await (async () => {
    try {
      const operation = resources.trustedFetch.startFetchWithTrustedCertificates("https://duckduckgo.com/bang.js", {
        signal: controller.signal,
        headers: { accept: "application/json,text/plain,*/*" },
      });
      resources.lifetime.trackTransportSettlement(operation.settledAsync);
      return await operation.responseAsync;
    } finally {
      timer.cancel();
    }
  })();

  if (!response.ok) throw new resources.ResponseError(response);

  const json: unknown = await response.json();
  const bangs = await duckDuckGoBangsResponseSchema.parseAsync(json);
  const normalized = bangs
    .map((bang) => ({ ...bang, t: normalizeBangToken(bang.t) }))
    .filter((bang) => bang.t.length > 0);
  normalized.sort((left, right) => left.t.localeCompare(right.t));
  return normalized;
}

export function createBangsDataset(resources: BangsSearchProcedureResources) {
  const { entries, inflight, upstreamSettlements } = resources.cache;
  const lifetime = new AbortController();
  const signal = AbortSignal.any([resources.lifetime.signal, lifetime.signal]);
  let expiryTimer: BangsDatasetTimer | undefined;
  let expiryTimerAt: number | undefined;
  let generation = 0;

  const evictExpired = () => {
    const now = resources.clock.now();
    entries.forEach((entry, key) => {
      if (now >= entry.staleUntil) entries.delete(key);
    });
  };

  const scheduleExpiry = (candidateExpiryAt?: number) => {
    if (candidateExpiryAt !== undefined && expiryTimerAt !== undefined && expiryTimerAt <= candidateExpiryAt) return;
    expiryTimer?.cancel();
    expiryTimer = undefined;
    expiryTimerAt = undefined;
    if (entries.size === 0) return;

    let nextExpiryAt = candidateExpiryAt ?? Number.POSITIVE_INFINITY;
    if (candidateExpiryAt === undefined) {
      for (const entry of entries.values()) {
        if (entry.staleUntil < nextExpiryAt) nextExpiryAt = entry.staleUntil;
      }
    }
    expiryTimerAt = nextExpiryAt;
    expiryTimer = resources.clock.setTimeout(
      () => {
        expiryTimer = undefined;
        expiryTimerAt = undefined;
        evictExpired();
        scheduleExpiry();
      },
      Math.max(0, nextExpiryAt - resources.clock.now()),
    );
    expiryTimer.unref();
  };

  const storeInMemory = (entry: BangsDatasetEntry, requestGeneration: number) => {
    if (signal.aborted || generation !== requestGeneration || resources.clock.now() >= entry.staleUntil) return;
    if (expiryTimerAt !== undefined && resources.clock.now() >= expiryTimerAt) evictExpired();
    entries.delete(cacheKey);
    if (entries.size >= maximumCacheSize) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    entries.set(cacheKey, entry);
    scheduleExpiry(entry.staleUntil);
  };

  const waitForSettlementGraceAsync = async (settledAsync: Promise<void>) => {
    await new Promise<void>((resolve) => {
      const timer = resources.clock.setTimeout(resolve, upstreamSettlementGraceMs);
      timer.unref();
      void settledAsync.then(() => {
        timer.cancel();
        resolve();
      });
    });
  };

  const startRequestWithDeadline = (deadlineAt: number, upstreamKey: string) => {
    signal.throwIfAborted();
    if (resources.clock.now() >= deadlineAt) throw new RequestHandlerTimeoutError();
    if (upstreamSettlements.has(upstreamKey) || upstreamSettlements.size >= maximumInflightRequests) {
      throw new RequestHandlerOverloadedError();
    }

    const controller = new AbortController();
    const upstreamSignal = AbortSignal.any([controller.signal, signal]);
    const timeoutError = new RequestHandlerTimeoutError();
    const remainingMs = deadlineAt - resources.clock.now();
    const upstreamRequest = requestBangsDatasetAsync(resources);
    const settledAsync = upstreamRequest.then(
      () => undefined,
      () => undefined,
    );
    upstreamSettlements.set(upstreamKey, settledAsync);
    void settledAsync.then(() => {
      if (upstreamSettlements.get(upstreamKey) === settledAsync) upstreamSettlements.delete(upstreamKey);
    });

    const resultAsync = new Promise<DuckDuckGoBang[]>((resolve, reject) => {
      if (upstreamSignal.aborted) reject(upstreamSignal.reason);
      const onAbort = () => reject(upstreamSignal.reason);
      upstreamSignal.addEventListener("abort", onAbort, { once: true });
      const timer = resources.clock.setTimeout(() => {
        controller.abort(timeoutError);
        reject(timeoutError);
      }, remainingMs);
      timer.unref();
      void upstreamRequest.then(resolve, reject).finally(() => {
        timer.cancel();
        upstreamSignal.removeEventListener("abort", onAbort);
      });
    });
    return { resultAsync, settledAsync };
  };

  const invalidateCache = () => {
    generation += 1;
    entries.clear();
    expiryTimer?.cancel();
    expiryTimer = undefined;
    expiryTimerAt = undefined;
  };

  const stopAsync = async () => {
    lifetime.abort(new Error("Request handler is stopped"));
    invalidateCache();
    await waitForSettlementGraceAsync(Promise.allSettled(upstreamSettlements.values()).then(() => undefined));
  };

  const getDataAsync = async (requestSignal: AbortSignal): Promise<BangsDatasetEntry> => {
    requestSignal.throwIfAborted();
    signal.throwIfAborted();
    const deadlineAt = resources.clock.now() + requestTimeoutMs;
    const requestGeneration = generation;
    const inflightKey = `${requestGeneration}:${cacheKey}`;
    const existing = inflight.get(inflightKey);
    if (existing) return existing;

    let cached = entries.get(cacheKey);
    if (cached) {
      entries.delete(cacheKey);
      entries.set(cacheKey, cached);
    }
    const now = resources.clock.now();
    if (cached && now < cached.expiresAt) return cached;
    if (cached && now >= cached.staleUntil) {
      entries.delete(cacheKey);
      scheduleExpiry();
      cached = undefined;
    }
    if (upstreamSettlements.has(inflightKey) || inflight.size >= maximumInflightRequests) {
      throw new RequestHandlerOverloadedError();
    }

    let cleanupAfterUpstreamAsync: Promise<void> | undefined;
    let promise: Promise<BangsDatasetEntry>;
    promise = (async () => {
      let upstreamSettledAsync: Promise<void> | undefined;
      try {
        const request = startRequestWithDeadline(deadlineAt, inflightKey);
        upstreamSettledAsync = request.settledAsync;
        const data = await request.resultAsync;
        signal.throwIfAborted();
        const completedAt = resources.clock.now();
        const entry: BangsDatasetEntry = {
          data,
          timestamp: new Date(completedAt),
          expiresAt: completedAt + cacheTtlMs,
          staleUntil: completedAt + cacheTtlMs,
        };
        storeInMemory(entry, requestGeneration);
        signal.throwIfAborted();
        return entry;
      } finally {
        if (upstreamSettledAsync) cleanupAfterUpstreamAsync = waitForSettlementGraceAsync(upstreamSettledAsync);
      }
    })();

    inflight.set(inflightKey, promise);
    const removeInflight = () => {
      const cleanupAsync = cleanupAfterUpstreamAsync ?? Promise.resolve();
      void cleanupAsync.then(
        () => {
          if (inflight.get(inflightKey) === promise) inflight.delete(inflightKey);
        },
        () => {
          if (inflight.get(inflightKey) === promise) inflight.delete(inflightKey);
        },
      );
    };
    void promise.then(removeInflight, removeInflight);
    return promise;
  };

  resources.lifetime.onDispose(stopAsync);
  return { getDataAsync, invalidateCache, stopAsync } satisfies NormalizedBangsDataset & {
    invalidateCache(): void;
    stopAsync(): Promise<void>;
  };
}
