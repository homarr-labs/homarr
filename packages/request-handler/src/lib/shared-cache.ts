import { createHash } from "node:crypto";

import { serialize } from "superjson";

import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import {
  createGetSetChannel,
  createLockChannel,
  getIntegrationCacheGenerationAsync,
  getWidgetCacheGenerationAsync,
} from "@homarr/redis";
import type { IntegrationCacheGeneration, WidgetCacheGeneration } from "@homarr/redis";

import type { CacheEntry, SharedCacheAdapter } from "./request-handler";

const logger = createLogger({ module: "sharedRequestCache" });
// The dedicated cache client rejects commands after 500 ms. This guard stays
// above that deadline so lock outcomes are never abandoned while still pending.
const REDIS_OPERATION_TIMEOUT_MS = 750;
const REFRESH_LOCK_TTL_SECONDS = 15;
const SHARED_CACHE_ENVELOPE_VERSION = 2;
const DEFAULT_HANDLER_CACHE_VERSION = "v1";
const namespacePattern = /^[a-z0-9][a-z0-9:-]*$/;
const cacheVersionPattern = /^[a-z0-9][a-z0-9._-]*$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;

  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).toSorted()) {
    result[key] = canonicalize(value[key]);
  }
  return result;
};

export const hashSharedCacheInput = (options: Record<string, unknown>) => {
  const serialized = JSON.stringify(canonicalize(serialize(options)));
  return createHash("sha256").update(serialized).digest("hex");
};

export const hashIntegrationCacheOptions = hashSharedCacheInput;

const withTimeoutAsync = async <T>(promise: Promise<T>, durationMs: number): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Redis operation timed out")), durationMs);
    timer.unref?.();
    void promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
};

interface SharedCacheEnvelope<TData> {
  version: typeof SHARED_CACHE_ENVELOPE_VERSION;
  entry: CacheEntry<TData>;
}

const isSharedCacheEnvelope = (value: unknown): value is SharedCacheEnvelope<unknown> => {
  if (!isRecord(value) || value.version !== SHARED_CACHE_ENVELOPE_VERSION || !isRecord(value.entry)) return false;

  const entry = value.entry;
  if (!Object.hasOwn(entry, "data") || !(entry.timestamp instanceof Date)) return false;
  const timestamp = entry.timestamp.getTime();
  return (
    Number.isFinite(timestamp) &&
    typeof entry.expiresAt === "number" &&
    Number.isFinite(entry.expiresAt) &&
    typeof entry.staleUntil === "number" &&
    Number.isFinite(entry.staleUntil) &&
    timestamp <= entry.expiresAt &&
    entry.expiresAt <= entry.staleUntil
  );
};

interface IntegrationSharedCacheOptions {
  namespace: string;
  integrationId: string;
  cacheIdentity: string;
  cacheVersion?: string;
}

interface RedisSharedCacheOptions {
  namespace: string;
  cacheKind: "integration" | "widget";
  cacheIdentity: string;
  cacheVersion: string;
  generation: string;
  metadata?: Record<string, string>;
  isShared?: boolean;
}

const logRedisFailure = (operation: string, metadata: Record<string, unknown>, error: unknown) => {
  logger.warn(
    new ErrorWithMetadata(
      "Redis response cache operation failed",
      {
        ...metadata,
        operation,
      },
      { cause: error },
    ),
  );
};

const createRedisSharedCache = <TData>({
  namespace,
  cacheKind,
  cacheIdentity,
  cacheVersion,
  generation,
  metadata = {},
  isShared: initialIsShared = true,
}: RedisSharedCacheOptions): SharedCacheAdapter<TData> => {
  const logMetadata = { cacheNamespace: namespace, cacheKind, ...metadata };
  const payloadName = `${cacheKind}-cache:payload:v2:${cacheVersion}:${namespace}:${generation}:${cacheIdentity}`;
  const lockName = `${cacheKind}-cache:lock:v2:${cacheVersion}:${namespace}:${generation}:${cacheIdentity}`;
  const payloadChannel = createGetSetChannel<unknown>(payloadName, { useBoundedCacheClient: true });
  const lock = createLockChannel(lockName, { useBoundedCacheClient: true });
  let isShared = initialIsShared;

  const runRedisOperationAsync = async <T>(operation: string, callback: () => Promise<T>, fallback: T): Promise<T> => {
    if (!isShared) return fallback;
    try {
      return await withTimeoutAsync(callback(), REDIS_OPERATION_TIMEOUT_MS);
    } catch (error) {
      isShared = false;
      logRedisFailure(operation, logMetadata, error);
      return fallback;
    }
  };

  return {
    generation,
    get isShared() {
      return isShared;
    },
    getAsync: async () => {
      const value = await runRedisOperationAsync("payload-read", () => payloadChannel.getAsync(), undefined);
      if (value === undefined || value === null) return value;
      if (isSharedCacheEnvelope(value)) return value.entry as CacheEntry<TData>;

      logger.warn("Ignored invalid Redis response cache entry", {
        ...logMetadata,
        operation: "payload-validate",
      });
      await runRedisOperationAsync("payload-remove", () => payloadChannel.removeAsync(), undefined);
      return null;
    },
    setAsync: async (entry, refreshLockToken) => {
      const retentionMs = entry.staleUntil - Date.now();
      if (retentionMs <= 0) return false;
      const envelope: SharedCacheEnvelope<TData> = {
        version: SHARED_CACHE_ENVELOPE_VERSION,
        entry,
      };
      return await runRedisOperationAsync(
        "payload-write",
        () => lock.setIfOwnedAsync(refreshLockToken, payloadName, envelope, retentionMs),
        undefined,
      );
    },
    acquireRefreshLockAsync: async () =>
      await runRedisOperationAsync(
        "refresh-lock-acquire",
        () => lock.acquireAsync(REFRESH_LOCK_TTL_SECONDS),
        undefined,
      ),
    renewRefreshLockAsync: async (token) =>
      await runRedisOperationAsync(
        "refresh-lock-renew",
        () => lock.renewAsync(token, REFRESH_LOCK_TTL_SECONDS),
        undefined,
      ),
    releaseRefreshLockAsync: async (token) => {
      try {
        await withTimeoutAsync(lock.releaseAsync(token), REDIS_OPERATION_TIMEOUT_MS);
      } catch (error) {
        logRedisFailure("refresh-lock-release", logMetadata, error);
      }
    },
  };
};

interface WidgetSharedCacheOptions {
  namespace: string;
  cacheIdentity: string;
  cacheVersion?: string;
}

export const createWidgetSharedCacheAsync = async <TData>({
  namespace,
  cacheIdentity,
  cacheVersion = DEFAULT_HANDLER_CACHE_VERSION,
}: WidgetSharedCacheOptions): Promise<SharedCacheAdapter<TData>> => {
  if (typeof window !== "undefined") throw new Error("Widget request caching is server-only");
  if (!namespacePattern.test(namespace)) throw new Error(`Invalid widget cache namespace '${namespace}'`);
  if (!cacheVersionPattern.test(cacheVersion)) throw new Error(`Invalid widget cache version '${cacheVersion}'`);

  const metadata = { cacheNamespace: namespace };
  let generation: WidgetCacheGeneration;
  try {
    generation = await getWidgetCacheGenerationAsync(namespace);
  } catch (error) {
    logRedisFailure("generation-read", metadata, error);
    generation = { value: "redis-unavailable", isShared: false };
  }

  return createRedisSharedCache<TData>({
    namespace,
    cacheKind: "widget",
    cacheIdentity,
    cacheVersion,
    generation: generation.value,
    isShared: generation.isShared,
  });
};

export const createIntegrationSharedCacheAsync = async <TData>({
  namespace,
  integrationId,
  cacheIdentity,
  cacheVersion = DEFAULT_HANDLER_CACHE_VERSION,
}: IntegrationSharedCacheOptions): Promise<SharedCacheAdapter<TData>> => {
  if (typeof window !== "undefined") throw new Error("Integration request caching is server-only");
  if (!namespacePattern.test(namespace)) throw new Error(`Invalid integration cache namespace '${namespace}'`);
  if (!cacheVersionPattern.test(cacheVersion)) throw new Error(`Invalid integration cache version '${cacheVersion}'`);

  const metadata = { cacheNamespace: namespace, integrationId };
  let generation: IntegrationCacheGeneration;
  try {
    generation = await getIntegrationCacheGenerationAsync(integrationId);
  } catch (error) {
    logRedisFailure("generation-read", metadata, error);
    generation = { value: "redis-unavailable", isShared: false };
  }

  const sharedCache = createRedisSharedCache<TData>({
    namespace,
    cacheKind: "integration",
    cacheIdentity,
    cacheVersion,
    generation: generation.value,
    metadata: { integrationId },
    isShared: generation.isShared,
  });
  return sharedCache;
};
